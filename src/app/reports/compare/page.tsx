import Link from "next/link";
import { Suspense } from "react";
import { getReportSummaries } from "@/lib/reports";
import { ReportsCompareClient } from "./ReportsCompareClient";

export const revalidate = 600;

export default async function ReportsComparePage() {
  const reports = await getReportSummaries();

  return (
    <main className="min-h-screen overflow-x-hidden bg-[color:var(--background)]">
      <header className="border-b border-[color:var(--line)] bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <p className="text-xs font-semibold text-[color:var(--accent)]">Factory Pulse</p>
            <h1 className="mt-1 text-2xl font-semibold text-[color:var(--foreground)]">기간 비교</h1>
          </div>
          <nav aria-label="기간 비교 보조 이동" className="flex flex-wrap gap-2 text-sm">
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
          <p className="text-sm font-semibold text-[color:var(--accent)]">ISR + CSR 비교</p>
          <h2 className="mt-2 max-w-4xl text-2xl font-semibold leading-tight text-[color:var(--foreground)] sm:text-3xl">
            두 기간의 생산량, 가동률, 불량률 변화를 비교합니다.
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[color:var(--muted)]">
            기간 A와 기간 B를 직접 선택해 공장별 생산 성과 차이를 확인하고, 변화가 큰 공장을 상세 화면으로 추적합니다.
          </p>
        </section>

        <div className="mt-5">
          <Suspense fallback={<ReportsCompareFallback />}>
            <ReportsCompareClient reports={reports} />
          </Suspense>
        </div>
      </div>
    </main>
  );
}

function ReportsCompareFallback() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {["compare-1", "compare-2", "compare-3", "compare-4"].map((item) => (
        <div className="rounded-md border border-[color:var(--line)] bg-white p-4 shadow-sm" key={item}>
          <div className="h-4 w-24 rounded bg-slate-100" />
          <div className="mt-4 h-8 w-20 rounded bg-slate-200" />
        </div>
      ))}
    </div>
  );
}
