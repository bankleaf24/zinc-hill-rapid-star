import { createFileRoute } from "@tanstack/react-router";
import {
  Bell,
  BellOff,
  CheckCheck,
  Clock3,
  Filter,
  History,
  ListTree,
  Pause,
  Play,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useMemo, useState } from "react";
import { AlarmStateBadge, SeverityBadge } from "@/components/scada/AlarmStateBadge";
import { ScadaShell } from "@/components/scada/ScadaShell";
import { Button } from "@/components/ui/button";
import {
  countAlarmSummary,
  deriveAlarmState,
  needsOperatorAttention,
  shouldAnnunciate,
  sortAlarms,
  useScadaStore,
} from "@/lib/scada-store";
import type { Alarm, AlarmEvent, AlarmSeverity, AlarmState } from "@/lib/scada-types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/alarms")({ component: AlarmsPage });

type Tab = "active" | "history" | "events" | "logic";
type SevFilter = "all" | AlarmSeverity;
type StateFilter = "all" | AlarmState;

function formatTs(ts: number) {
  return new Date(ts).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function AlarmsPage() {
  const alarms = useScadaStore((s) => s.alarms);
  const history = useScadaStore((s) => s.alarmHistory);
  const events = useScadaStore((s) => s.alarmEvents);
  const firstOutKey = useScadaStore((s) => s.firstOutKey);
  const silencedUntil = useScadaStore((s) => s.alarmSilencedUntil);
  const ackAlarm = useScadaStore((s) => s.ackAlarm);
  const ackAll = useScadaStore((s) => s.ackAll);
  const shelveAlarm = useScadaStore((s) => s.shelveAlarm);
  const unshelveAlarm = useScadaStore((s) => s.unshelveAlarm);
  const silenceHorn = useScadaStore((s) => s.silenceHorn);
  const unsilenceHorn = useScadaStore((s) => s.unsilenceHorn);
  const resetFault = useScadaStore((s) => s.resetFault);
  const motors = useScadaStore((s) => s.motors);

  const [tab, setTab] = useState<Tab>("active");
  const [sev, setSev] = useState<SevFilter>("all");
  const [stateF, setStateF] = useState<StateFilter>("all");
  const [area, setArea] = useState<string>("all");
  const [now] = useState(() => Date.now());
  // re-render-ish via store tick for live times
  const tick = useScadaStore((s) => s.tick);
  const liveNow = tick > 0 ? Date.now() : now;

  const summary = countAlarmSummary(alarms, liveNow);
  const silenced = silencedUntil > liveNow;
  const horn = shouldAnnunciate(alarms, silenced, liveNow);

  const areas = useMemo(() => {
    const set = new Set<string>();
    for (const a of alarms) set.add(a.area);
    for (const a of history) set.add(a.area);
    return ["all", ...[...set].sort()];
  }, [alarms, history]);

  const filteredActive = useMemo(() => {
    return sortAlarms(alarms, liveNow).filter((a) => {
      const st = deriveAlarmState(a, liveNow);
      if (sev !== "all" && a.severity !== sev) return false;
      if (stateF !== "all" && st !== stateF) return false;
      if (area !== "all" && a.area !== area) return false;
      return true;
    });
  }, [alarms, sev, stateF, area, liveNow]);

  const filteredHistory = useMemo(() => {
    return history.filter((a) => {
      if (sev !== "all" && a.severity !== sev) return false;
      if (area !== "all" && a.area !== area) return false;
      return true;
    });
  }, [history, sev, area]);

  return (
    <ScadaShell>
      <div className="space-y-4 p-3 sm:p-4 lg:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Alarm handling</h1>
            <p className="mt-0.5 max-w-2xl text-sm text-fg-muted">
              ISA-18.2 style lifecycle: raise → acknowledge → return-to-normal → clear. Includes
              hysteresis, shelve, silence, first-out, and event audit trail.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={horn ? "danger" : "secondary"}
              onClick={() => (silenced ? unsilenceHorn() : silenceHorn(5))}
            >
              {silenced ? <VolumeX className="size-3.5" /> : <Volume2 className="size-3.5" />}
              {silenced ? "Unsilence" : "Silence 5m"}
            </Button>
            <Button size="sm" variant="secondary" onClick={ackAll} disabled={summary.unack === 0}>
              <CheckCheck className="size-3.5" />
              Ack all ({summary.unack})
            </Button>
          </div>
        </div>

        {/* Annunciator strip */}
        <div
          className={cn(
            "panel flex flex-wrap items-center gap-3 px-4 py-3",
            horn && "border-fault/50 bg-fault/10",
            !horn && summary.unack > 0 && "border-warn/40 bg-warn/5",
          )}
        >
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-[var(--radius-sm)] border",
              horn
                ? "border-fault/50 bg-fault/20 text-fault"
                : summary.unack
                  ? "border-warn/40 bg-warn/15 text-warn"
                  : "border-border bg-surface-2 text-fg-muted",
            )}
          >
            {horn ? <Bell className="size-5 animate-pulse" /> : <BellOff className="size-5" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold">
              {horn
                ? "HORN · critical unacknowledged"
                : summary.unack > 0
                  ? `${summary.unack} alarm(s) need attention`
                  : "No unacknowledged alarms"}
            </div>
            <div className="text-[11px] text-fg-subtle">
              Active {summary.active} · Critical {summary.critical} · Shelved {summary.shelved}
              {firstOutKey ? ` · First-out: ${firstOutKey}` : ""}
              {silenced ? " · Horn silenced" : ""}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-center">
            <Kpi n={summary.unack} label="Unack" tone={summary.unack ? "fault" : undefined} />
            <Kpi n={summary.active} label="Active" tone={summary.active ? "warn" : undefined} />
            <Kpi n={summary.critical} label="Critical" tone={summary.critical ? "fault" : undefined} />
            <Kpi n={summary.shelved} label="Shelved" />
          </div>
        </div>

        {/* Tabs + filters */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-1 rounded-[var(--radius-md)] border border-border bg-surface p-1">
            {(
              [
                ["active", "Active", ListTree],
                ["history", "History", History],
                ["events", "Events", Clock3],
                ["logic", "Logic", Filter],
              ] as const
            ).map(([id, label, Icon]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] px-3 py-1.5 text-xs font-medium",
                  tab === id ? "bg-primary/15 text-primary" : "text-fg-muted hover:text-fg",
                )}
              >
                <Icon className="size-3.5" />
                {label}
              </button>
            ))}
          </div>

          {tab !== "logic" && tab !== "events" && (
            <div className="flex flex-wrap gap-2">
              <Select
                value={sev}
                onChange={(v) => setSev(v as SevFilter)}
                options={[
                  ["all", "All severity"],
                  ["critical", "Critical"],
                  ["high", "High"],
                  ["warning", "Warning"],
                  ["info", "Info"],
                ]}
              />
              {tab === "active" && (
                <Select
                  value={stateF}
                  onChange={(v) => setStateF(v as StateFilter)}
                  options={[
                    ["all", "All states"],
                    ["active_unack", "UNACK"],
                    ["active_ack", "ACK active"],
                    ["rtn_unack", "RTN unack"],
                    ["shelved", "Shelved"],
                  ]}
                />
              )}
              <Select
                value={area}
                onChange={setArea}
                options={areas.map((a) => [a, a === "all" ? "All areas" : a])}
              />
            </div>
          )}
        </div>

        {tab === "active" && (
          <ActiveTable
            rows={filteredActive}
            liveNow={liveNow}
            firstOutKey={firstOutKey}
            onAck={ackAlarm}
            onShelve={(id) => shelveAlarm(id, 15)}
            onUnshelve={unshelveAlarm}
            onResetMotor={(alarm) => {
              // If this is a motor fault key, reset the underlying FAULT bit
              const m = Object.values(motors).find((x) => alarm.key === `motor.fault.${x.id}`);
              if (m) resetFault(m.id);
              else ackAlarm(alarm.id);
            }}
          />
        )}

        {tab === "history" && <HistoryTable rows={filteredHistory} />}
        {tab === "events" && <EventsTable rows={events} />}
        {tab === "logic" && <LogicPanel />}
      </div>
    </ScadaShell>
  );
}

function Kpi({ n, label, tone }: { n: number; label: string; tone?: "fault" | "warn" }) {
  return (
    <div className="min-w-[3.5rem] rounded-[var(--radius-sm)] border border-border bg-bg px-2.5 py-1.5">
      <div
        className={cn(
          "font-mono text-sm font-semibold tabular",
          tone === "fault" && "text-fault",
          tone === "warn" && "text-warn",
        )}
      >
        {n}
      </div>
      <div className="text-[10px] uppercase tracking-wide text-fg-subtle">{label}</div>
    </div>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<[string, string] | string[]>;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 rounded-[var(--radius-sm)] border border-border bg-surface-2 px-2 text-xs text-fg"
    >
      {options.map((o) => {
        const [v, l] = o;
        return (
          <option key={v} value={v}>
            {l}
          </option>
        );
      })}
    </select>
  );
}

function ActiveTable({
  rows,
  liveNow,
  firstOutKey,
  onAck,
  onShelve,
  onUnshelve,
  onResetMotor,
}: {
  rows: Alarm[];
  liveNow: number;
  firstOutKey?: string;
  onAck: (id: string) => void;
  onShelve: (id: string) => void;
  onUnshelve: (id: string) => void;
  onResetMotor: (a: Alarm) => void;
}) {
  return (
    <div className="panel overflow-hidden">
      <div className="hidden grid-cols-[6.5rem_5.5rem_5.5rem_7rem_1fr_1.1fr_9rem] gap-2 border-b border-border bg-surface-2 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-fg-subtle xl:grid">
        <span>Time</span>
        <span>Severity</span>
        <span>State</span>
        <span>Area</span>
        <span>Source / tag</span>
        <span>Message</span>
        <span>Actions</span>
      </div>
      <div className="divide-y divide-border">
        {rows.length === 0 && (
          <div className="px-4 py-12 text-center text-sm text-fg-muted">
            No alarms match the current filters.
          </div>
        )}
        {rows.map((a) => {
          const st = deriveAlarmState(a, liveNow);
          const unack = needsOperatorAttention(a, liveNow);
          const isFO = firstOutKey === a.key;
          const isMotorFault = a.key.startsWith("motor.fault.");
          return (
            <div
              key={a.id}
              className={cn(
                "grid gap-2 px-3 py-3 xl:grid-cols-[6.5rem_5.5rem_5.5rem_7rem_1fr_1.1fr_9rem] xl:items-center",
                unack && "bg-fault/5",
                isFO && "ring-1 ring-inset ring-fault/40",
              )}
            >
              <div className="font-mono text-[11px] text-fg-subtle tabular">
                {formatTs(a.raisedAt)}
                {a.count > 1 && (
                  <div className="text-[10px] text-warn">×{a.count} trips</div>
                )}
              </div>
              <div className="flex flex-wrap gap-1">
                <SeverityBadge severity={a.severity} />
                {isFO && (
                  <span className="rounded-full bg-fault px-1.5 py-0.5 text-[9px] font-bold text-white">
                    FO
                  </span>
                )}
              </div>
              <AlarmStateBadge alarm={a} now={liveNow} />
              <div className="text-xs text-fg-muted">{a.area}</div>
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{a.source}</div>
                <div className="truncate font-mono text-[10px] text-fg-subtle">{a.tag}</div>
                {a.valueText && (
                  <div className="font-mono text-[11px] text-water tabular">{a.valueText}</div>
                )}
              </div>
              <div className="text-xs text-fg-muted">{a.message}</div>
              <div className="flex flex-wrap gap-1">
                {unack && (
                  <Button size="sm" variant="outline" onClick={() => onAck(a.id)}>
                    Ack
                  </Button>
                )}
                {st === "shelved" ? (
                  <Button size="sm" variant="ghost" onClick={() => onUnshelve(a.id)}>
                    <Play className="size-3.5" />
                    Unshelve
                  </Button>
                ) : (
                  a.active && (
                    <Button size="sm" variant="ghost" onClick={() => onShelve(a.id)}>
                      <Pause className="size-3.5" />
                      Shelve
                    </Button>
                  )
                )}
                {isMotorFault && a.active && (
                  <Button size="sm" variant="danger" onClick={() => onResetMotor(a)}>
                    Reset fault
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HistoryTable({ rows }: { rows: Alarm[] }) {
  return (
    <div className="panel overflow-hidden">
      <div className="divide-y divide-border">
        {rows.length === 0 && (
          <div className="px-4 py-12 text-center text-sm text-fg-muted">No history yet.</div>
        )}
        {rows.map((a) => (
          <div key={`${a.id}-${a.raisedAt}`} className="grid gap-1 px-4 py-3 sm:grid-cols-[8rem_1fr_1fr]">
            <div className="font-mono text-[11px] text-fg-subtle">{formatTs(a.raisedAt)}</div>
            <div>
              <div className="flex flex-wrap items-center gap-1.5">
                <SeverityBadge severity={a.severity} />
                <span className="text-sm font-medium">{a.source}</span>
              </div>
              <div className="text-xs text-fg-muted">{a.message}</div>
            </div>
            <div className="text-[11px] text-fg-subtle">
              Cleared {a.clearedAt ? formatTs(a.clearedAt) : "—"}
              {a.ackedBy ? ` · Ack by ${a.ackedBy}` : ""}
              {a.count > 1 ? ` · ${a.count} trips` : ""}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EventsTable({ rows }: { rows: AlarmEvent[] }) {
  return (
    <div className="panel overflow-hidden">
      <div className="divide-y divide-border">
        {rows.length === 0 && (
          <div className="px-4 py-12 text-center text-sm text-fg-muted">No events.</div>
        )}
        {rows.slice(0, 80).map((e) => (
          <div
            key={e.id}
            className="grid gap-1 px-4 py-2.5 sm:grid-cols-[8rem_5rem_1fr_1fr] sm:items-center"
          >
            <div className="font-mono text-[11px] text-fg-subtle tabular">{formatTs(e.ts)}</div>
            <EventType type={e.type} />
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{e.source}</div>
              <div className="truncate font-mono text-[10px] text-fg-subtle">{e.alarmKey}</div>
            </div>
            <div className="text-xs text-fg-muted">
              {e.message}
              {e.note ? <span className="text-fg-subtle"> · {e.note}</span> : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EventType({ type }: { type: AlarmEvent["type"] }) {
  const color: Record<AlarmEvent["type"], string> = {
    raise: "text-fault",
    retrip: "text-fault",
    ack: "text-run",
    rtn: "text-water",
    clear: "text-fg-muted",
    shelve: "text-manual",
    unshelve: "text-auto",
    silence: "text-warn",
    unsilence: "text-warn",
  };
  return (
    <span className={cn("font-mono text-[11px] font-semibold uppercase", color[type])}>{type}</span>
  );
}

function LogicPanel() {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <section className="panel p-4">
        <h2 className="mb-3 text-sm font-semibold">State machine</h2>
        <ol className="space-y-2 text-xs text-fg-muted">
          <li>
            <span className="font-semibold text-fg">1. Evaluate</span> — each scan reads PLC tags
            (FAULT, radar WORD, Low Level BIT, MDB WORD) and builds condition list.
          </li>
          <li>
            <span className="font-semibold text-fg">2. Raise</span> — condition false→true creates
            ACTIVE_UNACK (flash + horn if critical). First critical sets First-Out.
          </li>
          <li>
            <span className="font-semibold text-fg">3. Acknowledge</span> — operator Ack → ACTIVE_ACK
            (steady). Ack all for batch.
          </li>
          <li>
            <span className="font-semibold text-fg">4. Return-to-normal (RTN)</span> — condition
            true→false. If already acked → HISTORY. If not → RTN_UNACK until Ack.
          </li>
          <li>
            <span className="font-semibold text-fg">5. Shelve</span> — temporary suppress (default 15
            min) without clearing the process condition.
          </li>
          <li>
            <span className="font-semibold text-fg">6. Silence</span> — mutes horn only; does not
            acknowledge.
          </li>
        </ol>
      </section>

      <section className="panel p-4">
        <h2 className="mb-3 text-sm font-semibold">Configured rules</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[28rem] text-left text-xs">
            <thead className="text-[10px] uppercase tracking-wide text-fg-subtle">
              <tr className="border-b border-border">
                <th className="py-1.5 pr-2 font-medium">Condition</th>
                <th className="py-1.5 pr-2 font-medium">Severity</th>
                <th className="py-1.5 font-medium">Trip / clear</th>
              </tr>
            </thead>
            <tbody className="text-fg-muted">
              <Tr c="Motor FAULT bit" s="Critical" t="BIT = 1 / BIT = 0" />
              <Tr c="Valve FAULT bit" s="High" t="BIT = 1 / BIT = 0" />
              <Tr c="Tank radar low" s="Warning" t="≤ 20% / ≥ 23% (hysteresis)" />
              <Tr c="Tank radar high" s="High" t="≥ 92% / ≤ 89% (hysteresis)" />
              <Tr c="Chem / ozone Low Level" s="Warning" t="BIT = 1 / BIT = 0" />
              <Tr c="MDB undervoltage L-N avg" s="Critical" t="< 210 V / ≥ 215 V" />
              <Tr c="MDB overcurrent avg" s="High" t="> 120 A / ≤ 110 A" />
              <Tr c="MDB frequency band" s="Warning" t="outside 49.5–50.5 Hz" />
              <Tr c="MDB power factor" s="Info" t="< 0.85" />
              <Tr c="Plant communication" s="Critical" t="link down" />
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel p-4 lg:col-span-2">
        <h2 className="mb-2 text-sm font-semibold">Operator guidance</h2>
        <div className="grid gap-3 sm:grid-cols-3 text-xs text-fg-muted">
          <div className="rounded-[var(--radius-sm)] border border-border bg-surface-2 p-3">
            <div className="mb-1 font-semibold text-fg">Critical unack</div>
            Silence horn if needed → inspect source → correct process (e.g. Reset fault) → Ack when
            understood. FO marks first critical this session.
          </div>
          <div className="rounded-[var(--radius-sm)] border border-border bg-surface-2 p-3">
            <div className="mb-1 font-semibold text-fg">Level / chem warnings</div>
            Check tank mimic and dosing inventory. Hysteresis prevents chatter around the trip
            band. RTN auto-clears only after Ack if still unacked at RTN.
          </div>
          <div className="rounded-[var(--radius-sm)] border border-border bg-surface-2 p-3">
            <div className="mb-1 font-semibold text-fg">Shelve</div>
            Use only for known nuisance while work is in progress. Timer expires and re-exposes the
            alarm if still active.
          </div>
        </div>
      </section>
    </div>
  );
}

function Tr({ c, s, t }: { c: string; s: string; t: string }) {
  return (
    <tr className="border-b border-border/70">
      <td className="py-1.5 pr-2 text-fg">{c}</td>
      <td className="py-1.5 pr-2">{s}</td>
      <td className="py-1.5 font-mono text-[11px]">{t}</td>
    </tr>
  );
}
