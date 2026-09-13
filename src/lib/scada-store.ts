import { create } from "zustand";
import {
  ackAlarmRecord,
  ackAllRecords,
  bootstrapAlarmsFromPlant,
  countAlarmSummary,
  evaluateConditions,
  processAlarmScan,
  shelveAlarmRecord,
  shouldAnnunciate,
  unshelveAlarmRecord,
} from "./alarm-engine";
import type {
  Alarm,
  AlarmEvent,
  MdbMeter,
  MotorDevice,
  PlantSnapshot,
  TreatmentUnit,
  ValveDevice,
} from "./scada-types";
import { clamp } from "./utils";

function motor(
  id: string,
  name: string,
  group: string,
  plc: "slave1" | "slave2",
  opts?: Partial<Pick<MotorDevice, "auto" | "run" | "fault">>,
): MotorDevice {
  return {
    id,
    name,
    group,
    plc,
    auto: opts?.auto ?? true,
    run: opts?.run ?? false,
    fault: opts?.fault ?? false,
  };
}

function valve(
  id: string,
  name: string,
  group: string,
  kind: "actuator" | "solenoid",
  plc: "slave1" | "slave2",
  opts?: Partial<Pick<ValveDevice, "auto" | "open" | "close" | "fault">>,
): ValveDevice {
  return {
    id,
    name,
    group,
    kind,
    plc,
    auto: opts?.auto,
    open: opts?.open ?? false,
    close: opts?.close ?? true,
    fault: opts?.fault ?? false,
  };
}

function baseMdb(seed: number): MdbMeter {
  return {
    currentL1: 42 + seed,
    currentL2: 41 + seed * 0.8,
    currentL3: 43 + seed * 0.6,
    currentAvg: 42 + seed * 0.8,
    voltageL1N: 230.2,
    voltageL2N: 229.8,
    voltageL3N: 230.5,
    voltageLNAvg: 230.2,
    voltageL1L2: 399.1,
    voltageL2L3: 398.7,
    voltageL1L3: 399.4,
    voltageLLAvg: 399.1,
    kWh: 128450 + seed * 100,
    kWTotal: 28.4 + seed,
    kVarTotal: 6.2 + seed * 0.2,
    kVATotal: 29.1 + seed,
    pfAvg: 0.96,
    frequency: 50.01,
  };
}

const UNITS: TreatmentUnit[] = [1, 2, 3, 4].map((n) => ({
  id: n,
  name: `Water Treatment Unit ${n}`,
  rawPumps: [`u${n}-raw-1`, `u${n}-raw-2`],
  cipPump: `u${n}-cip`,
  backwashPump: `u${n}-bw`,
  solenoidValves: [1, 2, 3, 4, 5, 6, 7].map((v) => `u${n}-sv${v}`),
  ozone: `u${n}-ozone`,
  lowTanks: [`u${n}-pre-cl`, `u${n}-post-cl`, `u${n}-bw-cl`, `u${n}-oz-tank`],
}));

function buildPlantCore() {
  const motors: Record<string, MotorDevice> = {};
  const valves: Record<string, ValveDevice> = {};

  for (const tank of [1, 2] as const) {
    for (const p of [1, 2, 3] as const) {
      const id = `raw${tank}-p${p}`;
      motors[id] = motor(
        id,
        `Submersible Raw Water Tank ${tank} Pump ${p}`,
        `Raw Water Tank ${tank}`,
        "slave1",
        { auto: true, run: p === 1 },
      );
    }
  }

  motors["xfer-p1"] = motor("xfer-p1", "Submersible Transfer Pump 1", "Transfer", "slave1", {
    auto: true,
    run: true,
  });
  motors["xfer-p2"] = motor("xfer-p2", "Submersible Transfer Pump 2", "Transfer", "slave1", {
    auto: true,
    run: false,
  });

  for (const p of [1, 2, 3, 4] as const) {
    const id = `clear1-p${p}`;
    motors[id] = motor(id, `Submersible Clear Water Tank 1 Pump ${p}`, "Clear Water Tank 1", "slave1", {
      auto: true,
      run: p <= 2,
    });
  }

  for (const p of [1, 2, 3, 4] as const) {
    const id = `clear2-p${p}`;
    motors[id] = motor(id, `Submersible Clear Water Tank 2 Pump ${p}`, "Clear Water Tank 2", "slave2", {
      auto: true,
      run: p === 1,
    });
  }

  motors["s2-xfer-p1"] = motor("s2-xfer-p1", "Submersible Pump 1 (CR2)", "Control Room 2", "slave2", {
    auto: true,
    run: true,
  });
  motors["s2-xfer-p2"] = motor("s2-xfer-p2", "Submersible Pump 2 (CR2)", "Control Room 2", "slave2", {
    auto: true,
    run: false,
  });

  for (const n of [1, 2, 3, 4] as const) {
    const id = `blower-${n}`;
    motors[id] = motor(id, `Air Blower No.${n}`, "Air Blowers", "slave1", {
      auto: true,
      run: n <= 2,
    });
  }

  for (const u of [1, 2] as const) {
    for (const p of [1, 2] as const) {
      const id = `boost${u}-p${p}`;
      motors[id] = motor(id, `Booster Pump Unit ${u} Pump ${p}`, `Booster Unit ${u}`, "slave1", {
        auto: true,
        run: u === 1 && p === 1,
      });
    }
  }

  for (const u of [1, 2, 3, 4] as const) {
    for (const p of [1, 2] as const) {
      const id = `u${u}-raw-${p}`;
      motors[id] = motor(id, `Unit ${u} Raw Water Pump ${p}`, `Unit ${u}`, "slave1", {
        auto: true,
        run: p === 1 && u <= 3,
        fault: u === 4 && p === 2,
      });
    }
    motors[`u${u}-cip`] = motor(`u${u}-cip`, `Unit ${u} CIP Pump`, `Unit ${u}`, "slave1", {
      auto: true,
      run: false,
    });
    motors[`u${u}-bw`] = motor(`u${u}-bw`, `Unit ${u} Backwash Pump`, `Unit ${u}`, "slave1", {
      auto: true,
      run: u === 2,
    });
    motors[`u${u}-ozone`] = motor(`u${u}-ozone`, `Unit ${u} Ozone`, `Unit ${u}`, "slave1", {
      auto: true,
      run: u <= 3,
    });

    for (const v of [1, 2, 3, 4, 5, 6, 7] as const) {
      const id = `u${u}-sv${v}`;
      const open = v <= 3 || (u === 1 && v === 4);
      valves[id] = valve(id, `Unit ${u} UF Solenoid Valve ${v}`, `Unit ${u}`, "solenoid", "slave1", {
        open,
        close: !open,
      });
    }
  }

  valves["act-v1"] = valve(
    "act-v1",
    "Actuator Valve No.1 (Raw Water Tank 1)",
    "Raw Water Tank 1",
    "actuator",
    "slave1",
    { auto: true, open: true, close: false, fault: false },
  );
  valves["act-v2"] = valve(
    "act-v2",
    "Actuator Valve No.2 (Raw Water Tank 2)",
    "Raw Water Tank 2",
    "actuator",
    "slave1",
    { auto: true, open: true, close: false, fault: false },
  );

  const lowTanks: PlantSnapshot["lowTanks"] = {};
  const chems = [
    ["pre-cl", "pre-chlorine", "Pre Chlorine"],
    ["post-cl", "post-chlorine", "Post Chlorine"],
    ["bw-cl", "backwash-chlorine", "Backwash Chlorine"],
    ["oz-tank", "ozone", "Ozone Tank"],
  ] as const;

  for (const u of [1, 2, 3, 4] as const) {
    for (const [suffix, chem, label] of chems) {
      const id = `u${u}-${suffix}`;
      lowTanks[id] = {
        id,
        name: `Unit ${u} Low Level (${label})`,
        unitId: u,
        chemical: chem,
        lowLevel: u === 3 && suffix === "pre-cl",
        plc: "slave1",
      };
    }
  }

  const tanks: PlantSnapshot["tanks"] = {
    raw1: {
      id: "raw1",
      name: "Raw Water Tank No.1",
      kind: "raw",
      level: 72,
      capacityM3: 500,
      radarTag: "Level Raw water Tank No.1",
    },
    raw2: {
      id: "raw2",
      name: "Raw Water Tank No.2",
      kind: "raw",
      level: 68,
      capacityM3: 500,
      radarTag: "Level Raw water Tank No.2",
    },
    clear1: {
      id: "clear1",
      name: "Clear Water Tank No.1",
      kind: "clear",
      level: 81,
      capacityM3: 800,
      radarTag: "Level clear water Tank No.1",
    },
    clear2: {
      id: "clear2",
      name: "Clear Water Tank No.2",
      kind: "clear",
      level: 76,
      capacityM3: 800,
      radarTag: "Level clear water Tank No.2",
    },
  };

  const levels: PlantSnapshot["levels"] = {
    raw1: {
      id: "raw1",
      name: "Radar Raw Water Tank 1",
      tankId: "raw1",
      value: 72,
      unit: "%",
      lowAlarm: false,
      highAlarm: false,
      plc: "slave1",
    },
    raw2: {
      id: "raw2",
      name: "Radar Raw Water Tank 2",
      tankId: "raw2",
      value: 68,
      unit: "%",
      lowAlarm: false,
      highAlarm: false,
      plc: "slave1",
    },
    clear1: {
      id: "clear1",
      name: "Radar Clear Water Tank 1",
      tankId: "clear1",
      value: 81,
      unit: "%",
      lowAlarm: false,
      highAlarm: false,
      plc: "slave1",
    },
    clear2: {
      id: "clear2",
      name: "Radar Clear Water Tank 2",
      tankId: "clear2",
      value: 76,
      unit: "%",
      lowAlarm: false,
      highAlarm: false,
      plc: "slave2",
    },
  };

  return {
    motors,
    valves,
    lowTanks,
    tanks,
    levels,
    mdb1: baseMdb(0),
    mdb2: baseMdb(3.2),
    connected: true as const,
  };
}

function buildInitial(): PlantSnapshot {
  const t0 = 1_700_000_000_000;
  const core = buildPlantCore();
  const boot = bootstrapAlarmsFromPlant(core, t0 - 1000 * 60 * 12);

  const historySeed: Alarm = {
    id: "info.u2.bw.cycle",
    key: "info.u2.bw.cycle",
    severity: "info",
    area: "Unit 2",
    source: "Unit 2 Backwash Pump",
    tag: "u2-bw.RUN",
    message: "Backwash cycle completed",
    active: false,
    ack: true,
    raisedAt: t0 - 1000 * 60 * 55,
    updatedAt: t0 - 1000 * 60 * 50,
    ackedAt: t0 - 1000 * 60 * 54,
    ackedBy: "System",
    clearedAt: t0 - 1000 * 60 * 50,
    count: 1,
  };

  const histEvent: AlarmEvent = {
    id: "ev-seed-clear",
    ts: t0 - 1000 * 60 * 50,
    type: "clear",
    alarmKey: historySeed.key,
    severity: "info",
    source: historySeed.source,
    message: historySeed.message,
    note: "Seed history",
  };

  return {
    connected: true,
    tick: 0,
    lastUpdate: t0,
    tanks: core.tanks,
    motors: core.motors,
    valves: core.valves,
    levels: core.levels,
    lowTanks: core.lowTanks,
    mdb1: core.mdb1,
    mdb2: core.mdb2,
    alarms: boot.alarms,
    alarmHistory: [historySeed, ...boot.history],
    alarmEvents: [histEvent, ...boot.events],
    alarmSilencedUntil: 0,
    firstOutKey: boot.firstOutKey,
    units: UNITS,
    plantFlowM3h: 78.5,
    inletFlowM3d: 2000,
  };
}

interface ScadaStore extends PlantSnapshot {
  startSimulation: () => () => void;
  ackAlarm: (id: string) => void;
  ackAll: () => void;
  shelveAlarm: (id: string, minutes?: number) => void;
  unshelveAlarm: (id: string) => void;
  silenceHorn: (minutes?: number) => void;
  unsilenceHorn: () => void;
  toggleMotor: (id: string) => void;
  toggleValve: (id: string) => void;
  setMotorMode: (id: string, auto: boolean) => void;
  resetFault: (id: string) => void;
}

function jitter(n: number, amp: number) {
  return n + (Math.random() - 0.5) * amp;
}

export const useScadaStore = create<ScadaStore>((set) => ({
  ...buildInitial(),

  startSimulation: () => {
    const id = window.setInterval(() => {
      set((s) => {
        const motors = { ...s.motors };
        const tanks = { ...s.tanks };
        const levels = { ...s.levels };
        const valves = { ...s.valves };
        let plantFlow = 0;

        for (const m of Object.values(motors)) {
          if (m.run && !m.fault) {
            if (
              m.id.startsWith("raw") ||
              m.id.startsWith("clear") ||
              m.id.startsWith("boost") ||
              m.id.startsWith("u")
            ) {
              plantFlow += 4.2;
            }
          }
        }

        const rawOut =
          Object.values(motors).filter((m) => m.id.startsWith("raw") && m.run && !m.fault).length *
          0.035;
        const clearIn =
          Object.values(motors).filter(
            (m) => m.id.startsWith("u") && m.id.includes("-raw-") && m.run && !m.fault,
          ).length * 0.03;
        const clearOut =
          Object.values(motors).filter((m) => m.id.startsWith("clear") && m.run && !m.fault).length *
          0.028;

        tanks.raw1 = {
          ...tanks.raw1,
          level: clamp(
            tanks.raw1.level + (valves["act-v1"]?.open ? 0.08 : 0) - rawOut * 0.5 + jitter(0, 0.05),
            5,
            98,
          ),
        };
        tanks.raw2 = {
          ...tanks.raw2,
          level: clamp(
            tanks.raw2.level + (valves["act-v2"]?.open ? 0.08 : 0) - rawOut * 0.5 + jitter(0, 0.05),
            5,
            98,
          ),
        };
        tanks.clear1 = {
          ...tanks.clear1,
          level: clamp(
            tanks.clear1.level + clearIn * 0.55 - clearOut * 0.55 + jitter(0, 0.04),
            8,
            97,
          ),
        };
        tanks.clear2 = {
          ...tanks.clear2,
          level: clamp(
            tanks.clear2.level + clearIn * 0.45 - clearOut * 0.45 + jitter(0, 0.04),
            8,
            97,
          ),
        };

        for (const key of ["raw1", "raw2", "clear1", "clear2"] as const) {
          levels[key] = {
            ...levels[key],
            value: Math.round(tanks[key].level * 10) / 10,
            lowAlarm: tanks[key].level < 20,
            highAlarm: tanks[key].level > 92,
          };
        }

        if (s.tick > 0 && s.tick % 45 === 0) {
          const a = motors["u1-raw-1"];
          const b = motors["u1-raw-2"];
          if (a && b && a.auto && b.auto && !a.fault && !b.fault) {
            motors["u1-raw-1"] = { ...a, run: !a.run };
            motors["u1-raw-2"] = { ...b, run: !b.run };
          }
        }

        if (s.tick > 0 && s.tick % 30 === 0) {
          const bw = motors["u2-bw"];
          if (bw?.run) {
            motors["u2-bw"] = { ...bw, run: false };
          }
        }

        if (s.tick > 0 && s.tick % 90 === 40) {
          tanks.clear1 = { ...tanks.clear1, level: 93.5 };
          levels.clear1 = {
            ...levels.clear1,
            value: 93.5,
            highAlarm: true,
          };
        }

        const runningKw =
          Object.values(motors).filter((m) => m.run && !m.fault).length * 2.15;

        const mdb1: MdbMeter = {
          ...s.mdb1,
          currentL1: clamp(jitter(18 + runningKw * 0.55, 1.2), 0, 200),
          currentL2: clamp(jitter(17.5 + runningKw * 0.53, 1.2), 0, 200),
          currentL3: clamp(jitter(18.2 + runningKw * 0.54, 1.2), 0, 200),
          currentAvg: 0,
          voltageL1N: jitter(230.1, 0.4),
          voltageL2N: jitter(229.9, 0.4),
          voltageL3N: jitter(230.3, 0.4),
          voltageLNAvg: 0,
          voltageL1L2: jitter(399.0, 0.6),
          voltageL2L3: jitter(398.8, 0.6),
          voltageL1L3: jitter(399.2, 0.6),
          voltageLLAvg: 0,
          kWTotal: clamp(jitter(runningKw * 0.62, 0.8), 0, 500),
          kVarTotal: clamp(jitter(runningKw * 0.12, 0.3), 0, 200),
          kVATotal: 0,
          pfAvg: clamp(jitter(0.96, 0.01), 0.7, 1),
          frequency: clamp(jitter(50.0, 0.03), 49.5, 50.5),
          kWh: s.mdb1.kWh + (runningKw * 0.62) / 3600,
        };
        mdb1.currentAvg = (mdb1.currentL1 + mdb1.currentL2 + mdb1.currentL3) / 3;
        mdb1.voltageLNAvg = (mdb1.voltageL1N + mdb1.voltageL2N + mdb1.voltageL3N) / 3;
        mdb1.voltageLLAvg = (mdb1.voltageL1L2 + mdb1.voltageL2L3 + mdb1.voltageL1L3) / 3;
        mdb1.kVATotal = Math.sqrt(mdb1.kWTotal ** 2 + mdb1.kVarTotal ** 2);

        const mdb2: MdbMeter = {
          ...s.mdb2,
          currentL1: clamp(jitter(14 + runningKw * 0.35, 1), 0, 200),
          currentL2: clamp(jitter(13.8 + runningKw * 0.34, 1), 0, 200),
          currentL3: clamp(jitter(14.2 + runningKw * 0.36, 1), 0, 200),
          currentAvg: 0,
          voltageL1N: jitter(230.0, 0.35),
          voltageL2N: jitter(230.2, 0.35),
          voltageL3N: jitter(229.9, 0.35),
          voltageLNAvg: 0,
          voltageL1L2: jitter(398.9, 0.5),
          voltageL2L3: jitter(399.1, 0.5),
          voltageL1L3: jitter(399.0, 0.5),
          voltageLLAvg: 0,
          kWTotal: clamp(jitter(runningKw * 0.38, 0.6), 0, 500),
          kVarTotal: clamp(jitter(runningKw * 0.09, 0.2), 0, 200),
          kVATotal: 0,
          pfAvg: clamp(jitter(0.95, 0.01), 0.7, 1),
          frequency: clamp(jitter(50.0, 0.03), 49.5, 50.5),
          kWh: s.mdb2.kWh + (runningKw * 0.38) / 3600,
        };
        mdb2.currentAvg = (mdb2.currentL1 + mdb2.currentL2 + mdb2.currentL3) / 3;
        mdb2.voltageLNAvg = (mdb2.voltageL1N + mdb2.voltageL2N + mdb2.voltageL3N) / 3;
        mdb2.voltageLLAvg = (mdb2.voltageL1L2 + mdb2.voltageL2L3 + mdb2.voltageL1L3) / 3;
        mdb2.kVATotal = Math.sqrt(mdb2.kWTotal ** 2 + mdb2.kVarTotal ** 2);

        const now = Date.now();
        const plantSlice = {
          motors,
          valves,
          tanks,
          lowTanks: s.lowTanks,
          mdb1,
          mdb2,
          connected: true,
        };
        const conditions = evaluateConditions(plantSlice, s.alarms);
        const scan = processAlarmScan(s.alarms, s.alarmHistory, s.alarmEvents, conditions, now);

        return {
          tick: s.tick + 1,
          lastUpdate: now,
          motors,
          tanks,
          levels,
          valves,
          mdb1,
          mdb2,
          plantFlowM3h: clamp(jitter(plantFlow, 1.5), 0, 250),
          alarms: scan.alarms,
          alarmHistory: scan.history,
          alarmEvents: scan.events,
          firstOutKey: scan.firstOutKey ?? s.firstOutKey,
          connected: true,
        };
      });
    }, 1000);

    return () => window.clearInterval(id);
  },

  ackAlarm: (id) =>
    set((s) => {
      const r = ackAlarmRecord(s.alarms, s.alarmHistory, s.alarmEvents, id, Date.now());
      return { alarms: r.alarms, alarmHistory: r.history, alarmEvents: r.events };
    }),

  ackAll: () =>
    set((s) => {
      const r = ackAllRecords(s.alarms, s.alarmHistory, s.alarmEvents, Date.now());
      return { alarms: r.alarms, alarmHistory: r.history, alarmEvents: r.events };
    }),

  shelveAlarm: (id, minutes = 15) =>
    set((s) => {
      const r = shelveAlarmRecord(s.alarms, s.alarmEvents, id, Date.now(), minutes * 60 * 1000);
      return { alarms: r.alarms, alarmEvents: r.events };
    }),

  unshelveAlarm: (id) =>
    set((s) => {
      const r = unshelveAlarmRecord(s.alarms, s.alarmEvents, id, Date.now());
      return { alarms: r.alarms, alarmEvents: r.events };
    }),

  silenceHorn: (minutes = 5) =>
    set((s) => {
      const now = Date.now();
      const until = now + minutes * 60 * 1000;
      const ev: AlarmEvent = {
        id: `ev-silence-${now}`,
        ts: now,
        type: "silence",
        alarmKey: "*",
        severity: "info",
        source: "Annunciator",
        message: `Horn silenced for ${minutes} min`,
        note: "Operator",
      };
      return {
        alarmSilencedUntil: until,
        alarmEvents: [ev, ...s.alarmEvents].slice(0, 200),
      };
    }),

  unsilenceHorn: () =>
    set((s) => {
      const now = Date.now();
      const ev: AlarmEvent = {
        id: `ev-unsilence-${now}`,
        ts: now,
        type: "unsilence",
        alarmKey: "*",
        severity: "info",
        source: "Annunciator",
        message: "Horn silence cancelled",
        note: "Operator",
      };
      return {
        alarmSilencedUntil: 0,
        alarmEvents: [ev, ...s.alarmEvents].slice(0, 200),
      };
    }),

  toggleMotor: (id) =>
    set((s) => {
      const m = s.motors[id];
      if (!m || m.fault) return s;
      return {
        motors: {
          ...s.motors,
          [id]: { ...m, run: !m.run },
        },
      };
    }),

  toggleValve: (id) =>
    set((s) => {
      const v = s.valves[id];
      if (!v || v.fault) return s;
      const open = !v.open;
      return {
        valves: {
          ...s.valves,
          [id]: { ...v, open, close: !open },
        },
      };
    }),

  setMotorMode: (id, auto) =>
    set((s) => {
      const m = s.motors[id];
      if (!m) return s;
      return { motors: { ...s.motors, [id]: { ...m, auto } } };
    }),

  resetFault: (id) =>
    set((s) => {
      const m = s.motors[id];
      if (!m) return s;
      const motors = { ...s.motors, [id]: { ...m, fault: false, run: false } };
      const now = Date.now();
      const plantSlice = {
        motors,
        valves: s.valves,
        tanks: s.tanks,
        lowTanks: s.lowTanks,
        mdb1: s.mdb1,
        mdb2: s.mdb2,
        connected: s.connected,
      };
      const conditions = evaluateConditions(plantSlice, s.alarms);
      const scan = processAlarmScan(s.alarms, s.alarmHistory, s.alarmEvents, conditions, now);
      return {
        motors,
        alarms: scan.alarms,
        alarmHistory: scan.history,
        alarmEvents: scan.events,
      };
    }),
}));

export function motorStatus(m: MotorDevice): "run" | "stop" | "fault" {
  if (m.fault) return "fault";
  if (m.run) return "run";
  return "stop";
}

export function valveStatus(v: ValveDevice): "open" | "close" | "fault" | "transit" {
  if (v.fault) return "fault";
  if (v.open && !v.close) return "open";
  if (!v.open && v.close) return "close";
  return "transit";
}

export function countByStatus(motors: Record<string, MotorDevice>) {
  let run = 0;
  let stop = 0;
  let fault = 0;
  for (const m of Object.values(motors)) {
    if (m.fault) fault++;
    else if (m.run) run++;
    else stop++;
  }
  return { run, stop, fault, total: run + stop + fault };
}

export {
  countAlarmSummary,
  shouldAnnunciate,
  deriveAlarmState,
  needsOperatorAttention,
  sortAlarms,
} from "./alarm-engine";
