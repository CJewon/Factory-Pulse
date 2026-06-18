import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="min-h-screen bg-[color:var(--background)] px-4 py-10">
      <section className="mx-auto max-w-2xl rounded-md border border-[color:var(--line)] bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-[color:var(--accent)]">404</p>
        <h1 className="mt-2 text-2xl font-semibold text-[color:var(--foreground)]">요청한 화면을 찾을 수 없습니다.</h1>
        <p className="mt-3 text-sm leading-6 text-[color:var(--muted)]">
          주소가 잘못되었거나 아직 구현되지 않은 화면일 수 있습니다. 공장 목록으로 돌아가 다시 선택해 주세요.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            className="flex h-11 items-center rounded-md bg-[color:var(--accent)] px-4 text-sm font-semibold text-white hover:bg-[color:var(--accent-strong)]"
            href="/factories"
          >
            공장 목록
          </Link>
          <Link
            className="flex h-11 items-center rounded-md border border-[color:var(--line)] bg-white px-4 text-sm font-semibold text-[color:var(--foreground)] hover:border-[color:var(--accent)]"
            href="/"
          >
            운영 현황
          </Link>
        </div>
      </section>
    </main>
  );
}
