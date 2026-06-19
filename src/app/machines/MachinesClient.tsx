"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { MachineStatusTone, MachineStatusValue, MachineSummary } from "@/lib/machines";
import {
  appendReturnTo,
  type BrowserHistoryMode,
  normalizeSearchQuery,
  readBrowserSearchParams,
  writeBrowserQueryString
} from "@/lib/url-state";

type StatusFilter = "all" | MachineStatusValue;
type SortMode = "risk" | "name" | "alarms" | "installed";
type MachineFilters = {
  factoryId: string;
  lineId: string;
  query: string;
  sortMode: SortMode;
  status: StatusFilter;
};

const statusClass: Record<MachineStatusTone, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  danger: "border-rose-200 bg-rose-50 text-rose-800",
  neutral: "border-slate-200 bg-slate-50 text-slate-700",
  info: "border-cyan-200 bg-cyan-50 text-cyan-800"
};

const statusOptions: Array<{ label: string; value: StatusFilter }> = [
  { label: "전체 상태", value: "all" },
  { label: "정상", value: "normal" },
  { label: "주의", value: "warning" },
  { label: "위험", value: "critical" },
  { label: "정지", value: "stopped" },
  { label: "점검", value: "maintenance" },
  { label: "확인 필요", value: "unknown" }
];

const sortLabels: Record<SortMode, string> = {
  risk: "위험도순",
  name: "설비명순",
  alarms: "알람순",
  installed: "설치일순"
};

export function MachinesClient({
  initialFactoryId,
  initialLineId,
  initialQuery,
  initialSort,
  initialStatus,
  machines
}: {
  initialFactoryId: string | null;
  initialLineId: string;
  initialQuery: string;
  initialSort: SortMode;
  initialStatus: StatusFilter;
  machines: MachineSummary[];
}) {
  const [query, setQuery] = useState(initialQuery);
  const [factoryId, setFactoryId] = useState(initialFactoryId ?? "all");
  const [lineId, setLineId] = useState(initialLineId);
  const [status, setStatus] = useState<StatusFilter>(initialStatus);
  const [sortMode, setSortMode] = useState<SortMode>(initialSort);

  useEffect(() => {
    function syncFiltersFromLocation() {
      const nextFilters = getMachineFiltersFromSearchParams(readBrowserSearchParams());

      setQuery(nextFilters.query);
      setFactoryId(nextFilters.factoryId);
      setLineId(nextFilters.lineId);
      setStatus(nextFilters.status);
      setSortMode(nextFilters.sortMode);
    }

    syncFiltersFromLocation();
    window.addEventListener("popstate", syncFiltersFromLocation);

    return () => {
      window.removeEventListener("popstate", syncFiltersFromLocation);
    };
  }, []);

  const factories = useMemo(() => getFactories(machines), [machines]);
  const selectedFactoryExists = factoryId === "all" || factories.some((factory) => factory.id === factoryId);
  const lines = useMemo(() => getLines(machines, factoryId), [factoryId, machines]);
  const totals = useMemo(() => getTotals(machines), [machines]);
  const hasActiveFilters =
    query.trim().length > 0 || factoryId !== "all" || lineId !== "all" || status !== "all" || sortMode !== "risk";
  const listReturnTo = useMemo(() => {
    const queryString = buildMachineQueryString({ factoryId, lineId, query, sortMode, status });

    return queryString ? `/machines?${queryString}` : "/machines";
  }, [factoryId, lineId, query, sortMode, status]);

  const visibleMachines = useMemo(() => {
    if (!selectedFactoryExists) {
      return [];
    }

    const normalizedQuery = query.trim().toLocaleLowerCase("ko");

    return [...machines]
      .filter((machine) => {
        const matchesFactory = factoryId === "all" || machine.factoryId === factoryId;
        const matchesLine = lineId === "all" || machine.lineId === lineId;
        const matchesStatus = status === "all" || machine.status.value === status;
        const matchesQuery =
          normalizedQuery.length === 0 ||
          machine.name.toLocaleLowerCase("ko").includes(normalizedQuery) ||
          machine.modelNameLabel.toLocaleLowerCase("ko").includes(normalizedQuery) ||
          machine.type.toLocaleLowerCase("ko").includes(normalizedQuery);

        return matchesFactory && matchesLine && matchesStatus && matchesQuery;
      })
      .sort((left, right) => compareMachines(left, right, sortMode));
  }, [factoryId, lineId, machines, query, selectedFactoryExists, sortMode, status]);

  function resetFilters() {
    applyFilters(getDefaultMachineFilters(), "push");
  }

  function changeFactory(nextFactoryId: string) {
    updateFilters({ factoryId: nextFactoryId, lineId: "all" }, "push");
  }

  function updateFilters(patch: Partial<MachineFilters>, mode: BrowserHistoryMode = "push") {
    applyFilters(
      {
        factoryId,
        lineId,
        query,
        sortMode,
        status,
        ...patch
      },
      mode
    );
  }

  function applyFilters(nextFilters: MachineFilters, mode: BrowserHistoryMode) {
    const normalizedFilters = {
      ...nextFilters,
      query: normalizeSearchQuery(nextFilters.query)
    };

    setQuery(normalizedFilters.query);
    setFactoryId(normalizedFilters.factoryId);
    setLineId(normalizedFilters.lineId);
    setStatus(normalizedFilters.status);
    setSortMode(normalizedFilters.sortMode);
    writeBrowserQueryString(buildMachineQueryString(normalizedFilters), mode);
  }

  return (
    <div className="space-y-5">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryTile label="전체 설비" value={`${totals.machineCount}대`} note="공개 조회" tone="neutral" />
        <SummaryTile label="정상" value={`${totals.normalCount}대`} note="가동 중" tone="success" />
        <SummaryTile label="주의/위험" value={`${totals.riskCount}대`} note="확인 우선" tone="danger" />
        <SummaryTile label="점검/정지" value={`${totals.pausedCount}대`} note="운영 확인" tone="info" />
        <SummaryTile label="열린 알람" value={`${totals.openAlarmCount}건`} note="미해결" tone="warning" />
      </section>

      <section className="min-w-0 overflow-hidden rounded-md border border-[color:var(--line)] bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-2 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h2 className="text-lg font-semibold">설비 목록 제어</h2>
            <p className="mt-1 text-sm leading-6 text-[color:var(--muted)]">
              <span className="block sm:inline">공장, 라인, 상태 기준으로 설비를 좁힙니다.</span>{" "}
              <span className="block sm:inline">상세 화면은 선택한 설비 기준으로 이동합니다.</span>
            </p>
          </div>
          <span className="w-fit rounded-md border border-[color:var(--line)] bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
            현재 정렬 {sortLabels[sortMode]}
          </span>
        </div>

        {factoryId !== "all" && selectedFactoryExists ? (
          <p className="mt-3 w-fit rounded-md border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-800">
            선택 공장: {factories.find((factory) => factory.id === factoryId)?.name}
          </p>
        ) : null}

        {!selectedFactoryExists ? (
          <InvalidFactoryState onReset={resetFilters} />
        ) : (
          <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(180px,1fr)_180px_180px_180px_160px_auto] xl:items-end">
            <label className="block">
              <span className="text-sm font-semibold text-[color:var(--foreground)]">검색</span>
              <input
                className="mt-2 h-11 w-full rounded-md border border-[color:var(--line)] bg-white px-3 text-sm outline-none transition focus:border-[color:var(--accent)] focus:ring-2 focus:ring-teal-100"
                onChange={(event) => updateFilters({ query: event.target.value }, "replace")}
                placeholder="설비명, 모델명 검색"
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
              <span className="text-sm font-semibold text-[color:var(--foreground)]">라인</span>
              <select
                className="mt-2 h-11 w-full rounded-md border border-[color:var(--line)] bg-white px-3 text-sm outline-none transition focus:border-[color:var(--accent)] focus:ring-2 focus:ring-teal-100"
                onChange={(event) => updateFilters({ lineId: event.target.value }, "push")}
                value={lineId}
              >
                <option value="all">전체 라인</option>
                {lines.map((line) => (
                  <option key={line.id} value={line.id}>
                    {line.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-[color:var(--foreground)]">상태</span>
              <select
                className="mt-2 h-11 w-full rounded-md border border-[color:var(--line)] bg-white px-3 text-sm outline-none transition focus:border-[color:var(--accent)] focus:ring-2 focus:ring-teal-100"
                onChange={(event) => updateFilters({ status: event.target.value as StatusFilter }, "push")}
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
                onChange={(event) => updateFilters({ sortMode: event.target.value as SortMode }, "push")}
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

      {selectedFactoryExists ? (
        <section className="rounded-md border border-[color:var(--line)] bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-[color:var(--line)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">설비 {visibleMachines.length}대</h2>
              <p className="mt-1 text-sm text-[color:var(--muted)]">위험도가 높은 설비가 먼저 표시됩니다.</p>
            </div>
          </div>

          {visibleMachines.length === 0 ? (
            <EmptyState onReset={resetFilters} />
          ) : (
            <>
              <div className="hidden overflow-x-auto lg:block">
                <table className="min-w-full border-separate border-spacing-0 text-left">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-normal text-[color:var(--muted)]">
                    <tr>
                      <th className="border-b border-[color:var(--line)] px-4 py-3">설비</th>
                      <th className="border-b border-[color:var(--line)] px-4 py-3">상태</th>
                      <th className="border-b border-[color:var(--line)] px-4 py-3">공장</th>
                      <th className="border-b border-[color:var(--line)] px-4 py-3">라인</th>
                      <th className="border-b border-[color:var(--line)] px-4 py-3">유형</th>
                      <th className="border-b border-[color:var(--line)] px-4 py-3">알람</th>
                      <th className="border-b border-[color:var(--line)] px-4 py-3">설치일</th>
                      <th className="border-b border-[color:var(--line)] px-4 py-3 text-right">작업</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleMachines.map((machine) => (
                      <tr className="align-top transition hover:bg-slate-50" key={machine.id}>
                        <td className="border-b border-[color:var(--line)] px-4 py-4">
                          <p className="font-semibold text-[color:var(--foreground)]">{machine.name}</p>
                          <p className="mt-1 text-xs text-[color:var(--muted)]">{machine.modelNameLabel}</p>
                        </td>
                        <td className="border-b border-[color:var(--line)] px-4 py-4">
                          <StatusBadge machine={machine} />
                        </td>
                        <td className="border-b border-[color:var(--line)] px-4 py-4 text-sm">{machine.factoryName}</td>
                        <td className="border-b border-[color:var(--line)] px-4 py-4 text-sm">{machine.lineName}</td>
                        <td className="border-b border-[color:var(--line)] px-4 py-4 text-sm">{machine.type}</td>
                        <td className="border-b border-[color:var(--line)] px-4 py-4 text-sm">
                          <p className="font-semibold">{machine.openAlarmCount}건</p>
                          <p className="mt-1 text-xs text-[color:var(--muted)]">
                            위험 {machine.criticalOpenAlarmCount}건, 주의 {machine.warningOpenAlarmCount}건
                          </p>
                        </td>
                        <td className="border-b border-[color:var(--line)] px-4 py-4 text-sm">{machine.installedAtLabel}</td>
                        <td className="border-b border-[color:var(--line)] px-4 py-4 text-right">
                          <Link
                            className="inline-flex h-10 items-center justify-center rounded-md bg-[color:var(--foreground)] px-3 text-sm font-semibold text-white transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"
                            href={appendReturnTo(machine.links.detail, listReturnTo)}
                          >
                            상세 보기
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-3 p-3 lg:hidden">
                {visibleMachines.map((machine) => (
                  <MachineCard key={machine.id} listReturnTo={listReturnTo} machine={machine} />
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
  tone: MachineStatusTone;
  value: string;
}) {
  return (
    <article className="min-w-0 overflow-hidden rounded-md border border-[color:var(--line)] bg-white p-4 shadow-sm">
      <div className="flex flex-col items-start gap-2">
        <p className="text-sm font-medium text-[color:var(--muted)]">{label}</p>
        <span className={`max-w-full break-words rounded-md border px-2 py-1 text-xs font-semibold ${statusClass[tone]}`}>
          {note}
        </span>
      </div>
      <p className="mt-4 text-3xl font-semibold text-[color:var(--foreground)]">{value}</p>
    </article>
  );
}

function MachineCard({ listReturnTo, machine }: { listReturnTo: string; machine: MachineSummary }) {
  return (
    <article className="rounded-md border border-[color:var(--line)] bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-semibold text-[color:var(--foreground)]">{machine.name}</h3>
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            {machine.factoryName} / {machine.lineName}
          </p>
        </div>
        <StatusBadge machine={machine} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <Metric label="유형" value={machine.type} />
        <Metric label="모델" value={machine.modelNameLabel} />
        <Metric label="알람" value={`${machine.openAlarmCount}건`} />
        <Metric label="설치일" value={machine.installedAtLabel} />
      </div>

      <Link
        className="mt-4 flex h-11 items-center justify-center rounded-md bg-[color:var(--foreground)] px-3 text-sm font-semibold text-white transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"
        href={appendReturnTo(machine.links.detail, listReturnTo)}
      >
        상세 보기
      </Link>
    </article>
  );
}

function StatusBadge({ machine }: { machine: MachineSummary }) {
  return (
    <span className={`inline-flex w-fit items-center rounded-md border px-2 py-1 text-xs font-semibold ${statusClass[machine.status.tone]}`}>
      {machine.status.label}
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
      <h3 className="text-lg font-semibold">조건에 맞는 설비가 없습니다.</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[color:var(--muted)]">
        검색어, 공장, 라인, 상태 필터를 조정하거나 초기화해 주세요.
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

function InvalidFactoryState({ onReset }: { onReset: () => void }) {
  return (
    <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3">
      <h3 className="text-sm font-semibold text-rose-800">선택한 공장을 찾을 수 없습니다.</h3>
      <p className="mt-1 text-sm leading-6 text-rose-700">주소의 `factoryId` 값을 확인하거나 전체 설비 목록으로 돌아가세요.</p>
      <button
        className="mt-3 h-10 rounded-md bg-rose-700 px-3 text-sm font-semibold text-white hover:bg-rose-800"
        onClick={onReset}
        type="button"
      >
        전체 설비 보기
      </button>
    </div>
  );
}

function getFactories(machines: MachineSummary[]) {
  return Array.from(new Map(machines.map((machine) => [machine.factoryId, { id: machine.factoryId, name: machine.factoryName }])).values()).sort(
    (left, right) => left.name.localeCompare(right.name, "ko")
  );
}

function getLines(machines: MachineSummary[], factoryId: string) {
  return Array.from(
    new Map(
      machines
        .filter((machine) => factoryId === "all" || machine.factoryId === factoryId)
        .map((machine) => [machine.lineId, { id: machine.lineId, name: machine.lineName }])
    ).values()
  ).sort((left, right) => left.name.localeCompare(right.name, "ko"));
}

function getTotals(machines: MachineSummary[]) {
  return machines.reduce(
    (acc, machine) => {
      acc.machineCount += 1;
      acc.openAlarmCount += machine.openAlarmCount;

      if (machine.status.value === "normal") {
        acc.normalCount += 1;
      }

      if (machine.status.value === "warning" || machine.status.value === "critical") {
        acc.riskCount += 1;
      }

      if (machine.status.value === "maintenance" || machine.status.value === "stopped") {
        acc.pausedCount += 1;
      }

      return acc;
    },
    {
      machineCount: 0,
      normalCount: 0,
      openAlarmCount: 0,
      pausedCount: 0,
      riskCount: 0
    }
  );
}

function compareMachines(left: MachineSummary, right: MachineSummary, sortMode: SortMode) {
  switch (sortMode) {
    case "name":
      return left.name.localeCompare(right.name, "ko");
    case "alarms":
      return right.openAlarmCount - left.openAlarmCount || left.name.localeCompare(right.name, "ko");
    case "installed":
      return compareInstalledAt(left, right) || left.name.localeCompare(right.name, "ko");
    case "risk":
    default:
      return (
        right.status.priority - left.status.priority ||
        right.openAlarmCount - left.openAlarmCount ||
        left.name.localeCompare(right.name, "ko")
      );
  }
}

function compareInstalledAt(left: MachineSummary, right: MachineSummary) {
  if (!left.installedAt && !right.installedAt) {
    return 0;
  }

  if (!left.installedAt) {
    return 1;
  }

  if (!right.installedAt) {
    return -1;
  }

  return right.installedAt.localeCompare(left.installedAt);
}

function getDefaultMachineFilters(): MachineFilters {
  return {
    factoryId: "all",
    lineId: "all",
    query: "",
    sortMode: "risk",
    status: "all"
  };
}

function getMachineFiltersFromSearchParams(params: URLSearchParams): MachineFilters {
  return {
    factoryId: params.get("factoryId") || "all",
    lineId: params.get("lineId") || "all",
    query: normalizeSearchQuery(params.get("q")),
    sortMode: parseMachineSortMode(params.get("sort")),
    status: parseMachineStatusFilter(params.get("status"))
  };
}

function buildMachineQueryString(filters: MachineFilters) {
  const params = new URLSearchParams();
  const query = normalizeSearchQuery(filters.query);

  if (query) {
    params.set("q", query);
  }

  if (filters.factoryId !== "all") {
    params.set("factoryId", filters.factoryId);
  }

  if (filters.lineId !== "all") {
    params.set("lineId", filters.lineId);
  }

  if (filters.status !== "all") {
    params.set("status", filters.status);
  }

  if (filters.sortMode !== "risk") {
    params.set("sort", filters.sortMode);
  }

  return params.toString();
}

function parseMachineStatusFilter(value: string | null): StatusFilter {
  if (
    value === "normal" ||
    value === "warning" ||
    value === "critical" ||
    value === "stopped" ||
    value === "maintenance" ||
    value === "unknown"
  ) {
    return value;
  }

  return "all";
}

function parseMachineSortMode(value: string | null): SortMode {
  if (value === "name" || value === "alarms" || value === "installed") {
    return value;
  }

  return "risk";
}
