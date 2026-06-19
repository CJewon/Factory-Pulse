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
  detail: string;
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

export type ReportDateTotals = {
  reportCount: number;
  totalOutput: number;
  totalDefects: number;
  averageOperationRate: number;
  defectRate: number;
  riskCount: number;
};

export type ReportDateStatusCount = {
  good: number;
  warning: number;
  critical: number;
  unknown: number;
};

export type ReportDateDetail = {
  reportDate: string;
  reportDateLabel: string;
  reports: ReportSummary[];
  totals: ReportDateTotals;
  statusCounts: ReportDateStatusCount;
  topOutputReport: ReportSummary | null;
  lowestOperationReport: ReportSummary | null;
  highestDefectReport: ReportSummary | null;
};

export type ReportCompareInput = {
  factoryId?: string;
  fromA: string;
  fromB: string;
  reports: ReportSummary[];
  toA: string;
  toB: string;
};

export type ReportComparePeriod = {
  dayCount: number;
  from: string;
  fromLabel: string;
  to: string;
  toLabel: string;
};

export type ReportCompareDelta = {
  direction: "down" | "flat" | "up";
  label: string;
  tone: ReportTone;
  value: number;
};

export type ReportCompareDeltas = {
  averageOperationRate: ReportCompareDelta;
  defectRate: ReportCompareDelta;
  riskCount: ReportCompareDelta;
  totalOutput: ReportCompareDelta;
};

export type ReportCompareFactoryRow = {
  deltas: ReportCompareDeltas;
  factoryId: string;
  factoryLocation: string;
  factoryName: string;
  links: {
    reports: string;
    factory: string;
  };
  periodA: ReportDateTotals;
  periodB: ReportDateTotals;
};

export type ReportCompareTrendPoint = {
  averageOperationRate: number;
  date: string;
  dateLabel: string;
  defectRate: number;
  riskCount: number;
  totalOutput: number;
};

export type ReportCompareResult = {
  deltas: ReportCompareDeltas;
  factoryRows: ReportCompareFactoryRow[];
  periodA: ReportComparePeriod;
  periodAReports: ReportSummary[];
  periodATotals: ReportDateTotals;
  periodB: ReportComparePeriod;
  periodBReports: ReportSummary[];
  periodBTotals: ReportDateTotals;
  trend: ReportCompareTrendPoint[];
};
