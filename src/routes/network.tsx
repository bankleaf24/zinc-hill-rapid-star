import { createFileRoute } from "@tanstack/react-router";
import { Cloud, Monitor, Router, Server, Smartphone, Wifi } from "lucide-react";
import { ScadaShell } from "@/components/scada/ScadaShell";
import { StatusBadge } from "@/components/scada/StatusBadge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/network")({ component: NetworkPage });

function NetworkPage() {
  return (
    <ScadaShell>
      <div className="space-y-4 p-3 sm:p-4 lg:p-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">SCADA Network</h1>
          <p className="mt-0.5 text-sm text-fg-muted">
            Architecture from the SCADA diagram — PLC Master/Slaves, HMI, IoT gateway, MQTT, and
            cloud clients.
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-xs text-fg-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-0.5 w-6 bg-primary" /> LAN
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-0.5 w-6 bg-fault" /> Fiber optic
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-0.5 w-6 bg-warn" /> Digital I/O
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-0.5 w-6 bg-run" /> Analog 4–20 mA
          </span>
        </div>

        {/* Cloud tier */}
        <section className="panel p-4">
          <h2 className="mb-3 text-sm font-semibold">Cloud & remote access</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Node icon={Cloud} title="Cloud" detail="SCADA MWA remote" />
            <Node icon={Server} title="MQTT Server" detail="Broker" />
            <Node icon={Router} title="IoT Gateway" detail="192.168.1.13" ok />
            <Node icon={Server} title="SCADA Cloud Module" detail="192.168.1.12" ok />
            <Node icon={Monitor} title="Engineering PC" detail="192.168.1.14" ok />
            <Node icon={Monitor} title="Tablet / Phone" detail="MQTT clients" />
            <Node icon={Smartphone} title="Smart Phone" detail="Remote view" />
            <Node icon={Wifi} title="Mobile access" detail="via MQTT" />
          </div>
        </section>

        {/* Control rooms */}
        <div className="grid gap-4 lg:grid-cols-3">
          <Room
            title="Control Room 1 · Master"
            nodes={[
              { title: "PLC Master", ip: "192.168.1.10", ok: true },
              { title: "HMI 1", ip: "192.168.1.11", ok: true },
              { title: "Hub Switch", ip: "TCP/IP", ok: true },
            ]}
          />
          <Room
            title="Control Room 2 · Slave 1 area"
            nodes={[
              { title: "PLC Slave 1", ip: "192.168.1.21", ok: true },
              { title: "HMI 1", ip: "192.168.1.22", ok: true },
              { title: "Fiber to LAN", ip: "Converter", ok: true },
            ]}
            accent="Field: Raw tanks, UF units 1–4, Clear tank 1, blowers, boosters"
          />
          <Room
            title="Control Room 3 · Slave 2 area"
            nodes={[
              { title: "PLC Slave 2", ip: "192.168.1.31", ok: true },
              { title: "HMI 2", ip: "192.168.1.32", ok: true },
              { title: "Fiber to LAN", ip: "Converter", ok: true },
            ]}
            accent="Field: Clear tank 2, boosters, air blowers, transfer pumps"
          />
        </div>

        {/* Field I/O summary from SCADA diagram */}
        <section className="panel p-4">
          <h2 className="mb-3 text-sm font-semibold">Field I/O summary (from SCADA diagram)</h2>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <IoCard
              title="Raw water side"
              items={[
                "Raw water tank No.1 / No.2",
                "Actuator valve No.1 / No.2",
                "Radar sensors",
                "Submersible raw pumps 1–3 each",
              ]}
            />
            <IoCard
              title="Treatment units 1–4"
              items={[
                "Raw water pumps 1–2",
                "CIP + Backwash pumps",
                "Solenoid valves 1–7",
                "Ozone + chemical low levels",
              ]}
            />
            <IoCard
              title="Clear water side"
              items={[
                "Clear water tank No.1 / No.2",
                "Radar sensors",
                "Submersible clear pumps 1–4",
                "Booster pump units 1–2",
              ]}
            />
            <IoCard
              title="Utilities"
              items={[
                "Air blower No.1–4",
                "MDB current / voltage / power",
                "Pre / Post / BW chlorine levels",
                "Ozone tank levels",
              ]}
            />
          </div>
        </section>
      </div>
    </ScadaShell>
  );
}

function Node({
  icon: Icon,
  title,
  detail,
  ok,
}: {
  icon: typeof Cloud;
  title: string;
  detail: string;
  ok?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 rounded-[var(--radius-md)] border border-border bg-surface-2 p-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-surface text-primary ring-1 ring-border">
        <Icon className="size-4" strokeWidth={2} />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <div className="truncate text-sm font-medium">{title}</div>
          {ok != null && <StatusBadge status={ok ? "ok" : "fault"} label={ok ? "UP" : "DOWN"} />}
        </div>
        <div className="font-mono text-[11px] text-fg-subtle">{detail}</div>
      </div>
    </div>
  );
}

function Room({
  title,
  nodes,
  accent,
}: {
  title: string;
  nodes: Array<{ title: string; ip: string; ok: boolean }>;
  accent?: string;
}) {
  return (
    <section className="panel flex flex-col p-4">
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      <div className="space-y-2">
        {nodes.map((n) => (
          <div
            key={n.title}
            className="flex items-center justify-between gap-2 rounded-[var(--radius-sm)] border border-border bg-surface-2 px-3 py-2"
          >
            <div>
              <div className="text-sm font-medium">{n.title}</div>
              <div className="font-mono text-[11px] text-fg-subtle">{n.ip}</div>
            </div>
            <span className={cn("status-dot", n.ok ? "status-dot-run" : "status-dot-fault")} />
          </div>
        ))}
      </div>
      {accent && <p className="mt-3 text-[11px] leading-relaxed text-fg-subtle">{accent}</p>}
    </section>
  );
}

function IoCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-border bg-surface-2 p-3">
      <div className="mb-2 text-xs font-semibold text-primary">{title}</div>
      <ul className="space-y-1 text-[11px] text-fg-muted">
        {items.map((it) => (
          <li key={it} className="flex gap-1.5">
            <span className="mt-1.5 size-1 shrink-0 rounded-full bg-fg-subtle" />
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}
