/**
 * Alarm handling engine (ISA-18.2 inspired) for Water Bank 901 SCADA.
 *
 * Lifecycle (per tag / condition key):
 *   NORMAL ──trip──► ACTIVE_UNACK ──ack──► ACTIVE_ACK
 *                         │                     │
 *                        RTN                   RTN
 *                         ▼                     ▼
 *                    RTN_UNACK ──ack──► HISTORY (cleared)
 *                         ▲
 *                    ACTIVE_ACK also → HISTORY on RTN+already acked
 *
 * Operator may SHELVE an active alarm (timer or manual unshelve).
 * Silence mutes the horn without acknowledging.
 */

import type {
  Alarm,
  AlarmEvent,
  AlarmSeverity,
  AlarmState,
  LowLevelTank,
  MdbMeter,
  MotorDevice,
  Tank,
  ValveDevice,
} from "./scada-types";

/** Detected process condition this scan (true = abnormal). */
export interface AlarmCondition {
  key: string;
  severity: AlarmSeverity;
  area: string;
  source: string;
  tag: string;
  message: string;
  valueText?: string;
  /** When true, condition is currently abnormal. */
  active: boolean;
}

export interface AlarmThresholds {
  tankLowTrip: number;
  tankLowClear: number;
  tankHighTrip: number;
  tankHighClear: number;
  undervoltageTrip: number;
  undervoltageClear: number;
  overcurrentTrip: number;
  overcurrentClear: number;
  freqLowTrip: number;
  freqHighTrip: number;
  pfLowTrip: number;
}

export const DEFAULT_THRESHOLDS: AlarmThresholds = {
  tankLowTrip: 20,
  tankLowClear: 23,
  tankHighTrip: 92,
  tankHighClear: 89,
  undervoltageTrip: 210,
  undervoltageClear: 215,
  overcurrentTrip: 120,
  overcurrentClear: 110,
  freqLowTrip: 49.5,
  freqHighTrip: 50.5,
  pfLowTrip: 0.85,
};

const MAX_ACTIVE = 80;
const MAX_HISTORY = 120;
const MAX_EVENTS = 200;
const DEFAULT_SHELVE_MS = 15 * 60 * 1000;

const SEVERITY_RANK: Record<AlarmSeverity, number> = {
  critical: 0,
  high: 1,
  warning: 2,
  info: 3,
};

export function severityRank(s: AlarmSeverity) {
  return SEVERITY_RANK[s] ?? 9;
}

/** Derived UI state from alarm record. */
export function deriveAlarmState(a: Alarm, now = Date.now()): AlarmState {
  if (a.shelvedUntil != null && a.shelvedUntil > now) return "shelved";
  if (a.active && !a.ack) return "active_unack";
  if (a.active && a.ack) return "active_ack";
  if (!a.active && !a.ack) return "rtn_unack";
  return "cleared";
}

export function isAlarmVisible(a: Alarm, now = Date.now()) {
  const st = deriveAlarmState(a, now);
  return st !== "cleared";
}

export function needsOperatorAttention(a: Alarm, now = Date.now()) {
  const st = deriveAlarmState(a, now);
  return st === "active_unack" || st === "rtn_unack";
}

export function shouldAnnunciate(alarms: Alarm[], silenced: boolean, now = Date.now()) {
  if (silenced) return false;
  return alarms.some((a) => {
    const st = deriveAlarmState(a, now);
    return st === "active_unack" && a.severity === "critical";
  });
}

export function countAlarmSummary(alarms: Alarm[], now = Date.now()) {
  let unack = 0;
  let active = 0;
  let critical = 0;
  let shelved = 0;
  let total = 0;
  for (const a of alarms) {
    const st = deriveAlarmState(a, now);
    if (st === "cleared") continue;
    total++;
    if (st === "shelved") {
      shelved++;
      continue;
    }
    if (st === "active_unack" || st === "rtn_unack") unack++;
    if (st === "active_unack" || st === "active_ack") {
      active++;
      if (a.severity === "critical") critical++;
    }
  }
  return { unack, active, critical, shelved, total };
}

export function sortAlarms(alarms: Alarm[], now = Date.now()) {
  return [...alarms].sort((a, b) => {
    const sa = deriveAlarmState(a, now);
    const sb = deriveAlarmState(b, now);
    const order = (st: AlarmState) => {
      if (st === "active_unack") return 0;
      if (st === "rtn_unack") return 1;
      if (st === "active_ack") return 2;
      if (st === "shelved") return 3;
      return 4;
    };
    const d = order(sa) - order(sb);
    if (d !== 0) return d;
    const sev = severityRank(a.severity) - severityRank(b.severity);
    if (sev !== 0) return sev;
    return b.raisedAt - a.raisedAt;
  });
}

// ─── Condition evaluation from plant tags ───────────────────────────────────

function levelActive(
  value: number,
  wasActive: boolean,
  trip: number,
  clear: number,
  high: boolean,
): boolean {
  if (high) {
    if (wasActive) return value >= clear;
    return value >= trip;
  }
  if (wasActive) return value <= clear;
  return value <= trip;
}

export function evaluateConditions(
  plant: {
    motors: Record<string, MotorDevice>;
    valves: Record<string, ValveDevice>;
    tanks: Record<string, Tank>;
    lowTanks: Record<string, LowLevelTank>;
    mdb1: MdbMeter;
    mdb2: MdbMeter;
    connected: boolean;
  },
  prevAlarms: Alarm[],
  thresholds: AlarmThresholds = DEFAULT_THRESHOLDS,
): AlarmCondition[] {
  const prevByKey = new Map(prevAlarms.map((a) => [a.key, a]));
  const out: AlarmCondition[] = [];

  out.push({
    key: "comm.plant",
    severity: "critical",
    area: "Network",
    source: "PLC link",
    tag: "COMM_OK",
    message: "Plant communication lost — PLC Master / Slave offline",
    active: !plant.connected,
  });

  for (const m of Object.values(plant.motors)) {
    out.push({
      key: `motor.fault.${m.id}`,
      severity: "critical",
      area: m.group,
      source: m.name,
      tag: `${m.id}.FAULT`,
      message: "Motor FAULT bit active — trip / overload / protection",
      active: m.fault,
    });
  }

  for (const v of Object.values(plant.valves)) {
    if (v.fault == null) continue;
    out.push({
      key: `valve.fault.${v.id}`,
      severity: "high",
      area: v.group,
      source: v.name,
      tag: `${v.id}.FAULT`,
      message: "Valve FAULT — actuator / limit switch error",
      active: !!v.fault,
    });
  }

  for (const t of Object.values(plant.tanks)) {
    const lowKey = `tank.low.${t.id}`;
    const highKey = `tank.high.${t.id}`;
    const prevLow = prevByKey.get(lowKey)?.active ?? false;
    const prevHigh = prevByKey.get(highKey)?.active ?? false;

    const lowActive = levelActive(
      t.level,
      prevLow,
      thresholds.tankLowTrip,
      thresholds.tankLowClear,
      false,
    );
    const highActive = levelActive(
      t.level,
      prevHigh,
      thresholds.tankHighTrip,
      thresholds.tankHighClear,
      true,
    );

    out.push({
      key: lowKey,
      severity: "warning",
      area: t.kind === "raw" ? "Raw water" : "Clear water",
      source: t.name,
      tag: t.radarTag,
      message: `Low level alarm — radar below ${thresholds.tankLowTrip}%`,
      valueText: `${t.level.toFixed(1)}%`,
      active: lowActive,
    });
    out.push({
      key: highKey,
      severity: "high",
      area: t.kind === "raw" ? "Raw water" : "Clear water",
      source: t.name,
      tag: t.radarTag,
      message: `High level alarm — radar above ${thresholds.tankHighTrip}%`,
      valueText: `${t.level.toFixed(1)}%`,
      active: highActive,
    });
  }

  for (const lt of Object.values(plant.lowTanks)) {
    out.push({
      key: `chem.low.${lt.id}`,
      severity: "warning",
      area: `Unit ${lt.unitId}`,
      source: lt.name,
      tag: `${lt.id}.LowLevel`,
      message: "Chemical / dosing tank low level BIT",
      active: lt.lowLevel,
    });
  }

  for (const [slave, mdb] of [
    ["slave1", plant.mdb1],
    ["slave2", plant.mdb2],
  ] as const) {
    const area = slave === "slave1" ? "MDB Slave 1" : "MDB Slave 2";
    const prefix = `mdb.${slave}`;

    const prevUv = prevByKey.get(`${prefix}.uv`)?.active ?? false;
    const uvActive = levelActive(
      mdb.voltageLNAvg,
      prevUv,
      thresholds.undervoltageTrip,
      thresholds.undervoltageClear,
      false,
    );
    out.push({
      key: `${prefix}.uv`,
      severity: "critical",
      area,
      source: area,
      tag: "MDB_Meter_Voltage_L_N_Avg",
      message: `Undervoltage L-N avg < ${thresholds.undervoltageTrip} V`,
      valueText: `${mdb.voltageLNAvg.toFixed(1)} V`,
      active: uvActive,
    });

    const prevOc = prevByKey.get(`${prefix}.oc`)?.active ?? false;
    const ocActive = levelActive(
      mdb.currentAvg,
      prevOc,
      thresholds.overcurrentTrip,
      thresholds.overcurrentClear,
      true,
    );
    out.push({
      key: `${prefix}.oc`,
      severity: "high",
      area,
      source: area,
      tag: "MDB_Meter_Current_Avg",
      message: `Overcurrent avg > ${thresholds.overcurrentTrip} A`,
      valueText: `${mdb.currentAvg.toFixed(1)} A`,
      active: ocActive,
    });

    out.push({
      key: `${prefix}.freq`,
      severity: "warning",
      area,
      source: area,
      tag: "MDB_Meter_Frequency",
      message: `Frequency out of band (${thresholds.freqLowTrip}–${thresholds.freqHighTrip} Hz)`,
      valueText: `${mdb.frequency.toFixed(2)} Hz`,
      active: mdb.frequency < thresholds.freqLowTrip || mdb.frequency > thresholds.freqHighTrip,
    });

    out.push({
      key: `${prefix}.pf`,
      severity: "info",
      area,
      source: area,
      tag: "MDB_Meter_PF_Avg",
      message: `Power factor low < ${thresholds.pfLowTrip}`,
      valueText: mdb.pfAvg.toFixed(3),
      active: mdb.pfAvg < thresholds.pfLowTrip,
    });
  }

  return out;
}

// ─── State machine scan ─────────────────────────────────────────────────────

export interface AlarmScanResult {
  alarms: Alarm[];
  history: Alarm[];
  events: AlarmEvent[];
  firstOutKey?: string;
}

function pushEvent(
  events: AlarmEvent[],
  type: AlarmEvent["type"],
  alarm: Alarm,
  ts: number,
  note?: string,
): AlarmEvent[] {
  const ev: AlarmEvent = {
    id: `ev-${ts}-${type}-${alarm.key}-${events.length}`,
    ts,
    type,
    alarmKey: alarm.key,
    severity: alarm.severity,
    source: alarm.source,
    message: alarm.message,
    note,
  };
  return [ev, ...events].slice(0, MAX_EVENTS);
}

export function processAlarmScan(
  prevAlarms: Alarm[],
  prevHistory: Alarm[],
  prevEvents: AlarmEvent[],
  conditions: AlarmCondition[],
  now: number,
): AlarmScanResult {
  const byKey = new Map(prevAlarms.map((a) => [a.key, { ...a }]));
  let events = prevEvents;
  let history = [...prevHistory];
  let firstOutKey: string | undefined;

  for (const a of byKey.values()) {
    if (a.shelvedUntil != null && a.shelvedUntil <= now) {
      a.shelvedUntil = undefined;
      a.shelvedBy = undefined;
      events = pushEvent(events, "unshelve", a, now, "Shelve timer expired");
    }
  }

  for (const c of conditions) {
    const existing = byKey.get(c.key);

    if (c.active) {
      if (!existing) {
        const raised: Alarm = {
          id: c.key,
          key: c.key,
          severity: c.severity,
          area: c.area,
          source: c.source,
          tag: c.tag,
          message: c.message,
          valueText: c.valueText,
          active: true,
          ack: false,
          raisedAt: now,
          updatedAt: now,
          count: 1,
        };
        byKey.set(c.key, raised);
        events = pushEvent(events, "raise", raised, now);
        if (c.severity === "critical" && !firstOutKey) firstOutKey = c.key;
      } else if (!existing.active) {
        existing.active = true;
        existing.ack = false;
        existing.raisedAt = now;
        existing.updatedAt = now;
        existing.clearedAt = undefined;
        existing.count = (existing.count ?? 1) + 1;
        existing.message = c.message;
        existing.valueText = c.valueText;
        existing.severity = c.severity;
        events = pushEvent(events, "retrip", existing, now, `Occurrence #${existing.count}`);
        if (c.severity === "critical" && !firstOutKey) firstOutKey = c.key;
      } else {
        existing.valueText = c.valueText;
        existing.message = c.message;
        existing.updatedAt = now;
      }
    } else if (existing?.active) {
      existing.active = false;
      existing.clearedAt = now;
      existing.updatedAt = now;
      existing.valueText = c.valueText;
      events = pushEvent(events, "rtn", existing, now);

      if (existing.ack || (existing.shelvedUntil != null && existing.shelvedUntil > now)) {
        const done = { ...existing, ack: true };
        byKey.delete(c.key);
        history = [done, ...history].slice(0, MAX_HISTORY);
        events = pushEvent(events, "clear", done, now, "RTN + acked/shelved → history");
      }
    }
  }

  for (const [key, a] of [...byKey.entries()]) {
    if (!a.active && a.ack && !(a.shelvedUntil != null && a.shelvedUntil > now)) {
      byKey.delete(key);
      history = [a, ...history].slice(0, MAX_HISTORY);
    }
  }

  const alarms = sortAlarms([...byKey.values()], now).slice(0, MAX_ACTIVE);
  return { alarms, history, events, firstOutKey };
}

// ─── Operator actions ───────────────────────────────────────────────────────

export function ackAlarmRecord(
  alarms: Alarm[],
  history: Alarm[],
  events: AlarmEvent[],
  id: string,
  now: number,
  operator = "Operator",
) {
  let nextHistory = history;
  let nextEvents = events;
  const next = alarms
    .map((a) => {
      if (a.id !== id && a.key !== id) return a;
      if (a.ack && a.active) return a;
      const updated: Alarm = {
        ...a,
        ack: true,
        ackedAt: now,
        ackedBy: operator,
        updatedAt: now,
      };
      nextEvents = pushEvent(nextEvents, "ack", updated, now, operator);

      if (!updated.active) {
        nextHistory = [updated, ...nextHistory].slice(0, MAX_HISTORY);
        nextEvents = pushEvent(nextEvents, "clear", updated, now, "Ack after RTN");
        return null;
      }
      return updated;
    })
    .filter((a): a is Alarm => a != null);

  return { alarms: next, history: nextHistory, events: nextEvents };
}

export function ackAllRecords(
  alarms: Alarm[],
  history: Alarm[],
  events: AlarmEvent[],
  now: number,
  operator = "Operator",
) {
  let next = alarms;
  let hist = history;
  let ev = events;
  const targets = alarms.filter((a) => needsOperatorAttention(a, now));
  for (const a of targets) {
    const r = ackAlarmRecord(next, hist, ev, a.id, now, operator);
    next = r.alarms;
    hist = r.history;
    ev = r.events;
  }
  return { alarms: next, history: hist, events: ev };
}

export function shelveAlarmRecord(
  alarms: Alarm[],
  events: AlarmEvent[],
  id: string,
  now: number,
  durationMs = DEFAULT_SHELVE_MS,
  operator = "Operator",
) {
  const until = now + durationMs;
  let nextEvents = events;
  const next = alarms.map((a) => {
    if (a.id !== id && a.key !== id) return a;
    if (!a.active) return a;
    const updated: Alarm = {
      ...a,
      shelvedUntil: until,
      shelvedBy: operator,
      updatedAt: now,
    };
    nextEvents = pushEvent(
      nextEvents,
      "shelve",
      updated,
      now,
      `${operator} · ${Math.round(durationMs / 60000)} min`,
    );
    return updated;
  });
  return { alarms: next, events: nextEvents };
}

export function unshelveAlarmRecord(
  alarms: Alarm[],
  events: AlarmEvent[],
  id: string,
  now: number,
  operator = "Operator",
) {
  let nextEvents = events;
  const next = alarms.map((a) => {
    if (a.id !== id && a.key !== id) return a;
    const updated: Alarm = {
      ...a,
      shelvedUntil: undefined,
      shelvedBy: undefined,
      updatedAt: now,
      ack: a.ack,
    };
    nextEvents = pushEvent(nextEvents, "unshelve", updated, now, operator);
    return updated;
  });
  return { alarms: next, events: nextEvents };
}

/** Seed initial alarms consistent with plant startup faults. */
export function bootstrapAlarmsFromPlant(
  plant: {
    motors: Record<string, MotorDevice>;
    valves: Record<string, ValveDevice>;
    tanks: Record<string, Tank>;
    lowTanks: Record<string, LowLevelTank>;
    mdb1: MdbMeter;
    mdb2: MdbMeter;
    connected: boolean;
  },
  now: number,
): AlarmScanResult {
  const conditions = evaluateConditions(plant, [], DEFAULT_THRESHOLDS);
  return processAlarmScan([], [], [], conditions, now);
}
