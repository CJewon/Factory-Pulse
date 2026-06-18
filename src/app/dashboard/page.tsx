import { Suspense } from "react";
import Link from "next/link";
import {
  getDashboardMachineBoard,
  getDashboardRecentAlarms,
  getDashboardSummary,
  getDashboardTrend,
  type DashboardAlarmItem,
  type DashboardTone,
} from "@/lib/dashboard";

export const dynamic = "force-dynamic";

const toneClass: Record<DashboardTone, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  danger: "border-rose-200 bg-rose-50 text-rose-800",
  neutral: "border-slate-200 bg-slate-50 text-slate-700",
  info: "border-cyan-200 bg-cyan-50 text-cyan-800"
};

export default function DashboardPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[color:var(--background)]">
      <header className="border-b border-[color:var(--line)] bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <p className="text-xs font-semibold text-[color:var(--accent)]">Factory Pulse</p>
            <h1 className="mt-1 text-2xl font-semibold text-[color:var(--foreground)]">대시보드</h1>
          </div>
          <nav aria-label="대시보드 보조 이동" className="flex flex-wrap gap-2 text-sm">
            <Link className="rounded-md border border-[color:var(--line)] bg-white px-3 py-2 font-semibold hover:border-[color:var(--accent)]" href="/factories">
              공장 목록
            </Link>
            <Link className="rounded-md border border-[color:var(--line)] bg-white px-3 py-2 font-semibold hover:border-[color:var(--accent)]" href="/machines">
              설비 목록
            </Link>
            <Link className="rounded-md border border-[color:var(--line)] bg-white px-3 py-2 font-semibold hover:border-[color:var(--accent)]" href="/alarms">
              알람 목록
            </Link>
            <Link className="rounded-md border border-[color:var(--line)] bg-white px-3 py-2 font-semibold hover:border-[color:var(--accent)]" href="/reports">
              리포트 목록
            </Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="border-b border-[color:var(--line)] pb-5">
          <p className="text-sm font-semibold text-[color:var(--accent)]">Dynamic + Streaming</p>
          <h2 className="mt-2 max-w-3xl text-2xl font-semibold leading-tight text-[color:var(--foreground)] sm:text-3xl">
            전체 공장과 설비의 현재 위험도를 먼저 확인합니다.
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[color:var(--muted)]">
            Supabase 최신 공개 데이터를 요청 시점에 조회하고, 알람/설비/생산 추세 영역은 Suspense 경계로 분리합니다.
          </p>
        </section>

        <div className="mt-5">
          <Suspense fallback={<SummarySkeleton />}>
            <DashboardSummarySection />
          </Suspense>
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.75fr)]">
          <Suspense fallback={<PanelSkeleton title="설비 상태 보드" />}>
            <MachineStatusBoard />
          </Suspense>
          <Suspense fallback={<PanelSkeleton title="최근 알람" />}>
            <RecentAlarmsPanel />
          </Suspense>
        </div>

        <div className="mt-5">
          <Suspense fallback={<PanelSkeleton title="생산량 추이" />}>
            <ProductionTrendPanel />
          </Suspense>
        </div>
      </div>
    </main>
  );
}

async function DashboardSummarySection() {
  const summary = await getDashboardSummary();

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <SummaryTile label="전체 가동률" note="최근 리포트 평균" tone="success" value={summary.averageOperationRateLabel} />
      <SummaryTile label="가동 설비" note={`전체 ${summary.machineCount}대`} tone="info" value={`${summary.normalMachineCount}대`} />
      <SummaryTile label="미해결 알람" note={`위험 ${summary.criticalOpenAlarmCount}건`} tone="warning" value={`${summary.openAlarmCount}건`} />
      <SummaryTile
        label="위험 설비"
        note={`주의 ${summary.warningMachineCount}대 / 정지 ${summary.pausedMachineCount}대`}
        tone="danger"
        value={`${summary.criticalMachineCount}대`}
      />
    </section>
  );
}

async function MachineStatusBoard() {
  const machines = await getDashboardMachineBoard();

  return (
    <section className="rounded-md border border-[color:var(--line)] bg-white shadow-sm">
      <PanelHeader
        actionHref="/machines"
        actionLabel="설비 목록"
        description="위험도와 열린 알람이 높은 설비부터 표시합니다."
        title="설비 상태 보드"
      />
      {machines.length === 0 ? (
        <EmptyPanel description="등록된 설비가 없습니다." title="표시할 설비가 없습니다." />
      ) : (
        <div className="divide-y divide-[color:var(--line)]">
          {machines.map((machine) => (
            <article className="grid gap-3 px-4 py-4 md:grid-cols-[minmax(180px,1fr)_160px_140px_auto] md:items-center" key={machine.id}>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-[color:var(--foreground)]">{machine.name}</h3>
                  <span className={`rounded-md border px-2 py-1 text-xs font-semibold ${toneClass[machine.statusTone]}`}>
                    {machine.statusLabel}
                  </span>
                </div>
                <p className="mt-1 text-sm text-[color:var(--muted)]">
                  {machine.factoryName} / {machine.lineName}
                </p>
              </div>
              <Metric label="열린 알람" value={`${machine.openAlarmCount}건`} />
              <div>
                <span className={`rounded-md border px-2 py-1 text-xs font-semibold ${toneClass[machine.sensorTone]}`}>
                  {machine.sensorLabel}
                </span>
                <p className="mt-2 text-xs text-[color:var(--muted)]">{machine.sensorRecordedAtLabel}</p>
              </div>
              <Link className="flex h-10 items-center justify-center rounded-md bg-[color:var(--foreground)] px-3 text-sm font-semibold text-white hover:bg-slate-700" href={machine.links.detail}>
                상세 보기
              </Link>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

async function RecentAlarmsPanel() {
  const alarms = await getDashboardRecentAlarms();

  return (
    <section className="rounded-md border border-[color:var(--line)] bg-white shadow-sm">
      <PanelHeader actionHref="/alarms" actionLabel="알람 목록" description="미해결 위험 알람을 우선 표시합니다." title="최근 알람" />
      {alarms.length === 0 ? (
        <EmptyPanel description="최근 발생한 알람이 없습니다." title="최근 알람 없음" />
      ) : (
        <div className="divide-y divide-[color:var(--line)]">
          {alarms.map((alarm) => (
            <AlarmRow alarm={alarm} key={alarm.id} />
          ))}
        </div>
      )}
    </section>
  );
}

async function ProductionTrendPanel() {
  const trend = await getDashboardTrend();

  return (
    <section className="rounded-md border border-[color:var(--line)] bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-2 border-b border-[color:var(--line)] pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">생산량 추이</h2>
          <p className="mt-1 text-sm text-[color:var(--muted)]">최근 생산 리포트 기준 일자별 생산량입니다.</p>
        </div>
        <Link className="w-fit rounded-md border border-[color:var(--line)] bg-white px-3 py-2 text-sm font-semibold hover:border-[color:var(--accent)]" href="/reports">
          리포트 목록
        </Link>
      </div>
      {trend.length === 0 ? (
        <EmptyPanel description="표시할 생산 리포트가 없습니다." title="생산 추세 없음" />
      ) : (
        <div className="mt-4 overflow-x-auto">
          <div className="flex min-w-[680px] items-end gap-3">
            {trend.map((point) => (
              <div className="flex min-w-14 flex-1 flex-col items-center gap-2" key={point.date}>
                <div className="flex h-36 w-full items-end rounded-md bg-slate-100 px-2">
                  <div
                    aria-label={`${point.dateLabel} 생산량 ${point.totalOutputLabel}`}
                    className="w-full rounded-t-md bg-[color:var(--accent)]"
                    style={{ height: `${point.height}%` }}
                  />
                </div>
                <p className="text-xs font-semibold text-[color:var(--foreground)]">{point.dateLabel.slice(5)}</p>
                <p className="text-xs text-[color:var(--muted)]">{point.totalOutputLabel}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function SummaryTile({ label, note, tone, value }: { label: string; note: string; tone: DashboardTone; value: string }) {
  return (
    <article className="rounded-md border border-[color:var(--line)] bg-white p-4 shadow-sm">
      <p className="text-sm text-[color:var(--muted)]">{label}</p>
      <span className={`mt-2 inline-flex rounded-md border px-2 py-1 text-xs font-semibold ${toneClass[tone]}`}>{note}</span>
      <p className="mt-4 text-3xl font-semibold text-[color:var(--foreground)]">{value}</p>
    </article>
  );
}

function PanelHeader({
  actionHref,
  actionLabel,
  description,
  title
}: {
  actionHref: string;
  actionLabel: string;
  description: string;
  title: string;
}) {
  return (
    <div className="flex flex-col gap-2 border-b border-[color:var(--line)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-[color:var(--muted)]">{description}</p>
      </div>
      <Link className="w-fit rounded-md border border-[color:var(--line)] bg-white px-3 py-2 text-sm font-semibold hover:border-[color:var(--accent)]" href={actionHref}>
        {actionLabel}
      </Link>
    </div>
  );
}

function AlarmRow({ alarm }: { alarm: DashboardAlarmItem }) {
  return (
    <article className="px-4 py-4">
      <div className="flex flex-wrap gap-2">
        <span className={`rounded-md border px-2 py-1 text-xs font-semibold ${toneClass[alarm.severityTone]}`}>
          {alarm.severityLabel}
        </span>
        <span className={`rounded-md border px-2 py-1 text-xs font-semibold ${toneClass[alarm.statusTone]}`}>
          {alarm.statusLabel}
        </span>
      </div>
      <h3 className="mt-3 text-sm font-semibold text-[color:var(--foreground)]">{alarm.message}</h3>
      <p className="mt-1 text-xs leading-5 text-[color:var(--muted)]">
        {alarm.factoryName} / {alarm.machineName} / {alarm.occurredAtLabel}
      </p>
      <Link className="mt-3 inline-flex h-10 items-center rounded-md bg-[color:var(--foreground)] px-3 text-sm font-semibold text-white hover:bg-slate-700" href={alarm.links.machine}>
        설비 상세
      </Link>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-[color:var(--muted)]">{label}</p>
      <p className="mt-1 font-semibold text-[color:var(--foreground)]">{value}</p>
    </div>
  );
}

function EmptyPanel({ description, title }: { description: string; title: string }) {
  return (
    <div className="px-4 py-8 text-center">
      <p className="text-base font-semibold text-[color:var(--foreground)]">{title}</p>
      <p className="mt-2 text-sm text-[color:var(--muted)]">{description}</p>
    </div>
  );
}

function SummarySkeleton() {
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {["summary-1", "summary-2", "summary-3", "summary-4"].map((item) => (
        <div className="rounded-md border border-[color:var(--line)] bg-white p-4 shadow-sm" key={item}>
          <div className="h-4 w-24 rounded bg-slate-100" />
          <div className="mt-4 h-8 w-20 rounded bg-slate-200" />
        </div>
      ))}
    </section>
  );
}

function PanelSkeleton({ title }: { title: string }) {
  return (
    <section className="rounded-md border border-[color:var(--line)] bg-white p-4 shadow-sm">
      <div className="h-5 w-32 rounded bg-slate-200" aria-label={`${title} 로딩`} />
      <div className="mt-4 space-y-3">
        {["row-1", "row-2", "row-3"].map((row) => (
          <div className="h-16 rounded bg-slate-100" key={row} />
        ))}
      </div>
    </section>
  );
}
