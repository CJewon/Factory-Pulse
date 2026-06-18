import type {
  AlarmListRow,
  AlarmSeverity,
  AlarmSeverityValue,
  AlarmStatus,
  AlarmSummary,
  AlarmSummaryInput,
  AlarmSummaryLinks,
  AlarmTone
} from "./types";

export function mapAlarmSummaries(input: AlarmSummaryInput): AlarmSummary[] {
  const factoriesById = new Map(input.factories.map((factory) => [factory.id, factory]));
  const linesById = new Map(input.lines.map((line) => [line.id, line]));
  const machinesById = new Map(input.machines.map((machine) => [machine.id, machine]));

  return input.alarms.flatMap((alarm) => {
    const machine = machinesById.get(alarm.machine_id);

    if (!machine) {
      return [];
    }

    const line = linesById.get(machine.line_id);

    if (!line) {
      return [];
    }

    const factory = factoriesById.get(line.factory_id);

    if (!factory) {
      return [];
    }

    return {
      id: alarm.id,
      alarmId: alarm.id,
      message: alarm.message,
      severity: getAlarmSeverity(alarm.severity),
      status: getAlarmStatus(alarm),
      isResolved: alarm.is_resolved,
      occurredAt: alarm.occurred_at,
      occurredAtLabel: formatDateTime(alarm.occurred_at),
      resolvedAt: alarm.resolved_at,
      resolvedAtLabel: alarm.resolved_at ? formatDateTime(alarm.resolved_at) : "미해결",
      factoryId: factory.id,
      factoryName: factory.name,
      lineId: line.id,
      lineName: line.name,
      machineId: machine.id,
      machineName: machine.name,
      machineType: machine.type,
      machineStatus: machine.status,
      links: getAlarmSummaryLinks(machine.id, factory.id)
    };
  });
}

export function sortAlarmSummaries(summaries: AlarmSummary[]) {
  return [...summaries].sort((left, right) => {
    const statusDiff = Number(left.isResolved) - Number(right.isResolved);

    if (statusDiff !== 0) {
      return statusDiff;
    }

    const severityDiff = right.severity.priority - left.severity.priority;

    if (severityDiff !== 0) {
      return severityDiff;
    }

    return right.occurredAt.localeCompare(left.occurredAt);
  });
}

function getAlarmSeverity(severity: AlarmListRow["severity"]): AlarmSeverity {
  const value = normalizeSeverity(severity);

  switch (value) {
    case "critical":
      return { value, label: "위험", tone: "danger", priority: 3 };
    case "warning":
      return { value, label: "주의", tone: "warning", priority: 2 };
    case "info":
      return { value, label: "정보", tone: "info", priority: 1 };
    case "unknown":
    default:
      return { value: "unknown", label: "확인 필요", tone: "neutral", priority: 0 };
  }
}

function normalizeSeverity(severity: AlarmListRow["severity"]): AlarmSeverityValue {
  switch (severity) {
    case "critical":
    case "warning":
    case "info":
      return severity;
    default:
      return "unknown";
  }
}

function getAlarmStatus(alarm: AlarmListRow): AlarmStatus {
  if (alarm.is_resolved) {
    return { value: "resolved", label: "해결됨", tone: "success" };
  }

  return { value: "open", label: "미해결", tone: getOpenStatusTone(alarm.severity) };
}

function getOpenStatusTone(severity: AlarmListRow["severity"]): AlarmTone {
  if (severity === "critical") {
    return "danger";
  }

  if (severity === "warning") {
    return "warning";
  }

  return "info";
}

function getAlarmSummaryLinks(machineId: string, factoryId: string): AlarmSummaryLinks {
  return {
    factory: `/factories/${encodeURIComponent(factoryId)}`,
    machine: `/machines/${encodeURIComponent(machineId)}`
  };
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
