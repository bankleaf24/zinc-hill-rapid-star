import { Link, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  AlarmSmoke,
  Cable,
  Droplets,
  Factory,
  Gauge,
  GitBranch,
  LayoutDashboard,
  Menu,
  Network,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/scada/StatusBadge";
import { countAlarmSummary, countByStatus, useScadaStore } from "@/lib/scada-store";
import { cn, fmt } from "@/lib/utils";
import { UserButton, SignedIn, SignedOut } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

const NAV: Array<{
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
}> = [
  { to: "/", label: "Plant Overview", icon: LayoutDashboard, exact: true },
  { to: "/pid", label: "P&ID", icon: GitBranch },
  { to: "/units", label: "UF Units", icon: Factory },
  { to: "/tanks", label: "Tanks", icon: Droplets },
  { to: "/equipment", label: "Equipment", icon: Gauge },
  { to: "/electrical", label: "MDB Power", icon: Zap },
  { to: "/alarms", label: "Alarms", icon: AlarmSmoke },
  { to: "/network", label: "Network", icon: Network },
];

function formatClock(ts: number) {
  return new Date(ts).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export function ScadaShell({
  children,
  fill = false,
}: {
  children: React.ReactNode;
  /** When true, main content fills viewport without page scroll (Plant Overview). */
  fill?: boolean;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const startSimulation = useScadaStore((s) => s.startSimulation);
  const connected = useScadaStore((s) => s.connected);
  const lastUpdate = useScadaStore((s) => s.lastUpdate);
  const plantFlow = useScadaStore((s) => s.plantFlowM3h);
  const motors = useScadaStore((s) => s.motors);
  const alarms = useScadaStore((s) => s.alarms);
  const { user, isPending } = useCurrentUserState();

  useEffect(() => {
    setMounted(true);
    return startSimulation();
  }, [startSimulation]);

  const stats = useMemo(() => countByStatus(motors), [motors]);
  const summary = useMemo(
    () => countAlarmSummary(alarms, mounted ? Date.now() : 0),
    [alarms, mounted, lastUpdate],
  );
  const unacked = summary.unack;

  return (
    <div className={cn("flex flex-col bg-bg text-fg", fill ? "h-dvh overflow-hidden" : "min-h-dvh")}>
      <header className="sticky top-0 z-40 shrink-0 pt-[var(--grok-banner-h,0px)]">
        <div className="infou-titlebar flex h-10 items-center gap-2 px-2 shadow-md sm:h-11 sm:gap-3 sm:px-4">
          <Button
            size="icon"
            variant="ghost"
            className="text-white hover:bg-white/10 lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </Button>

          <Link to="/" className="flex min-w-0 items-center gap-2">
            <div className="flex h-6 items-center gap-1 rounded-[var(--radius-sm)] bg-white/10 px-1.5 ring-1 ring-white/20 sm:h-7 sm:gap-1.5 sm:px-2">
              <span className="text-[10px] font-bold tracking-wide text-white">LS</span>
              <span className="text-[10px] font-semibold text-sky-200">InfoU</span>
            </div>
            <div className="min-w-0 leading-tight">
              <div className="truncate text-xs font-semibold tracking-tight text-white sm:text-sm">
                Water Bank 901 · SCADA
              </div>
              <div className="hidden text-[10px] text-sky-200/80 sm:block">
                XGT InfoU 1.9.11 · Park WTP
              </div>
            </div>
          </Link>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <div className="hidden items-center gap-3 rounded-[var(--radius-sm)] border border-white/15 bg-black/20 px-2.5 py-0.5 md:flex">
              <Metric label="Flow" value={`${fmt(plantFlow, 1)} m³/h`} light />
              <div className="h-4 w-px bg-white/20" />
              <Metric label="Run" value={String(stats.run)} tone="run" light />
              <Metric label="Fault" value={String(stats.fault)} tone={stats.fault ? "fault" : undefined} light />
              <div className="h-4 w-px bg-white/20" />
              <Metric label="Unack" value={String(unacked)} tone={unacked ? "warn" : undefined} light />
            </div>

            <StatusBadge
              status={connected ? "ok" : "offline"}
              label={connected ? "ONLINE" : "OFFLINE"}
              className="hidden sm:inline-flex"
            />

            <div className="hidden min-w-[9rem] text-right font-mono text-[10px] text-sky-100/80 tabular xl:block">
              {mounted ? formatClock(lastUpdate) : "—"}
            </div>

            <div className="flex items-center gap-2">
              {isPending ? (
                <div className="h-7 w-7 animate-pulse rounded-full bg-white/10" />
              ) : user ? (
                <SignedIn>
                  <UserButton />
                </SignedIn>
              ) : (
                <SignedOut>
                  <Link
                    to="/login"
                    className="rounded-[var(--radius-sm)] border border-white/20 px-2 py-0.5 text-xs text-sky-100 hover:bg-white/10"
                  >
                    Sign in
                  </Link>
                </SignedOut>
              )}
            </div>
          </div>
        </div>

        {unacked > 0 && (
          <Link
            to="/alarms"
            className={cn(
              "flex items-center gap-2 border-t px-3 py-1 text-[11px] hover:opacity-90 sm:px-4",
              summary.critical > 0
                ? "border-fault/30 bg-fault/15 text-fault"
                : "border-warn/30 bg-warn/10 text-warn",
            )}
          >
            <AlarmSmoke className="size-3.5 shrink-0" />
            <span className="font-medium">
              Alarm · {unacked} unack{summary.critical > 0 ? ` · ${summary.critical} critical` : ""}
            </span>
            <span className="ml-auto opacity-80">Open</span>
          </Link>
        )}
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-48 shrink-0 border-r border-border bg-bg-elevated lg:flex lg:flex-col xl:w-52">
          <div className="infou-chrome shrink-0 border-b border-border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-sky-200/90">
            Project Explorer
          </div>
          <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto p-1.5">
            {NAV.map((item) => {
              const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-[12px] transition-colors xl:text-[13px]",
                    active
                      ? "bg-primary text-white shadow-sm"
                      : "text-fg-muted hover:bg-surface-2 hover:text-fg",
                  )}
                >
                  <Icon className="size-4 shrink-0" strokeWidth={2} />
                  <span className="truncate">{item.label}</span>
                  {item.to === "/alarms" && unacked > 0 && (
                    <span className="ml-auto rounded-full bg-fault px-1.5 py-0.5 text-[10px] font-semibold text-white">
                      {unacked}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="mx-1.5 mb-1.5 shrink-0 rounded-[var(--radius-md)] border border-border bg-surface p-2">
            <div className="mb-1.5 flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-wide text-fg-subtle">
              <Cable className="size-3" />
              XGT / PLC
            </div>
            <div className="space-y-1 text-[10px]">
              <PlcRow name="Master" ip="192.168.1.10" ok />
              <PlcRow name="Slave 1" ip="192.168.1.21" ok />
              <PlcRow name="Slave 2" ip="192.168.1.31" ok />
              <PlcRow name="IoT" ip="192.168.1.13" ok />
            </div>
          </div>
        </aside>

        {open && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-black/60"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
            />
            <div className="absolute inset-y-0 left-0 flex w-[min(17rem,88vw)] flex-col border-r border-border bg-bg-elevated pt-[var(--grok-banner-h,0px)] shadow-xl">
              <div className="infou-titlebar flex h-11 items-center justify-between px-3">
                <span className="text-sm font-semibold text-white">InfoU Screens</span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-white"
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                >
                  <X className="size-5" />
                </Button>
              </div>
              <nav className="flex flex-col gap-0.5 overflow-y-auto p-2">
                {NAV.map((item) => {
                  const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-2.5 text-sm",
                        active ? "bg-primary text-white" : "text-fg-muted hover:bg-surface-2",
                      )}
                    >
                      <Icon className="size-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        )}

        <main
          className={cn(
            "min-w-0 flex-1",
            fill ? "flex min-h-0 flex-col overflow-hidden" : "overflow-auto",
          )}
        >
          {children}
        </main>
      </div>

      <footer className="infou-chrome hidden shrink-0 items-center justify-between border-t border-border px-3 py-0.5 text-[10px] text-sky-100/70 sm:flex">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1">
            <Activity className="size-3" /> InfoU 1.9.11 · 1s scan
          </span>
          <span className="hidden md:inline">2,000 m³/day · MWA</span>
        </div>
        <span className="font-mono tabular text-sky-100/80">
          {mounted ? formatClock(lastUpdate) : "—"}
        </span>
      </footer>
    </div>
  );
}

function Metric({
  label,
  value,
  tone,
  light,
}: {
  label: string;
  value: string;
  tone?: "run" | "fault" | "warn";
  light?: boolean;
}) {
  return (
    <div className="leading-none">
      <div className={cn("text-[8px] uppercase tracking-wide", light ? "text-sky-200/70" : "text-fg-subtle")}>
        {label}
      </div>
      <div
        className={cn(
          "mt-0.5 font-mono text-[11px] font-semibold tabular",
          tone === "run" && "text-run",
          tone === "fault" && "text-fault",
          tone === "warn" && "text-warn",
          !tone && (light ? "text-white" : "text-fg"),
        )}
      >
        {value}
      </div>
    </div>
  );
}

function PlcRow({ name, ip, ok }: { name: string; ip: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-fg-muted">{name}</span>
      <span className="flex items-center gap-1.5 font-mono text-[9px] text-fg-subtle">
        {ip}
        <span className={cn("status-dot", ok ? "status-dot-run" : "status-dot-fault")} />
      </span>
    </div>
  );
}
