import { cn } from "@/lib/utils";

const styles = {
  run: "bg-run/15 text-run border-run/30",
  stop: "bg-stop/15 text-fg-muted border-border",
  fault: "bg-fault/15 text-fault border-fault/35",
  open: "bg-water/15 text-water border-water/30",
  close: "bg-stop/15 text-fg-muted border-border",
  auto: "bg-auto/15 text-auto border-auto/30",
  manual: "bg-manual/15 text-manual border-manual/30",
  warn: "bg-warn/15 text-warn border-warn/30",
  ok: "bg-run/15 text-run border-run/30",
  offline: "bg-stop/20 text-fg-subtle border-border",
} as const;

export function StatusBadge({
  status,
  label,
  className,
}: {
  status: keyof typeof styles;
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide",
        styles[status],
        className,
      )}
    >
      <span
        className={cn(
          "status-dot",
          status === "run" || status === "ok" || status === "open"
            ? "status-dot-run"
            : status === "fault"
              ? "status-dot-fault"
              : status === "warn"
                ? "status-dot-warn"
                : "status-dot-stop",
        )}
      />
      {label ?? status}
    </span>
  );
}
