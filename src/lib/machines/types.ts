import type { Tables } from "@/lib/supabase/types";
import type { AlarmSummaryRow, FactoryRow, LineRow, MachineRow } from "@/lib/factories/types";

export type { AlarmSummaryRow, FactoryRow, LineRow, MachineRow };
export type SensorReadingRow = Tables<"sensor_readings">;
export type MachineDetailSensorRow = Pick<
  SensorReadingRow,
  "id" | "machine_id" | "temperature" | "pressure" | "current_amp" | "vibration" | "recorded_at"
>;
export type MachineDetailAlarmRow = Pick<
  Tables<"alarms">,
  "id" | "machine_id" | "severity" | "message" | "is_resolved" | "occurred_at" | "resolved_at"
>;

export type MachineStatusValue = "normal" | "warning" | "critical" | "stopped" | "maintenance" | "unknown";
export type MachineStatusTone = "success" | "warning" | "danger" | "neutral" | "info";
export type SensorStatusValue = "normal" | "warning" | "critical" | "unknown";

export type MachineSummaryStatus = {
  value: MachineStatusValue;
  label: string;
  tone: MachineStatusTone;
  priority: number;
};

export type MachineSummaryLinks = {
  detail: string;
  alarms: string;
};

export type MachineSummary = {
  id: string;
  machineId: string;
  name: string;
  type: string;
  modelName: string | null;
  modelNameLabel: string;
  installedAt: string | null;
  installedAtLabel: string;
  status: MachineSummaryStatus;
  factoryId: string;
  factoryName: string;
  lineId: string;
  lineName: string;
  openAlarmCount: number;
  criticalOpenAlarmCount: number;
  warningOpenAlarmCount: number;
  links: MachineSummaryLinks;
};

export type SensorMetric = {
  key: "temperature" | "pressure" | "currentAmp" | "vibration";
  label: string;
  value: number;
  valueLabel: string;
  rangeLabel: string;
  status: {
    value: SensorStatusValue;
    label: string;
    tone: MachineStatusTone;
  };
};

export type MachineSensorSnapshot = {
  id: string;
  recordedAt: string;
  recordedAtLabel: string;
  metrics: SensorMetric[];
};

export type MachineDetailAlarm = {
  id: string;
  message: string;
  severity: {
    value: "critical" | "warning" | "info" | "unknown";
    label: string;
    tone: MachineStatusTone;
    priority: number;
  };
  status: {
    value: "open" | "resolved";
    label: string;
    tone: MachineStatusTone;
  };
  occurredAt: string;
  occurredAtLabel: string;
};

export type MachineDetail = MachineSummary & {
  sensorSnapshot: MachineSensorSnapshot | null;
  recentAlarms: MachineDetailAlarm[];
};

export type MachineDetailInput = {
  machine: MachineSummary;
  latestSensorReading: MachineDetailSensorRow | null;
  recentAlarms: MachineDetailAlarmRow[];
};

export type MachineSummaryInput = {
  factories: FactoryRow[];
  lines: LineRow[];
  machines: MachineRow[];
  alarms: AlarmSummaryRow[];
};

export type MachineFactoryOption = Pick<Tables<"factories">, "id" | "name">;
