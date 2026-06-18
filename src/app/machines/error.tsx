"use client";

import Link from "next/link";

export default function MachinesError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-screen bg-[color:var(--background)] px-4 py-10">
      <section className="mx-auto max-w-2xl rounded-md border border-rose-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-rose-700">설비 목록을 불러오지 못했습니다.</p>
        <h1 className="mt-2 text-2xl font-semibold text-[color:var(--foreground)]">조회 상태를 확인해 주세요.</h1>
        <p className="mt-3 text-sm leading-6 text-[color:var(--muted)]">
          Supabase 공개 조회 또는 네트워크 상태를 확인해야 합니다. 같은 요청을 다시 실행하거나 공장 목록으로 돌아갈 수 있습니다.
        </p>
        {error.message ? (
          <p className="mt-3 break-words rounded-md bg-rose-50 px-3 py-2 text-xs font-medium text-rose-800">{error.message}</p>
        ) : null}
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            className="h-11 rounded-md bg-[color:var(--accent)] px-4 text-sm font-semibold text-white hover:bg-[color:var(--accent-strong)]"
            onClick={reset}
            type="button"
          >
            다시 시도
          </button>
          <Link
            className="flex h-11 items-center rounded-md border border-[color:var(--line)] bg-white px-4 text-sm font-semibold text-[color:var(--foreground)] hover:border-[color:var(--accent)]"
            href="/factories"
          >
            공장 목록
          </Link>
        </div>
      </section>
    </main>
  );
}
