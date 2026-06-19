import Link from "next/link";
import { getDashboardPreferenceContext } from "@/lib/settings/queries";
import { SettingsForm } from "./SettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const preferenceContext = await getDashboardPreferenceContext();
  const sourceLabel = preferenceContext.source === "saved" ? "저장된 개인 설정" : "기본 설정";
  const updatedAtLabel = preferenceContext.updatedAt ? formatKoreanDateTime(preferenceContext.updatedAt) : null;

  return (
    <main className="min-h-screen overflow-x-hidden bg-[color:var(--background)]">
      <header className="border-b border-[color:var(--line)] bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <p className="text-xs font-semibold text-[color:var(--accent)]">Factory Pulse</p>
            <h1 className="mt-1 text-2xl font-semibold text-[color:var(--foreground)]">대시보드 설정</h1>
          </div>
          <nav aria-label="설정 화면 이동" className="flex flex-wrap gap-2 text-sm">
            <Link className="rounded-md border border-[color:var(--line)] bg-white px-3 py-2 font-semibold hover:border-[color:var(--accent)]" href="/dashboard">
              대시보드
            </Link>
            <Link className="rounded-md border border-[color:var(--line)] bg-white px-3 py-2 font-semibold hover:border-[color:var(--accent)]" href="/reports">
              리포트
            </Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="border-b border-[color:var(--line)] pb-5">
          <p className="text-sm font-semibold text-[color:var(--accent)]">개인화 설정</p>
          <h2 className="mt-2 max-w-3xl text-2xl font-semibold leading-tight text-[color:var(--foreground)] sm:text-3xl">
            자주 보는 카드와 갱신 주기를 저장합니다.
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[color:var(--muted)]">
            저장된 설정은 본인 계정의 `dashboard_preferences`에만 반영됩니다. 비로그인 상태에서는 기본 설정을 미리 볼 수 있습니다.
          </p>
          {preferenceContext.loadError ? (
            <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
              {preferenceContext.loadError}
            </p>
          ) : null}
        </section>

        <div className="mt-5">
          <SettingsForm
            initialPreferences={preferenceContext.preferences}
            isAuthenticated={preferenceContext.isAuthenticated}
            sourceLabel={sourceLabel}
            updatedAtLabel={updatedAtLabel}
            userLabel={preferenceContext.userLabel}
          />
        </div>
      </div>
    </main>
  );
}

function formatKoreanDateTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Seoul"
  }).format(new Date(value));
}
