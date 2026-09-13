export type BitState = boolean;

export type EquipmentStatus = "run" | "stop" | "fault" | "offline";

export interface MotorDevice {
  id: string;
  name: string;
  group: string;
  auto: boolean;
  run: boolean;
  fault: boolean;
  plc: "slave1" | "slave2";
}

export interface ValveDevice {
  id: string;
  name: string;
  group: string;
  auto?: boolean;
  open: boolean;
  close: boolean;
  fault?: boolean;
  kind: "actuator" | "solenoid";
  plc: "slave1" | "slave2";
}

export interface LevelSensor {
  id: string;
  name: string;
  tankId: string;
  value: number;
  unit: "%";
  lowAlarm: boolean;
  highAlarm: boolean;
  plc: "slave1" | "slave2";
}

export interface LowLevelTank {
  id: string;
  name: string;
  unitId: number;
  chemical: "pre-chlorine" | "post-chlorine" | "backwash-chlorine" | "ozone";
  lowLevel: boolean;
  plc: "slave1" | "slave2";
}

export interface Tank {
  id: string;
  name: string;
  kind: "raw" | "clear";
  level: number;
  capacityM3: number;
  radarTag: string;
}

export interface MdbMeter {
  currentL1: number;
  currentL2: number;
  currentL3: number;
  currentAvg: number;
  voltageL1N: number;
  voltageL2N: number;
  voltageL3N: number;
  voltageLNAvg: number;
  voltageL1L2: number;
  voltageL2L3: number;
  voltageL1L3: number;
  voltageLLAvg: number;
  kWh: number;
  kWTotal: number;
  kVarTotal: number;
  kVATotal: number;
  pfAvg: number;
  frequency: number;
}

/** ISA-18.2-style severity (critical highest). */
export type AlarmSeverity = "critical" | "high" | "warning" | "info";

/**
 * Derived presentation state:
 * - active_unack: abnormal + not acked (flash / horn)
 * - active_ack: abnormal + acked (steady)
 * - rtn_unack: back to normal but operator has not acked yet
 * - shelved: temporarily suppressed
 * - cleared: fully closed (history only)
 */
export type AlarmState =
  | "active_unack"
  | "active_ack"
  | "rtn_unack"
  | "shelved"
  | "cleared";

export interface Alarm {
  /** Stable condition key (also used as id). */
  id: string;
  key: string;
  severity: AlarmSeverity;
  area: string;
  source: string;
  tag: string;
  message: string;
  valueText?: string;
  /** Process condition currently abnormal. */
  active: boolean;
  /** Operator has acknowledged this occurrence. */
  ack: boolean;
  raisedAt: number;
  updatedAt: number;
  ackedAt?: number;
  ackedBy?: string;
  clearedAt?: number;
  /** If set and in the future, alarm is shelved. */
  shelvedUntil?: number;
  shelvedBy?: string;
  /** How many times this key has re-tripped. */
  count: number;
}

export type AlarmEventType =
  | "raise"
  | "retrip"
  | "ack"
  | "rtn"
  | "clear"
  | "shelve"
  | "unshelve"
  | "silence"
  | "unsilence";

export interface AlarmEvent {
  id: string;
  ts: number;
  type: AlarmEventType;
  alarmKey: string;
  severity: AlarmSeverity;
  source: string;
  message: string;
  note?: string;
}

export interface TreatmentUnit {
  id: number;
  name: string;
  rawPumps: string[];
  cipPump: string;
  backwashPump: string;
  solenoidValves: string[];
  ozone: string;
  lowTanks: string[];
}

export interface PlantSnapshot {
  connected: boolean;
  tick: number;
  lastUpdate: number;
  tanks: Record<string, Tank>;
  motors: Record<string, MotorDevice>;
  valves: Record<string, ValveDevice>;
  levels: Record<string, LevelSensor>;
  lowTanks: Record<string, LowLevelTank>;
  mdb1: MdbMeter;
  mdb2: MdbMeter;
  /** Active + RTN-unack + shelved alarms. */
  alarms: Alarm[];
  /** Fully cleared occurrences. */
  alarmHistory: Alarm[];
  /** Audit trail of alarm state transitions. */
  alarmEvents: AlarmEvent[];
  /** Horn silenced until this timestamp (or 0). */
  alarmSilencedUntil: number;
  /** First-out critical key for this plant session. */
  firstOutKey?: string;
  units: TreatmentUnit[];
  plantFlowM3h: number;
  inletFlowM3d: number;
}
