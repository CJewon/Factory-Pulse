import type {
  AlarmSummaryRow,
  MachineDetail,
  MachineDetailAlarm,
  MachineDetailAlarmRow,
  MachineDetailInput,
  MachineRow,
  MachineStatusValue,
  MachineSummary,
  MachineSummaryInput,
  MachineSummaryLinks,
  MachineSummaryStatus,
  SensorMetric,
  SensorStatusValue
} from "./types";

export function mapMachineSummaries(input: MachineSummaryInput): MachineSummary[] {
  const factoriesById = new Map(input.factories.map((factory) => [factory.id, factory]));
  const linesById = new Map(input.lines.map((line) => [line.id, line]));
  const openAlarmsByMachineId = groupOpenAlarmsByMachineId(input.alarms);

  return input.machines.flatMap((machine) => {
    const line = linesById.get(machine.line_id);

    if (!line) {
      return [];
    }

    const factory = factoriesById.get(line.factory_id);

    if (!factory) {
      return [];
    }

    const openAlarms = openAlarmsByMachineId.get(machine.id) ?? [];
    const criticalOpenAlarmCount = openAlarms.filter((alarm) => alarm.severity === "critical").length;
    const warningOpenAlarmCount = openAlarms.filter((alarm) => alarm.severity === "warning").length;

    return {
      id: machine.id,
      machineId: machine.id,
      name: machine.name,
      type: machine.type,
      modelName: machine.model_name,
      modelNameLabel: machine.model_name || "모델 정보 없음",
      installedAt: machine.installed_at,
      installedAtLabel: formatDate(machine.installed_at),
      status: getMachineSummaryStatus(machine.status),
      factoryId: factory.id,
      factoryName: factory.name,
      lineId: line.id,
      lineName: line.name,
      openAlarmCount: openAlarms.length,
      criticalOpenAlarmCount,
      warningOpenAlarmCount,
      links: getMachineSummaryLinks(machine.id)
    };
  });
}

export function sortMachineSummaries(summaries: MachineSummary[]) {
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

export function mapMachineDetail(input: MachineDetailInput): MachineDetail {
  return {
    ...input.machine,
    sensorSnapshot: input.latestSensorReading ? mapSensorSnapshot(input.latestSensorReading) : null,
    recentAlarms: input.recentAlarms.map(mapMachineDetailAlarm)
  };
}

function groupOpenAlarmsByMachineId(alarms: AlarmSummaryRow[]) {
  const grouped = new Map<string, AlarmSummaryRow[]>();

  for (const alarm of alarms) {
    if (alarm.is_resolved) {
      continue;
    }

    const currentAlarms = grouped.get(alarm.machine_id) ?? [];
    currentAlarms.push(alarm);
    grouped.set(alarm.machine_id, currentAlarms);
  }

  return grouped;
}

function mapSensorSnapshot(reading: MachineDetailInput["latestSensorReading"]) {
  if (!reading) {
    return null;
  }

  return {
    id: reading.id,
    recordedAt: reading.recorded_at,
    recordedAtLabel: formatDateTime(reading.recorded_at),
    metrics: [
      getSensorMetric({
        key: "temperature",
        label: "온도",
        rangeLabel: "정상 범위 40~85°C",
        unit: "°C",
        value: reading.temperature,
        warning: (value) => value < 40 || value > 85,
        critical: (value) => value < 30 || value > 95
      }),
      getSensorMetric({
        key: "pressure",
        label: "압력",
        rangeLabel: "정상 범위 2.0~4.5bar",
        unit: "bar",
        value: reading.pressure,
        warning: (value) => value < 2 || value > 4.5,
        critical: (value) => value < 1 || value > 5.5
      }),
      getSensorMetric({
        key: "currentAmp",
        label: "전류",
        rangeLabel: "정상 범위 4~16A",
        unit: "A",
        value: reading.current_amp,
        warning: (value) => value < 4 || value > 16,
        critical: (value) => value < 2 || value > 20
      }),
      getSensorMetric({
        key: "vibration",
        label: "진동",
        rangeLabel: "정상 범위 0.00~0.08mm/s",
        unit: "mm/s",
        value: reading.vibration,
        warning: (value) => value > 0.08,
        critical: (value) => value > 0.12
      })
    ]
  };
}

function getSensorMetric({
  critical,
  key,
  label,
  rangeLabel,
  unit,
  value,
  warning
}: {
  critical: (value: number) => boolean;
  key: SensorMetric["key"];
  label: string;
  rangeLabel: string;
  unit: string;
  value: number | string;
  warning: (value: number) => boolean;
}): SensorMetric {
  const numericValue = toNumber(value);
  const status = getSensorStatus(numericValue, warning, critical);

  return {
    key,
    label,
    rangeLabel,
    status,
    value: numericValue,
    valueLabel: `${formatSensorValue(numericValue)}${unit}`
  };
}

function getSensorStatus(
  value: number,
  warning: (value: number) => boolean,
  critical: (value: number) => boolean
): SensorMetric["status"] {
  const normalized = normalizeSensorStatus(value, warning, critical);

  switch (normalized) {
    case "critical":
      return { value: normalized, label: "위험", tone: "danger" };
    case "warning":
      return { value: normalized, label: "주의", tone: "warning" };
    case "normal":
      return { value: normalized, label: "정상", tone: "success" };
    case "unknown":
    default:
      return { value: "unknown", label: "확인 필요", tone: "neutral" };
  }
}

function normalizeSensorStatus(
  value: number,
  warning: (value: number) => boolean,
  critical: (value: number) => boolean
): SensorStatusValue {
  if (!Number.isFinite(value)) {
    return "unknown";
  }

  if (critical(value)) {
    return "critical";
  }

  if (warning(value)) {
    return "warning";
  }

  return "normal";
}

function mapMachineDetailAlarm(alarm: MachineDetailAlarmRow): MachineDetailAlarm {
  return {
    id: alarm.id,
    message: alarm.message,
    occurredAt: alarm.occurred_at,
    occurredAtLabel: formatDateTime(alarm.occurred_at),
    severity: getAlarmSeverity(alarm.severity),
    status: alarm.is_resolved
      ? { value: "resolved", label: "해결됨", tone: "success" }
      : { value: "open", label: "미해결", tone: getOpenAlarmTone(alarm.severity) }
  };
}

function getAlarmSeverity(severity: MachineDetailAlarmRow["severity"]): MachineDetailAlarm["severity"] {
  switch (severity) {
    case "critical":
      return { value: "critical", label: "위험", tone: "danger", priority: 3 };
    case "warning":
      return { value: "warning", label: "주의", tone: "warning", priority: 2 };
    case "info":
      return { value: "info", label: "정보", tone: "info", priority: 1 };
    default:
      return { value: "unknown", label: "확인 필요", tone: "neutral", priority: 0 };
  }
}

function getOpenAlarmTone(severity: MachineDetailAlarmRow["severity"]): MachineSummaryStatus["tone"] {
  if (severity === "critical") {
    return "danger";
  }

  if (severity === "warning") {
    return "warning";
  }

  return "info";
}

function getMachineSummaryStatus(status: MachineRow["status"]): MachineSummaryStatus {
  const normalized = normalizeMachineStatus(status);

  switch (normalized) {
    case "critical":
      return { value: "critical", label: "위험", tone: "danger", priority: 5 };
    case "warning":
      return { value: "warning", label: "주의", tone: "warning", priority: 4 };
    case "maintenance":
      return { value: "maintenance", label: "점검", tone: "info", priority: 3 };
    case "stopped":
      return { value: "stopped", label: "정지", tone: "neutral", priority: 2 };
    case "normal":
      return { value: "normal", label: "정상", tone: "success", priority: 1 };
    case "unknown":
    default:
      return { value: "unknown", label: "확인 필요", tone: "neutral", priority: 0 };
  }
}

function normalizeMachineStatus(status: MachineRow["status"]): MachineStatusValue {
  switch (status) {
    case "normal":
    case "warning":
    case "critical":
    case "stopped":
    case "maintenance":
      return status;
    default:
      return "unknown";
  }
}

function getMachineSummaryLinks(machineId: string): MachineSummaryLinks {
  const encodedMachineId = encodeURIComponent(machineId);

  return {
    detail: `/machines/${encodedMachineId}`,
    alarms: `/alarms?machineId=${encodedMachineId}`
  };
}

function formatDate(value: string | null) {
  if (!value) {
    return "설치일 없음";
  }

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

function formatSensorValue(value: number) {
  if (!Number.isFinite(value)) {
    return "-";
  }

  return new Intl.NumberFormat("ko-KR", {
    maximumFractionDigits: value < 1 ? 3 : 1,
    minimumFractionDigits: value < 1 ? 2 : 0
  }).format(value);
}

function toNumber(value: number | string) {
  const parsed = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(parsed)) {
    return Number.NaN;
  }

  return parsed;
}
