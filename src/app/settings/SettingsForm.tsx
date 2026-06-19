"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { saveDashboardPreferencesAction, type SaveDashboardPreferencesActionResult } from "./actions";
import { formatRefreshInterval } from "@/lib/settings/mapper";
import { dashboardSettingsSchema } from "@/lib/settings/schema";
import {
  dashboardCardOptions,
  defaultDashboardPreferences,
  refreshIntervals,
  type DashboardPreferences
} from "@/lib/settings/types";

type SettingsFormProps = {
  initialPreferences: DashboardPreferences;
  isAuthenticated: boolean;
  userLabel: string | null;
  sourceLabel: string;
  updatedAtLabel: string | null;
};

export function SettingsForm({
  initialPreferences,
  isAuthenticated,
  sourceLabel,
  updatedAtLabel,
  userLabel
}: SettingsFormProps) {
  const router = useRouter();
  const [savedPreferences, setSavedPreferences] = useState(initialPreferences);
  const [result, setResult] = useState<SaveDashboardPreferencesActionResult | null>(
    isAuthenticated
      ? null
      : {
          ok: false,
          code: "UNAUTHENTICATED",
          message: "로그인 후 저장할 수 있습니다. 지금은 기본 설정을 미리 볼 수 있습니다."
        }
  );
  const {
    clearErrors,
    control,
    formState: { errors, isDirty, isSubmitting },
    handleSubmit,
    register,
    reset,
    setError
  } = useForm<DashboardPreferences>({
    defaultValues: initialPreferences
  });

  const visibleCards = useWatch({ control, name: "visibleCards" }) ?? [];
  const refreshInterval = Number(useWatch({ control, name: "refreshInterval" }));
  const visibleCardCount = Array.isArray(visibleCards) ? visibleCards.length : 0;
  const statusTone = result?.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800";
  const saveDisabled = !isAuthenticated || isSubmitting || !isDirty;

  const previewLabel = useMemo(() => {
    const intervalLabel = formatRefreshInterval(refreshIntervals.includes(refreshInterval as never) ? (refreshInterval as never) : savedPreferences.refreshInterval);

    return `${visibleCardCount}개 카드 표시 / ${intervalLabel} 갱신`;
  }, [refreshInterval, savedPreferences.refreshInterval, visibleCardCount]);

  const onSubmit = handleSubmit(async (values) => {
    clearErrors();
    setResult(null);

    const parsed = dashboardSettingsSchema.safeParse({
      visibleCards: Array.isArray(values.visibleCards) ? values.visibleCards : [],
      refreshInterval: Number(values.refreshInterval)
    });

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const field = issue?.path[0] === "refreshInterval" ? "refreshInterval" : "visibleCards";

      setError(field, {
        type: "manual",
        message: issue?.message ?? "설정값을 확인해 주세요."
      });
      setResult({
        ok: false,
        code: "INVALID_INPUT",
        field,
        message: issue?.message ?? "설정값을 확인해 주세요."
      });
      return;
    }

    const actionResult = await saveDashboardPreferencesAction(parsed.data);
    setResult(actionResult);

    if (actionResult.ok) {
      setSavedPreferences(actionResult.preferences);
      reset(actionResult.preferences);
      router.refresh();
    }
  });

  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      <section className="rounded-md border border-[color:var(--line)] bg-white shadow-sm">
        <div className="border-b border-[color:var(--line)] px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[color:var(--foreground)]">표시 카드</h2>
              <p className="mt-1 text-sm leading-6 text-[color:var(--muted)]">
                대시보드에서 반복 확인하는 영역만 남겨 화면 밀도를 조정합니다.
              </p>
            </div>
            <span className="w-fit rounded-md border border-[color:var(--line)] bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
              {previewLabel}
            </span>
          </div>
        </div>

        <div className="grid gap-3 p-4 sm:p-5 lg:grid-cols-2">
          {dashboardCardOptions.map((card) => (
            <label
              className="flex min-h-28 cursor-pointer gap-3 rounded-md border border-[color:var(--line)] bg-white p-4 transition hover:border-[color:var(--accent)]"
              key={card.id}
            >
              <input
                aria-label={`카드 표시: ${card.label}`}
                className="mt-1 h-5 w-5 shrink-0 accent-[color:var(--accent)]"
                type="checkbox"
                value={card.id}
                {...register("visibleCards")}
              />
              <span className="min-w-0">
                <span className="block font-semibold text-[color:var(--foreground)]">{card.label}</span>
                <span className="mt-2 block text-sm leading-6 text-[color:var(--muted)]">{card.description}</span>
              </span>
            </label>
          ))}
        </div>

        {errors.visibleCards?.message ? (
          <p className="border-t border-[color:var(--line)] px-4 py-3 text-sm font-semibold text-[color:var(--danger)] sm:px-5">
            {errors.visibleCards.message}
          </p>
        ) : null}
      </section>

      <section className="rounded-md border border-[color:var(--line)] bg-white shadow-sm">
        <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-center">
          <div>
            <h2 className="text-lg font-semibold text-[color:var(--foreground)]">갱신 주기</h2>
            <p className="mt-1 text-sm leading-6 text-[color:var(--muted)]">
              대시보드 자동 갱신 기준입니다. 너무 짧은 주기는 조회 부하를 만들 수 있어 허용값으로 제한합니다.
            </p>
          </div>
          <div>
            <label className="text-sm font-semibold text-[color:var(--foreground)]" htmlFor="refreshInterval">
              새로고침 주기
            </label>
            <select
              className="mt-2 h-11 w-full rounded-md border border-[color:var(--line)] bg-white px-3 text-sm text-[color:var(--foreground)] focus:border-[color:var(--accent)] focus:outline-none focus:ring-2 focus:ring-teal-100"
              id="refreshInterval"
              {...register("refreshInterval", { valueAsNumber: true })}
            >
              {refreshIntervals.map((interval) => (
                <option key={interval} value={interval}>
                  {formatRefreshInterval(interval)}
                </option>
              ))}
            </select>
            {errors.refreshInterval?.message ? (
              <p className="mt-2 text-sm font-semibold text-[color:var(--danger)]">{errors.refreshInterval.message}</p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="rounded-md border border-[color:var(--line)] bg-white p-4 shadow-sm sm:p-5">
        <div className="grid gap-3 text-sm text-[color:var(--muted)] md:grid-cols-3">
          <StatusItem label="계정 상태" value={userLabel ?? "비로그인"} />
          <StatusItem label="설정 기준" value={sourceLabel} />
          <StatusItem label="최근 저장" value={updatedAtLabel ?? "저장 이력 없음"} />
        </div>

        <div aria-live="polite" className="mt-4 min-h-10">
          {isDirty ? (
            <p className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-800">
              저장되지 않은 변경 사항이 있습니다.
            </p>
          ) : result ? (
            <p className={`rounded-md border px-3 py-2 text-sm font-semibold ${statusTone}`}>{result.message}</p>
          ) : null}
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <button
            className="h-11 rounded-md border border-[color:var(--line)] bg-white px-4 text-sm font-semibold text-[color:var(--foreground)] hover:border-[color:var(--accent)] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!isDirty || isSubmitting}
            onClick={() => {
              reset(savedPreferences);
              setResult(null);
            }}
            type="button"
          >
            초기화
          </button>
          <button
            className="h-11 rounded-md border border-[color:var(--line)] bg-white px-4 text-sm font-semibold text-[color:var(--foreground)] hover:border-[color:var(--accent)] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isSubmitting}
            onClick={() => {
              reset(defaultDashboardPreferences, { keepDefaultValues: true });
              setResult(null);
            }}
            type="button"
          >
            기본값 복원
          </button>
          <Link
            className="flex h-11 items-center justify-center rounded-md border border-[color:var(--line)] bg-white px-4 text-sm font-semibold text-[color:var(--foreground)] hover:border-[color:var(--accent)]"
            href="/dashboard"
          >
            취소
          </Link>
          <button
            className="h-11 rounded-md bg-[color:var(--accent)] px-5 text-sm font-semibold text-white hover:bg-[color:var(--accent-strong)] disabled:cursor-not-allowed disabled:bg-slate-300"
            disabled={saveDisabled}
            type="submit"
          >
            {isSubmitting ? "저장 중..." : "저장"}
          </button>
        </div>
      </section>
    </form>
  );
}

function StatusItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-[color:var(--muted)]">{label}</p>
      <p className="mt-1 break-words font-semibold text-[color:var(--foreground)]">{value}</p>
    </div>
  );
}
