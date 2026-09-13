import { deriveAlarmState } from "@/lib/alarm-engine";
import type { Alarm, AlarmSeverity, AlarmState } from "@/lib/scada-types";
import { cn } from "@/lib/utils";

const STATE_STYLE: Record<AlarmState, string> = {
  active_unack: "bg-fault/20 text-fault border-fault/40 animate-pulse",
  active_ack: "bg-fault/10 text-fault/90 border-fault/25",
  rtn_unack: "bg-warn/15 text-warn border-warn/35 animate-pulse",
  shelved: "bg-manual/15 text-manual border-manual/30",
  cleared: "bg-stop/15 text-fg-muted border-border",
};

const STATE_LABEL: Record<AlarmState, string> = {
  active_unack: "UNACK",
  active_ack: "ACK · ACTIVE",
  rtn_unack: "RTN · UNACK",
  shelved: "SHELVED",
  cleared: "CLEARED",
};

const SEV_STYLE: Record<AlarmSeverity, string> = {
  critical: "bg-fault text-white border-fault",
  high: "bg-fault/80 text-white border-fault/80",
  warning: "bg-warn/90 text-primary-fg border-warn",
  info: "bg-auto/20 text-auto border-auto/35",
};

export function AlarmStateBadge({ alarm, now }: { alarm: Alarm; now?: number }) {
  const st = deriveAlarmState(alarm, now);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        STATE_STYLE[st],
      )}
    >
      {STATE_LABEL[st]}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: AlarmSeverity }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        SEV_STYLE[severity],
      )}
    >
      {severity}
    </span>
  );
}
