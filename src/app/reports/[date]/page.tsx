import Link from "next/link";
import { notFound } from "next/navigation";
import { getReportDateDetail, getReportDates, type ReportSummary, type ReportTone } from "@/lib/reports";

type ReportDatePageProps = {
  params: Promise<{
    date: string;
  }>;
};

const toneClass: Record<ReportTone, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  danger: "border-rose-200 bg-rose-50 text-rose-800",
  neutral: "border-slate-200 bg-slate-50 text-slate-700"
};

export const revalidate = 600;

export async function generateStaticParams() {
  const dates = await getReportDates();

  return dates.map((date) => ({ date }));
}

export default async function ReportDatePage({ params }: ReportDatePageProps) {
  const { date } = await params;

  if (!isDateString(date)) {
    notFound();
  }

  const detail = await getReportDateDetail(date);

  return (
    <main className="min-h-screen overflow-x-hidden bg-[color:var(--background)]">
      <header className="border-b border-[color:var(--line)] bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <p className="text-xs font-semibold text-[color:var(--accent)]">Factory Pulse</p>
            <h1 className="mt-1 text-2xl font-semibold text-[color:var(--foreground)]">일별 생산 리포트</h1>
          </div>
          <nav aria-label="일별 생산 리포트 보조 이동" className="flex flex-wrap gap-2 text-sm">
            <Link
              className="rounded-md border border-[color:var(--line)] bg-white px-3 py-2 font-semibold text-[color:var(--foreground)] hover:border-[color:var(--accent)]"
              href="/reports"
            >
              리포트 목록
            </Link>
            <Link
              className="rounded-md border border-[color:var(--line)] bg-white px-3 py-2 font-semibold text-[color:var(--foreground)] hover:border-[color:var(--accent)]"
              href="/dashboard"
            >
              대시보드
            </Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="border-b border-[color:var(--line)] pb-5">
          <p className="text-sm font-semibold text-[color:var(--accent)]">ISR 상세 리포트</p>
          <h2 className="mt-2 max-w-4xl text-2xl font-semibold leading-tight text-[color:var(--foreground)] sm:text-3xl">
            {detail.reportDateLabel} 생산 성과를 공장별로 비교합니다.
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[color:var(--muted)]">
            같은 날짜의 공장별 생산량, 불량률, 가동률을 묶어 보고 운영자가 어느 공장을 먼저 확인해야 하는지 판단합니다.
          </p>
        </section>

        {detail.reports.length === 0 ? (
          <EmptyDateState date={detail.reportDateLabel} />
        ) : (
          <div className="mt-5 space-y-5">
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <SummaryTile label="총 생산량" note="전체 공장 합산" tone="neutral" value={`${formatNumber(detail.totals.totalOutput)}개`} />
              <SummaryTile label="평균 가동률" note="공장 평균" tone="success" value={formatPercent(detail.totals.averageOperationRate)} />
              <SummaryTile label="평균 불량률" note="전체 불량 기준" tone="warning" value={formatPercent(detail.totals.defectRate)} />
              <SummaryTile label="리포트 수" note="공장별 기록" tone="neutral" value={`${detail.totals.reportCount}건`} />
              <SummaryTile label="확인 필요" note="주의/위험" tone="danger" value={`${detail.totals.riskCount}건`} />
            </section>

            <section className="grid gap-3 lg:grid-cols-3">
              <HighlightReport title="생산량 최상위" report={detail.topOutputReport} valueKey="output" />
              <HighlightReport title="가동률 최저" report={detail.lowestOperationReport} valueKey="operation" />
              <HighlightReport title="불량률 최고" report={detail.highestDefectReport} valueKey="defect" />
            </section>

            <section className="rounded-md border border-[color:var(--line)] bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-2 border-b border-[color:var(--line)] pb-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-[color:var(--foreground)]">상태 요약</h2>
                  <p className="mt-1 text-sm text-[color:var(--muted)]">공장별 리포트를 상태 기준으로 묶었습니다.</p>
                </div>
              </div>
              <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <StatusCount label="양호" value={detail.statusCounts.good} tone="success" />
                <StatusCount label="주의" value={detail.statusCounts.warning} tone="warning" />
                <StatusCount label="확인 필요" value={detail.statusCounts.critical} tone="danger" />
                <StatusCount label="데이터 부족" value={detail.statusCounts.unknown} tone="neutral" />
              </dl>
            </section>

            <section className="rounded-md border border-[color:var(--line)] bg-white shadow-sm">
              <div className="flex flex-col gap-2 border-b border-[color:var(--line)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-[color:var(--foreground)]">공장별 리포트</h2>
                  <p className="mt-1 text-sm text-[color:var(--muted)]">주의와 확인 필요 상태가 먼저 표시됩니다.</p>
                </div>
              </div>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[920px] border-collapse text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold text-slate-600">
                    <tr>
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
                    {detail.reports.map((report) => (
                      <tr className="border-t border-[color:var(--line)]" key={report.reportId}>
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
                        <td className="px-4 py-4 text-right">
                          <Link
                            className="inline-flex h-10 items-center rounded-md bg-[color:var(--foreground)] px-3 text-sm font-semibold text-white hover:bg-slate-700"
                            href={report.links.factory}
                          >
                            공장 상세
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="divide-y divide-[color:var(--line)] md:hidden">
                {detail.reports.map((report) => (
                  <article className="p-4" key={report.reportId}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold text-[color:var(--foreground)]">{report.factoryName}</p>
                        <p className="mt-1 text-sm text-[color:var(--muted)]">{report.factoryLocation}</p>
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
                    <Link
                      className="mt-4 flex h-11 w-full items-center justify-center rounded-md bg-[color:var(--foreground)] px-3 text-sm font-semibold text-white"
                      href={report.links.factory}
                    >
                      공장 상세
                    </Link>
                  </article>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}

function EmptyDateState({ date }: { date: string }) {
  return (
    <section className="mt-5 rounded-md border border-[color:var(--line)] bg-white px-4 py-12 text-center shadow-sm">
      <h2 className="text-xl font-semibold text-[color:var(--foreground)]">{date} 리포트가 없습니다.</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[color:var(--muted)]">
        날짜 형식은 올바르지만 해당 날짜에 저장된 생산 리포트가 없습니다. 전체 리포트 목록에서 다른 날짜를 선택해 주세요.
      </p>
      <Link
        className="mt-5 inline-flex h-11 items-center rounded-md bg-[color:var(--foreground)] px-4 text-sm font-semibold text-white hover:bg-slate-700"
        href="/reports"
      >
        리포트 목록으로
      </Link>
    </section>
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

function HighlightReport({
  report,
  title,
  valueKey
}: {
  report: ReportSummary | null;
  title: string;
  valueKey: "output" | "operation" | "defect";
}) {
  const value = getHighlightValue(report, valueKey);

  return (
    <article className="rounded-md border border-[color:var(--line)] bg-white p-4 shadow-sm">
      <p className="text-sm font-semibold text-[color:var(--muted)]">{title}</p>
      {report ? (
        <>
          <h3 className="mt-3 text-lg font-semibold text-[color:var(--foreground)]">{report.factoryName}</h3>
          <p className="mt-1 text-sm text-[color:var(--muted)]">{report.factoryLocation}</p>
          <p className="mt-4 text-2xl font-semibold text-[color:var(--foreground)]">{value}</p>
          <span className={`mt-3 inline-flex rounded-md border px-2 py-1 text-xs font-semibold ${toneClass[report.status.tone]}`}>
            {report.status.label}
          </span>
        </>
      ) : (
        <p className="mt-3 text-sm text-[color:var(--muted)]">표시할 리포트가 없습니다.</p>
      )}
    </article>
  );
}

function StatusCount({ label, tone, value }: { label: string; tone: ReportTone; value: number }) {
  return (
    <div className={`rounded-md border px-3 py-3 ${toneClass[tone]}`}>
      <dt className="text-xs font-semibold">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold">{value}건</dd>
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

function getHighlightValue(report: ReportSummary | null, valueKey: "output" | "operation" | "defect") {
  if (!report) {
    return "-";
  }

  switch (valueKey) {
    case "operation":
      return report.operationRateLabel;
    case "defect":
      return report.defectRateLabel;
    case "output":
    default:
      return report.totalOutputLabel;
  }
}

function isDateString(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00Z`);

  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value);
}

function formatPercent(value: number) {
  if (!Number.isFinite(value)) {
    return "-";
  }

  return `${value.toFixed(1)}%`;
}
