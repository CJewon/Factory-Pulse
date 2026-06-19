"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { mapReportComparison } from "@/lib/reports/mapper";
import type { ReportCompareDelta, ReportCompareResult, ReportSummary, ReportTone } from "@/lib/reports/types";
import { appendReturnTo } from "@/lib/url-state";

type CompareFilters = {
  factoryId: string;
  fromA: string;
  fromB: string;
  toA: string;
  toB: string;
};

const toneClass: Record<ReportTone, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  danger: "border-rose-200 bg-rose-50 text-rose-800",
  neutral: "border-slate-200 bg-slate-50 text-slate-700"
};

export function ReportsCompareClient({ reports }: { reports: ReportSummary[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchKey = searchParams.toString();
  const factories = useMemo(() => getFactories(reports), [reports]);
  const defaultFilters = useMemo(() => getDefaultCompareFilters(reports), [reports]);
  const appliedFilters = useMemo(
    () => getFiltersFromSearchParams(searchKey, defaultFilters),
    [defaultFilters, searchKey]
  );
  const [draftState, setDraftState] = useState<{ filters: CompareFilters; searchKey: string }>(() => ({
    filters: appliedFilters,
    searchKey
  }));
  const draftFilters = draftState.searchKey === searchKey ? draftState.filters : appliedFilters;
  const selectedFactoryExists =
    appliedFilters.factoryId === "all" || factories.some((factory) => factory.id === appliedFilters.factoryId);
  const dateError = getDateRangeError(appliedFilters);
  const hasInvalidFilters = !selectedFactoryExists || Boolean(dateError);
  const comparison = useMemo(() => {
    if (hasInvalidFilters) {
      return null;
    }

    return mapReportComparison({
      factoryId: appliedFilters.factoryId,
      fromA: appliedFilters.fromA,
      fromB: appliedFilters.fromB,
      reports,
      toA: appliedFilters.toA,
      toB: appliedFilters.toB
    });
  }, [appliedFilters, hasInvalidFilters, reports]);
  const selectedFactory = factories.find((factory) => factory.id === appliedFilters.factoryId) ?? null;
  const hasDraftChanges = buildQueryString(draftFilters) !== buildQueryString(appliedFilters);
  const hasAppliedQuery = searchKey.length > 0;
  const compareReturnTo = searchKey ? `${pathname}?${searchKey}` : pathname;

  function updateDraft(nextFilters: Partial<CompareFilters>) {
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

  function swapPeriods() {
    updateDraft({
      fromA: draftFilters.fromB,
      fromB: draftFilters.fromA,
      toA: draftFilters.toB,
      toB: draftFilters.toA
    });
  }

  return (
    <div className="space-y-5">
      <section className="rounded-md border border-[color:var(--line)] bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[color:var(--foreground)]">비교 조건</h2>
            <p className="mt-1 text-sm leading-6 text-[color:var(--muted)]">
              선택한 기간을 직전 동일 기간과 비교합니다. 조건은 URL에 반영되어 공유할 수 있습니다.
            </p>
          </div>
          {comparison ? (
            <span className="w-fit rounded-md border border-[color:var(--line)] bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
              기간 B {comparison.periodB.fromLabel} - {comparison.periodB.toLabel}
            </span>
          ) : null}
        </div>

        {selectedFactory ? (
          <p className="mt-3 w-fit rounded-md border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-800">
            선택 공장: {selectedFactory.name}
          </p>
        ) : null}

        <div className="mt-4 grid gap-3 lg:grid-cols-[150px_150px_150px_150px_220px_auto_auto_auto] lg:items-end">
          <label className="block">
            <span className="text-sm font-semibold text-[color:var(--foreground)]">기간 A 시작</span>
            <input
              className="mt-2 h-11 w-full rounded-md border border-[color:var(--line)] bg-white px-3 text-sm outline-none transition focus:border-[color:var(--accent)] focus:ring-2 focus:ring-teal-100"
              onChange={(event) => updateDraft({ fromA: event.target.value })}
              type="date"
              value={draftFilters.fromA}
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-[color:var(--foreground)]">기간 A 종료</span>
            <input
              className="mt-2 h-11 w-full rounded-md border border-[color:var(--line)] bg-white px-3 text-sm outline-none transition focus:border-[color:var(--accent)] focus:ring-2 focus:ring-teal-100"
              onChange={(event) => updateDraft({ toA: event.target.value })}
              type="date"
              value={draftFilters.toA}
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-[color:var(--foreground)]">기간 B 시작</span>
            <input
              className="mt-2 h-11 w-full rounded-md border border-[color:var(--line)] bg-white px-3 text-sm outline-none transition focus:border-[color:var(--accent)] focus:ring-2 focus:ring-teal-100"
              onChange={(event) => updateDraft({ fromB: event.target.value })}
              type="date"
              value={draftFilters.fromB}
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-[color:var(--foreground)]">기간 B 종료</span>
            <input
              className="mt-2 h-11 w-full rounded-md border border-[color:var(--line)] bg-white px-3 text-sm outline-none transition focus:border-[color:var(--accent)] focus:ring-2 focus:ring-teal-100"
              onChange={(event) => updateDraft({ toB: event.target.value })}
              type="date"
              value={draftFilters.toB}
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

          <button
            className="h-11 rounded-md bg-[color:var(--accent)] px-4 text-sm font-semibold text-white transition hover:bg-[color:var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!hasDraftChanges}
            onClick={applyFilters}
            type="button"
          >
            비교 적용
          </button>

          <button
            className="h-11 rounded-md border border-[color:var(--line)] bg-white px-4 text-sm font-semibold text-[color:var(--foreground)] transition hover:border-[color:var(--accent)]"
            onClick={swapPeriods}
            type="button"
          >
            기간 교체
          </button>

          <button
            className="h-11 rounded-md border border-[color:var(--line)] bg-white px-4 text-sm font-semibold text-[color:var(--foreground)] transition hover:border-[color:var(--accent)] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!hasAppliedQuery && !hasDraftChanges}
            onClick={resetFilters}
            type="button"
          >
            초기화
          </button>
        </div>

        {hasInvalidFilters ? (
          <InvalidCompareState
            dateError={dateError}
            factoryId={appliedFilters.factoryId}
            selectedFactoryExists={selectedFactoryExists}
          />
        ) : null}
      </section>

      {!hasInvalidFilters && comparison ? <CompareResultView comparison={comparison} returnTo={compareReturnTo} /> : null}
    </div>
  );
}

function CompareResultView({ comparison, returnTo }: { comparison: ReportCompareResult; returnTo: string }) {
  const isEmpty = comparison.periodATotals.reportCount === 0 && comparison.periodBTotals.reportCount === 0;

  if (isEmpty) {
    return <EmptyCompareState comparison={comparison} />;
  }

  return (
    <div className="space-y-5">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile
          delta={comparison.deltas.totalOutput}
          label="총 생산량"
          note="기간 B 대비"
          value={`${formatNumber(comparison.periodATotals.totalOutput)}개`}
        />
        <MetricTile
          delta={comparison.deltas.averageOperationRate}
          label="평균 가동률"
          note="높을수록 양호"
          value={formatPercent(comparison.periodATotals.averageOperationRate)}
        />
        <MetricTile
          delta={comparison.deltas.defectRate}
          label="불량률"
          note="낮을수록 양호"
          value={formatPercent(comparison.periodATotals.defectRate)}
        />
        <MetricTile
          delta={comparison.deltas.riskCount}
          label="확인 필요"
          note="주의/위험 리포트"
          value={`${comparison.periodATotals.riskCount}건`}
        />
      </section>

      <section className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)]">
        <article className="rounded-md border border-[color:var(--line)] bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-2 border-b border-[color:var(--line)] pb-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[color:var(--foreground)]">일자별 생산 흐름</h2>
              <p className="mt-1 text-sm text-[color:var(--muted)]">
                기간 A {comparison.periodA.fromLabel} - {comparison.periodA.toLabel} 기준입니다.
              </p>
            </div>
            <span className="w-fit rounded-md border border-[color:var(--line)] bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
              {comparison.periodA.dayCount}일
            </span>
          </div>
          <TrendChart comparison={comparison} returnTo={returnTo} />
        </article>

        <article className="rounded-md border border-[color:var(--line)] bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-[color:var(--foreground)]">기간 요약</h2>
          <dl className="mt-4 space-y-3">
            <PeriodMetric
              periodA={`${formatNumber(comparison.periodATotals.totalDefects)}건`}
              label="불량 수"
              periodB={`${formatNumber(comparison.periodBTotals.totalDefects)}건`}
            />
            <PeriodMetric
              periodA={`${comparison.periodATotals.reportCount}건`}
              label="리포트 수"
              periodB={`${comparison.periodBTotals.reportCount}건`}
            />
            <PeriodMetric
              periodA={formatPercent(comparison.periodATotals.averageOperationRate)}
              label="평균 가동률"
              periodB={formatPercent(comparison.periodBTotals.averageOperationRate)}
            />
          </dl>
        </article>
      </section>

      <section className="rounded-md border border-[color:var(--line)] bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-[color:var(--line)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[color:var(--foreground)]">공장별 비교</h2>
            <p className="mt-1 text-sm text-[color:var(--muted)]">확인 필요 항목과 생산량이 큰 공장이 먼저 표시됩니다.</p>
          </div>
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[1040px] border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-600">
              <tr>
                <th className="px-4 py-3">공장</th>
                <th className="px-4 py-3 text-right">생산량</th>
                <th className="px-4 py-3 text-right">생산량 변화</th>
                <th className="px-4 py-3 text-right">가동률</th>
                <th className="px-4 py-3 text-right">불량률</th>
                <th className="px-4 py-3 text-right">확인 필요</th>
                <th className="px-4 py-3 text-right">작업</th>
              </tr>
            </thead>
            <tbody>
              {comparison.factoryRows.map((row) => (
                <tr className="border-t border-[color:var(--line)]" key={row.factoryId}>
                  <td className="px-4 py-4">
                    <p className="font-semibold text-[color:var(--foreground)]">{row.factoryName}</p>
                    <p className="mt-1 text-xs text-[color:var(--muted)]">{row.factoryLocation}</p>
                  </td>
                  <td className="px-4 py-4 text-right font-semibold">{formatNumber(row.periodA.totalOutput)}개</td>
                  <td className="px-4 py-4 text-right">
                    <DeltaBadge delta={row.deltas.totalOutput} />
                  </td>
                  <td className="px-4 py-4 text-right">{formatPercent(row.periodA.averageOperationRate)}</td>
                  <td className="px-4 py-4 text-right">{formatPercent(row.periodA.defectRate)}</td>
                  <td className="px-4 py-4 text-right">{row.periodA.riskCount}건</td>
                  <td className="px-4 py-4">
                    <div className="flex justify-end gap-2">
                      <Link
                        className="inline-flex h-10 items-center rounded-md border border-[color:var(--line)] bg-white px-3 text-sm font-semibold text-[color:var(--foreground)] hover:border-[color:var(--accent)]"
                        href={row.links.reports}
                      >
                        리포트 보기
                      </Link>
                      <Link
                        className="inline-flex h-10 items-center rounded-md bg-[color:var(--foreground)] px-3 text-sm font-semibold text-white hover:bg-slate-700"
                        href={appendReturnTo(row.links.factory, returnTo)}
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
          {comparison.factoryRows.map((row) => (
            <article className="p-4" key={row.factoryId}>
              <div>
                <p className="text-base font-semibold text-[color:var(--foreground)]">{row.factoryName}</p>
                <p className="mt-1 text-sm text-[color:var(--muted)]">{row.factoryLocation}</p>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3">
                <CompactMetric label="생산량" value={`${formatNumber(row.periodA.totalOutput)}개`} />
                <CompactMetric label="생산량 변화" value={row.deltas.totalOutput.label} />
                <CompactMetric label="가동률" value={formatPercent(row.periodA.averageOperationRate)} />
                <CompactMetric label="불량률" value={formatPercent(row.periodA.defectRate)} />
              </dl>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <Link
                  className="flex h-11 w-full items-center justify-center rounded-md border border-[color:var(--line)] bg-white px-3 text-sm font-semibold text-[color:var(--foreground)]"
                  href={row.links.reports}
                >
                  리포트 보기
                </Link>
                <Link
                  className="flex h-11 w-full items-center justify-center rounded-md bg-[color:var(--foreground)] px-3 text-sm font-semibold text-white"
                  href={appendReturnTo(row.links.factory, returnTo)}
                >
                  공장 상세
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function MetricTile({
  delta,
  label,
  note,
  value
}: {
  delta: ReportCompareDelta;
  label: string;
  note: string;
  value: string;
}) {
  return (
    <article className="rounded-md border border-[color:var(--line)] bg-white p-4 shadow-sm">
      <p className="text-sm text-[color:var(--muted)]">{label}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <span className="inline-flex rounded-md border border-[color:var(--line)] bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700">
          {note}
        </span>
        <DeltaBadge delta={delta} />
      </div>
      <p className="mt-4 text-3xl font-semibold tracking-normal text-[color:var(--foreground)]">{value}</p>
    </article>
  );
}

function DeltaBadge({ delta }: { delta: ReportCompareDelta }) {
  return <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-semibold ${toneClass[delta.tone]}`}>{delta.label}</span>;
}

function PeriodMetric({ label, periodA, periodB }: { label: string; periodA: string; periodB: string }) {
  return (
    <div className="rounded-md border border-[color:var(--line)] bg-slate-50 p-3">
      <dt className="text-xs font-semibold text-[color:var(--muted)]">{label}</dt>
      <dd className="mt-2 flex items-center justify-between gap-3 text-sm">
        <span className="font-semibold text-[color:var(--foreground)]">기간 A {periodA}</span>
        <span className="text-[color:var(--muted)]">기간 B {periodB}</span>
      </dd>
    </div>
  );
}

function TrendChart({ comparison, returnTo }: { comparison: ReportCompareResult; returnTo: string }) {
  const maxOutput = Math.max(0, ...comparison.trend.map((point) => point.totalOutput));

  if (comparison.trend.length === 0) {
    return <p className="py-8 text-center text-sm text-[color:var(--muted)]">차트로 표시할 리포트가 없습니다.</p>;
  }

  return (
    <div className="mt-4 overflow-x-auto">
      <div className="flex min-w-[720px] items-end gap-3">
        {comparison.trend.map((point) => {
          const height = maxOutput > 0 ? Math.max(8, Math.round((point.totalOutput / maxOutput) * 100)) : 8;

          return (
            <div className="flex min-w-16 flex-1 flex-col items-center gap-2" key={point.date}>
              <div className="flex h-36 w-full items-end rounded-md bg-slate-100 px-2">
                <div
                  aria-label={`${point.dateLabel} 생산량 ${formatNumber(point.totalOutput)}개`}
                  className="w-full rounded-t-md bg-[color:var(--accent)]"
                  style={{ height: `${height}%` }}
                />
              </div>
              <Link
                className="text-xs font-semibold text-[color:var(--foreground)] underline-offset-4 hover:underline"
                href={appendReturnTo(`/reports/${point.date}`, returnTo)}
              >
                {point.dateLabel.slice(5)}
              </Link>
              <p className="text-xs text-[color:var(--muted)]">{formatCompact(point.totalOutput)}개</p>
            </div>
          );
        })}
      </div>
    </div>
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

function InvalidCompareState({
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
      <p className="text-sm font-semibold text-amber-900">비교 조건을 확인해 주세요.</p>
      <p className="mt-2 text-sm leading-6 text-amber-800">
        {!selectedFactoryExists ? `선택한 공장 ID(${factoryId})를 찾을 수 없습니다.` : dateError}
      </p>
      <form action="/reports/compare" className="mt-4" method="get">
        <button
          className="inline-flex h-11 items-center rounded-md border border-amber-300 bg-white px-4 text-sm font-semibold text-amber-900 hover:border-amber-500"
          type="submit"
        >
          기본 비교로 초기화
        </button>
      </form>
    </div>
  );
}

function EmptyCompareState({ comparison }: { comparison: ReportCompareResult }) {
  return (
    <section className="rounded-md border border-[color:var(--line)] bg-white px-4 py-12 text-center shadow-sm">
      <h2 className="text-xl font-semibold text-[color:var(--foreground)]">비교할 리포트가 없습니다.</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[color:var(--muted)]">
        기간 A {comparison.periodA.fromLabel} - {comparison.periodA.toLabel}, 기간 B {comparison.periodB.fromLabel} -{" "}
        {comparison.periodB.toLabel}에 저장된 생산 리포트가 없습니다. 기간을 바꾸거나 전체 리포트 목록에서 날짜를 다시 선택해 주세요.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Link
          className="inline-flex h-11 items-center rounded-md bg-[color:var(--foreground)] px-4 text-sm font-semibold text-white hover:bg-slate-700"
          href="/reports"
        >
          리포트 목록
        </Link>
        <Link
          className="inline-flex h-11 items-center rounded-md border border-[color:var(--line)] bg-white px-4 text-sm font-semibold text-[color:var(--foreground)] hover:border-[color:var(--accent)]"
          href="/reports/compare"
        >
          기본 비교
        </Link>
      </div>
    </section>
  );
}

function getFiltersFromSearchParams(searchKey: string, defaults: CompareFilters): CompareFilters {
  const params = new URLSearchParams(searchKey);

  return {
    factoryId: params.get("factoryId") ?? defaults.factoryId,
    fromA: params.get("fromA") ?? defaults.fromA,
    fromB: params.get("fromB") ?? defaults.fromB,
    toA: params.get("toA") ?? defaults.toA,
    toB: params.get("toB") ?? defaults.toB
  };
}

function buildQueryString(filters: CompareFilters) {
  const params = new URLSearchParams();

  if (filters.fromA) {
    params.set("fromA", filters.fromA);
  }

  if (filters.toA) {
    params.set("toA", filters.toA);
  }

  if (filters.fromB) {
    params.set("fromB", filters.fromB);
  }

  if (filters.toB) {
    params.set("toB", filters.toB);
  }

  if (filters.factoryId !== "all") {
    params.set("factoryId", filters.factoryId);
  }

  return params.toString();
}

function getDefaultCompareFilters(reports: ReportSummary[]): CompareFilters {
  const dates = [...new Set(reports.map((report) => report.reportDate))].sort();
  const toA = dates.at(-1) ?? "";
  const fromA = toA ? addDays(toA, -6) : "";
  const toB = fromA ? addDays(fromA, -1) : "";
  const fromB = toB ? addDays(toB, -6) : "";

  return {
    factoryId: "all",
    fromA,
    fromB,
    toA,
    toB
  };
}

function getFactories(reports: ReportSummary[]) {
  const factories = new Map<string, { id: string; name: string }>();

  for (const report of reports) {
    factories.set(report.factoryId, { id: report.factoryId, name: report.factoryName });
  }

  return [...factories.values()].sort((left, right) => left.name.localeCompare(right.name, "ko"));
}

function getDateRangeError(filters: CompareFilters) {
  if (!filters.fromA || !filters.toA || !filters.fromB || !filters.toB) {
    return "기간 A와 기간 B의 시작일, 종료일을 모두 선택해 주세요.";
  }

  if (!isDateString(filters.fromA)) {
    return "기간 A 시작일은 YYYY-MM-DD 형식이어야 합니다.";
  }

  if (!isDateString(filters.toA)) {
    return "기간 A 종료일은 YYYY-MM-DD 형식이어야 합니다.";
  }

  if (!isDateString(filters.fromB)) {
    return "기간 B 시작일은 YYYY-MM-DD 형식이어야 합니다.";
  }

  if (!isDateString(filters.toB)) {
    return "기간 B 종료일은 YYYY-MM-DD 형식이어야 합니다.";
  }

  if (filters.fromA > filters.toA) {
    return "기간 A 시작일은 종료일보다 늦을 수 없습니다.";
  }

  if (filters.fromB > filters.toB) {
    return "기간 B 시작일은 종료일보다 늦을 수 없습니다.";
  }

  return null;
}

function isDateString(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00Z`);

  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value);
}

function addDays(value: string, days: number) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString().slice(0, 10);
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
