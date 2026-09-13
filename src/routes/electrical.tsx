import { createFileRoute } from "@tanstack/react-router";
import { ScadaShell } from "@/components/scada/ScadaShell";
import { useScadaStore } from "@/lib/scada-store";
import type { MdbMeter } from "@/lib/scada-types";
import { fmt } from "@/lib/utils";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/electrical")({ component: ElectricalPage });

function ElectricalPage() {
  const mdb1 = useScadaStore((s) => s.mdb1);
  const mdb2 = useScadaStore((s) => s.mdb2);
  const [history, setHistory] = useState<Array<{ t: string; kw1: number; kw2: number }>>([]);

  useEffect(() => {
    const t = new Date().toLocaleTimeString("en-GB", { hour12: false });
    setHistory((h) =>
      [...h, { t, kw1: mdb1.kWTotal, kw2: mdb2.kWTotal }].slice(-30),
    );
  }, [mdb1.kWTotal, mdb2.kWTotal]);

  return (
    <ScadaShell>
      <div className="space-y-4 p-3 sm:p-4 lg:p-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Electrical MDB</h1>
          <p className="mt-0.5 text-sm text-fg-muted">
            Main distribution board meters — current, voltage, power, PF, frequency (WORD tags on
            PLC Slave 1 & 2).
          </p>
        </div>

        <div className="panel p-4">
          <h2 className="mb-3 text-sm font-semibold">Active power trend</h2>
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history}>
                <defs>
                  <linearGradient id="kw1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2dd4bf" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#2dd4bf" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="kw2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#38bdf8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#c5dcea" strokeDasharray="3 3" />
                <XAxis dataKey="t" tick={{ fill: "#5a7a96", fontSize: 10 }} stroke="#c5dcea" />
                <YAxis tick={{ fill: "#5a7a96", fontSize: 10 }} stroke="#c5dcea" unit=" kW" width={48} />
                <Tooltip
                  contentStyle={{
                    background: "#ffffff",
                    border: "1px solid #b7d4ea",
                    borderRadius: 8,
                    fontSize: 12,
                    color: "#12324f",
                  }}
                />
                <Area type="monotone" dataKey="kw1" name="MDB Slave1 kW" stroke="#2dd4bf" fill="url(#kw1)" strokeWidth={2} />
                <Area type="monotone" dataKey="kw2" name="MDB Slave2 kW" stroke="#38bdf8" fill="url(#kw2)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <MdbPanel title="MDB · PLC Slave 1" meter={mdb1} />
          <MdbPanel title="MDB · PLC Slave 2" meter={mdb2} />
        </div>
      </div>
    </ScadaShell>
  );
}

function MdbPanel({ title, meter }: { title: string; meter: MdbMeter }) {
  return (
    <section className="panel overflow-hidden">
      <div className="border-b border-border bg-surface-2 px-4 py-2.5">
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      <div className="grid gap-px bg-border sm:grid-cols-2">
        <MetricBlock title="CURRENT (A)" rows={[
          ["L1", meter.currentL1, "A"],
          ["L2", meter.currentL2, "A"],
          ["L3", meter.currentL3, "A"],
          ["Avg", meter.currentAvg, "A"],
        ]} />
        <MetricBlock title="VOLTAGE L-N (V)" rows={[
          ["L1-N", meter.voltageL1N, "V"],
          ["L2-N", meter.voltageL2N, "V"],
          ["L3-N", meter.voltageL3N, "V"],
          ["Avg", meter.voltageLNAvg, "V"],
        ]} />
        <MetricBlock title="VOLTAGE L-L (V)" rows={[
          ["L1-L2", meter.voltageL1L2, "V"],
          ["L2-L3", meter.voltageL2L3, "V"],
          ["L1-L3", meter.voltageL1L3, "V"],
          ["Avg", meter.voltageLLAvg, "V"],
        ]} />
        <MetricBlock title="POWER" rows={[
          ["Active", meter.kWTotal, "kW"],
          ["Reactive", meter.kVarTotal, "kVar"],
          ["Apparent", meter.kVATotal, "kVA"],
          ["Energy", meter.kWh, "kWh"],
        ]} />
        <MetricBlock title="QUALITY" rows={[
          ["Power factor", meter.pfAvg, ""],
          ["Frequency", meter.frequency, "Hz"],
        ]} wide />
      </div>
    </section>
  );
}

function MetricBlock({
  title,
  rows,
  wide,
}: {
  title: string;
  rows: Array<[string, number, string]>;
  wide?: boolean;
}) {
  return (
    <div className={`bg-surface p-4 ${wide ? "sm:col-span-2" : ""}`}>
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-fg-subtle">
        {title}
      </div>
      <div className={`grid gap-2 ${wide ? "sm:grid-cols-2" : ""}`}>
        {rows.map(([label, value, unit]) => (
          <div key={label} className="flex items-baseline justify-between gap-2">
            <span className="text-xs text-fg-muted">{label}</span>
            <span className="font-mono text-sm font-semibold tabular text-fg">
              {fmt(value, unit === "kWh" ? 1 : unit === "" ? 3 : 1)}
              {unit && <span className="ml-1 text-[10px] font-normal text-fg-subtle">{unit}</span>}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
