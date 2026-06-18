import type { Tables } from "@/lib/supabase/types";
import type { FactoryRow, LineRow, MachineRow } from "@/lib/factories/types";

export type AlarmRow = Tables<"alarms">;
export type AlarmListRow = Pick<
  AlarmRow,
  "id" | "machine_id" | "severity" | "message" | "is_resolved" | "occurred_at" | "resolved_at"
>;

export type { FactoryRow, LineRow, MachineRow };

export type AlarmSeverityValue = "critical" | "warning" | "info" | "unknown";
export type AlarmStatusValue = "open" | "resolved";
export type AlarmTone = "danger" | "warning" | "info" | "success" | "neutral";

export type AlarmSeverity = {
  value: AlarmSeverityValue;
  label: string;
  tone: AlarmTone;
  priority: number;
};

export type AlarmStatus = {
  value: AlarmStatusValue;
  label: string;
  tone: AlarmTone;
};

export type AlarmSummaryLinks = {
  machine: string;
  factory: string;
};

export type AlarmSummary = {
  id: string;
  alarmId: string;
  message: string;
  severity: AlarmSeverity;
  status: AlarmStatus;
  isResolved: boolean;
  occurredAt: string;
  occurredAtLabel: string;
  resolvedAt: string | null;
  resolvedAtLabel: string;
  factoryId: string;
  factoryName: string;
  lineId: string;
  lineName: string;
  machineId: string;
  machineName: string;
  machineType: string;
  machineStatus: MachineRow["status"];
  links: AlarmSummaryLinks;
};

export type AlarmSummaryInput = {
  alarms: AlarmListRow[];
  factories: FactoryRow[];
  lines: LineRow[];
  machines: MachineRow[];
};
