"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AlarmSummary, AlarmTone } from "@/lib/alarms/types";
import {
  buildLiveAlarmQueryString,
  defaultLiveAlarmFilters,
  formatLiveAlarmTime,
  formatLiveRefreshInterval,
  liveAlarmLimitOptions,
  liveAlarmRefreshIntervals,
  type LiveAlarmFilters,
  type LiveAlarmSeverityFilter,
  type LiveAlarmSnapshot,
  type LiveAlarmStatusFilter
} from "@/lib/alarms/live";

type RefreshInterval = (typeof liveAlarmRefreshIntervals)[number];

const toneClass: Record<AlarmTone, string> = {
  danger: "border-rose-200 bg-rose-50 text-rose-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  info: "border-sky-200 bg-sky-50 text-sky-800",
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  neutral: "border-slate-200 bg-slate-50 text-slate-700"
};

const severityOptions: Array<{ label: string; value: LiveAlarmSeverityFilter }> = [
  { label: "전체 심각도", value: "all" },
  { label: "위험", value: "critical" },
  { label: "주의", value: "warning" },
  { label: "정보", value: "info" },
  { label: "확인 필요", value: "unknown" }
];

const statusOptions: Array<{ label: string; value: LiveAlarmStatusFilter }> = [
  { label: "미해결", value: "open" },
  { label: "전체 상태", value: "all" },
  { label: "해결됨", value: "resolved" }
];

export function LiveAlarmsClient({ initialFilters }: { initialFilters: LiveAlarmFilters }) {
  const router = useRouter();
  const [filters, setFilters] = useState(initialFilters);
  const [isLive, setIsLive] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState<RefreshInterval>(15);
  const previousAlarmIdsRef = useRef<Set<string> | null>(null);
  const [newAlarmIds, setNewAlarmIds] = useState<Set<string>>(new Set());

  const query = useQuery({
    queryKey: ["alarms", "live", filters],
    queryFn: () => fetchLiveAlarmSnapshot(filters),
    refetchInterval: isLive ? refreshInterval * 1000 : false,
    refetchIntervalInBackground: false,
    staleTime: 0,
    placeholderData: (previousData) => previousData
  });

  const snapshot = query.data ?? null;
  const visibleMachines = useMemo(() => {
    if (!snapshot) {
      return [];
    }

    return snapshot.options.machines.filter((machine) => !filters.factoryId || machine.factoryId === filters.factoryId);
  }, [filters.factoryId, snapshot]);
  const statusLabel = isLive ? "감시 중" : "일시정지";
  const statusClass = isLive ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-slate-50 text-slate-700";
  const hasActiveFilters = buildLiveAlarmQueryString(filters).length > 0;

  useEffect(() => {
    if (!snapshot) {
      return;
    }

    const currentIds = new Set(snapshot.alarms.map((alarm) => alarm.id));
    const previousIds = previousAlarmIdsRef.current;

    if (previousIds) {
      const nextNewAlarmIds = new Set(snapshot.alarms.filter((alarm) => !previousIds.has(alarm.id)).map((alarm) => alarm.id));

      if (nextNewAlarmIds.size > 0) {
        setNewAlarmIds(nextNewAlarmIds);
        const timeout = window.setTimeout(() => setNewAlarmIds(new Set()), 6000);

        previousAlarmIdsRef.current = currentIds;
        return () => window.clearTimeout(timeout);
      }
    }

    previousAlarmIdsRef.current = currentIds;
  }, [snapshot]);

  function updateFilters(patch: Partial<LiveAlarmFilters>) {
    const nextFilters: LiveAlarmFilters = {
      ...filters,
      ...patch
    };

    if (patch.factoryId !== undefined) {
      nextFilters.machineId = null;
    }

    setFilters(nextFilters);
    const queryString = buildLiveAlarmQueryString(nextFilters);
    router.replace(queryString ? `/alarms/live?${queryString}` : "/alarms/live", { scroll: false });
  }

  function resetFilters() {
    updateFilters(defaultLiveAlarmFilters);
  }

  return (
    <div className="space-y-5">
      <section className="rounded-md border border-[color:var(--line)] bg-white p-4 shadow-sm sm:p-5">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-md border px-2 py-1 text-xs font-semibold ${statusClass}`}>{statusLabel}</span>
              {query.isFetching ? (
                <span className="rounded-md border border-sky-200 bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-800">
                  갱신 중...
                </span>
              ) : null}
            </div>
            <h2 className="mt-3 text-xl font-semibold text-[color:var(--foreground)]">Live feed</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[color:var(--muted)]">
              기본값은 미해결 알람입니다. 자동 갱신은 브라우저가 켜져 있을 때만 동작하며, 일시정지할 수 있습니다.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              className="h-11 rounded-md border border-[color:var(--line)] bg-white px-4 text-sm font-semibold hover:border-[color:var(--accent)] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={query.isFetching}
              onClick={() => void query.refetch()}
              type="button"
            >
              {query.isFetching ? "갱신 중" : "새로고침"}
            </button>
            <button
              className="h-11 rounded-md bg-[color:var(--foreground)] px-4 text-sm font-semibold text-white hover:bg-slate-700"
              onClick={() => setIsLive((current) => !current)}
              type="button"
            >
              {isLive ? "일시정지" : "다시 시작"}
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <StatusMetric label="마지막 성공" value={snapshot ? formatLiveAlarmTime(snapshot.fetchedAt) : "대기 중"} />
          <StatusMetric label="갱신 주기" value={formatLiveRefreshInterval(refreshInterval)} />
          <StatusMetric label="조회 제한" value={`최근 ${filters.limit}건`} />
          <StatusMetric label="신규 감지" value={newAlarmIds.size > 0 ? `${newAlarmIds.size}건` : "없음"} />
        </div>

        {newAlarmIds.size > 0 ? (
          <p aria-live="polite" className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
            새 알람 {newAlarmIds.size}건이 감지되었습니다.
          </p>
        ) : null}
      </section>

      {snapshot ? (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryTile label="미해결" note="전체 공개 데이터 기준" tone="warning" value={`${snapshot.totals.openCount}건`} />
          <SummaryTile label="위험" note="미해결 위험" tone="danger" value={`${snapshot.totals.openCriticalCount}건`} />
          <SummaryTile label="주의" note="미해결 주의" tone="warning" value={`${snapshot.totals.openWarningCount}건`} />
          <SummaryTile label="최근 10분" note="감시 기준" tone="info" value={`${snapshot.totals.recentOpenCount}건`} />
        </section>
      ) : null}

      <section className="rounded-md border border-[color:var(--line)] bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-2 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h2 className="text-lg font-semibold">감시 조건</h2>
            <p className="mt-1 text-sm leading-6 text-[color:var(--muted)]">필터는 URL에 반영되어 같은 감시 조건을 공유할 수 있습니다.</p>
          </div>
          <span className="w-fit rounded-md border border-[color:var(--line)] bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
            기본 상태: 미해결
          </span>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-[180px_180px_180px_180px_150px_150px_auto] xl:items-end">
          <SelectField label="공장">
            <select
              className={selectClassName}
              onChange={(event) => updateFilters({ factoryId: event.target.value === "all" ? null : event.target.value })}
              value={filters.factoryId ?? "all"}
            >
              <option value="all">전체 공장</option>
              {snapshot?.options.factories.map((factory) => (
                <option key={factory.id} value={factory.id}>
                  {factory.name}
                </option>
              ))}
            </select>
          </SelectField>

          <SelectField label="설비">
            <select
              className={selectClassName}
              onChange={(event) => updateFilters({ machineId: event.target.value === "all" ? null : event.target.value })}
              value={filters.machineId ?? "all"}
            >
              <option value="all">전체 설비</option>
              {visibleMachines.map((machine) => (
                <option key={machine.id} value={machine.id}>
                  {machine.name}
                </option>
              ))}
            </select>
          </SelectField>

          <SelectField label="심각도">
            <select
              className={selectClassName}
              onChange={(event) => updateFilters({ severity: event.target.value as LiveAlarmSeverityFilter })}
              value={filters.severity}
            >
              {severityOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </SelectField>

          <SelectField label="상태">
            <select
              className={selectClassName}
              onChange={(event) => updateFilters({ status: event.target.value as LiveAlarmStatusFilter })}
              value={filters.status}
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </SelectField>

          <SelectField label="조회 건수">
            <select className={selectClassName} onChange={(event) => updateFilters({ limit: Number(event.target.value) })} value={filters.limit}>
              {liveAlarmLimitOptions.map((limit) => (
                <option key={limit} value={limit}>
                  {limit}건
                </option>
              ))}
            </select>
          </SelectField>

          <SelectField label="갱신 주기">
            <select
              className={selectClassName}
              onChange={(event) => setRefreshInterval(Number(event.target.value) as RefreshInterval)}
              value={refreshInterval}
            >
              {liveAlarmRefreshIntervals.map((interval) => (
                <option key={interval} value={interval}>
                  {formatLiveRefreshInterval(interval)}
                </option>
              ))}
            </select>
          </SelectField>

          <button
            className="h-11 rounded-md border border-[color:var(--line)] bg-white px-3 text-sm font-semibold hover:border-[color:var(--accent)] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!hasActiveFilters}
            onClick={resetFilters}
            type="button"
          >
            필터 초기화
          </button>
        </div>
      </section>

      {query.isError ? (
        <section className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900" role="alert">
          <p className="font-semibold">알람 갱신에 실패했습니다.</p>
          <p className="mt-1 leading-6">마지막 성공 데이터가 있으면 그대로 유지합니다. 잠시 후 자동 재시도하거나 새로고침을 눌러 주세요.</p>
        </section>
      ) : null}

      {query.isLoading ? <LiveAlarmSkeleton /> : null}

      {snapshot ? <LiveAlarmFeed snapshot={snapshot} newAlarmIds={newAlarmIds} onReset={resetFilters} /> : null}
    </div>
  );
}

function LiveAlarmFeed({
  newAlarmIds,
  onReset,
  snapshot
}: {
  newAlarmIds: Set<string>;
  onReset: () => void;
  snapshot: LiveAlarmSnapshot;
}) {
  if (snapshot.filterIssue) {
    return (
      <section className="rounded-md border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-900">
        <h2 className="font-semibold">감시 조건을 확인해 주세요.</h2>
        <p className="mt-1 leading-6">{snapshot.filterIssue}</p>
        <button className="mt-3 h-10 rounded-md bg-rose-700 px-3 font-semibold text-white hover:bg-rose-800" onClick={onReset} type="button">
          필터 초기화
        </button>
      </section>
    );
  }

  return (
    <section className="rounded-md border border-[color:var(--line)] bg-white shadow-sm">
      <div className="flex flex-col gap-2 border-b border-[color:var(--line)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">감시 중인 알람 {snapshot.alarms.length}건</h2>
          <p className="mt-1 text-sm text-[color:var(--muted)]">미해결 위험 알람이 먼저 표시됩니다.</p>
        </div>
        <Link className="w-fit rounded-md border border-[color:var(--line)] bg-white px-3 py-2 text-sm font-semibold hover:border-[color:var(--accent)]" href="/alarms">
          전체 알람 목록
        </Link>
      </div>

      {snapshot.alarms.length === 0 ? (
        <div className="px-4 py-12 text-center">
          <h3 className="text-lg font-semibold">현재 조건에 맞는 새 알람이 없습니다.</h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[color:var(--muted)]">
            자동 갱신은 계속 유지됩니다. 조건을 넓히거나 전체 알람 목록에서 과거 이력을 확인해 주세요.
          </p>
          <button
            className="mt-4 h-11 rounded-md bg-[color:var(--accent)] px-4 text-sm font-semibold text-white hover:bg-[color:var(--accent-strong)]"
            onClick={onReset}
            type="button"
          >
            필터 초기화
          </button>
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto lg:block">
            <table className="min-w-full border-separate border-spacing-0 text-left">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-normal text-[color:var(--muted)]">
                <tr>
                  <th className="border-b border-[color:var(--line)] px-4 py-3">알람</th>
                  <th className="border-b border-[color:var(--line)] px-4 py-3">심각도</th>
                  <th className="border-b border-[color:var(--line)] px-4 py-3">상태</th>
                  <th className="border-b border-[color:var(--line)] px-4 py-3">공장/라인</th>
                  <th className="border-b border-[color:var(--line)] px-4 py-3">설비</th>
                  <th className="border-b border-[color:var(--line)] px-4 py-3">발생 시각</th>
                  <th className="border-b border-[color:var(--line)] px-4 py-3 text-right">작업</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.alarms.map((alarm) => (
                  <AlarmTableRow alarm={alarm} isNew={newAlarmIds.has(alarm.id)} key={alarm.id} />
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 p-3 lg:hidden">
            {snapshot.alarms.map((alarm) => (
              <AlarmCard alarm={alarm} isNew={newAlarmIds.has(alarm.id)} key={alarm.id} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function AlarmTableRow({ alarm, isNew }: { alarm: AlarmSummary; isNew: boolean }) {
  return (
    <tr className={isNew ? "bg-emerald-50 align-top" : "align-top transition hover:bg-slate-50"}>
      <td className="border-b border-[color:var(--line)] px-4 py-4">
        <div className="flex flex-wrap items-center gap-2">
          {isNew ? <NewBadge /> : null}
          <p className="max-w-[360px] font-semibold text-[color:var(--foreground)]">{alarm.message}</p>
        </div>
      </td>
      <td className="border-b border-[color:var(--line)] px-4 py-4">
        <SeverityBadge alarm={alarm} />
      </td>
      <td className="border-b border-[color:var(--line)] px-4 py-4">
        <StatusBadge alarm={alarm} />
      </td>
      <td className="border-b border-[color:var(--line)] px-4 py-4 text-sm">
        <p className="font-semibold">{alarm.factoryName}</p>
        <p className="mt-1 text-xs text-[color:var(--muted)]">{alarm.lineName}</p>
      </td>
      <td className="border-b border-[color:var(--line)] px-4 py-4 text-sm">
        <p className="font-semibold">{alarm.machineName}</p>
        <p className="mt-1 text-xs text-[color:var(--muted)]">{alarm.machineType}</p>
      </td>
      <td className="border-b border-[color:var(--line)] px-4 py-4 text-sm">{alarm.occurredAtLabel}</td>
      <td className="border-b border-[color:var(--line)] px-4 py-4 text-right">
        <Link className="inline-flex h-10 items-center justify-center rounded-md bg-[color:var(--foreground)] px-3 text-sm font-semibold text-white hover:bg-slate-700" href={alarm.links.machine}>
          설비 상세
        </Link>
      </td>
    </tr>
  );
}

function AlarmCard({ alarm, isNew }: { alarm: AlarmSummary; isNew: boolean }) {
  return (
    <article className={isNew ? "rounded-md border border-emerald-200 bg-emerald-50 p-4 shadow-sm" : "rounded-md border border-[color:var(--line)] bg-white p-4 shadow-sm"}>
      <div className="flex flex-wrap gap-2">
        {isNew ? <NewBadge /> : null}
        <SeverityBadge alarm={alarm} />
        <StatusBadge alarm={alarm} />
      </div>
      <h3 className="mt-3 font-semibold text-[color:var(--foreground)]">{alarm.message}</h3>
      <p className="mt-1 text-sm leading-6 text-[color:var(--muted)]">
        {alarm.factoryName} / {alarm.lineName} / {alarm.machineName}
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <StatusMetric label="설비 유형" value={alarm.machineType} />
        <StatusMetric label="발생" value={alarm.occurredAtLabel} />
      </div>
      <Link className="mt-4 flex h-11 items-center justify-center rounded-md bg-[color:var(--foreground)] px-3 text-sm font-semibold text-white hover:bg-slate-700" href={alarm.links.machine}>
        설비 상세
      </Link>
    </article>
  );
}

function SummaryTile({ label, note, tone, value }: { label: string; note: string; tone: AlarmTone; value: string }) {
  return (
    <article className="rounded-md border border-[color:var(--line)] bg-white p-4 shadow-sm">
      <p className="text-sm text-[color:var(--muted)]">{label}</p>
      <span className={`mt-2 inline-flex rounded-md border px-2 py-1 text-xs font-semibold ${toneClass[tone]}`}>{note}</span>
      <p className="mt-4 text-3xl font-semibold text-[color:var(--foreground)]">{value}</p>
    </article>
  );
}

function SelectField({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-[color:var(--foreground)]">{label}</span>
      {children}
    </label>
  );
}

function StatusMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[color:var(--line)] bg-slate-50 px-3 py-2">
      <p className="text-xs font-semibold text-[color:var(--muted)]">{label}</p>
      <p className="mt-1 break-words font-semibold text-[color:var(--foreground)]">{value}</p>
    </div>
  );
}

function SeverityBadge({ alarm }: { alarm: AlarmSummary }) {
  return <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-semibold ${toneClass[alarm.severity.tone]}`}>{alarm.severity.label}</span>;
}

function StatusBadge({ alarm }: { alarm: AlarmSummary }) {
  return <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-semibold ${toneClass[alarm.status.tone]}`}>{alarm.status.label}</span>;
}

function NewBadge() {
  return <span className="inline-flex rounded-md border border-emerald-200 bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800">신규</span>;
}

function LiveAlarmSkeleton() {
  return (
    <section className="rounded-md border border-[color:var(--line)] bg-white p-4 shadow-sm">
      <div className="h-5 w-40 rounded bg-slate-200" />
      <div className="mt-4 grid gap-3">
        {["live-row-1", "live-row-2", "live-row-3"].map((row) => (
          <div className="h-20 rounded bg-slate-100" key={row} />
        ))}
      </div>
    </section>
  );
}

async function fetchLiveAlarmSnapshot(filters: LiveAlarmFilters): Promise<LiveAlarmSnapshot> {
  const queryString = buildLiveAlarmQueryString(filters);
  const response = await fetch(queryString ? `/api/alarms/live?${queryString}` : "/api/alarms/live", {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("알람 갱신에 실패했습니다.");
  }

  return response.json() as Promise<LiveAlarmSnapshot>;
}

const selectClassName =
  "mt-2 h-11 w-full rounded-md border border-[color:var(--line)] bg-white px-3 text-sm outline-none transition focus:border-[color:var(--accent)] focus:ring-2 focus:ring-teal-100";
