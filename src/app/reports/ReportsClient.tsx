"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import type { ReportStatusValue, ReportSummary, ReportTone } from "@/lib/reports";
import { appendReturnTo } from "@/lib/url-state";

type StatusFilter = "all" | ReportStatusValue;
type SortMode = "latest" | "oldest" | "output" | "operation" | "defect";

type ReportFilters = {
  q: string;
  factoryId: string;
  from: string;
  to: string;
  status: StatusFilter;
  sort: SortMode;
};

type ReportTotals = {
  reportCount: number;
  totalOutput: number;
  totalDefects: number;
  averageOperationRate: number;
  defectRate: number;
  riskCount: number;
};

type ChartPoint = {
  date: string;
  dateLabel: string;
  totalOutput: number;
  height: number;
};

const defaultFilters: ReportFilters = {
  q: "",
  factoryId: "all",
  from: "",
  to: "",
  status: "all",
  sort: "latest"
};

const toneClass: Record<ReportTone, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  danger: "border-rose-200 bg-rose-50 text-rose-800",
  neutral: "border-slate-200 bg-slate-50 text-slate-700"
};

const statusOptions: Array<{ label: string; value: StatusFilter }> = [
  { label: "전체 상태", value: "all" },
  { label: "양호", value: "good" },
  { label: "주의", value: "warning" },
  { label: "확인 필요", value: "critical" },
  { label: "데이터 부족", value: "unknown" }
];

const sortLabels: Record<SortMode, string> = {
  latest: "최근 리포트순",
  oldest: "오래된 리포트순",
  output: "생산량 높은순",
  operation: "가동률 낮은순",
  defect: "불량률 높은순"
};

export function ReportsClient({ reports }: { reports: ReportSummary[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchKey = searchParams.toString();
  const appliedFilters = useMemo(() => getFiltersFromSearchParams(searchKey), [searchKey]);
  const [draftState, setDraftState] = useState<{ filters: ReportFilters; searchKey: string }>(() => ({
    filters: appliedFilters,
    searchKey
  }));
  const draftFilters = draftState.searchKey === searchKey ? draftState.filters : appliedFilters;

  const factories = useMemo(() => getFactories(reports), [reports]);
  const selectedFactoryExists =
    appliedFilters.factoryId === "all" || factories.some((factory) => factory.id === appliedFilters.factoryId);
  const dateError = getDateFilterError(appliedFilters);
  const hasInvalidFilters = !selectedFactoryExists || Boolean(dateError);
  const visibleReports = useMemo(() => {
    if (hasInvalidFilters) {
      return [];
    }

    return reports
      .filter((report) => matchesReport(report, appliedFilters))
      .sort((left, right) => compareReports(left, right, appliedFilters.sort));
  }, [appliedFilters, hasInvalidFilters, reports]);
  const totals = useMemo(() => getTotals(visibleReports), [visibleReports]);
  const chartPoints = useMemo(() => getChartPoints(visibleReports), [visibleReports]);
  const selectedFactory = factories.find((factory) => factory.id === appliedFilters.factoryId) ?? null;
  const compareLink = useMemo(() => buildCompareLink(appliedFilters, visibleReports), [appliedFilters, visibleReports]);
  const listReturnTo = searchKey ? `${pathname}?${searchKey}` : pathname;
  const hasDraftChanges = buildQueryString(draftFilters) !== buildQueryString(appliedFilters);
  const hasAppliedFilters = buildQueryString(appliedFilters).length > 0;

  function updateDraft(nextFilters: Partial<ReportFilters>) {
    setDraftState({ filters: { ...draftFilters, ...nextFilters }, searchKey });
  }

  function applyFilters() {
    const query = buildQueryString(draftFilters);
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function resetFilters() {
    setDraftState({ filters: defaultFilters, searchKey });
    router.replace(pathname, { scroll: false });
  }

  return (
    <div className="space-y-5">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryTile label="총 생산량" note="필터 기준" tone="neutral" value={`${formatNumber(totals.totalOutput)}개`} />
        <SummaryTile label="평균 가동률" note="리포트 평균" tone="success" value={formatPercent(totals.averageOperationRate)} />
        <SummaryTile label="평균 불량률" note="전체 불량 기준" tone="warning" value={formatPercent(totals.defectRate)} />
        <SummaryTile label="리포트 수" note="표시 중" tone="neutral" value={`${totals.reportCount}건`} />
        <SummaryTile label="확인 필요" note="주의/위험" tone="danger" value={`${totals.riskCount}건`} />
      </section>

      <section className="min-w-0 overflow-hidden rounded-md border border-[color:var(--line)] bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-2 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h2 className="text-lg font-semibold">리포트 필터</h2>
            <p className="mt-1 text-sm leading-6 text-[color:var(--muted)]">
              <span className="block sm:inline">공장과 기간 기준으로 리포트를 좁힙니다.</span>{" "}
              <span className="block sm:inline">적용 버튼을 누르면 URL 조건도 함께 갱신됩니다.</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="w-fit rounded-md border border-[color:var(--line)] bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
              현재 정렬 {sortLabels[appliedFilters.sort]}
            </span>
            <Link
              className="inline-flex h-9 items-center rounded-md bg-[color:var(--accent)] px-3 text-xs font-semibold text-white hover:bg-[color:var(--accent-strong)]"
              href={compareLink}
            >
              기간 비교
            </Link>
          </div>
        </div>

        {selectedFactory ? (
          <p className="mt-3 w-fit rounded-md border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-800">
            선택 공장: {selectedFactory.name}
          </p>
        ) : null}

        {hasInvalidFilters ? (
          <InvalidFilterState
            dateError={dateError}
            factoryId={appliedFilters.factoryId}
            selectedFactoryExists={selectedFactoryExists}
          />
        ) : (
          <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(180px,1fr)_180px_150px_150px_150px_170px_auto_auto] xl:items-end">
            <label className="block">
              <span className="text-sm font-semibold text-[color:var(--foreground)]">검색</span>
              <input
                className="mt-2 h-11 w-full rounded-md border border-[color:var(--line)] bg-white px-3 text-sm outline-none transition focus:border-[color:var(--accent)] focus:ring-2 focus:ring-teal-100"
                onChange={(event) => updateDraft({ q: event.target.value })}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    applyFilters();
                  }
                }}
                placeholder="공장명, 위치 검색"
                type="search"
                value={draftFilters.q}
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-[color:var(--foreground)]">공장</span>
              <select
                className="mt-2 h-11 w-full rounded-md border border-[color:var(--line)] bg-white px-3 text-sm outline-none transition focus:border-[color:var(--accent)] focus:ring-2 focus:ring-teal-100"
                onChange={(event) => updateDraft({ factoryId: event.target.value })}
                value={draftFilters.factoryId}
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
              <span className="text-sm font-semibold text-[color:var(--foreground)]">시작일</span>
              <input
                className="mt-2 h-11 w-full rounded-md border border-[color:var(--line)] bg-white px-3 text-sm outline-none transition focus:border-[color:var(--accent)] focus:ring-2 focus:ring-teal-100"
                onChange={(event) => updateDraft({ from: event.target.value })}
                type="date"
                value={draftFilters.from}
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-[color:var(--foreground)]">종료일</span>
              <input
                className="mt-2 h-11 w-full rounded-md border border-[color:var(--line)] bg-white px-3 text-sm outline-none transition focus:border-[color:var(--accent)] focus:ring-2 focus:ring-teal-100"
                onChange={(event) => updateDraft({ to: event.target.value })}
                type="date"
                value={draftFilters.to}
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-[color:var(--foreground)]">상태</span>
              <select
                className="mt-2 h-11 w-full rounded-md border border-[color:var(--line)] bg-white px-3 text-sm outline-none transition focus:border-[color:var(--accent)] focus:ring-2 focus:ring-teal-100"
                onChange={(event) => updateDraft({ status: event.target.value as StatusFilter })}
                value={draftFilters.status}
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
                onChange={(event) => updateDraft({ sort: event.target.value as SortMode })}
                value={draftFilters.sort}
              >
                {Object.entries(sortLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <button
              className="h-11 rounded-md bg-[color:var(--accent)] px-3 text-sm font-semibold text-white transition hover:bg-[color:var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!hasDraftChanges}
              onClick={applyFilters}
              type="button"
            >
              필터 적용
            </button>

            <button
              className="h-11 rounded-md border border-[color:var(--line)] bg-white px-3 text-sm font-semibold text-[color:var(--foreground)] transition hover:border-[color:var(--accent)] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!hasAppliedFilters && !hasDraftChanges}
              onClick={resetFilters}
              type="button"
            >
              초기화
            </button>
          </div>
        )}
      </section>

      {!hasInvalidFilters ? (
        <section className="rounded-md border border-[color:var(--line)] bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-2 border-b border-[color:var(--line)] pb-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">생산 추세</h2>
              <p className="mt-1 text-sm text-[color:var(--muted)]">최근 표시 리포트 기준 생산량 흐름입니다.</p>
            </div>
            <span className="w-fit rounded-md border border-[color:var(--line)] bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
              최대 {formatNumber(Math.max(0, ...chartPoints.map((point) => point.totalOutput)))}개
            </span>
          </div>
          {chartPoints.length === 0 ? (
            <p className="py-8 text-center text-sm text-[color:var(--muted)]">차트로 표시할 리포트가 없습니다.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <div className="flex min-w-[680px] items-end gap-3">
                {chartPoints.map((point) => (
                  <div className="flex min-w-14 flex-1 flex-col items-center gap-2" key={point.date}>
                    <div className="flex h-32 w-full items-end rounded-md bg-slate-100 px-2">
                      <div
                        aria-label={`${point.dateLabel} 생산량 ${formatNumber(point.totalOutput)}개`}
                        className="w-full rounded-t-md bg-[color:var(--accent)]"
                        style={{ height: `${point.height}%` }}
                      />
                    </div>
                    <p className="text-xs font-semibold text-[color:var(--foreground)]">{point.dateLabel.slice(5)}</p>
                    <p className="text-xs text-[color:var(--muted)]">{formatCompact(point.totalOutput)}개</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      ) : null}

      {!hasInvalidFilters ? (
        <section className="rounded-md border border-[color:var(--line)] bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-[color:var(--line)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">리포트 {visibleReports.length}건</h2>
              <p className="mt-1 text-sm text-[color:var(--muted)]">최신 생산 리포트가 먼저 표시됩니다.</p>
            </div>
          </div>

          {visibleReports.length === 0 ? (
            <EmptyState onReset={resetFilters} />
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[980px] border-collapse text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold text-slate-600">
                    <tr>
                      <th className="px-4 py-3">리포트 날짜</th>
                      <th className="px-4 py-3">공장</th>
                      <th className="px-4 py-3 text-right">총 생산량</th>
                      <th className="px-4 py-3 text-right">불량 수</th>
                      <th className="px-4 py-3 text-right">불량률</th>
                      <th className="px-4 py-3 text-right">가동률</th>
                      <th className="px-4 py-3">상태</th>
                      <th className="px-4 py-3 text-right">작업</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleReports.map((report) => (
                      <tr className="border-t border-[color:var(--line)]" key={report.reportId}>
                        <td className="px-4 py-4 font-semibold text-[color:var(--foreground)]">{report.reportDateLabel}</td>
                        <td className="px-4 py-4">
                          <p className="font-semibold text-[color:var(--foreground)]">{report.factoryName}</p>
                          <p className="mt-1 text-xs text-[color:var(--muted)]">{report.factoryLocation}</p>
                        </td>
                        <td className="px-4 py-4 text-right font-semibold">{report.totalOutputLabel}</td>
                        <td className="px-4 py-4 text-right">{report.defectCountLabel}</td>
                        <td className="px-4 py-4 text-right">{report.defectRateLabel}</td>
                        <td className="px-4 py-4 text-right font-semibold">{report.operationRateLabel}</td>
                        <td className="px-4 py-4">
                          <span className={`rounded-md border px-2 py-1 text-xs font-semibold ${toneClass[report.status.tone]}`}>
                            {report.status.label}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex justify-end gap-2">
                            <Link
                              className="inline-flex h-10 items-center rounded-md bg-[color:var(--accent)] px-3 text-sm font-semibold text-white hover:bg-[color:var(--accent-strong)]"
                              href={appendReturnTo(report.links.detail, listReturnTo)}
                            >
                              리포트 상세
                            </Link>
                            <Link
                              className="inline-flex h-10 items-center rounded-md border border-[color:var(--line)] bg-white px-3 text-sm font-semibold text-[color:var(--foreground)] hover:border-[color:var(--accent)]"
                              href={report.links.factory}
                            >
                              공장 상세
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="divide-y divide-[color:var(--line)] md:hidden">
                {visibleReports.map((report) => (
                  <article className="p-4" key={report.reportId}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold text-[color:var(--foreground)]">{report.reportDateLabel}</p>
                        <p className="mt-1 text-sm text-[color:var(--muted)]">{report.factoryName}</p>
                      </div>
                      <span className={`shrink-0 rounded-md border px-2 py-1 text-xs font-semibold ${toneClass[report.status.tone]}`}>
                        {report.status.label}
                      </span>
                    </div>
                    <dl className="mt-4 grid grid-cols-2 gap-3">
                      <CompactMetric label="생산량" value={report.totalOutputLabel} />
                      <CompactMetric label="가동률" value={report.operationRateLabel} />
                      <CompactMetric label="불량 수" value={report.defectCountLabel} />
                      <CompactMetric label="불량률" value={report.defectRateLabel} />
                    </dl>
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      <Link
                        className="flex h-11 w-full items-center justify-center rounded-md bg-[color:var(--accent)] px-3 text-sm font-semibold text-white"
                        href={appendReturnTo(report.links.detail, listReturnTo)}
                      >
                        리포트 상세
                      </Link>
                      <Link
                        className="flex h-11 w-full items-center justify-center rounded-md border border-[color:var(--line)] bg-white px-3 text-sm font-semibold text-[color:var(--foreground)]"
                        href={report.links.factory}
                      >
                        공장 상세
                      </Link>
                    </div>
                  </article>
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
  tone: ReportTone;
  value: string;
}) {
  return (
    <article className="rounded-md border border-[color:var(--line)] bg-white p-4 shadow-sm">
      <p className="text-sm text-[color:var(--muted)]">{label}</p>
      <span className={`mt-2 inline-flex rounded-md border px-2 py-1 text-xs font-semibold ${toneClass[tone]}`}>
        {note}
      </span>
      <p className="mt-4 text-3xl font-semibold tracking-normal text-[color:var(--foreground)]">{value}</p>
    </article>
  );
}

function CompactMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[color:var(--line)] bg-slate-50 p-3">
      <dt className="text-xs font-semibold text-[color:var(--muted)]">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-[color:var(--foreground)]">{value}</dd>
    </div>
  );
}

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="px-4 py-10 text-center">
      <p className="text-base font-semibold text-[color:var(--foreground)]">조건에 맞는 리포트가 없습니다.</p>
      <p className="mt-2 text-sm text-[color:var(--muted)]">공장, 기간, 검색어 조건을 줄이면 다시 확인할 수 있습니다.</p>
      <button
        className="mt-5 h-11 rounded-md border border-[color:var(--line)] bg-white px-4 text-sm font-semibold text-[color:var(--foreground)] hover:border-[color:var(--accent)]"
        onClick={onReset}
        type="button"
      >
        필터 초기화
      </button>
    </div>
  );
}

function InvalidFilterState({
  dateError,
  factoryId,
  selectedFactoryExists
}: {
  dateError: string | null;
  factoryId: string;
  selectedFactoryExists: boolean;
}) {
  return (
    <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-4">
      <p className="text-sm font-semibold text-amber-900">필터 조건을 확인해 주세요.</p>
      <p className="mt-2 text-sm leading-6 text-amber-800">
        {!selectedFactoryExists ? `선택한 공장 ID(${factoryId})를 찾을 수 없습니다.` : dateError}
      </p>
      <form action="/reports" className="mt-4" method="get">
        <button
          className="inline-flex h-11 items-center rounded-md border border-amber-300 bg-white px-4 text-sm font-semibold text-amber-900 hover:border-amber-500"
          type="submit"
        >
          전체 리포트로 초기화
        </button>
      </form>
    </div>
  );
}

function getFiltersFromSearchParams(searchKey: string): ReportFilters {
  const params = new URLSearchParams(searchKey);
  const status = params.get("status");
  const sort = params.get("sort");

  return {
    q: params.get("q") ?? "",
    factoryId: params.get("factoryId") ?? "all",
    from: params.get("from") ?? "",
    to: params.get("to") ?? "",
    status: isStatusFilter(status) ? status : "all",
    sort: isSortMode(sort) ? sort : "latest"
  };
}

function buildQueryString(filters: ReportFilters) {
  const params = new URLSearchParams();
  const q = filters.q.trim();

  if (q) {
    params.set("q", q);
  }

  if (filters.factoryId !== "all") {
    params.set("factoryId", filters.factoryId);
  }

  if (filters.from) {
    params.set("from", filters.from);
  }

  if (filters.to) {
    params.set("to", filters.to);
  }

  if (filters.status !== "all") {
    params.set("status", filters.status);
  }

  if (filters.sort !== "latest") {
    params.set("sort", filters.sort);
  }

  return params.toString();
}

function buildCompareLink(filters: ReportFilters, reports: ReportSummary[]) {
  const params = new URLSearchParams();
  const hasValidAppliedRange = filters.from && filters.to && isDateString(filters.from) && isDateString(filters.to) && filters.from <= filters.to;
  const range = hasValidAppliedRange ? { fromA: filters.from, toA: filters.to } : getDefaultCompareRange(reports);

  if (range.fromA && range.toA) {
    const fromB = addDays(range.fromA, -getInclusiveDayCount(range.fromA, range.toA));
    const toB = addDays(range.fromA, -1);

    params.set("fromA", range.fromA);
    params.set("toA", range.toA);
    params.set("fromB", fromB);
    params.set("toB", toB);
  }

  if (filters.factoryId !== "all") {
    params.set("factoryId", filters.factoryId);
  }

  const query = params.toString();

  return query ? `/reports/compare?${query}` : "/reports/compare";
}

function getDefaultCompareRange(reports: ReportSummary[]) {
  const dates = [...new Set(reports.map((report) => report.reportDate))].sort();
  const toA = dates.at(-1) ?? "";
  const fromA = toA ? addDays(toA, -6) : "";

  return { fromA, toA };
}

function getFactories(reports: ReportSummary[]) {
  const factories = new Map<string, { id: string; name: string }>();

  for (const report of reports) {
    factories.set(report.factoryId, { id: report.factoryId, name: report.factoryName });
  }

  return [...factories.values()].sort((left, right) => left.name.localeCompare(right.name, "ko"));
}

function matchesReport(report: ReportSummary, filters: ReportFilters) {
  const normalizedQuery = filters.q.trim().toLocaleLowerCase("ko");
  const matchesQuery =
    normalizedQuery.length === 0 ||
    report.factoryName.toLocaleLowerCase("ko").includes(normalizedQuery) ||
    report.factoryLocation.toLocaleLowerCase("ko").includes(normalizedQuery);
  const matchesFactory = filters.factoryId === "all" || report.factoryId === filters.factoryId;
  const matchesFrom = !filters.from || report.reportDate >= filters.from;
  const matchesTo = !filters.to || report.reportDate <= filters.to;
  const matchesStatus = filters.status === "all" || report.status.value === filters.status;

  return matchesQuery && matchesFactory && matchesFrom && matchesTo && matchesStatus;
}

function compareReports(left: ReportSummary, right: ReportSummary, sortMode: SortMode) {
  switch (sortMode) {
    case "oldest":
      return left.reportDate.localeCompare(right.reportDate) || left.factoryName.localeCompare(right.factoryName, "ko");
    case "output":
      return right.totalOutput - left.totalOutput || right.reportDate.localeCompare(left.reportDate);
    case "operation":
      return left.operationRate - right.operationRate || right.reportDate.localeCompare(left.reportDate);
    case "defect":
      return right.defectRate - left.defectRate || right.reportDate.localeCompare(left.reportDate);
    case "latest":
    default:
      return right.reportDate.localeCompare(left.reportDate) || left.factoryName.localeCompare(right.factoryName, "ko");
  }
}

function getDateFilterError(filters: ReportFilters) {
  if (filters.from && !isDateString(filters.from)) {
    return "시작일은 YYYY-MM-DD 형식이어야 합니다.";
  }

  if (filters.to && !isDateString(filters.to)) {
    return "종료일은 YYYY-MM-DD 형식이어야 합니다.";
  }

  if (filters.from && filters.to && filters.from > filters.to) {
    return "시작일은 종료일보다 늦을 수 없습니다.";
  }

  return null;
}

function getTotals(reports: ReportSummary[]): ReportTotals {
  const totalOutput = reports.reduce((sum, report) => sum + report.totalOutput, 0);
  const totalDefects = reports.reduce((sum, report) => sum + report.defectCount, 0);
  const operationSum = reports.reduce((sum, report) => sum + report.operationRate, 0);
  const averageOperationRate = reports.length > 0 ? operationSum / reports.length : 0;
  const defectRate = totalOutput > 0 ? (totalDefects / totalOutput) * 100 : 0;
  const riskCount = reports.filter((report) => report.status.value === "critical" || report.status.value === "warning").length;

  return {
    reportCount: reports.length,
    totalOutput,
    totalDefects,
    averageOperationRate,
    defectRate,
    riskCount
  };
}

function getChartPoints(reports: ReportSummary[]): ChartPoint[] {
  const groupedByDate = new Map<string, number>();

  for (const report of reports) {
    groupedByDate.set(report.reportDate, (groupedByDate.get(report.reportDate) ?? 0) + report.totalOutput);
  }

  const points = [...groupedByDate.entries()]
    .sort(([leftDate], [rightDate]) => leftDate.localeCompare(rightDate))
    .slice(-10)
    .map(([date, totalOutput]) => ({
      date,
      dateLabel: formatDate(date),
      totalOutput,
      height: 0
    }));
  const maxOutput = Math.max(0, ...points.map((point) => point.totalOutput));

  return points.map((point) => ({
    ...point,
    height: maxOutput > 0 ? Math.max(8, Math.round((point.totalOutput / maxOutput) * 100)) : 8
  }));
}

function isStatusFilter(value: string | null): value is StatusFilter {
  return value === "all" || value === "good" || value === "warning" || value === "critical" || value === "unknown";
}

function isSortMode(value: string | null): value is SortMode {
  return value === "latest" || value === "oldest" || value === "output" || value === "operation" || value === "defect";
}

function isDateString(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00Z`);

  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value);
}

function getInclusiveDayCount(from: string, to: string) {
  const fromDate = new Date(`${from}T00:00:00Z`);
  const toDate = new Date(`${to}T00:00:00Z`);
  const diff = toDate.getTime() - fromDate.getTime();

  return Math.max(1, Math.round(diff / 86400000) + 1);
}

function addDays(value: string, days: number) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString().slice(0, 10);
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-");

  if (!year || !month || !day) {
    return value;
  }

  return `${year}.${month}.${day}`;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value);
}

function formatCompact(value: number) {
  return new Intl.NumberFormat("ko-KR", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function formatPercent(value: number) {
  if (!Number.isFinite(value)) {
    return "-";
  }

  return `${value.toFixed(1)}%`;
}
