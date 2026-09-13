import { cn, fmt } from "@/lib/utils";

export function LevelGauge({
  label,
  value,
  unit = "%",
  capacityM3,
  low,
  high,
  className,
  compact,
}: {
  label: string;
  value: number;
  unit?: string;
  capacityM3?: number;
  low?: boolean;
  high?: boolean;
  className?: string;
  compact?: boolean;
}) {
  const h = Math.max(0, Math.min(100, value));
  const volume = capacityM3 != null ? (capacityM3 * h) / 100 : null;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className={cn("font-medium text-fg", compact ? "text-xs" : "text-sm")}>{label}</div>
          {volume != null && (
            <div className="text-[11px] text-fg-subtle tabular">
              {fmt(volume, 0)} / {fmt(capacityM3!, 0)} m³
            </div>
          )}
        </div>
        <div className="text-right">
          <div
            className={cn(
              "font-mono font-semibold tabular",
              low || high ? "text-warn" : "text-water",
              compact ? "text-sm" : "text-lg",
            )}
          >
            {fmt(value, 1)}
            <span className="ml-0.5 text-xs font-normal text-fg-muted">{unit}</span>
          </div>
          {(low || high) && (
            <div className="text-[10px] font-medium uppercase tracking-wide text-warn">
              {low ? "Low alarm" : "High alarm"}
            </div>
          )}
        </div>
      </div>

      <div
        className={cn(
          "relative overflow-hidden rounded-[var(--radius-sm)] border border-border bg-bg",
          compact ? "h-16" : "h-28",
        )}
      >
        <div
          className="water-shimmer absolute inset-x-0 bottom-0 transition-[height] duration-700 ease-out"
          style={{ height: `${h}%` }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),transparent_30%)]" />
        {/* scale marks */}
        {[25, 50, 75].map((m) => (
          <div
            key={m}
            className="absolute inset-x-0 border-t border-dashed border-white/10"
            style={{ bottom: `${m}%` }}
          />
        ))}
        <div className="absolute inset-x-0 top-1 flex justify-between px-1.5 text-[9px] text-fg-subtle">
          <span>H</span>
          <span>100</span>
        </div>
        <div className="absolute inset-x-0 bottom-1 flex justify-between px-1.5 text-[9px] text-fg-subtle">
          <span>L</span>
          <span>0</span>
        </div>
      </div>
    </div>
  );
}
