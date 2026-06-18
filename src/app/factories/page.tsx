import Link from "next/link";
import { getFactorySummaries } from "@/lib/factories";
import { FactoriesClient } from "./FactoriesClient";

export const revalidate = 600;

export default async function FactoriesPage() {
  const summaries = await getFactorySummaries();
  const generatedAt = new Date().toISOString();

  return (
    <main className="min-h-screen overflow-x-hidden bg-[color:var(--background)]">
      <header className="border-b border-[color:var(--line)] bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <p className="text-xs font-semibold text-[color:var(--accent)]">Factory Pulse</p>
            <h1 className="mt-1 text-2xl font-semibold text-[color:var(--foreground)]">공장 목록</h1>
          </div>
          <nav aria-label="공장 목록 보조 이동" className="flex flex-wrap gap-2 text-sm">
            <Link
              className="rounded-md border border-[color:var(--line)] bg-white px-3 py-2 font-semibold text-[color:var(--foreground)] hover:border-[color:var(--accent)]"
              href="/"
            >
              운영 현황
            </Link>
            <Link
              className="rounded-md border border-[color:var(--line)] bg-white px-3 py-2 font-semibold text-[color:var(--foreground)] hover:border-[color:var(--accent)]"
              href="/docs/rendering"
            >
              렌더링 전략
            </Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="border-b border-[color:var(--line)] pb-5">
          <p className="text-sm font-semibold text-[color:var(--accent)]">ISR 10분 갱신</p>
          <h2 className="mt-2 max-w-3xl text-2xl font-semibold leading-tight text-[color:var(--foreground)] sm:text-3xl">
            <span className="block sm:inline">공장 상태와 알람 수로</span>{" "}
            <span className="block sm:inline">다음 확인 대상을 고릅니다.</span>
          </h2>
          <p className="mt-3 max-w-3xl break-words text-sm leading-6 text-[color:var(--muted)] [overflow-wrap:anywhere]">
            <span className="block sm:inline">Supabase 데이터를 서버에서 조합합니다.</span>{" "}
            <span className="block sm:inline">검색과 정렬은 브라우저에서 처리합니다.</span>
          </p>
        </section>

        <div className="mt-5">
          <FactoriesClient generatedAt={generatedAt} summaries={summaries} />
        </div>
      </div>
    </main>
  );
}
