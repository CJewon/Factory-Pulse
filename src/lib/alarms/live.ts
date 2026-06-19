import { mapAlarmSummaries, sortAlarmSummaries } from "./mapper";
import type { AlarmSeverityValue, AlarmStatusValue, AlarmSummary, AlarmSummaryInput } from "./types";

export type LiveAlarmSeverityFilter = "all" | AlarmSeverityValue;
export type LiveAlarmStatusFilter = "all" | AlarmStatusValue;

export type LiveAlarmFilters = {
  factoryId: string | null;
  machineId: string | null;
  severity: LiveAlarmSeverityFilter;
  status: LiveAlarmStatusFilter;
  limit: number;
};

export type LiveAlarmFilterOption = {
  id: string;
  name: string;
};

export type LiveAlarmSnapshot = {
  alarms: AlarmSummary[];
  fetchedAt: string;
  filters: LiveAlarmFilters;
  filterIssue: string | null;
  options: {
    factories: LiveAlarmFilterOption[];
    machines: Array<LiveAlarmFilterOption & { factoryId: string }>;
  };
  totals: {
    visibleCount: number;
    openCount: number;
    openCriticalCount: number;
    openWarningCount: number;
    recentOpenCount: number;
  };
};

export const liveAlarmRefreshIntervals = [10, 15, 30, 60] as const;
export const liveAlarmLimitOptions = [10, 20, 30, 50] as const;

export const defaultLiveAlarmFilters: LiveAlarmFilters = {
  factoryId: null,
  machineId: null,
  severity: "all",
  status: "open",
  limit: 20
};

export function parseLiveAlarmSearchParams(searchParams: URLSearchParams): LiveAlarmFilters {
  return {
    factoryId: normalizeOptionalId(searchParams.get("factoryId")),
    machineId: normalizeOptionalId(searchParams.get("machineId")),
    severity: parseSeverity(searchParams.get("severity")),
    status: parseStatus(searchParams.get("status")),
    limit: parseLimit(searchParams.get("limit"))
  };
}

export function createLiveAlarmSnapshot(
  input: AlarmSummaryInput,
  filters: LiveAlarmFilters = defaultLiveAlarmFilters,
  now = new Date()
): LiveAlarmSnapshot {
  const factoryIds = new Set(input.factories.map((factory) => factory.id));
  const linesById = new Map(input.lines.map((line) => [line.id, line]));
  const machinesById = new Map(input.machines.map((machine) => [machine.id, machine]));
  const machineFactoryIds = new Map(
    input.machines.flatMap((machine) => {
      const line = linesById.get(machine.line_id);

      return line ? [[machine.id, line.factory_id] as const] : [];
    })
  );
  const filterIssue = getFilterIssue(filters, factoryIds, machinesById, machineFactoryIds);
  const summaries = sortAlarmSummaries(mapAlarmSummaries(input));
  const visibleAlarms = filterIssue
    ? []
    : summaries
        .filter((alarm) => matchesLiveFilters(alarm, filters))
        .slice(0, filters.limit);

  return {
    alarms: visibleAlarms,
    fetchedAt: now.toISOString(),
    filters,
    filterIssue,
    options: {
      factories: input.factories
        .map((factory) => ({ id: factory.id, name: factory.name }))
        .sort((left, right) => left.name.localeCompare(right.name, "ko")),
      machines: input.machines
        .flatMap((machine) => {
          const factoryId = machineFactoryIds.get(machine.id);

          return factoryId ? [{ id: machine.id, name: machine.name, factoryId }] : [];
        })
        .sort((left, right) => left.name.localeCompare(right.name, "ko"))
    },
    totals: getLiveAlarmTotals(summaries, now)
  };
}

export function buildLiveAlarmQueryString(filters: LiveAlarmFilters) {
  const params = new URLSearchParams();

  if (filters.factoryId) {
    params.set("factoryId", filters.factoryId);
  }

  if (filters.machineId) {
    params.set("machineId", filters.machineId);
  }

  if (filters.severity !== defaultLiveAlarmFilters.severity) {
    params.set("severity", filters.severity);
  }

  if (filters.status !== defaultLiveAlarmFilters.status) {
    params.set("status", filters.status);
  }

  if (filters.limit !== defaultLiveAlarmFilters.limit) {
    params.set("limit", String(filters.limit));
  }

  return params.toString();
}

export function formatLiveAlarmTime(value: string) {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: "Asia/Seoul"
  }).format(parsed);
}

export function formatLiveRefreshInterval(seconds: number) {
  return seconds >= 60 ? `${seconds / 60}분` : `${seconds}초`;
}

function matchesLiveFilters(alarm: AlarmSummary, filters: LiveAlarmFilters) {
  const matchesFactory = !filters.factoryId || alarm.factoryId === filters.factoryId;
  const matchesMachine = !filters.machineId || alarm.machineId === filters.machineId;
  const matchesSeverity = filters.severity === "all" || alarm.severity.value === filters.severity;
  const matchesStatus = filters.status === "all" || alarm.status.value === filters.status;

  return matchesFactory && matchesMachine && matchesSeverity && matchesStatus;
}

function getFilterIssue(
  filters: LiveAlarmFilters,
  factoryIds: Set<string>,
  machinesById: Map<string, { id: string }>,
  machineFactoryIds: Map<string, string>
) {
  if (filters.factoryId && !factoryIds.has(filters.factoryId)) {
    return "선택한 공장을 찾을 수 없습니다. 전체 공장 기준으로 다시 확인해 주세요.";
  }

  if (filters.machineId && !machinesById.has(filters.machineId)) {
    return "선택한 설비를 찾을 수 없습니다. 전체 설비 기준으로 다시 확인해 주세요.";
  }

  if (filters.factoryId && filters.machineId && machineFactoryIds.get(filters.machineId) !== filters.factoryId) {
    return "선택한 공장에 속한 설비가 아닙니다. 필터를 초기화해 주세요.";
  }

  return null;
}

function getLiveAlarmTotals(summaries: AlarmSummary[], now: Date) {
  const recentThreshold = now.getTime() - 10 * 60 * 1000;

  return summaries.reduce(
    (acc, alarm) => {
      if (alarm.isResolved) {
        return acc;
      }

      acc.openCount += 1;

      if (alarm.severity.value === "critical") {
        acc.openCriticalCount += 1;
      }

      if (alarm.severity.value === "warning") {
        acc.openWarningCount += 1;
      }

      const occurredAt = new Date(alarm.occurredAt).getTime();

      if (!Number.isNaN(occurredAt) && occurredAt >= recentThreshold) {
        acc.recentOpenCount += 1;
      }

      return acc;
    },
    {
      visibleCount: summaries.length,
      openCount: 0,
      openCriticalCount: 0,
      openWarningCount: 0,
      recentOpenCount: 0
    }
  );
}

function normalizeOptionalId(value: string | null) {
  const normalized = value?.trim();

  return normalized && normalized !== "all" ? normalized : null;
}

function parseSeverity(value: string | null): LiveAlarmSeverityFilter {
  if (value === "critical" || value === "warning" || value === "info" || value === "unknown") {
    return value;
  }

  return "all";
}

function parseStatus(value: string | null): LiveAlarmStatusFilter {
  if (value === "all" || value === "resolved") {
    return value;
  }

  return "open";
}

function parseLimit(value: string | null) {
  const numericLimit = Number(value);

  if (liveAlarmLimitOptions.includes(numericLimit as (typeof liveAlarmLimitOptions)[number])) {
    return numericLimit;
  }

  return defaultLiveAlarmFilters.limit;
}
