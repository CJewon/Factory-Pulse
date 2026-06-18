import type {
  DashboardAlarmItem,
  DashboardDataInput,
  DashboardMachineCard,
  DashboardSummary,
  DashboardTrendPoint
} from "./types";
import type { MachineDetailSensorRow, MachineStatusTone } from "@/lib/machines";
import type { ReportSummary } from "@/lib/reports";

const numberFormatter = new Intl.NumberFormat("ko-KR");

export function createDashboardSummary({
  alarms,
  machines,
  reports
}: Pick<DashboardDataInput, "alarms" | "machines" | "reports">): DashboardSummary {
  const latestReports = getLatestReportsByFactory(reports);
  const totalOutput = latestReports.reduce((sum, report) => sum + report.totalOutput, 0);
  const defectCount = latestReports.reduce((sum, report) => sum + report.defectCount, 0);
  const operationRateSum = latestReports.reduce((sum, report) => sum + report.operationRate, 0);
  const averageOperationRate = latestReports.length > 0 ? operationRateSum / latestReports.length : 0;
  const defectRate = totalOutput > 0 ? (defectCount / totalOutput) * 100 : 0;

  return {
    machineCount: machines.length,
    normalMachineCount: machines.filter((machine) => machine.status.value === "normal").length,
    warningMachineCount: machines.filter((machine) => machine.status.value === "warning").length,
    criticalMachineCount: machines.filter((machine) => machine.status.value === "critical").length,
    pausedMachineCount: machines.filter((machine) => machine.status.value === "maintenance" || machine.status.value === "stopped").length,
    openAlarmCount: alarms.filter((alarm) => !alarm.isResolved).length,
    criticalOpenAlarmCount: alarms.filter((alarm) => !alarm.isResolved && alarm.severity.value === "critical").length,
    averageOperationRate,
    averageOperationRateLabel: formatPercent(averageOperationRate),
    totalOutput,
    totalOutputLabel: `${numberFormatter.format(totalOutput)}개`,
    defectRate,
    defectRateLabel: formatPercent(defectRate)
  };
}

export function createDashboardMachineBoard({
  machines,
  sensorReadings
}: Pick<DashboardDataInput, "machines" | "sensorReadings">): DashboardMachineCard[] {
  const latestSensors = getLatestSensorsByMachine(sensorReadings);

  return machines
    .map((machine) => {
      const sensor = latestSensors.get(machine.machineId) ?? null;
      const sensorTone = sensor ? getSensorTone(sensor) : "neutral";

      return {
        id: machine.machineId,
        machineId: machine.machineId,
        name: machine.name,
        factoryName: machine.factoryName,
        lineName: machine.lineName,
        statusLabel: machine.status.label,
        statusTone: machine.status.tone,
        openAlarmCount: machine.openAlarmCount,
        sensorRecordedAtLabel: sensor ? formatDateTime(sensor.recorded_at) : "센서 데이터 없음",
        sensorLabel: sensor ? getSensorLabel(sensorTone) : "확인 필요",
        sensorTone,
        links: machine.links
      };
    })
    .sort(compareDashboardMachines)
    .slice(0, 6);
}

export function createDashboardRecentAlarms(alarms: DashboardDataInput["alarms"], limit = 5): DashboardAlarmItem[] {
  return [...alarms]
    .sort((left, right) => {
      const resolvedDiff = Number(left.isResolved) - Number(right.isResolved);

      if (resolvedDiff !== 0) {
        return resolvedDiff;
      }

      const severityDiff = right.severity.priority - left.severity.priority;

      if (severityDiff !== 0) {
        return severityDiff;
      }

      return right.occurredAt.localeCompare(left.occurredAt);
    })
    .slice(0, limit)
    .map((alarm) => ({
      id: alarm.alarmId,
      factoryName: alarm.factoryName,
      machineName: alarm.machineName,
      message: alarm.message,
      occurredAtLabel: alarm.occurredAtLabel,
      severityLabel: alarm.severity.label,
      severityTone: alarm.severity.tone,
      statusLabel: alarm.status.label,
      statusTone: alarm.status.tone,
      links: {
        alarms: `/alarms?machineId=${encodeURIComponent(alarm.machineId)}`,
        machine: alarm.links.machine
      }
    }));
}

export function createDashboardTrend(reports: ReportSummary[], limit = 10): DashboardTrendPoint[] {
  const grouped = new Map<string, ReportSummary[]>();

  for (const report of reports) {
    const group = grouped.get(report.reportDate) ?? [];
    group.push(report);
    grouped.set(report.reportDate, group);
  }

  const points = [...grouped.entries()]
    .sort(([leftDate], [rightDate]) => leftDate.localeCompare(rightDate))
    .slice(-limit)
    .map(([date, items]) => {
      const totalOutput = items.reduce((sum, report) => sum + report.totalOutput, 0);
      const defectCount = items.reduce((sum, report) => sum + report.defectCount, 0);
      const operationRate = items.reduce((sum, report) => sum + report.operationRate, 0) / items.length;
      const defectRate = totalOutput > 0 ? (defectCount / totalOutput) * 100 : 0;

      return {
        date,
        dateLabel: formatDate(date),
        defectRate,
        defectRateLabel: formatPercent(defectRate),
        height: 0,
        operationRate,
        operationRateLabel: formatPercent(operationRate),
        totalOutput,
        totalOutputLabel: `${numberFormatter.format(totalOutput)}개`
      };
    });
  const maxOutput = Math.max(0, ...points.map((point) => point.totalOutput));

  return points.map((point) => ({
    ...point,
    height: maxOutput > 0 ? Math.max(8, Math.round((point.totalOutput / maxOutput) * 100)) : 8
  }));
}

function getLatestReportsByFactory(reports: ReportSummary[]) {
  const latestReports = new Map<string, ReportSummary>();

  for (const report of reports) {
    const current = latestReports.get(report.factoryId);

    if (!current || report.reportDate > current.reportDate) {
      latestReports.set(report.factoryId, report);
    }
  }

  return [...latestReports.values()];
}

function getLatestSensorsByMachine(readings: MachineDetailSensorRow[]) {
  const latestSensors = new Map<string, MachineDetailSensorRow>();

  for (const reading of readings) {
    const current = latestSensors.get(reading.machine_id);

    if (!current || reading.recorded_at > current.recorded_at) {
      latestSensors.set(reading.machine_id, reading);
    }
  }

  return latestSensors;
}

function compareDashboardMachines(left: DashboardMachineCard, right: DashboardMachineCard) {
  const statusDiff = getTonePriority(right.statusTone) - getTonePriority(left.statusTone);

  if (statusDiff !== 0) {
    return statusDiff;
  }

  const alarmDiff = right.openAlarmCount - left.openAlarmCount;

  if (alarmDiff !== 0) {
    return alarmDiff;
  }

  return left.name.localeCompare(right.name, "ko");
}

function getSensorTone(reading: MachineDetailSensorRow): MachineStatusTone {
  if (reading.temperature > 95 || reading.pressure > 5.5 || reading.current_amp > 20 || reading.vibration > 0.12) {
    return "danger";
  }

  if (
    reading.temperature > 85 ||
    reading.pressure > 4.5 ||
    reading.current_amp > 16 ||
    reading.vibration > 0.08
  ) {
    return "warning";
  }

  return "success";
}

function getSensorLabel(tone: MachineStatusTone) {
  if (tone === "danger") {
    return "센서 위험";
  }

  if (tone === "warning") {
    return "센서 주의";
  }

  return "센서 정상";
}

function getTonePriority(tone: MachineStatusTone) {
  switch (tone) {
    case "danger":
      return 4;
    case "warning":
      return 3;
    case "info":
      return 2;
    case "neutral":
      return 1;
    case "success":
    default:
      return 0;
  }
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-");

  if (!year || !month || !day) {
    return value;
  }

  return `${year}.${month}.${day}`;
}

function formatDateTime(value: string) {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Seoul"
  }).format(parsed);
}

function formatPercent(value: number) {
  if (!Number.isFinite(value)) {
    return "-";
  }

  return `${value.toFixed(1)}%`;
}
