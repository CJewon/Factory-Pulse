import Link from "next/link";
import { getMachineSummaries } from "@/lib/machines";
import { MachinesClient } from "./MachinesClient";

export const dynamic = "force-dynamic";

export default async function MachinesPage({
  searchParams
}: {
  searchParams: Promise<{
    factoryId?: string;
    lineId?: string;
    q?: string;
    sort?: string;
    status?: string;
  }>;
}) {
  const params = await searchParams;
  const machines = await getMachineSummaries();
  const initialFactoryId = params.factoryId ?? null;

  return (
    <main className="min-h-screen overflow-x-hidden bg-[color:var(--background)]">
      <header className="border-b border-[color:var(--line)] bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <p className="text-xs font-semibold text-[color:var(--accent)]">Factory Pulse</p>
            <h1 className="mt-1 text-2xl font-semibold text-[color:var(--foreground)]">설비 목록</h1>
          </div>
          <nav aria-label="설비 목록 보조 이동" className="flex flex-wrap gap-2 text-sm">
            <Link
              className="rounded-md border border-[color:var(--line)] bg-white px-3 py-2 font-semibold text-[color:var(--foreground)] hover:border-[color:var(--accent)]"
              href="/factories"
            >
              공장 목록
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
          <p className="text-sm font-semibold text-[color:var(--accent)]">Dynamic + CSR 필터</p>
          <h2 className="mt-2 max-w-3xl text-2xl font-semibold leading-tight text-[color:var(--foreground)] sm:text-3xl">
            <span className="block sm:inline">공장과 라인 기준으로</span>{" "}
            <span className="block sm:inline">설비 상태를 확인합니다.</span>
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[color:var(--muted)]">
            <span className="block sm:inline">요청 시점의 설비 목록을 서버에서 조회합니다.</span>{" "}
            <span className="block sm:inline">검색과 필터는 브라우저에서 처리합니다.</span>
          </p>
        </section>

        <div className="mt-5">
          <MachinesClient
            initialFactoryId={initialFactoryId}
            initialLineId={params.lineId ?? "all"}
            initialQuery={getInitialQuery(params.q)}
            initialSort={getInitialSort(params.sort)}
            initialStatus={getInitialStatus(params.status)}
            machines={machines}
          />
        </div>
      </div>
    </main>
  );
}

function getInitialStatus(value: string | undefined) {
  if (
    value === "normal" ||
    value === "warning" ||
    value === "critical" ||
    value === "stopped" ||
    value === "maintenance" ||
    value === "unknown"
  ) {
    return value;
  }

  return "all";
}

function getInitialSort(value: string | undefined) {
  if (value === "name" || value === "alarms" || value === "installed") {
    return value;
  }

  return "risk";
}

function getInitialQuery(value: string | undefined) {
  return (value ?? "").trim().slice(0, 80);
}
