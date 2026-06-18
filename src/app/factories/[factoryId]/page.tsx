import Link from "next/link";
import { notFound } from "next/navigation";
import { getFactorySummaries } from "@/lib/factories";
import type { FactoryStatusTone, FactorySummary } from "@/lib/factories";

export const revalidate = 600;

const statusClass: Record<FactoryStatusTone, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  danger: "border-rose-200 bg-rose-50 text-rose-800",
  neutral: "border-slate-200 bg-slate-50 text-slate-700"
};

export async function generateStaticParams() {
  const factories = await getFactorySummaries();

  return factories.map((factory) => ({
    factoryId: factory.factoryId
  }));
}

export default async function FactoryDetailPage({
  params
}: {
  params: Promise<{ factoryId: string }>;
}) {
  const { factoryId } = await params;
  const factories = await getFactorySummaries();
  const factory = factories.find((item) => item.factoryId === factoryId);

  if (!factory) {
    notFound();
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[color:var(--background)]">
      <header className="border-b border-[color:var(--line)] bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <p className="text-xs font-semibold text-[color:var(--accent)]">Factory Pulse</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold text-[color:var(--foreground)]">{factory.name}</h1>
              <span className={`rounded-md border px-2 py-1 text-xs font-semibold ${statusClass[factory.status.tone]}`}>
                {factory.status.label}
              </span>
            </div>
          </div>
          <Link
            className="w-fit rounded-md border border-[color:var(--line)] bg-white px-3 py-2 text-sm font-semibold text-[color:var(--foreground)] hover:border-[color:var(--accent)]"
            href="/factories"
          >
            목록으로
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
          <article className="rounded-md border border-[color:var(--line)] bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-[color:var(--accent)]">공장 상세</p>
            <h2 className="mt-2 text-2xl font-semibold">{factory.name}</h2>
            <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
              {factory.description ?? "등록된 설명이 없습니다."}
            </p>

            <dl className="mt-5 grid gap-4 sm:grid-cols-2">
              <DetailMetric label="위치" value={factory.locationLabel} />
              <DetailMetric label="최근 리포트" value={factory.latestReportDateLabel} />
              <DetailMetric label="라인" value={`${factory.activeLineCount}/${factory.lineCount}개 활성`} />
              <DetailMetric label="설비" value={`${factory.machineCount}대`} />
              <DetailMetric label="열린 알람" value={`${factory.openAlarmCount}건`} />
              <DetailMetric label="위험 알람" value={`${factory.criticalOpenAlarmCount}건`} />
            </dl>
          </article>

          <aside className="rounded-md border border-[color:var(--line)] bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">상태 요약</h2>
            <div className="mt-4 space-y-3">
              <StatusLine label="정상 설비" value={factory.machineStatusCounts.normal} />
              <StatusLine label="주의 설비" value={factory.machineStatusCounts.warning} />
              <StatusLine label="위험 설비" value={factory.machineStatusCounts.critical} />
              <StatusLine label="정지 설비" value={factory.machineStatusCounts.stopped} />
              <StatusLine label="점검 설비" value={factory.machineStatusCounts.maintenance} />
            </div>
          </aside>
        </section>

        <section className="mt-5 rounded-md border border-[color:var(--line)] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">다음 연결 화면</h2>
          <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
            설비, 알람, 생산 리포트 화면으로 현재 공장 기준의 운영 데이터를 이어서 확인합니다.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              className="flex h-11 items-center rounded-md bg-[color:var(--accent)] px-4 text-sm font-semibold text-white hover:bg-[color:var(--accent-strong)]"
              href={factory.links.machines}
            >
              설비 목록
            </Link>
            <Link
              className="flex h-11 items-center rounded-md border border-[color:var(--line)] bg-white px-4 text-sm font-semibold text-[color:var(--foreground)] hover:border-[color:var(--accent)]"
              href={factory.links.alarms}
            >
              알람 보기
            </Link>
            <Link
              className="flex h-11 items-center rounded-md border border-[color:var(--line)] bg-white px-4 text-sm font-semibold text-[color:var(--foreground)] hover:border-[color:var(--accent)]"
              href={factory.links.reports}
            >
              리포트 보기
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

function DetailMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-t border-[color:var(--line)] pt-3">
      <dt className="text-xs font-semibold text-[color:var(--muted)]">{label}</dt>
      <dd className="mt-1 break-words text-base font-semibold text-[color:var(--foreground)]">{value}</dd>
    </div>
  );
}

function StatusLine({ label, value }: { label: string; value: FactorySummary["machineStatusCounts"][keyof FactorySummary["machineStatusCounts"]] }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[color:var(--line)] pb-3 text-sm last:border-b-0 last:pb-0">
      <span className="font-medium text-[color:var(--muted)]">{label}</span>
      <span className="font-semibold text-[color:var(--foreground)]">{value}대</span>
    </div>
  );
}
