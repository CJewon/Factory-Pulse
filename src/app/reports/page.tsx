import { Suspense } from "react";
import Link from "next/link";
import { getReportSummaries } from "@/lib/reports";
import { ReportsClient } from "./ReportsClient";

export const revalidate = 600;

export default async function ReportsPage() {
  const reports = await getReportSummaries();

  return (
    <main className="min-h-screen overflow-x-hidden bg-[color:var(--background)]">
      <header className="border-b border-[color:var(--line)] bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <p className="text-xs font-semibold text-[color:var(--accent)]">Factory Pulse</p>
            <h1 className="mt-1 text-2xl font-semibold text-[color:var(--foreground)]">생산 리포트</h1>
          </div>
          <nav aria-label="생산 리포트 보조 이동" className="flex flex-wrap gap-2 text-sm">
            <Link
              className="rounded-md border border-[color:var(--line)] bg-white px-3 py-2 font-semibold text-[color:var(--foreground)] hover:border-[color:var(--accent)]"
              href="/factories"
            >
              공장 목록
            </Link>
            <Link
              className="rounded-md border border-[color:var(--line)] bg-white px-3 py-2 font-semibold text-[color:var(--foreground)] hover:border-[color:var(--accent)]"
              href="/alarms"
            >
              알람 목록
            </Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="border-b border-[color:var(--line)] pb-5">
          <p className="text-sm font-semibold text-[color:var(--accent)]">ISR + CSR 필터</p>
          <h2 className="mt-2 max-w-3xl text-2xl font-semibold leading-tight text-[color:var(--foreground)] sm:text-3xl">
            <span className="block sm:inline">공장별 생산량과 품질 지표를</span>{" "}
            <span className="block sm:inline">리포트로 확인합니다.</span>
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[color:var(--muted)]">
            일정 주기로 갱신되는 생산 리포트를 기준으로 총 생산량, 불량률, 가동률을 비교합니다.
          </p>
        </section>

        <div className="mt-5">
          <Suspense fallback={<ReportsClientFallback />}>
            <ReportsClient reports={reports} />
          </Suspense>
        </div>
      </div>
    </main>
  );
}

function ReportsClientFallback() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {["summary-1", "summary-2", "summary-3", "summary-4", "summary-5"].map((item) => (
        <div className="rounded-md border border-[color:var(--line)] bg-white p-4 shadow-sm" key={item}>
          <div className="h-4 w-24 rounded bg-slate-100" />
          <div className="mt-4 h-8 w-20 rounded bg-slate-200" />
        </div>
      ))}
    </div>
  );
}
