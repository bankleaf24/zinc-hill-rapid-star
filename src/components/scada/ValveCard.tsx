import { GitBranch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/scada/StatusBadge";
import { valveStatus } from "@/lib/scada-store";
import type { ValveDevice } from "@/lib/scada-types";
import { cn } from "@/lib/utils";

export function ValveCard({
  valve,
  onToggle,
}: {
  valve: ValveDevice;
  onToggle?: () => void;
}) {
  const st = valveStatus(valve);

  return (
    <div className={cn("panel flex flex-col gap-2.5 p-3", st === "fault" && "border-fault/40")}>
      <div className="flex items-start gap-2">
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border",
            st === "open" && "border-water/40 bg-water/10 text-water",
            st === "fault" && "border-fault/40 bg-fault/10 text-fault",
            (st === "close" || st === "transit") && "border-border bg-surface-2 text-fg-muted",
          )}
        >
          <GitBranch className="size-4" strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-fg">{valve.name}</div>
          <div className="text-[11px] text-fg-subtle capitalize">
            {valve.kind} · {valve.group}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <StatusBadge
          status={st === "open" ? "open" : st === "fault" ? "fault" : "close"}
          label={st === "open" ? "OPEN" : st === "fault" ? "FAULT" : "CLOSE"}
        />
        {valve.auto != null && (
          <StatusBadge status={valve.auto ? "auto" : "manual"} label={valve.auto ? "AUTO" : "MAN"} />
        )}
      </div>
      {onToggle && (
        <Button size="sm" variant="outline" disabled={!!valve.fault} onClick={onToggle}>
          {valve.open ? "Close" : "Open"}
        </Button>
      )}
    </div>
  );
}
