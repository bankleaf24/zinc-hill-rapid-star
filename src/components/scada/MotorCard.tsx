import { Fan, RotateCcw, Waves } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/scada/StatusBadge";
import { motorStatus } from "@/lib/scada-store";
import type { MotorDevice } from "@/lib/scada-types";
import { cn } from "@/lib/utils";

export function MotorCard({
  motor,
  onToggle,
  onMode,
  onReset,
  dense,
}: {
  motor: MotorDevice;
  onToggle?: () => void;
  onMode?: (auto: boolean) => void;
  onReset?: () => void;
  dense?: boolean;
}) {
  const st = motorStatus(motor);
  const Icon = motor.id.includes("blower") ? Fan : Waves;

  return (
    <div
      className={cn(
        "panel flex flex-col gap-3 p-3",
        st === "fault" && "border-fault/40",
        dense && "gap-2 p-2.5",
      )}
    >
      <div className="flex items-start gap-2">
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border",
            st === "run" && "border-run/40 bg-run/10 text-run",
            st === "fault" && "border-fault/40 bg-fault/10 text-fault",
            st === "stop" && "border-border bg-surface-2 text-fg-muted",
          )}
        >
          <Icon
            className={cn("size-4", st === "run" && "animate-spin [animation-duration:2.5s]")}
            strokeWidth={2}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-fg">{motor.name}</div>
          <div className="truncate text-[11px] text-fg-subtle">
            {motor.group} · PLC {motor.plc === "slave1" ? "Slave 1" : "Slave 2"}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <StatusBadge status={st} label={st === "run" ? "RUN" : st === "fault" ? "FAULT" : "STOP"} />
        <StatusBadge status={motor.auto ? "auto" : "manual"} label={motor.auto ? "AUTO" : "MAN"} />
      </div>

      {(onToggle || onMode || onReset) && (
        <div className="mt-auto flex flex-wrap gap-1.5">
          {onToggle && (
            <Button
              size="sm"
              variant={motor.run ? "secondary" : "default"}
              disabled={motor.fault}
              onClick={onToggle}
            >
              {motor.run ? "Stop" : "Start"}
            </Button>
          )}
          {onMode && (
            <Button size="sm" variant="outline" onClick={() => onMode(!motor.auto)}>
              {motor.auto ? "To Manual" : "To Auto"}
            </Button>
          )}
          {onReset && motor.fault && (
            <Button size="sm" variant="danger" onClick={onReset}>
              <RotateCcw className="size-3.5" />
              Reset
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
