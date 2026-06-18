import type {
  AlarmSummaryRow,
  FactoryRow,
  FactorySummary,
  FactorySummaryInput,
  FactorySummaryLinks,
  FactorySummaryStatus,
  LineRow,
  MachineRow,
  MachineStatusCounts,
  ProductionReportSummaryRow
} from "./types";

const EMPTY_MACHINE_STATUS_COUNTS: MachineStatusCounts = {
  normal: 0,
  warning: 0,
  critical: 0,
  stopped: 0,
  maintenance: 0,
  other: 0
};

export function mapFactorySummaries(input: FactorySummaryInput): FactorySummary[] {
  const linesByFactoryId = groupBy(input.lines, (line) => line.factory_id);
  const machinesByLineId = groupBy(input.machines, (machine) => machine.line_id);
  const lineByMachineId = new Map<string, LineRow>();
  const latestReportByFactoryId = getLatestReportByFactoryId(input.productionReports);

  for (const line of input.lines) {
    const machines = machinesByLineId.get(line.id) ?? [];

    for (const machine of machines) {
      lineByMachineId.set(machine.id, line);
    }
  }

  const openAlarmsByFactoryId = groupOpenAlarmsByFactoryId(input.alarms, lineByMachineId);

  return input.factories.map((factory) => {
    const lines = linesByFactoryId.get(factory.id) ?? [];
    const machines = lines.flatMap((line) => machinesByLineId.get(line.id) ?? []);
    const openAlarms = openAlarmsByFactoryId.get(factory.id) ?? [];
    const latestReport = latestReportByFactoryId.get(factory.id) ?? null;
    const machineStatusCounts = getMachineStatusCounts(machines);
    const criticalOpenAlarmCount = openAlarms.filter((alarm) => alarm.severity === "critical").length;
    const warningOpenAlarmCount = openAlarms.filter((alarm) => alarm.severity === "warning").length;

    return {
      id: factory.id,
      factoryId: factory.id,
      name: factory.name,
      location: factory.location,
      locationLabel: factory.location || "위치 정보 없음",
      description: factory.description,
      sourceStatus: factory.status,
      status: getFactorySummaryStatus({
        factory,
        machineStatusCounts,
        criticalOpenAlarmCount,
        warningOpenAlarmCount
      }),
      lineCount: lines.length,
      activeLineCount: lines.filter((line) => line.status === "active").length,
      machineCount: machines.length,
      machineStatusCounts,
      openAlarmCount: openAlarms.length,
      criticalOpenAlarmCount,
      warningOpenAlarmCount,
      latestReportDate: latestReport?.report_date ?? null,
      latestReportDateLabel: formatReportDate(latestReport?.report_date ?? null),
      links: getFactorySummaryLinks(factory.id)
    };
  });
}

export function sortFactorySummaries(summaries: FactorySummary[]) {
  return [...summaries].sort((left, right) => {
    const priorityDiff = right.status.priority - left.status.priority;

    if (priorityDiff !== 0) {
      return priorityDiff;
    }

    const alarmDiff = right.openAlarmCount - left.openAlarmCount;

    if (alarmDiff !== 0) {
      return alarmDiff;
    }

    return left.name.localeCompare(right.name, "ko");
  });
}

function groupBy<T>(items: T[], getKey: (item: T) => string) {
  const grouped = new Map<string, T[]>();

  for (const item of items) {
    const key = getKey(item);
    const currentItems = grouped.get(key) ?? [];
    currentItems.push(item);
    grouped.set(key, currentItems);
  }

  return grouped;
}

function groupOpenAlarmsByFactoryId(alarms: AlarmSummaryRow[], lineByMachineId: Map<string, LineRow>) {
  const grouped = new Map<string, AlarmSummaryRow[]>();

  for (const alarm of alarms) {
    if (alarm.is_resolved) {
      continue;
    }

    const line = lineByMachineId.get(alarm.machine_id);

    if (!line) {
      continue;
    }

    const currentAlarms = grouped.get(line.factory_id) ?? [];
    currentAlarms.push(alarm);
    grouped.set(line.factory_id, currentAlarms);
  }

  return grouped;
}

function getLatestReportByFactoryId(reports: ProductionReportSummaryRow[]) {
  const latestReports = new Map<string, ProductionReportSummaryRow>();

  for (const report of reports) {
    const currentReport = latestReports.get(report.factory_id);

    if (!currentReport || report.report_date > currentReport.report_date) {
      latestReports.set(report.factory_id, report);
    }
  }

  return latestReports;
}

function getMachineStatusCounts(machines: MachineRow[]): MachineStatusCounts {
  const counts: MachineStatusCounts = { ...EMPTY_MACHINE_STATUS_COUNTS };

  for (const machine of machines) {
    switch (machine.status) {
      case "normal":
      case "warning":
      case "critical":
      case "stopped":
      case "maintenance":
        counts[machine.status] += 1;
        break;
      default:
        counts.other += 1;
    }
  }

  return counts;
}

function getFactorySummaryStatus({
  factory,
  machineStatusCounts,
  criticalOpenAlarmCount,
  warningOpenAlarmCount
}: {
  factory: FactoryRow;
  machineStatusCounts: MachineStatusCounts;
  criticalOpenAlarmCount: number;
  warningOpenAlarmCount: number;
}): FactorySummaryStatus {
  if (criticalOpenAlarmCount > 0 || machineStatusCounts.critical > 0) {
    return {
      value: "critical",
      label: "위험",
      tone: "danger",
      priority: 3
    };
  }

  if (
    warningOpenAlarmCount > 0 ||
    machineStatusCounts.warning > 0 ||
    machineStatusCounts.maintenance > 0
  ) {
    return {
      value: "warning",
      label: "주의",
      tone: "warning",
      priority: 2
    };
  }

  if (factory.status !== "active" || machineStatusCounts.stopped > 0) {
    return {
      value: "offline",
      label: "오프라인",
      tone: "neutral",
      priority: 1
    };
  }

  return {
    value: "normal",
    label: "정상",
    tone: "success",
    priority: 0
  };
}

function getFactorySummaryLinks(factoryId: string): FactorySummaryLinks {
  const encodedFactoryId = encodeURIComponent(factoryId);

  return {
    detail: `/factories/${encodedFactoryId}`,
    machines: `/machines?factoryId=${encodedFactoryId}`,
    alarms: `/alarms?factoryId=${encodedFactoryId}`,
    reports: `/reports?factoryId=${encodedFactoryId}`
  };
}

function formatReportDate(reportDate: string | null) {
  if (!reportDate) {
    return "최근 리포트 없음";
  }

  const [year, month, day] = reportDate.split("-");

  if (!year || !month || !day) {
    return reportDate;
  }

  return `${year}.${month}.${day}`;
}
