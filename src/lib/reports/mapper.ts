import type {
  ReportCompareDelta,
  ReportCompareDeltas,
  ReportCompareFactoryRow,
  ReportCompareInput,
  ReportComparePeriod,
  ReportCompareResult,
  ReportCompareTrendPoint,
  ReportDateDetail,
  ReportDateStatusCount,
  ReportDateTotals,
  ReportStatusValue,
  ReportSummary,
  ReportSummaryInput,
  ReportSummaryLinks,
  ReportSummaryStatus,
  ReportTone
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

export function mapReportComparison({
  factoryId = "all",
  fromA,
  fromB,
  reports,
  toA,
  toB
}: ReportCompareInput): ReportCompareResult {
  const periodA = createReportComparePeriod(fromA, toA);
  const periodB = createReportComparePeriod(fromB, toB);
  const scopedReports = reports.filter((report) => factoryId === "all" || report.factoryId === factoryId);
  const periodAReports = scopedReports.filter((report) => isReportInRange(report, periodA));
  const periodBReports = scopedReports.filter((report) => isReportInRange(report, periodB));
  const periodATotals = getReportDateTotals(periodAReports);
  const periodBTotals = getReportDateTotals(periodBReports);

  return {
    deltas: getReportCompareDeltas(periodATotals, periodBTotals),
    factoryRows: getReportCompareFactoryRows(periodAReports, periodBReports),
    periodA,
    periodAReports,
    periodATotals,
    periodB,
    periodBReports,
    periodBTotals,
    trend: getReportCompareTrend(periodAReports)
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

function createReportComparePeriod(from: string, to: string): ReportComparePeriod {
  return {
    dayCount: getInclusiveDayCount(from, to),
    from,
    fromLabel: formatReportDate(from),
    to,
    toLabel: formatReportDate(to)
  };
}

function isReportInRange(report: ReportSummary, period: ReportComparePeriod) {
  return report.reportDate >= period.from && report.reportDate <= period.to;
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

function getReportCompareDeltas(current: ReportDateTotals, previous: ReportDateTotals): ReportCompareDeltas {
  return {
    averageOperationRate: getPointDelta(current.averageOperationRate, previous.averageOperationRate, "lower-is-bad"),
    defectRate: getPointDelta(current.defectRate, previous.defectRate, "lower-is-good"),
    riskCount: getCountDelta(current.riskCount, previous.riskCount, "lower-is-good"),
    totalOutput: getPercentDelta(current.totalOutput, previous.totalOutput, "higher-is-good")
  };
}

function getReportCompareFactoryRows(
  periodAReports: ReportSummary[],
  periodBReports: ReportSummary[]
): ReportCompareFactoryRow[] {
  const factoryMap = new Map<string, ReportSummary>();

  for (const report of [...periodAReports, ...periodBReports]) {
    if (!factoryMap.has(report.factoryId)) {
      factoryMap.set(report.factoryId, report);
    }
  }

  return [...factoryMap.values()]
    .map((factoryReport) => {
      const periodA = getReportDateTotals(periodAReports.filter((report) => report.factoryId === factoryReport.factoryId));
      const periodB = getReportDateTotals(periodBReports.filter((report) => report.factoryId === factoryReport.factoryId));

      return {
        deltas: getReportCompareDeltas(periodA, periodB),
        factoryId: factoryReport.factoryId,
        factoryLocation: factoryReport.factoryLocation,
        factoryName: factoryReport.factoryName,
        links: {
          factory: factoryReport.links.factory,
          reports: `/reports?factoryId=${encodeURIComponent(factoryReport.factoryId)}`
        },
        periodA,
        periodB
      };
    })
    .sort((left, right) => {
      const riskDiff = right.periodA.riskCount - left.periodA.riskCount;

      if (riskDiff !== 0) {
        return riskDiff;
      }

      const outputDiff = right.periodA.totalOutput - left.periodA.totalOutput;

      if (outputDiff !== 0) {
        return outputDiff;
      }

      return left.factoryName.localeCompare(right.factoryName, "ko");
    });
}

function getReportCompareTrend(reports: ReportSummary[]): ReportCompareTrendPoint[] {
  const reportsByDate = new Map<string, ReportSummary[]>();

  for (const report of reports) {
    reportsByDate.set(report.reportDate, [...(reportsByDate.get(report.reportDate) ?? []), report]);
  }

  return [...reportsByDate.entries()]
    .sort(([leftDate], [rightDate]) => leftDate.localeCompare(rightDate))
    .map(([date, dailyReports]) => {
      const totals = getReportDateTotals(dailyReports);

      return {
        averageOperationRate: totals.averageOperationRate,
        date,
        dateLabel: formatReportDate(date),
        defectRate: totals.defectRate,
        riskCount: totals.riskCount,
        totalOutput: totals.totalOutput
      };
    });
}

function getPercentDelta(current: number, previous: number, toneRule: "higher-is-good" | "lower-is-good"): ReportCompareDelta {
  if (previous === 0) {
    if (current === 0) {
      return { direction: "flat", label: "변화 없음", tone: "neutral", value: 0 };
    }

    return {
      direction: "up",
      label: "신규 발생",
      tone: toneRule === "higher-is-good" ? "success" : "danger",
      value: 100
    };
  }

  const value = ((current - previous) / previous) * 100;

  return {
    direction: getDeltaDirection(value),
    label: `${formatSigned(value)}%`,
    tone: getDeltaTone(value, toneRule),
    value
  };
}

function getPointDelta(
  current: number,
  previous: number,
  toneRule: "lower-is-bad" | "lower-is-good"
): ReportCompareDelta {
  const value = current - previous;

  return {
    direction: getDeltaDirection(value),
    label: `${formatSigned(value)}%p`,
    tone: getDeltaTone(value, toneRule === "lower-is-bad" ? "higher-is-good" : "lower-is-good"),
    value
  };
}

function getCountDelta(current: number, previous: number, toneRule: "lower-is-good"): ReportCompareDelta {
  const value = current - previous;

  return {
    direction: getDeltaDirection(value),
    label: `${formatSigned(value)}건`,
    tone: getDeltaTone(value, toneRule),
    value
  };
}

function getDeltaDirection(value: number): ReportCompareDelta["direction"] {
  if (value > 0) {
    return "up";
  }

  if (value < 0) {
    return "down";
  }

  return "flat";
}

function getDeltaTone(value: number, toneRule: "higher-is-good" | "lower-is-good"): ReportTone {
  if (value === 0) {
    return "neutral";
  }

  if (toneRule === "higher-is-good") {
    return value > 0 ? "success" : "danger";
  }

  return value < 0 ? "success" : "danger";
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

function formatSigned(value: number) {
  if (!Number.isFinite(value)) {
    return "0.0";
  }

  const fixed = Math.abs(value).toFixed(1);

  if (value > 0) {
    return `+${fixed}`;
  }

  if (value < 0) {
    return `-${fixed}`;
  }

  return "0.0";
}

function toNumber(value: number | string) {
  const parsed = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return parsed;
}

function getInclusiveDayCount(from: string, to: string) {
  const fromDate = new Date(`${from}T00:00:00Z`);
  const toDate = new Date(`${to}T00:00:00Z`);
  const diff = toDate.getTime() - fromDate.getTime();

  return Math.max(1, Math.round(diff / 86400000) + 1);
}
