import type {
  ReportDateDetail,
  ReportDateStatusCount,
  ReportDateTotals,
  ReportStatusValue,
  ReportSummary,
  ReportSummaryInput,
  ReportSummaryLinks,
  ReportSummaryStatus
} from "./types";

const numberFormatter = new Intl.NumberFormat("ko-KR");

export function mapReportSummaries(input: ReportSummaryInput): ReportSummary[] {
  const factoriesById = new Map(input.factories.map((factory) => [factory.id, factory]));

  return input.reports.flatMap((report) => {
    const factory = factoriesById.get(report.factory_id);

    if (!factory) {
      return [];
    }

    const totalOutput = toNumber(report.total_output);
    const defectCount = toNumber(report.defect_count);
    const operationRate = toNumber(report.operation_rate);
    const defectRate = getDefectRate(defectCount, totalOutput);

    return {
      id: report.id,
      reportId: report.id,
      factoryId: factory.id,
      factoryName: factory.name,
      factoryLocation: factory.location,
      reportDate: report.report_date,
      reportDateLabel: formatReportDate(report.report_date),
      totalOutput,
      totalOutputLabel: `${numberFormatter.format(totalOutput)}개`,
      defectCount,
      defectCountLabel: `${numberFormatter.format(defectCount)}건`,
      defectRate,
      defectRateLabel: formatPercent(defectRate),
      operationRate,
      operationRateLabel: formatPercent(operationRate),
      status: getReportStatus({ defectRate, operationRate, totalOutput }),
      links: getReportSummaryLinks(factory.id, report.report_date)
    };
  });
}

export function mapReportDateDetail(reportDate: string, summaries: ReportSummary[]): ReportDateDetail {
  const reports = sortReportsForDate(summaries.filter((summary) => summary.reportDate === reportDate));

  return {
    reportDate,
    reportDateLabel: formatReportDate(reportDate),
    reports,
    totals: getReportDateTotals(reports),
    statusCounts: getReportDateStatusCounts(reports),
    topOutputReport: getTopOutputReport(reports),
    lowestOperationReport: getLowestOperationReport(reports),
    highestDefectReport: getHighestDefectReport(reports)
  };
}

export function sortReportSummaries(summaries: ReportSummary[]) {
  return [...summaries].sort((left, right) => {
    const dateDiff = right.reportDate.localeCompare(left.reportDate);

    if (dateDiff !== 0) {
      return dateDiff;
    }

    return left.factoryName.localeCompare(right.factoryName, "ko");
  });
}

function sortReportsForDate(reports: ReportSummary[]) {
  return [...reports].sort((left, right) => {
    const statusDiff = right.status.priority - left.status.priority;

    if (statusDiff !== 0) {
      return statusDiff;
    }

    return left.factoryName.localeCompare(right.factoryName, "ko");
  });
}

function getReportDateTotals(reports: ReportSummary[]): ReportDateTotals {
  const totalOutput = reports.reduce((sum, report) => sum + report.totalOutput, 0);
  const totalDefects = reports.reduce((sum, report) => sum + report.defectCount, 0);
  const operationSum = reports.reduce((sum, report) => sum + report.operationRate, 0);
  const averageOperationRate = reports.length > 0 ? operationSum / reports.length : 0;

  return {
    reportCount: reports.length,
    totalOutput,
    totalDefects,
    averageOperationRate,
    defectRate: getDefectRate(totalDefects, totalOutput),
    riskCount: reports.filter((report) => report.status.value === "critical" || report.status.value === "warning").length
  };
}

function getReportDateStatusCounts(reports: ReportSummary[]): ReportDateStatusCount {
  return reports.reduce(
    (counts, report) => {
      counts[report.status.value] += 1;
      return counts;
    },
    {
      good: 0,
      warning: 0,
      critical: 0,
      unknown: 0
    }
  );
}

function getTopOutputReport(reports: ReportSummary[]) {
  return reports.reduce<ReportSummary | null>((topReport, report) => {
    if (!topReport || report.totalOutput > topReport.totalOutput) {
      return report;
    }

    return topReport;
  }, null);
}

function getLowestOperationReport(reports: ReportSummary[]) {
  return reports.reduce<ReportSummary | null>((lowestReport, report) => {
    if (!lowestReport || report.operationRate < lowestReport.operationRate) {
      return report;
    }

    return lowestReport;
  }, null);
}

function getHighestDefectReport(reports: ReportSummary[]) {
  return reports.reduce<ReportSummary | null>((highestReport, report) => {
    if (!highestReport || report.defectRate > highestReport.defectRate) {
      return report;
    }

    return highestReport;
  }, null);
}

function getDefectRate(defectCount: number, totalOutput: number) {
  if (totalOutput <= 0) {
    return 0;
  }

  return (defectCount / totalOutput) * 100;
}

function getReportStatus({
  defectRate,
  operationRate,
  totalOutput
}: {
  defectRate: number;
  operationRate: number;
  totalOutput: number;
}): ReportSummaryStatus {
  const value = normalizeReportStatus({ defectRate, operationRate, totalOutput });

  switch (value) {
    case "critical":
      return { value, label: "확인 필요", tone: "danger", priority: 3 };
    case "warning":
      return { value, label: "주의", tone: "warning", priority: 2 };
    case "good":
      return { value, label: "양호", tone: "success", priority: 1 };
    case "unknown":
    default:
      return { value: "unknown", label: "데이터 부족", tone: "neutral", priority: 0 };
  }
}

function normalizeReportStatus({
  defectRate,
  operationRate,
  totalOutput
}: {
  defectRate: number;
  operationRate: number;
  totalOutput: number;
}): ReportStatusValue {
  if (totalOutput <= 0 || !Number.isFinite(operationRate)) {
    return "unknown";
  }

  if (operationRate < 80 || defectRate >= 5) {
    return "critical";
  }

  if (operationRate < 90 || defectRate >= 2) {
    return "warning";
  }

  return "good";
}

function getReportSummaryLinks(factoryId: string, reportDate: string): ReportSummaryLinks {
  return {
    factory: `/factories/${encodeURIComponent(factoryId)}`,
    detail: `/reports/${encodeURIComponent(reportDate)}`
  };
}

function formatReportDate(reportDate: string) {
  const [year, month, day] = reportDate.split("-");

  if (!year || !month || !day) {
    return reportDate;
  }

  return `${year}.${month}.${day}`;
}

function formatPercent(value: number) {
  if (!Number.isFinite(value)) {
    return "-";
  }

  return `${value.toFixed(1)}%`;
}

function toNumber(value: number | string) {
  const parsed = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return parsed;
}
