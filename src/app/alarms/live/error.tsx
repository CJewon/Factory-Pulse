"use client";

import Link from "next/link";

export default function LiveAlarmsError() {
  return (
    <main className="min-h-screen bg-[color:var(--background)] px-4 py-10">
      <section className="mx-auto max-w-xl rounded-md border border-[color:var(--line)] bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-[color:var(--danger)]">실시간 알람 오류</p>
        <h1 className="mt-2 text-2xl font-semibold text-[color:var(--foreground)]">알람 감시 화면을 불러오지 못했습니다.</h1>
        <p className="mt-3 text-sm leading-6 text-[color:var(--muted)]">잠시 후 다시 시도하거나 전체 알람 목록에서 현재 상태를 확인해 주세요.</p>
        <Link className="mt-5 inline-flex h-11 items-center rounded-md bg-[color:var(--accent)] px-4 text-sm font-semibold text-white" href="/alarms">
          전체 알람 목록
        </Link>
      </section>
    </main>
  );
}
