import Link from "next/link";
import { getAlarmSummaries, type AlarmSeverityValue, type AlarmStatusValue } from "@/lib/alarms";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AlarmsClient } from "./AlarmsClient";

type SearchParams = {
  factoryId?: string;
  machineId?: string;
  q?: string;
  severity?: string;
  sort?: string;
  status?: string;
};

export const dynamic = "force-dynamic";

export default async function AlarmsPage({
  searchParams
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const [alarms, canResolveAlarms] = await Promise.all([getAlarmSummaries(), getCanResolveAlarms()]);

  return (
    <main className="min-h-screen overflow-x-hidden bg-[color:var(--background)]">
      <header className="border-b border-[color:var(--line)] bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <p className="text-xs font-semibold text-[color:var(--accent)]">Factory Pulse</p>
            <h1 className="mt-1 text-2xl font-semibold text-[color:var(--foreground)]">알람 목록</h1>
          </div>
          <nav aria-label="알람 목록 보조 이동" className="flex flex-wrap gap-2 text-sm">
            <Link
              className="rounded-md border border-[color:var(--line)] bg-white px-3 py-2 font-semibold text-[color:var(--foreground)] hover:border-[color:var(--accent)]"
              href="/alarms/live"
            >
              실시간 감시
            </Link>
            <Link
              className="rounded-md border border-[color:var(--line)] bg-white px-3 py-2 font-semibold text-[color:var(--foreground)] hover:border-[color:var(--accent)]"
              href="/machines"
            >
              설비 목록
            </Link>
            <Link
              className="rounded-md border border-[color:var(--line)] bg-white px-3 py-2 font-semibold text-[color:var(--foreground)] hover:border-[color:var(--accent)]"
              href="/factories"
            >
              공장 목록
            </Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="border-b border-[color:var(--line)] pb-5">
          <p className="text-sm font-semibold text-[color:var(--accent)]">Dynamic + CSR 필터</p>
          <h2 className="mt-2 max-w-3xl text-2xl font-semibold leading-tight text-[color:var(--foreground)] sm:text-3xl">
            <span className="block sm:inline">알람 심각도와 상태로</span>{" "}
            <span className="block sm:inline">확인 우선순위를 정합니다.</span>
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[color:var(--muted)]">
            <span className="block sm:inline">조회는 공개 데이터 기준으로 제공됩니다.</span>{" "}
            <span className="block sm:inline">알람 확인은 로그인 세션이 있을 때 Server Action으로 처리합니다.</span>
          </p>
        </section>

        <div className="mt-5">
          <AlarmsClient
            alarms={alarms}
            initialFactoryId={params.factoryId ?? null}
            initialMachineId={params.machineId ?? null}
            initialQuery={getInitialQuery(params.q)}
            initialSeverity={getInitialSeverity(params.severity)}
            initialSort={getInitialSort(params.sort)}
            initialStatus={getInitialStatus(params.status)}
            canResolveAlarms={canResolveAlarms}
          />
        </div>
      </div>
    </main>
  );
}

async function getCanResolveAlarms() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  return !error && Boolean(user);
}

function getInitialSeverity(value: string | undefined): "all" | AlarmSeverityValue {
  if (value === "critical" || value === "warning" || value === "info" || value === "unknown") {
    return value;
  }

  return "all";
}

function getInitialStatus(value: string | undefined): "all" | AlarmStatusValue {
  if (value === "open" || value === "resolved") {
    return value;
  }

  return "all";
}

function getInitialSort(value: string | undefined) {
  if (value === "latest" || value === "machine") {
    return value;
  }

  return "risk";
}

function getInitialQuery(value: string | undefined) {
  return (value ?? "").trim().slice(0, 80);
}
