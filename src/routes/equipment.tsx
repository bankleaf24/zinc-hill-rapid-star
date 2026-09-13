import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ScadaShell } from "@/components/scada/ScadaShell";
import { MotorCard } from "@/components/scada/MotorCard";
import { ValveCard } from "@/components/scada/ValveCard";
import { useScadaStore } from "@/lib/scada-store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/equipment")({ component: EquipmentPage });

type Filter =
  | "all"
  | "raw"
  | "clear"
  | "boost"
  | "blower"
  | "transfer"
  | "actuator";

function EquipmentPage() {
  const motors = useScadaStore((s) => s.motors);
  const valves = useScadaStore((s) => s.valves);
  const toggleMotor = useScadaStore((s) => s.toggleMotor);
  const toggleValve = useScadaStore((s) => s.toggleValve);
  const setMotorMode = useScadaStore((s) => s.setMotorMode);
  const resetFault = useScadaStore((s) => s.resetFault);
  const [filter, setFilter] = useState<Filter>("all");

  const motorList = useMemo(() => {
    return Object.values(motors)
      .filter((m) => {
        // Exclude unit-specific UF motors (shown on unit pages) — plant equipment focus
        if (m.id.startsWith("u") && /u\d-/.test(m.id)) return false;
        if (filter === "all") return true;
        if (filter === "raw") return m.id.startsWith("raw");
        if (filter === "clear") return m.id.startsWith("clear");
        if (filter === "boost") return m.id.startsWith("boost");
        if (filter === "blower") return m.id.startsWith("blower");
        if (filter === "transfer") return m.id.includes("xfer");
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [motors, filter]);

  const actuatorValves = useMemo(
    () => Object.values(valves).filter((v) => v.kind === "actuator"),
    [valves],
  );

  const filters: { id: Filter; label: string }[] = [
    { id: "all", label: "All plant" },
    { id: "raw", label: "Raw pumps" },
    { id: "clear", label: "Clear pumps" },
    { id: "boost", label: "Boosters" },
    { id: "blower", label: "Blowers" },
    { id: "transfer", label: "Transfer" },
    { id: "actuator", label: "Actuators" },
  ];

  return (
    <ScadaShell>
      <div className="space-y-4 p-3 sm:p-4 lg:p-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Pumps & Blowers</h1>
          <p className="mt-0.5 text-sm text-fg-muted">
            Plant-wide motors and actuator valves from PLC Slave 1 / Slave 2. Start/stop and AUTO
            mode for operator control (demo simulation).
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {filters.map((f) => (
            <Button
              key={f.id}
              size="sm"
              variant={filter === f.id ? "default" : "outline"}
              onClick={() => setFilter(f.id)}
              className={cn(filter === f.id && "pointer-events-none")}
            >
              {f.label}
            </Button>
          ))}
        </div>

        {(filter === "all" || filter === "actuator") && (
          <section>
            <h2 className="mb-2 text-sm font-semibold">Actuator valves (raw tank inlets)</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {actuatorValves.map((v) => (
                <ValveCard key={v.id} valve={v} onToggle={() => toggleValve(v.id)} />
              ))}
            </div>
          </section>
        )}

        {filter !== "actuator" && (
          <section>
            <h2 className="mb-2 text-sm font-semibold">
              Motors <span className="font-normal text-fg-subtle">({motorList.length})</span>
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {motorList.map((m) => (
                <MotorCard
                  key={m.id}
                  motor={m}
                  onToggle={() => toggleMotor(m.id)}
                  onMode={(auto) => setMotorMode(m.id, auto)}
                  onReset={() => resetFault(m.id)}
                />
              ))}
            </div>
            {motorList.length === 0 && (
              <div className="panel p-6 text-center text-sm text-fg-muted">No motors in this filter.</div>
            )}
          </section>
        )}
      </div>
    </ScadaShell>
  );
}
