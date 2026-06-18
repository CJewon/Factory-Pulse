"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { AlarmSeverityValue, AlarmStatusValue, AlarmSummary, AlarmTone } from "@/lib/alarms";

type SeverityFilter = "all" | AlarmSeverityValue;
type StatusFilter = "all" | AlarmStatusValue;
type SortMode = "risk" | "latest" | "machine";

const toneClass: Record<AlarmTone, string> = {
  danger: "border-rose-200 bg-rose-50 text-rose-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  info: "border-sky-200 bg-sky-50 text-sky-800",
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  neutral: "border-slate-200 bg-slate-50 text-slate-700"
};

const severityOptions: Array<{ label: string; value: SeverityFilter }> = [
  { label: "전체 심각도", value: "all" },
  { label: "위험", value: "critical" },
  { label: "주의", value: "warning" },
  { label: "정보", value: "info" },
  { label: "확인 필요", value: "unknown" }
];

const statusOptions: Array<{ label: string; value: StatusFilter }> = [
  { label: "전체 상태", value: "all" },
  { label: "미해결", value: "open" },
  { label: "해결됨", value: "resolved" }
];

const sortLabels: Record<SortMode, string> = {
  risk: "위험도순",
  latest: "최신순",
  machine: "설비명순"
};

export function AlarmsClient({
  alarms,
  initialFactoryId,
  initialMachineId,
  initialSeverity,
  initialStatus
}: {
  alarms: AlarmSummary[];
  initialFactoryId: string | null;
  initialMachineId: string | null;
  initialSeverity: SeverityFilter;
  initialStatus: StatusFilter;
}) {
  const [query, setQuery] = useState("");
  const [factoryId, setFactoryId] = useState(initialFactoryId ?? "all");
  const [machineId, setMachineId] = useState(initialMachineId ?? "all");
  const [severity, setSeverity] = useState<SeverityFilter>(initialSeverity);
  const [status, setStatus] = useState<StatusFilter>(initialStatus);
  const [sortMode, setSortMode] = useState<SortMode>("risk");

  const factories = useMemo(() => getFactories(alarms), [alarms]);
  const machines = useMemo(() => getMachines(alarms, factoryId), [alarms, factoryId]);
  const selectedFactoryExists = factoryId === "all" || factories.some((factory) => factory.id === factoryId);
  const selectedMachineExists = machineId === "all" || alarms.some((alarm) => alarm.machineId === machineId);
  const selectedMachine = alarms.find((alarm) => alarm.machineId === machineId) ?? null;
  const totals = useMemo(() => getTotals(alarms), [alarms]);
  const hasActiveFilters =
    query.trim().length > 0 ||
    factoryId !== "all" ||
    machineId !== "all" ||
    severity !== "all" ||
    status !== "all" ||
    sortMode !== "risk";

  const visibleAlarms = useMemo(() => {
    if (!selectedFactoryExists || !selectedMachineExists) {
      return [];
    }

    const normalizedQuery = query.trim().toLocaleLowerCase("ko");

    return [...alarms]
      .filter((alarm) => {
        const matchesFactory = factoryId === "all" || alarm.factoryId === factoryId;
        const matchesMachine = machineId === "all" || alarm.machineId === machineId;
        const matchesSeverity = severity === "all" || alarm.severity.value === severity;
        const matchesStatus = status === "all" || alarm.status.value === status;
        const matchesQuery =
          normalizedQuery.length === 0 ||
          alarm.message.toLocaleLowerCase("ko").includes(normalizedQuery) ||
          alarm.machineName.toLocaleLowerCase("ko").includes(normalizedQuery) ||
          alarm.factoryName.toLocaleLowerCase("ko").includes(normalizedQuery) ||
          alarm.lineName.toLocaleLowerCase("ko").includes(normalizedQuery);

        return matchesFactory && matchesMachine && matchesSeverity && matchesStatus && matchesQuery;
      })
      .sort((left, right) => compareAlarms(left, right, sortMode));
  }, [alarms, factoryId, machineId, query, selectedFactoryExists, selectedMachineExists, severity, sortMode, status]);

  function resetFilters() {
    setQuery("");
    setFactoryId("all");
    setMachineId("all");
    setSeverity("all");
    setStatus("all");
    setSortMode("risk");
  }

  function changeFactory(nextFactoryId: string) {
    setFactoryId(nextFactoryId);
    setMachineId("all");
  }

  return (
    <div className="space-y-5">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryTile label="전체 알람" note="seed 기준" tone="neutral" value={`${totals.alarmCount}건`} />
        <SummaryTile label="미해결" note="확인 필요" tone="warning" value={`${totals.openCount}건`} />
        <SummaryTile label="위험 미해결" note="우선 처리" tone="danger" value={`${totals.openCriticalCount}건`} />
        <SummaryTile label="주의 미해결" note="추적 필요" tone="warning" value={`${totals.openWarningCount}건`} />
        <SummaryTile label="해결됨" note="기록 보관" tone="success" value={`${totals.resolvedCount}건`} />
      </section>

      <section className="min-w-0 overflow-hidden rounded-md border border-[color:var(--line)] bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-2 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h2 className="text-lg font-semibold">알람 목록 제어</h2>
            <p className="mt-1 text-sm leading-6 text-[color:var(--muted)]">
              <span className="block sm:inline">심각도, 상태, 공장, 설비 기준으로 알람을 좁힙니다.</span>{" "}
              <span className="block sm:inline">P0에서는 조회와 이동만 제공합니다.</span>
            </p>
          </div>
          <span className="w-fit rounded-md border border-[color:var(--line)] bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
            현재 정렬 {sortLabels[sortMode]}
          </span>
        </div>

        {selectedMachine ? (
          <p className="mt-3 w-fit rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-800">
            선택 설비: {selectedMachine.machineName}
          </p>
        ) : null}

        {!selectedFactoryExists || !selectedMachineExists ? (
          <InvalidSelectionState onReset={resetFilters} />
        ) : (
          <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(180px,1fr)_180px_180px_160px_150px_150px_auto] xl:items-end">
            <label className="block">
              <span className="text-sm font-semibold text-[color:var(--foreground)]">검색</span>
              <input
                className="mt-2 h-11 w-full rounded-md border border-[color:var(--line)] bg-white px-3 text-sm outline-none transition focus:border-[color:var(--accent)] focus:ring-2 focus:ring-teal-100"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="알람 메시지, 설비명 검색"
                type="search"
                value={query}
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-[color:var(--foreground)]">공장</span>
              <select
                className="mt-2 h-11 w-full rounded-md border border-[color:var(--line)] bg-white px-3 text-sm outline-none transition focus:border-[color:var(--accent)] focus:ring-2 focus:ring-teal-100"
                onChange={(event) => changeFactory(event.target.value)}
                value={factoryId}
              >
                <option value="all">전체 공장</option>
                {factories.map((factory) => (
                  <option key={factory.id} value={factory.id}>
                    {factory.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-[color:var(--foreground)]">설비</span>
              <select
                className="mt-2 h-11 w-full rounded-md border border-[color:var(--line)] bg-white px-3 text-sm outline-none transition focus:border-[color:var(--accent)] focus:ring-2 focus:ring-teal-100"
                onChange={(event) => setMachineId(event.target.value)}
                value={machineId}
              >
                <option value="all">전체 설비</option>
                {machines.map((machine) => (
                  <option key={machine.id} value={machine.id}>
                    {machine.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-[color:var(--foreground)]">심각도</span>
              <select
                className="mt-2 h-11 w-full rounded-md border border-[color:var(--line)] bg-white px-3 text-sm outline-none transition focus:border-[color:var(--accent)] focus:ring-2 focus:ring-teal-100"
                onChange={(event) => setSeverity(event.target.value as SeverityFilter)}
                value={severity}
              >
                {severityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-[color:var(--foreground)]">상태</span>
              <select
                className="mt-2 h-11 w-full rounded-md border border-[color:var(--line)] bg-white px-3 text-sm outline-none transition focus:border-[color:var(--accent)] focus:ring-2 focus:ring-teal-100"
                onChange={(event) => setStatus(event.target.value as StatusFilter)}
                value={status}
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-[color:var(--foreground)]">정렬</span>
              <select
                className="mt-2 h-11 w-full rounded-md border border-[color:var(--line)] bg-white px-3 text-sm outline-none transition focus:border-[color:var(--accent)] focus:ring-2 focus:ring-teal-100"
                onChange={(event) => setSortMode(event.target.value as SortMode)}
                value={sortMode}
              >
                {Object.entries(sortLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <button
              className="h-11 rounded-md border border-[color:var(--line)] bg-white px-3 text-sm font-semibold text-[color:var(--foreground)] transition hover:border-[color:var(--accent)] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!hasActiveFilters}
              onClick={resetFilters}
              type="button"
            >
              초기화
            </button>
          </div>
        )}
      </section>

      {selectedFactoryExists && selectedMachineExists ? (
        <section className="rounded-md border border-[color:var(--line)] bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-[color:var(--line)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">알람 {visibleAlarms.length}건</h2>
              <p className="mt-1 text-sm text-[color:var(--muted)]">미해결 위험 알람이 먼저 표시됩니다.</p>
            </div>
          </div>

          {visibleAlarms.length === 0 ? (
            <EmptyState onReset={resetFilters} />
          ) : (
            <>
              <div className="hidden overflow-x-auto lg:block">
                <table className="min-w-full border-separate border-spacing-0 text-left">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-normal text-[color:var(--muted)]">
                    <tr>
                      <th className="border-b border-[color:var(--line)] px-4 py-3">알람</th>
                      <th className="border-b border-[color:var(--line)] px-4 py-3">심각도</th>
                      <th className="border-b border-[color:var(--line)] px-4 py-3">상태</th>
                      <th className="border-b border-[color:var(--line)] px-4 py-3">공장</th>
                      <th className="border-b border-[color:var(--line)] px-4 py-3">설비</th>
                      <th className="border-b border-[color:var(--line)] px-4 py-3">발생 시각</th>
                      <th className="border-b border-[color:var(--line)] px-4 py-3 text-right">작업</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleAlarms.map((alarm) => (
                      <tr className="align-top transition hover:bg-slate-50" key={alarm.id}>
                        <td className="border-b border-[color:var(--line)] px-4 py-4">
                          <p className="max-w-[360px] font-semibold text-[color:var(--foreground)]">{alarm.message}</p>
                          <p className="mt-1 text-xs text-[color:var(--muted)]">{alarm.lineName}</p>
                        </td>
                        <td className="border-b border-[color:var(--line)] px-4 py-4">
                          <SeverityBadge alarm={alarm} />
                        </td>
                        <td className="border-b border-[color:var(--line)] px-4 py-4">
                          <StatusBadge alarm={alarm} />
                        </td>
                        <td className="border-b border-[color:var(--line)] px-4 py-4 text-sm">{alarm.factoryName}</td>
                        <td className="border-b border-[color:var(--line)] px-4 py-4 text-sm">
                          <p className="font-semibold">{alarm.machineName}</p>
                          <p className="mt-1 text-xs text-[color:var(--muted)]">{alarm.machineType}</p>
                        </td>
                        <td className="border-b border-[color:var(--line)] px-4 py-4 text-sm">{alarm.occurredAtLabel}</td>
                        <td className="border-b border-[color:var(--line)] px-4 py-4 text-right">
                          <Link
                            className="inline-flex h-10 items-center justify-center rounded-md bg-[color:var(--foreground)] px-3 text-sm font-semibold text-white transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"
                            href={alarm.links.machine}
                          >
                            설비 상세
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-3 p-3 lg:hidden">
                {visibleAlarms.map((alarm) => (
                  <AlarmCard alarm={alarm} key={alarm.id} />
                ))}
              </div>
            </>
          )}
        </section>
      ) : null}
    </div>
  );
}

function SummaryTile({
  label,
  note,
  tone,
  value
}: {
  label: string;
  note: string;
  tone: AlarmTone;
  value: string;
}) {
  return (
    <article className="min-w-0 overflow-hidden rounded-md border border-[color:var(--line)] bg-white p-4 shadow-sm">
      <div className="flex flex-col items-start gap-2">
        <p className="text-sm font-medium text-[color:var(--muted)]">{label}</p>
        <span className={`max-w-full break-words rounded-md border px-2 py-1 text-xs font-semibold ${toneClass[tone]}`}>
          {note}
        </span>
      </div>
      <p className="mt-4 text-3xl font-semibold text-[color:var(--foreground)]">{value}</p>
    </article>
  );
}

function AlarmCard({ alarm }: { alarm: AlarmSummary }) {
  return (
    <article className="rounded-md border border-[color:var(--line)] bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-semibold text-[color:var(--foreground)]">{alarm.message}</h3>
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            {alarm.factoryName} / {alarm.machineName}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <SeverityBadge alarm={alarm} />
          <StatusBadge alarm={alarm} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <Metric label="라인" value={alarm.lineName} />
        <Metric label="설비 유형" value={alarm.machineType} />
        <Metric label="발생" value={alarm.occurredAtLabel} />
        <Metric label="해결" value={alarm.resolvedAtLabel} />
      </div>

      <Link
        className="mt-4 flex h-11 items-center justify-center rounded-md bg-[color:var(--foreground)] px-3 text-sm font-semibold text-white transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"
        href={alarm.links.machine}
      >
        설비 상세
      </Link>
    </article>
  );
}

function SeverityBadge({ alarm }: { alarm: AlarmSummary }) {
  return (
    <span className={`inline-flex w-fit items-center rounded-md border px-2 py-1 text-xs font-semibold ${toneClass[alarm.severity.tone]}`}>
      {alarm.severity.label}
    </span>
  );
}

function StatusBadge({ alarm }: { alarm: AlarmSummary }) {
  return (
    <span className={`inline-flex w-fit items-center rounded-md border px-2 py-1 text-xs font-semibold ${toneClass[alarm.status.tone]}`}>
      {alarm.status.label}
    </span>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 border-t border-[color:var(--line)] pt-3">
      <p className="text-xs font-medium text-[color:var(--muted)]">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-[color:var(--foreground)]">{value}</p>
    </div>
  );
}

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="px-4 py-12 text-center">
      <h3 className="text-lg font-semibold">조건에 맞는 알람이 없습니다.</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[color:var(--muted)]">
        검색어, 공장, 설비, 심각도, 상태 필터를 조정하거나 초기화해 주세요.
      </p>
      <button
        className="mt-4 h-11 rounded-md bg-[color:var(--accent)] px-4 text-sm font-semibold text-white transition hover:bg-[color:var(--accent-strong)]"
        onClick={onReset}
        type="button"
      >
        초기화
      </button>
    </div>
  );
}

function InvalidSelectionState({ onReset }: { onReset: () => void }) {
  return (
    <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3">
      <h3 className="text-sm font-semibold text-rose-800">선택한 공장 또는 설비를 찾을 수 없습니다.</h3>
      <p className="mt-1 text-sm leading-6 text-rose-700">주소의 query 값을 확인하거나 전체 알람 목록으로 돌아가세요.</p>
      <button
        className="mt-3 h-10 rounded-md bg-rose-700 px-3 text-sm font-semibold text-white hover:bg-rose-800"
        onClick={onReset}
        type="button"
      >
        전체 알람 보기
      </button>
    </div>
  );
}

function getFactories(alarms: AlarmSummary[]) {
  return Array.from(new Map(alarms.map((alarm) => [alarm.factoryId, { id: alarm.factoryId, name: alarm.factoryName }])).values()).sort(
    (left, right) => left.name.localeCompare(right.name, "ko")
  );
}

function getMachines(alarms: AlarmSummary[], factoryId: string) {
  return Array.from(
    new Map(
      alarms
        .filter((alarm) => factoryId === "all" || alarm.factoryId === factoryId)
        .map((alarm) => [alarm.machineId, { id: alarm.machineId, name: alarm.machineName }])
    ).values()
  ).sort((left, right) => left.name.localeCompare(right.name, "ko"));
}

function getTotals(alarms: AlarmSummary[]) {
  return alarms.reduce(
    (acc, alarm) => {
      acc.alarmCount += 1;

      if (alarm.isResolved) {
        acc.resolvedCount += 1;
        return acc;
      }

      acc.openCount += 1;

      if (alarm.severity.value === "critical") {
        acc.openCriticalCount += 1;
      }

      if (alarm.severity.value === "warning") {
        acc.openWarningCount += 1;
      }

      return acc;
    },
    {
      alarmCount: 0,
      openCount: 0,
      openCriticalCount: 0,
      openWarningCount: 0,
      resolvedCount: 0
    }
  );
}

function compareAlarms(left: AlarmSummary, right: AlarmSummary, sortMode: SortMode) {
  switch (sortMode) {
    case "latest":
      return right.occurredAt.localeCompare(left.occurredAt);
    case "machine":
      return left.machineName.localeCompare(right.machineName, "ko") || right.occurredAt.localeCompare(left.occurredAt);
    case "risk":
    default:
      return (
        Number(left.isResolved) - Number(right.isResolved) ||
        right.severity.priority - left.severity.priority ||
        right.occurredAt.localeCompare(left.occurredAt)
      );
  }
}
