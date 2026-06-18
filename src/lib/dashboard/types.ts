import type { AlarmSummary } from "@/lib/alarms";
import type { MachineDetailSensorRow, MachineSummary, MachineStatusTone } from "@/lib/machines";
import type { ReportSummary } from "@/lib/reports";

export type DashboardTone = MachineStatusTone;

export type DashboardSummary = {
  machineCount: number;
  normalMachineCount: number;
  warningMachineCount: number;
  criticalMachineCount: number;
  pausedMachineCount: number;
  openAlarmCount: number;
  criticalOpenAlarmCount: number;
  averageOperationRate: number;
  averageOperationRateLabel: string;
  totalOutput: number;
  totalOutputLabel: string;
  defectRate: number;
  defectRateLabel: string;
};

export type DashboardMachineCard = {
  id: string;
  machineId: string;
  name: string;
  factoryName: string;
  lineName: string;
  statusLabel: string;
  statusTone: DashboardTone;
  openAlarmCount: number;
  sensorRecordedAtLabel: string;
  sensorTone: DashboardTone;
  sensorLabel: string;
  links: {
    detail: string;
    alarms: string;
  };
};

export type DashboardAlarmItem = {
  id: string;
  message: string;
  machineName: string;
  factoryName: string;
  severityLabel: string;
  severityTone: DashboardTone;
  statusLabel: string;
  statusTone: DashboardTone;
  occurredAtLabel: string;
  links: {
    alarms: string;
    machine: string;
  };
};

export type DashboardTrendPoint = {
  date: string;
  dateLabel: string;
  totalOutput: number;
  totalOutputLabel: string;
  operationRate: number;
  operationRateLabel: string;
  defectRate: number;
  defectRateLabel: string;
  height: number;
};

export type DashboardDataInput = {
  alarms: AlarmSummary[];
  machines: MachineSummary[];
  reports: ReportSummary[];
  sensorReadings: MachineDetailSensorRow[];
};
