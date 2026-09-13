import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { ScadaShell } from "@/components/scada/ScadaShell";
import { LevelGauge } from "@/components/scada/LevelGauge";
import { MotorCard } from "@/components/scada/MotorCard";
import { ValveCard } from "@/components/scada/ValveCard";
import { StatusBadge } from "@/components/scada/StatusBadge";
import { useScadaStore } from "@/lib/scada-store";
import { fmt } from "@/lib/utils";

export const Route = createFileRoute("/tanks/$tankId")({ component: TankDetailPage });

const TANK_META: Record<
  string,
  { motorPrefix: string; pumpCount: number; valveId?: string; plc: string }
> = {
  raw1: { motorPrefix: "raw1-p", pumpCount: 3, valveId: "act-v1", plc: "Slave 1" },
  raw2: { motorPrefix: "raw2-p", pumpCount: 3, valveId: "act-v2", plc: "Slave 1" },
  clear1: { motorPrefix: "clear1-p", pumpCount: 4, plc: "Slave 1" },
  clear2: { motorPrefix: "clear2-p", pumpCount: 4, plc: "Slave 2" },
};

function TankDetailPage() {
  const { tankId } = Route.useParams();
  const tanks = useScadaStore((s) => s.tanks);
  const levels = useScadaStore((s) => s.levels);
  const motors = useScadaStore((s) => s.motors);
  const valves = useScadaStore((s) => s.valves);
  const toggleMotor = useScadaStore((s) => s.toggleMotor);
  const toggleValve = useScadaStore((s) => s.toggleValve);
  const setMotorMode = useScadaStore((s) => s.setMotorMode);
  const resetFault = useScadaStore((s) => s.resetFault);

  const tank = tanks[tankId];
  const meta = TANK_META[tankId];
  if (!tank || !meta) return <Navigate to="/tanks" />;

  const lvl = levels[tankId];
  const pumpIds = Array.from({ length: meta.pumpCount }, (_, i) => `${meta.motorPrefix}${i + 1}`);
  const valve = meta.valveId ? valves[meta.valveId] : null;

  return (
    <ScadaShell>
      <div className="space-y-4 p-3 sm:p-4 lg:p-5">
        <div>
          <Link
            to="/tanks"
            className="mb-2 inline-flex items-center gap-1 text-xs text-fg-muted hover:text-primary"
          >
            <ArrowLeft className="size-3.5" /> All tanks
          </Link>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{tank.name}</h1>
          <p className="mt-0.5 text-sm text-fg-muted">
            {tank.kind === "raw" ? "Raw water storage" : "Clear water storage"} · PLC {meta.plc} ·
            Radar WORD tag
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="panel p-4 lg:col-span-1">
            <LevelGauge
              label="Radar level"
              value={tank.level}
              capacityM3={tank.capacityM3}
              low={lvl?.lowAlarm}
              high={lvl?.highAlarm}
            />
            <div className="mt-4 space-y-2 text-xs">
              <Row k="Tag name" v={tank.radarTag} />
              <Row k="Type" v="WORD" />
              <Row k="Capacity" v={`${fmt(tank.capacityM3, 0)} m³`} />
              <Row k="Volume now" v={`${fmt((tank.capacityM3 * tank.level) / 100, 1)} m³`} />
              <div className="flex items-center justify-between border-t border-border pt-2">
                <span className="text-fg-subtle">Alarms</span>
                <div className="flex gap-1.5">
                  <StatusBadge status={lvl?.lowAlarm ? "warn" : "ok"} label="LOW" />
                  <StatusBadge status={lvl?.highAlarm ? "warn" : "ok"} label="HIGH" />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4 lg:col-span-2">
            {valve && (
              <section>
                <h2 className="mb-2 text-sm font-semibold">Inlet actuator valve</h2>
                <div className="max-w-md">
                  <ValveCard valve={valve} onToggle={() => toggleValve(valve.id)} />
                </div>
              </section>
            )}

            <section>
              <h2 className="mb-2 text-sm font-semibold">
                Submersible pumps ({meta.pumpCount})
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {pumpIds.map((id) => {
                  const m = motors[id];
                  if (!m) return null;
                  return (
                    <MotorCard
                      key={id}
                      motor={m}
                      onToggle={() => toggleMotor(id)}
                      onMode={(auto) => setMotorMode(id, auto)}
                      onReset={() => resetFault(id)}
                    />
                  );
                })}
              </div>
            </section>
          </div>
        </div>
      </div>
    </ScadaShell>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-fg-subtle">{k}</span>
      <span className="text-right font-mono text-fg">{v}</span>
    </div>
  );
}
