import type { Tables } from "@/lib/supabase/types";
import type { FactoryRow } from "@/lib/factories/types";

export type { FactoryRow };

export type ProductionReportRow = Tables<"production_reports">;
export type ReportListRow = Pick<
  ProductionReportRow,
  "id" | "factory_id" | "report_date" | "total_output" | "defect_count" | "operation_rate"
>;

export type ReportStatusValue = "good" | "warning" | "critical" | "unknown";
export type ReportTone = "success" | "warning" | "danger" | "neutral";

export type ReportSummaryStatus = {
  value: ReportStatusValue;
  label: string;
  tone: ReportTone;
  priority: number;
};

export type ReportSummaryLinks = {
  factory: string;
};

export type ReportSummary = {
  id: string;
  reportId: string;
  factoryId: string;
  factoryName: string;
  factoryLocation: string;
  reportDate: string;
  reportDateLabel: string;
  totalOutput: number;
  totalOutputLabel: string;
  defectCount: number;
  defectCountLabel: string;
  defectRate: number;
  defectRateLabel: string;
  operationRate: number;
  operationRateLabel: string;
  status: ReportSummaryStatus;
  links: ReportSummaryLinks;
};

export type ReportSummaryInput = {
  factories: FactoryRow[];
  reports: ReportListRow[];
};
