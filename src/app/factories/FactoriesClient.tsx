"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { FactoryStatusValue, FactorySummary, FactorySummaryStatus, FactoryStatusTone } from "@/lib/factories";
import {
  appendReturnTo,
  type BrowserHistoryMode,
  normalizeSearchQuery,
  readBrowserSearchParams,
  writeBrowserQueryString
} from "@/lib/url-state";

type SortMode = "risk" | "name" | "alarms" | "report";
type StatusFilter = "all" | FactoryStatusValue;
type FactoryFilters = {
  query: string;
  sortMode: SortMode;
  statusFilter: StatusFilter;
};

const statusClass: Record<FactoryStatusTone, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  danger: "border-rose-200 bg-rose-50 text-rose-800",
  neutral: "border-slate-200 bg-slate-50 text-slate-700"
};

const sortLabels: Record<SortMode, string> = {
  risk: "위험도순",
  name: "공장명순",
  alarms: "열린 알람순",
  report: "최근 리포트순"
};

const statusOptions: Array<{ label: string; value: StatusFilter }> = [
  { label: "전체", value: "all" },
  { label: "위험", value: "critical" },
  { label: "주의", value: "warning" },
  { label: "정상", value: "normal" },
  { label: "오프라인", value: "offline" }
];

export function FactoriesClient({
  summaries,
  generatedAt
}: {
  summaries: FactorySummary[];
  generatedAt: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("risk");
  const [lastRequestedAt, setLastRequestedAt] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    function syncFiltersFromLocation() {
      const nextFilters = getFactoryFiltersFromSearchParams(readBrowserSearchParams());

      setQuery(nextFilters.query);
      setStatusFilter(nextFilters.statusFilter);
      setSortMode(nextFilters.sortMode);
    }

    syncFiltersFromLocation();
    window.addEventListener("popstate", syncFiltersFromLocation);

    return () => {
      window.removeEventListener("popstate", syncFiltersFromLocation);
    };
  }, []);

  const totals = useMemo(() => getTotals(summaries), [summaries]);
  const hasActiveFilters = query.trim().length > 0 || statusFilter !== "all" || sortMode !== "risk";
  const listReturnTo = useMemo(() => {
    const queryString = buildFactoryQueryString({ query, sortMode, statusFilter });

    return queryString ? `/factories?${queryString}` : "/factories";
  }, [query, sortMode, statusFilter]);

  const visibleFactories = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("ko");

    return [...summaries]
      .filter((factory) => {
        const matchesQuery =
          normalizedQuery.length === 0 ||
          factory.name.toLocaleLowerCase("ko").includes(normalizedQuery) ||
          factory.locationLabel.toLocaleLowerCase("ko").includes(normalizedQuery) ||
          factory.description?.toLocaleLowerCase("ko").includes(normalizedQuery);

        const matchesStatus = statusFilter === "all" || factory.status.value === statusFilter;

        return matchesQuery && matchesStatus;
      })
      .sort((left, right) => compareFactories(left, right, sortMode));
  }, [query, sortMode, statusFilter, summaries]);

  function resetFilters() {
    applyFilters(getDefaultFactoryFilters(), "push");
  }

  function updateFilters(patch: Partial<FactoryFilters>, mode: BrowserHistoryMode = "push") {
    applyFilters(
      {
        query,
        sortMode,
        statusFilter,
        ...patch
      },
      mode
    );
  }

  function applyFilters(nextFilters: FactoryFilters, mode: BrowserHistoryMode) {
    const normalizedFilters = {
      ...nextFilters,
      query: normalizeSearchQuery(nextFilters.query)
    };

    setQuery(normalizedFilters.query);
    setStatusFilter(normalizedFilters.statusFilter);
    setSortMode(normalizedFilters.sortMode);
    writeBrowserQueryString(buildFactoryQueryString(normalizedFilters), mode);
  }

  function refreshPage() {
    const requestedAt = new Date().toISOString();
    setLastRequestedAt(requestedAt);

    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryTile label="전체 공장" value={`${totals.factoryCount}곳`} note="Supabase seed 기준" tone="neutral" />
        <SummaryTile label="전체 설비" value={`${totals.machineCount}대`} note={`${totals.activeLineCount}개 활성 라인`} tone="success" />
        <SummaryTile label="열린 알람" value={`${totals.openAlarmCount}건`} note={`위험 ${totals.criticalAlarmCount}건`} tone="warning" />
        <SummaryTile label="위험 공장" value={`${totals.criticalFactoryCount}곳`} note="상세 확인 우선" tone="danger" />
      </section>

      <section className="min-w-0 overflow-hidden rounded-md border border-[color:var(--line)] bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h2 className="text-lg font-semibold">공장 목록 제어</h2>
            <p className="mt-1 break-words text-sm leading-6 text-[color:var(--muted)] [overflow-wrap:anywhere]">
              <span className="block sm:inline">검색과 정렬은 즉시 반영됩니다.</span>{" "}
              <span className="block sm:inline">새로고침은 ISR 캐시 범위에서 다시 요청합니다.</span>
            </p>
          </div>

          <div className="flex flex-col gap-2 text-xs text-[color:var(--muted)] sm:flex-row sm:items-center">
            <span className="max-w-full break-words rounded-md border border-[color:var(--line)] bg-slate-50 px-3 py-2">
              생성 시각 {formatDateTime(generatedAt)}
            </span>
            <span className="max-w-full break-words rounded-md border border-[color:var(--line)] bg-slate-50 px-3 py-2">
              요청 시각 {lastRequestedAt ? formatDateTime(lastRequestedAt) : "아직 없음"}
            </span>
          </div>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(220px,1fr)_180px_180px_auto] lg:items-end">
          <label className="block">
            <span className="text-sm font-semibold text-[color:var(--foreground)]">검색</span>
            <input
              className="mt-2 h-11 w-full rounded-md border border-[color:var(--line)] bg-white px-3 text-sm outline-none transition focus:border-[color:var(--accent)] focus:ring-2 focus:ring-teal-100"
              onChange={(event) => updateFilters({ query: event.target.value }, "replace")}
              placeholder="공장명, 위치, 설명 검색"
              type="search"
              value={query}
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-[color:var(--foreground)]">상태</span>
            <select
              className="mt-2 h-11 w-full rounded-md border border-[color:var(--line)] bg-white px-3 text-sm outline-none transition focus:border-[color:var(--accent)] focus:ring-2 focus:ring-teal-100"
              onChange={(event) => updateFilters({ statusFilter: event.target.value as StatusFilter }, "push")}
              value={statusFilter}
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

          <div className="flex flex-wrap gap-2">
            <button
              className="h-11 rounded-md border border-[color:var(--line)] bg-white px-3 text-sm font-semibold text-[color:var(--foreground)] transition hover:border-[color:var(--accent)] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!hasActiveFilters}
              onClick={resetFilters}
              type="button"
            >
              필터 초기화
            </button>
            <button
              className="h-11 rounded-md bg-[color:var(--accent)] px-3 text-sm font-semibold text-white transition hover:bg-[color:var(--accent-strong)] disabled:cursor-wait disabled:opacity-70"
              disabled={isPending}
              onClick={refreshPage}
              type="button"
            >
              {isPending ? "갱신 중" : "새로고침"}
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-md border border-[color:var(--line)] bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-[color:var(--line)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">공장 {visibleFactories.length}곳</h2>
            <p className="mt-1 text-sm text-[color:var(--muted)]">상태가 나쁜 공장일수록 기본 정렬에서 위에 표시됩니다.</p>
          </div>
          <span className="w-fit rounded-md border border-[color:var(--line)] bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
            현재 정렬 {sortLabels[sortMode]}
          </span>
        </div>

        {visibleFactories.length === 0 ? (
          <EmptyState onReset={resetFilters} />
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="min-w-full border-separate border-spacing-0 text-left">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-normal text-[color:var(--muted)]">
                  <tr>
                    <th className="border-b border-[color:var(--line)] px-4 py-3">공장</th>
                    <th className="border-b border-[color:var(--line)] px-4 py-3">상태</th>
                    <th className="border-b border-[color:var(--line)] px-4 py-3">라인</th>
                    <th className="border-b border-[color:var(--line)] px-4 py-3">설비</th>
                    <th className="border-b border-[color:var(--line)] px-4 py-3">열린 알람</th>
                    <th className="border-b border-[color:var(--line)] px-4 py-3">최근 리포트</th>
                    <th className="border-b border-[color:var(--line)] px-4 py-3 text-right">액션</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleFactories.map((factory) => (
                    <tr className="align-top transition hover:bg-slate-50" key={factory.id}>
                      <td className="border-b border-[color:var(--line)] px-4 py-4">
                        <div className="max-w-[320px]">
                          <p className="font-semibold text-[color:var(--foreground)]">{factory.name}</p>
                          <p className="mt-1 text-sm text-[color:var(--muted)]">{factory.locationLabel}</p>
                          {factory.description ? (
                            <p className="mt-2 line-clamp-2 text-xs leading-5 text-[color:var(--muted)]">{factory.description}</p>
                          ) : null}
                        </div>
                      </td>
                      <td className="border-b border-[color:var(--line)] px-4 py-4">
                        <StatusBadge status={factory.status} />
                      </td>
                      <td className="border-b border-[color:var(--line)] px-4 py-4 text-sm">
                        {factory.activeLineCount}/{factory.lineCount}개 활성
                      </td>
                      <td className="border-b border-[color:var(--line)] px-4 py-4 text-sm">
                        <p className="font-semibold">{factory.machineCount}대</p>
                        <p className="mt-1 text-xs text-[color:var(--muted)]">
                          위험 {factory.machineStatusCounts.critical}대, 주의 {factory.machineStatusCounts.warning}대
                        </p>
                      </td>
                      <td className="border-b border-[color:var(--line)] px-4 py-4 text-sm">
                        <p className="font-semibold">{factory.openAlarmCount}건</p>
                        <p className="mt-1 text-xs text-[color:var(--muted)]">
                          위험 {factory.criticalOpenAlarmCount}건, 주의 {factory.warningOpenAlarmCount}건
                        </p>
                      </td>
                      <td className="border-b border-[color:var(--line)] px-4 py-4 text-sm">
                        {factory.latestReportDateLabel}
                      </td>
                      <td className="border-b border-[color:var(--line)] px-4 py-4 text-right">
                        <Link
                          className="inline-flex h-10 items-center justify-center rounded-md bg-[color:var(--foreground)] px-3 text-sm font-semibold text-white transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"
                          href={appendReturnTo(factory.links.detail, listReturnTo)}
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
              {visibleFactories.map((factory) => (
                <FactoryCard factory={factory} key={factory.id} listReturnTo={listReturnTo} />
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  note,
  tone
}: {
  label: string;
  value: string;
  note: string;
  tone: FactoryStatusTone;
}) {
  return (
    <article className="min-w-0 overflow-hidden rounded-md border border-[color:var(--line)] bg-white p-4 shadow-sm">
      <div className="flex flex-col items-start gap-2 sm:flex-row sm:justify-between sm:gap-3">
        <p className="min-w-0 text-sm font-medium text-[color:var(--muted)]">{label}</p>
        <span className={`max-w-full break-words rounded-md border px-2 py-1 text-xs font-semibold ${statusClass[tone]}`}>
          {note}
        </span>
      </div>
      <p className="mt-4 text-3xl font-semibold text-[color:var(--foreground)]">{value}</p>
    </article>
  );
}

function FactoryCard({ factory, listReturnTo }: { factory: FactorySummary; listReturnTo: string }) {
  return (
    <article className="rounded-md border border-[color:var(--line)] bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-semibold text-[color:var(--foreground)]">{factory.name}</h3>
          <p className="mt-1 text-sm text-[color:var(--muted)]">{factory.locationLabel}</p>
        </div>
        <StatusBadge status={factory.status} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <Metric label="라인" value={`${factory.activeLineCount}/${factory.lineCount}개 활성`} />
        <Metric label="설비" value={`${factory.machineCount}대`} />
        <Metric label="열린 알람" value={`${factory.openAlarmCount}건`} />
        <Metric label="최근 리포트" value={factory.latestReportDateLabel} />
      </div>

      <Link
        className="mt-4 flex h-11 items-center justify-center rounded-md bg-[color:var(--foreground)] px-3 text-sm font-semibold text-white transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"
        href={appendReturnTo(factory.links.detail, listReturnTo)}
      >
        상세 보기
      </Link>
    </article>
  );
}

function StatusBadge({ status }: { status: FactorySummaryStatus }) {
  return (
    <span className={`inline-flex w-fit items-center rounded-md border px-2 py-1 text-xs font-semibold ${statusClass[status.tone]}`}>
      {status.label}
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
      <h3 className="text-lg font-semibold">조건에 맞는 공장이 없습니다.</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[color:var(--muted)]">
        검색어 또는 상태 필터 때문에 목록이 비어 있을 수 있습니다. 조건을 초기화하면 전체 공장 목록으로 돌아갑니다.
      </p>
      <button
        className="mt-4 h-11 rounded-md bg-[color:var(--accent)] px-4 text-sm font-semibold text-white transition hover:bg-[color:var(--accent-strong)]"
        onClick={onReset}
        type="button"
      >
        필터 초기화
      </button>
    </div>
  );
}

function compareFactories(left: FactorySummary, right: FactorySummary, sortMode: SortMode) {
  switch (sortMode) {
    case "name":
      return left.name.localeCompare(right.name, "ko");
    case "alarms":
      return right.openAlarmCount - left.openAlarmCount || left.name.localeCompare(right.name, "ko");
    case "report":
      return compareReportDate(left, right) || left.name.localeCompare(right.name, "ko");
    case "risk":
    default:
      return (
        right.status.priority - left.status.priority ||
        right.openAlarmCount - left.openAlarmCount ||
        left.name.localeCompare(right.name, "ko")
      );
  }
}

function compareReportDate(left: FactorySummary, right: FactorySummary) {
  if (!left.latestReportDate && !right.latestReportDate) {
    return 0;
  }

  if (!left.latestReportDate) {
    return 1;
  }

  if (!right.latestReportDate) {
    return -1;
  }

  return right.latestReportDate.localeCompare(left.latestReportDate);
}

function getTotals(factories: FactorySummary[]) {
  return factories.reduce(
    (acc, factory) => {
      acc.factoryCount += 1;
      acc.machineCount += factory.machineCount;
      acc.activeLineCount += factory.activeLineCount;
      acc.openAlarmCount += factory.openAlarmCount;
      acc.criticalAlarmCount += factory.criticalOpenAlarmCount;

      if (factory.status.value === "critical") {
        acc.criticalFactoryCount += 1;
      }

      return acc;
    },
    {
      activeLineCount: 0,
      criticalAlarmCount: 0,
      criticalFactoryCount: 0,
      factoryCount: 0,
      machineCount: 0,
      openAlarmCount: 0
    }
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Seoul"
  }).format(new Date(value));
}

function getDefaultFactoryFilters(): FactoryFilters {
  return {
    query: "",
    sortMode: "risk",
    statusFilter: "all"
  };
}

function getFactoryFiltersFromSearchParams(params: URLSearchParams): FactoryFilters {
  return {
    query: normalizeSearchQuery(params.get("q")),
    sortMode: parseFactorySortMode(params.get("sort")),
    statusFilter: parseFactoryStatusFilter(params.get("status"))
  };
}

function buildFactoryQueryString(filters: FactoryFilters) {
  const params = new URLSearchParams();
  const query = normalizeSearchQuery(filters.query);

  if (query) {
    params.set("q", query);
  }

  if (filters.statusFilter !== "all") {
    params.set("status", filters.statusFilter);
  }

  if (filters.sortMode !== "risk") {
    params.set("sort", filters.sortMode);
  }

  return params.toString();
}

function parseFactoryStatusFilter(value: string | null): StatusFilter {
  if (value === "critical" || value === "warning" || value === "normal" || value === "offline") {
    return value;
  }

  return "all";
}

function parseFactorySortMode(value: string | null): SortMode {
  if (value === "name" || value === "alarms" || value === "report") {
    return value;
  }

  return "risk";
}
