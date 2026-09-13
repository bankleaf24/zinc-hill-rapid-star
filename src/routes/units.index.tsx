import { createFileRoute, Link } from "@tanstack/react-router";
import { ScadaShell } from "@/components/scada/ScadaShell";
import { StatusBadge } from "@/components/scada/StatusBadge";
import { useScadaStore } from "@/lib/scada-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/units/")({ component: UnitsPage });

function UnitsPage() {
  const units = useScadaStore((s) => s.units);
  const motors = useScadaStore((s) => s.motors);
  const valves = useScadaStore((s) => s.valves);
  const lowTanks = useScadaStore((s) => s.lowTanks);

  return (
    <ScadaShell>
      <div className="space-y-4 p-3 sm:p-4 lg:p-5">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-primary">
            InfoU · Equipment graphics
          </div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">UF Treatment Units</h1>
          <p className="mt-0.5 text-sm text-fg-muted">
            Four ultrafiltration trains — raw feed, CIP/backwash, solenoid valves 1–7, ozone, chemical
            low-level tanks (PLC Slave 1 tags).
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {units.map((unit) => {
            const raw = unit.rawPumps.map((id) => motors[id]).filter(Boolean);
            const run = raw.some((m) => m.run && !m.fault);
            const fault =
              raw.some((m) => m.fault) ||
              motors[unit.cipPump]?.fault ||
              motors[unit.backwashPump]?.fault;
            const openValves = unit.solenoidValves.filter((id) => valves[id]?.open).length;
            const lowChem = unit.lowTanks.filter((id) => lowTanks[id]?.lowLevel).length;
            const ozone = motors[unit.ozone];

            return (
              <Link
                key={unit.id}
                to="/units/$unitId"
                params={{ unitId: String(unit.id) }}
                className={cn(
                  "panel group flex flex-col gap-3 overflow-hidden transition-colors hover:border-primary/50",
                  fault && "border-fault/50",
                )}
              >
                <div className="infou-chrome flex items-start justify-between gap-2 px-3 py-2">
                  <div>
                    <div className="text-[10px] font-medium uppercase tracking-wide text-sky-200/80">
                      UF graphic
                    </div>
                    <h2 className="text-lg font-semibold text-white">Unit {unit.id}</h2>
                  </div>
                  <StatusBadge
                    status={fault ? "fault" : run ? "run" : "stop"}
                    label={fault ? "FAULT" : run ? "RUN" : "IDLE"}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 px-3 text-xs">
                  <Stat label="Raw pumps" value={`${raw.filter((m) => m.run).length}/${raw.length}`} />
                  <Stat label="SV open" value={`${openValves}/7`} />
                  <Stat
                    label="Ozone"
                    value={ozone?.fault ? "FAULT" : ozone?.run ? "RUN" : "STOP"}
                    tone={ozone?.fault ? "fault" : ozone?.run ? "run" : undefined}
                  />
                  <Stat label="Chem low" value={String(lowChem)} tone={lowChem ? "warn" : undefined} />
                </div>

                <div className="mt-auto flex gap-1 px-3 pb-1">
                  {unit.solenoidValves.map((id) => (
                    <div
                      key={id}
                      className={cn(
                        "h-1.5 flex-1 rounded-full",
                        valves[id]?.open ? "bg-water" : "bg-border",
                      )}
                      title={valves[id]?.name}
                    />
                  ))}
                </div>
                <div className="border-t border-border px-3 py-2 text-[11px] text-primary group-hover:underline">
                  Open unit detail graphic
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </ScadaShell>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "run" | "fault" | "warn";
}) {
  return (
    <div className="rounded-[var(--radius-sm)] border border-border bg-surface-2 px-2.5 py-2">
      <div className="text-[10px] uppercase tracking-wide text-fg-subtle">{label}</div>
      <div
        className={cn(
          "mt-0.5 font-mono text-sm font-semibold tabular",
          tone === "run" && "text-run",
          tone === "fault" && "text-fault",
          tone === "warn" && "text-warn",
          !tone && "text-fg",
        )}
      >
        {value}
      </div>
    </div>
  );
}
