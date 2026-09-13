import { createFileRoute, Link } from "@tanstack/react-router";
import { ScadaShell } from "@/components/scada/ScadaShell";
import { LevelGauge } from "@/components/scada/LevelGauge";
import { useScadaStore } from "@/lib/scada-store";

export const Route = createFileRoute("/tanks/")({ component: TanksPage });

function TanksPage() {
  const tanks = useScadaStore((s) => s.tanks);
  const levels = useScadaStore((s) => s.levels);

  return (
    <ScadaShell>
      <div className="space-y-4 p-3 sm:p-4 lg:p-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Tanks & Levels</h1>
          <p className="mt-0.5 text-sm text-fg-muted">
            Radar level sensors on raw and clear water tanks (WORD tags) with low/high alarms.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Object.values(tanks).map((t) => {
            const lvl = levels[t.id];
            return (
              <Link
                key={t.id}
                to="/tanks/$tankId"
                params={{ tankId: t.id }}
                className="panel block p-4 transition-colors hover:border-primary/40"
              >
                <LevelGauge
                  label={t.name}
                  value={t.level}
                  capacityM3={t.capacityM3}
                  low={lvl?.lowAlarm}
                  high={lvl?.highAlarm}
                />
                <div className="mt-3 space-y-1 text-[11px] text-fg-subtle">
                  <div>Radar tag: {t.radarTag}</div>
                  <div>Type: WORD · {t.kind === "raw" ? "Raw water" : "Clear water"}</div>
                  <div className="text-primary">Open tank detail</div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </ScadaShell>
  );
}
