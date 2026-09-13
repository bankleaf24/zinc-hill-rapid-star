import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { ArrowLeft, Beaker } from "lucide-react";
import { ScadaShell } from "@/components/scada/ScadaShell";
import { MotorCard } from "@/components/scada/MotorCard";
import { ValveCard } from "@/components/scada/ValveCard";
import { StatusBadge } from "@/components/scada/StatusBadge";
import { useScadaStore } from "@/lib/scada-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/units/$unitId")({ component: UnitDetailPage });

function UnitDetailPage() {
  const { unitId } = Route.useParams();
  const id = Number(unitId);
  const units = useScadaStore((s) => s.units);
  const motors = useScadaStore((s) => s.motors);
  const valves = useScadaStore((s) => s.valves);
  const lowTanks = useScadaStore((s) => s.lowTanks);
  const toggleMotor = useScadaStore((s) => s.toggleMotor);
  const toggleValve = useScadaStore((s) => s.toggleValve);
  const setMotorMode = useScadaStore((s) => s.setMotorMode);
  const resetFault = useScadaStore((s) => s.resetFault);

  const unit = units.find((u) => u.id === id);
  if (!unit || Number.isNaN(id) || id < 1 || id > 4) {
    return <Navigate to="/units" />;
  }

  const motorIds = [...unit.rawPumps, unit.cipPump, unit.backwashPump, unit.ozone];

  return (
    <ScadaShell>
      <div className="space-y-4 p-3 sm:p-4 lg:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Link
              to="/units"
              className="mb-2 inline-flex items-center gap-1 text-xs text-fg-muted hover:text-primary"
            >
              <ArrowLeft className="size-3.5" /> All units
            </Link>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
              Water Treatment Unit {unit.id}
            </h1>
            <p className="mt-0.5 text-sm text-fg-muted">
              UF process equipment · PLC Slave 1 tags · AUTO / RUN / FAULT + valve OPEN / CLOSE
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[1, 2, 3, 4].map((n) => (
              <Link
                key={n}
                to="/units/$unitId"
                params={{ unitId: String(n) }}
                className={cn(
                  "rounded-[var(--radius-sm)] border px-3 py-1.5 text-xs font-medium",
                  n === id
                    ? "border-primary/40 bg-primary/15 text-primary"
                    : "border-border text-fg-muted hover:bg-surface-2",
                )}
              >
                Unit {n}
              </Link>
            ))}
          </div>
        </div>

        {/* Unit process strip */}
        <div className="panel overflow-x-auto p-4">
          <div className="flex min-w-[640px] items-center justify-between gap-2">
            <Stage label="Raw feed" detail="Pumps" active={unit.rawPumps.some((p) => motors[p]?.run)} />
            <Arrow />
            <Stage
              label="UF membranes"
              detail={`${unit.solenoidValves.filter((v) => valves[v]?.open).length}/7 SV open`}
              active={unit.solenoidValves.some((v) => valves[v]?.open)}
            />
            <Arrow />
            <Stage label="Ozone" detail={motors[unit.ozone]?.run ? "ON" : "OFF"} active={!!motors[unit.ozone]?.run} />
            <Arrow />
            <Stage
              label="Chemicals"
              detail="Cl₂ dosing"
              active={!unit.lowTanks.some((t) => lowTanks[t]?.lowLevel)}
              warn={unit.lowTanks.some((t) => lowTanks[t]?.lowLevel)}
            />
            <Arrow />
            <Stage
              label="CIP / BW"
              detail={
                motors[unit.cipPump]?.run
                  ? "CIP RUN"
                  : motors[unit.backwashPump]?.run
                    ? "BW RUN"
                    : "Standby"
              }
              active={!!(motors[unit.cipPump]?.run || motors[unit.backwashPump]?.run)}
            />
          </div>
        </div>

        <section>
          <h2 className="mb-2 text-sm font-semibold">Motors & ozone</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {motorIds.map((mid) => {
              const m = motors[mid];
              if (!m) return null;
              return (
                <MotorCard
                  key={mid}
                  motor={m}
                  onToggle={() => toggleMotor(mid)}
                  onMode={(auto) => setMotorMode(mid, auto)}
                  onReset={() => resetFault(mid)}
                />
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold">UF solenoid valves (1–7)</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {unit.solenoidValves.map((vid) => {
              const v = valves[vid];
              if (!v) return null;
              return <ValveCard key={vid} valve={v} onToggle={() => toggleValve(vid)} />;
            })}
          </div>
        </section>

        <section>
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <Beaker className="size-4 text-primary" />
            Low-level chemical / ozone tanks
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {unit.lowTanks.map((tid) => {
              const t = lowTanks[tid];
              if (!t) return null;
              return (
                <div
                  key={tid}
                  className={cn(
                    "panel p-3",
                    t.lowLevel && "border-warn/40",
                  )}
                >
                  <div className="text-sm font-medium">{t.name}</div>
                  <div className="mt-2">
                    <StatusBadge
                      status={t.lowLevel ? "warn" : "ok"}
                      label={t.lowLevel ? "LOW LEVEL" : "LEVEL OK"}
                    />
                  </div>
                  <div className="mt-2 text-[11px] text-fg-subtle">
                    Tag: Low Level · BIT · PLC Slave 1
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </ScadaShell>
  );
}

function Stage({
  label,
  detail,
  active,
  warn,
}: {
  label: string;
  detail: string;
  active?: boolean;
  warn?: boolean;
}) {
  return (
    <div
      className={cn(
        "min-w-[6.5rem] flex-1 rounded-[var(--radius-md)] border px-3 py-3 text-center",
        warn
          ? "border-warn/40 bg-warn/10"
          : active
            ? "border-run/35 bg-run/10"
            : "border-border bg-surface-2",
      )}
    >
      <div className="text-xs font-semibold">{label}</div>
      <div className={cn("mt-1 text-[11px]", warn ? "text-warn" : active ? "text-run" : "text-fg-muted")}>
        {detail}
      </div>
    </div>
  );
}

function Arrow() {
  return <div className="h-px w-4 shrink-0 bg-border sm:w-6" aria-hidden />;
}
