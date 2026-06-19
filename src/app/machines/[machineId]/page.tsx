import Link from "next/link";
import { notFound } from "next/navigation";
import { getMachineDetail } from "@/lib/machines";
import type { MachineDetail, MachineDetailAlarm, MachineStatusTone, SensorMetric } from "@/lib/machines";
import { ReturnToLink } from "@/shared/ui/ReturnToLink";

export const dynamic = "force-dynamic";

const statusClass: Record<MachineStatusTone, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  danger: "border-rose-200 bg-rose-50 text-rose-800",
  neutral: "border-slate-200 bg-slate-50 text-slate-700",
  info: "border-cyan-200 bg-cyan-50 text-cyan-800"
};

export default async function MachineDetailPage({
  params
}: {
  params: Promise<{ machineId: string }>;
}) {
  const { machineId } = await params;
  const machine = await getMachineDetail(machineId);

  if (!machine) {
    notFound();
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[color:var(--background)]">
      <header className="border-b border-[color:var(--line)] bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <p className="text-xs font-semibold text-[color:var(--accent)]">Factory Pulse</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold text-[color:var(--foreground)]">{machine.name}</h1>
              <span className={`rounded-md border px-2 py-1 text-xs font-semibold ${statusClass[machine.status.tone]}`}>
                {machine.status.label}
              </span>
            </div>
          </div>
          <ReturnToLink
            className="w-fit rounded-md border border-[color:var(--line)] bg-white px-3 py-2 text-sm font-semibold text-[color:var(--foreground)] hover:border-[color:var(--accent)]"
            fallbackHref={`/machines?factoryId=${encodeURIComponent(machine.factoryId)}`}
          >
            이전 목록으로
          </ReturnToLink>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
          <article className="rounded-md border border-[color:var(--line)] bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-[color:var(--accent)]">설비 상세</p>
            <h2 className="mt-2 text-2xl font-semibold">{machine.name}</h2>
            <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
              {machine.factoryName} / {machine.lineName}
            </p>

            <dl className="mt-5 grid gap-4 sm:grid-cols-2">
              <DetailMetric label="공장" value={machine.factoryName} />
              <DetailMetric label="라인" value={machine.lineName} />
              <DetailMetric label="유형" value={machine.type} />
              <DetailMetric label="모델" value={machine.modelNameLabel} />
              <DetailMetric label="설치일" value={machine.installedAtLabel} />
              <DetailMetric label="열린 알람" value={`${machine.openAlarmCount}건`} />
              <DetailMetric label="센서 갱신" value={machine.sensorSnapshot?.recordedAtLabel ?? "센서 데이터 없음"} />
            </dl>
          </article>

          <aside className="rounded-md border border-[color:var(--line)] bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">알람 요약</h2>
            <div className="mt-4 space-y-3">
              <StatusLine label="열린 알람" value={machine.openAlarmCount} />
              <StatusLine label="위험 알람" value={machine.criticalOpenAlarmCount} />
              <StatusLine label="주의 알람" value={machine.warningOpenAlarmCount} />
            </div>
          </aside>
        </section>

        <section className="mt-5 rounded-md border border-[color:var(--line)] bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-2 border-b border-[color:var(--line)] pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">현재 센서 상태</h2>
              <p className="mt-1 text-sm text-[color:var(--muted)]">
                온도, 압력, 전류, 진동의 최신 스냅샷입니다.
              </p>
            </div>
            <span className="w-fit rounded-md border border-[color:var(--line)] bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
              {machine.sensorSnapshot ? `갱신 ${machine.sensorSnapshot.recordedAtLabel}` : "센서 데이터 없음"}
            </span>
          </div>

          {machine.sensorSnapshot ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {machine.sensorSnapshot.metrics.map((metric) => (
                <SensorMetricCard key={metric.key} metric={metric} />
              ))}
            </div>
          ) : (
            <EmptyPanel
              description="해당 설비의 센서 스냅샷이 아직 없습니다."
              title="표시할 현재 센서 상태가 없습니다."
            />
          )}
        </section>

        <section className="mt-5 rounded-md border border-[color:var(--line)] bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-[color:var(--line)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">최근 알람</h2>
              <p className="mt-1 text-sm text-[color:var(--muted)]">최근 발생한 알람 5건을 최신순으로 표시합니다.</p>
            </div>
            <Link
              className="w-fit rounded-md border border-[color:var(--line)] bg-white px-3 py-2 text-sm font-semibold text-[color:var(--foreground)] hover:border-[color:var(--accent)]"
              href={machine.links.alarms}
            >
              전체 알람 보기
            </Link>
          </div>

          {machine.recentAlarms.length === 0 ? (
            <EmptyPanel description="최근 발생한 알람이 없습니다." title="최근 알람 없음" />
          ) : (
            <RecentAlarmList alarms={machine.recentAlarms} />
          )}
        </section>

        <section className="mt-5 rounded-md border border-[color:var(--line)] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">다음 연결 화면</h2>
          <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
            알람 목록은 구현되어 활성화했습니다. 이력 보기는 설비 이력 route 구현 후 활성화합니다.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              className="flex h-11 items-center rounded-md bg-[color:var(--accent)] px-4 text-sm font-semibold text-white hover:bg-[color:var(--accent-strong)]"
              href={machine.links.alarms}
            >
              알람 보기
            </Link>
            <Link
              className="flex h-11 items-center rounded-md border border-[color:var(--line)] bg-white px-4 text-sm font-semibold text-[color:var(--foreground)] hover:border-[color:var(--accent)]"
              href={`/factories/${encodeURIComponent(machine.factoryId)}`}
            >
              공장 상세
            </Link>
            <span className="flex h-11 items-center rounded-md border border-[color:var(--line)] bg-slate-50 px-4 text-sm font-semibold text-[color:var(--muted)]">
              이력 보기 예정
            </span>
          </div>
        </section>
      </div>
    </main>
  );
}

function SensorMetricCard({ metric }: { metric: SensorMetric }) {
  return (
    <article className="rounded-md border border-[color:var(--line)] bg-slate-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-[color:var(--muted)]">{metric.label}</p>
        <span className={`rounded-md border px-2 py-1 text-xs font-semibold ${statusClass[metric.status.tone]}`}>
          {metric.status.label}
        </span>
      </div>
      <p className="mt-4 text-3xl font-semibold text-[color:var(--foreground)]">{metric.valueLabel}</p>
      <p className="mt-2 text-xs font-medium text-[color:var(--muted)]">{metric.rangeLabel}</p>
    </article>
  );
}

function RecentAlarmList({ alarms }: { alarms: MachineDetailAlarm[] }) {
  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold text-slate-600">
            <tr>
              <th className="px-5 py-3">알람</th>
              <th className="px-5 py-3">심각도</th>
              <th className="px-5 py-3">상태</th>
              <th className="px-5 py-3">발생 시각</th>
            </tr>
          </thead>
          <tbody>
            {alarms.map((alarm) => (
              <tr className="border-t border-[color:var(--line)]" key={alarm.id}>
                <td className="px-5 py-4 font-semibold text-[color:var(--foreground)]">{alarm.message}</td>
                <td className="px-5 py-4">
                  <span className={`rounded-md border px-2 py-1 text-xs font-semibold ${statusClass[alarm.severity.tone]}`}>
                    {alarm.severity.label}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <span className={`rounded-md border px-2 py-1 text-xs font-semibold ${statusClass[alarm.status.tone]}`}>
                    {alarm.status.label}
                  </span>
                </td>
                <td className="px-5 py-4 text-[color:var(--muted)]">{alarm.occurredAtLabel}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="divide-y divide-[color:var(--line)] md:hidden">
        {alarms.map((alarm) => (
          <article className="p-4" key={alarm.id}>
            <div className="flex flex-wrap gap-2">
              <span className={`rounded-md border px-2 py-1 text-xs font-semibold ${statusClass[alarm.severity.tone]}`}>
                {alarm.severity.label}
              </span>
              <span className={`rounded-md border px-2 py-1 text-xs font-semibold ${statusClass[alarm.status.tone]}`}>
                {alarm.status.label}
              </span>
            </div>
            <h3 className="mt-3 text-sm font-semibold text-[color:var(--foreground)]">{alarm.message}</h3>
            <p className="mt-2 text-xs text-[color:var(--muted)]">{alarm.occurredAtLabel}</p>
          </article>
        ))}
      </div>
    </>
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

function DetailMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-t border-[color:var(--line)] pt-3">
      <dt className="text-xs font-semibold text-[color:var(--muted)]">{label}</dt>
      <dd className="mt-1 break-words text-base font-semibold text-[color:var(--foreground)]">{value}</dd>
    </div>
  );
}

function StatusLine({ label, value }: { label: string; value: MachineDetail["openAlarmCount"] }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[color:var(--line)] pb-3 text-sm last:border-b-0 last:pb-0">
      <span className="font-medium text-[color:var(--muted)]">{label}</span>
      <span className="font-semibold text-[color:var(--foreground)]">{value}건</span>
    </div>
  );
}
