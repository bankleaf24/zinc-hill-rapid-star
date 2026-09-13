import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, Droplets, Factory, Zap } from "lucide-react";
import { ScadaShell } from "@/components/scada/ScadaShell";
import { PlantMimic } from "@/components/scada/PlantMimic";
import { countAlarmSummary, countByStatus, sortAlarms, useScadaStore } from "@/lib/scada-store";
import { cn, fmt } from "@/lib/utils";

export const Route = createFileRoute("/")({ component: OverviewPage });

function OverviewPage() {
  const tanks = useScadaStore((s) => s.tanks);
  const motors = useScadaStore((s) => s.motors);
  const mdb1 = useScadaStore((s) => s.mdb1);
  const alarms = useScadaStore((s) => s.alarms);
  const plantFlow = useScadaStore((s) => s.plantFlowM3h);
  const inlet = useScadaStore((s) => s.inletFlowM3d);
  const stats = countByStatus(motors);
  const summary = countAlarmSummary(alarms);
  const topAlarms = sortAlarms(alarms).slice(0, 3);

  return (
    <ScadaShell fill>
      {/* Single-viewport overview: chrome + graphic only, no page scroll */}
      <div className="flex h-full min-h-0 flex-col gap-1.5 p-1.5 sm:p-2 lg:p-2.5">
        {/* Compact KPI strip */}
        <div className="flex shrink-0 flex-wrap items-center gap-1.5 sm:gap-2">
          <div className="mr-1 min-w-0 leading-tight">
            <div className="text-[9px] font-semibold uppercase tracking-wider text-primary">
              LS Electric · XGT InfoU 1.9.11
            </div>
            <h1 className="truncate text-sm font-semibold tracking-tight sm:text-base">
              Plant Overview · ระบบบำบัดน้ำอุทยาน
            </h1>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-1.5">
            <Kpi icon={Droplets} label="Flow" value={`${fmt(plantFlow, 1)} m³/h`} />
            <Kpi icon={Factory} label="RUN" value={`${stats.run}/${stats.total}`} />
            <Kpi icon={Zap} label="kW" value={fmt(mdb1.kWTotal, 1)} />
            <Kpi
              icon={AlertTriangle}
              label="Unack"
              value={String(summary.unack)}
              alert={summary.unack > 0}
            />
            <span className="hidden font-mono text-[10px] text-fg-subtle tabular xl:inline">
              Inlet {inlet.toLocaleString()} m³/d
            </span>
          </div>
        </div>

        {/* Graphic fills all remaining viewport height */}
        <div className="relative min-h-0 flex-1">
          <PlantMimic fill />
        </div>

        {/* Thin bottom strip: tank % + top alarms — still one screen */}
        <div className="grid shrink-0 grid-cols-2 gap-1.5 sm:grid-cols-4 lg:grid-cols-6">
          {Object.values(tanks).map((t) => (
            <Link
              key={t.id}
              to="/tanks/$tankId"
              params={{ tankId: t.id }}
              className="panel flex items-center gap-2 px-2 py-1 hover:border-primary/40"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-[9px] text-fg-subtle">{t.name.replace("Water ", "")}</div>
                <div
                  className={cn(
                    "font-mono text-xs font-semibold tabular",
                    t.level < 20 ? "text-warn" : t.level > 92 ? "text-fault" : "text-water",
                  )}
                >
                  {fmt(t.level, 0)}%
                </div>
              </div>
              <div className="h-7 w-1.5 overflow-hidden rounded-full bg-bg">
                <div
                  className="w-full water-shimmer rounded-full"
                  style={{ height: `${Math.max(4, t.level)}%`, marginTop: `${100 - t.level}%` }}
                />
              </div>
            </Link>
          ))}
          <div className="panel col-span-2 flex min-w-0 items-center gap-2 overflow-hidden px-2 py-1 sm:col-span-4 lg:col-span-2">
            <div className="shrink-0 text-[9px] font-semibold uppercase tracking-wide text-fg-subtle">
              Alarms
            </div>
            <div className="flex min-w-0 flex-1 gap-1.5 overflow-hidden">
              {topAlarms.length === 0 && (
                <span className="text-[10px] text-run">No active alarms</span>
              )}
              {topAlarms.map((a) => (
                <Link
                  key={a.id}
                  to="/alarms"
                  className={cn(
                    "truncate rounded px-1.5 py-0.5 text-[10px]",
                    a.severity === "critical"
                      ? "bg-fault/20 text-fault"
                      : a.severity === "high"
                        ? "bg-warn/20 text-warn"
                        : "bg-surface-2 text-fg-muted",
                  )}
                  title={a.message}
                >
                  {a.source}
                </Link>
              ))}
            </div>
            <Link to="/alarms" className="shrink-0 text-[10px] text-primary hover:underline">
              All
            </Link>
          </div>
        </div>
      </div>
    </ScadaShell>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  alert,
}: {
  icon: typeof Droplets;
  label: string;
  value: string;
  alert?: boolean;
}) {
  return (
    <div className="panel flex items-center gap-1.5 px-2 py-1">
      <Icon
        className={cn("size-3.5 shrink-0", alert ? "text-fault" : "text-primary")}
        strokeWidth={2}
      />
      <div className="leading-none">
        <div className="text-[8px] uppercase tracking-wide text-fg-subtle">{label}</div>
        <div
          className={cn(
            "font-mono text-[11px] font-semibold tabular",
            alert ? "text-fault" : "text-fg",
          )}
        >
          {value}
        </div>
      </div>
    </div>
  );
}
