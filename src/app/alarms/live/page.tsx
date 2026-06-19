import Link from "next/link";
import { parseLiveAlarmSearchParams } from "@/lib/alarms/live";
import { LiveAlarmsClient } from "./LiveAlarmsClient";

type SearchParams = {
  factoryId?: string;
  machineId?: string;
  severity?: string;
  status?: string;
  limit?: string;
};

export const dynamic = "force-dynamic";

export default async function LiveAlarmsPage({
  searchParams
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const normalizedParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") {
      normalizedParams.set(key, value);
    }
  }

  const initialFilters = parseLiveAlarmSearchParams(normalizedParams);

  return (
    <main className="min-h-screen overflow-x-hidden bg-[color:var(--background)]">
      <header className="border-b border-[color:var(--line)] bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <p className="text-xs font-semibold text-[color:var(--accent)]">Factory Pulse</p>
            <h1 className="mt-1 text-2xl font-semibold text-[color:var(--foreground)]">실시간 알람 감시</h1>
          </div>
          <nav aria-label="실시간 알람 보조 이동" className="flex flex-wrap gap-2 text-sm">
            <Link className="rounded-md border border-[color:var(--line)] bg-white px-3 py-2 font-semibold hover:border-[color:var(--accent)]" href="/alarms">
              전체 알람 목록
            </Link>
            <Link className="rounded-md border border-[color:var(--line)] bg-white px-3 py-2 font-semibold hover:border-[color:var(--accent)]" href="/dashboard">
              대시보드
            </Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="border-b border-[color:var(--line)] pb-5">
          <p className="text-sm font-semibold text-[color:var(--accent)]">CSR + Polling</p>
          <h2 className="mt-2 max-w-3xl text-2xl font-semibold leading-tight text-[color:var(--foreground)] sm:text-3xl">
            미해결 알람을 주기적으로 갱신해 놓치지 않습니다.
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[color:var(--muted)]">
            Supabase 공개 조회 데이터를 짧은 간격으로 다시 읽습니다. 실제 데이터 생성은 하지 않고, 운영 감시 화면의 최신성 UX를 검증합니다.
          </p>
        </section>

        <div className="mt-5">
          <LiveAlarmsClient initialFilters={initialFilters} />
        </div>
      </div>
    </main>
  );
}
