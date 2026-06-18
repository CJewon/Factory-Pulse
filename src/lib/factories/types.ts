import type { Tables } from "@/lib/supabase/types";

export type FactoryRow = Tables<"factories">;
export type LineRow = Tables<"lines">;
export type MachineRow = Tables<"machines">;
export type AlarmRow = Tables<"alarms">;
export type ProductionReportRow = Tables<"production_reports">;
export type AlarmSummaryRow = Pick<AlarmRow, "id" | "machine_id" | "severity" | "is_resolved" | "occurred_at">;
export type ProductionReportSummaryRow = Pick<ProductionReportRow, "id" | "factory_id" | "report_date">;

export type FactoryStatusValue = "normal" | "warning" | "critical" | "offline";
export type FactoryStatusTone = "success" | "warning" | "danger" | "neutral";

export type FactorySummaryStatus = {
  value: FactoryStatusValue;
  label: string;
  tone: FactoryStatusTone;
  priority: number;
};

export type FactorySummaryLinks = {
  detail: string;
  machines: string;
  alarms: string;
  reports: string;
};

export type MachineStatusCounts = {
  normal: number;
  warning: number;
  critical: number;
  stopped: number;
  maintenance: number;
  other: number;
};

export type FactorySummary = {
  id: string;
  factoryId: string;
  name: string;
  location: string;
  locationLabel: string;
  description: string | null;
  sourceStatus: string;
  status: FactorySummaryStatus;
  lineCount: number;
  activeLineCount: number;
  machineCount: number;
  machineStatusCounts: MachineStatusCounts;
  openAlarmCount: number;
  criticalOpenAlarmCount: number;
  warningOpenAlarmCount: number;
  latestReportDate: string | null;
  latestReportDateLabel: string;
  links: FactorySummaryLinks;
};

export type FactorySummaryInput = {
  factories: FactoryRow[];
  lines: LineRow[];
  machines: MachineRow[];
  alarms: AlarmSummaryRow[];
  productionReports: ProductionReportSummaryRow[];
};
