import Link from "next/link";

type Tone = "success" | "warning" | "danger" | "info" | "neutral";

const toneClass: Record<Tone, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  danger: "border-rose-200 bg-rose-50 text-rose-800",
  info: "border-sky-200 bg-sky-50 text-sky-800",
  neutral: "border-slate-200 bg-slate-50 text-slate-700"
};

const kpis: Array<{
  label: string;
  value: string;
  note: string;
  tone: Tone;
  progress: string;
}> = [
  { label: "전체 가동률", value: "94.8%", note: "전일 대비 1.6%p 상승", tone: "success", progress: "95%" },
  { label: "가동 설비", value: "128대", note: "12개 라인 기준", tone: "info", progress: "82%" },
  { label: "열린 알람", value: "7건", note: "주의 5건, 위험 2건", tone: "warning", progress: "58%" },
  { label: "위험 설비", value: "2대", note: "즉시 확인 필요", tone: "danger", progress: "28%" }
];

const factoryRows: Array<{
  name: string;
  location: string;
  status: string;
  tone: Tone;
  lines: string;
  machines: string;
  alarms: string;
  reportDate: string;
}> = [
  {
    name: "서울 스마트팩토리",
    location: "서울 금천구",
    status: "정상",
    tone: "success",
    lines: "2개 라인",
    machines: "4대",
    alarms: "0건",
    reportDate: "2026.06.18"
  },
  {
    name: "부산 자동차 공장",
    location: "부산 강서구",
    status: "주의",
    tone: "warning",
    lines: "2개 라인",
    machines: "4대",
    alarms: "3건",
    reportDate: "2026.06.18"
  },
  {
    name: "대전 시험 공장",
    location: "대전 유성구",
    status: "위험",
    tone: "danger",
    lines: "2개 라인",
    machines: "4대",
    alarms: "4건",
    reportDate: "2026.06.17"
  }
];

const alarmRows = [
  { title: "프레스 2호 진동 한계치 초과", factory: "대전 시험 공장", level: "위험", tone: "danger" as Tone },
  { title: "도장 라인 온도 상승", factory: "부산 자동차 공장", level: "주의", tone: "warning" as Tone },
  { title: "센서 수집 지연", factory: "대전 시험 공장", level: "주의", tone: "warning" as Tone }
];

const readinessRows = [
  { title: "Supabase 공개 조회", state: "완료", detail: "공개 anon key 기준으로 공장, 라인, 설비, 리포트 조회 준비" },
  { title: "공장 목록 화면", state: "진행 중", detail: "ISR 목록, 검색, 정렬, 상세 이동 UX 구현" },
  { title: "자동 테스트", state: "대기", detail: "Jest 단위 테스트와 실제 Chrome E2E 셋팅 필요" }
];

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[color:var(--background)]">
      <header className="border-b border-[color:var(--line)] bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <p className="text-xs font-semibold text-[color:var(--accent)]">Factory Pulse</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal text-[color:var(--foreground)]">
              스마트팩토리 운영 현황
            </h1>
          </div>

          <nav aria-label="주요 화면" className="flex flex-wrap gap-1.5 text-[13px] sm:gap-2 sm:text-sm">
            <a className="rounded-md bg-[color:var(--foreground)] px-2.5 py-2 font-semibold text-white sm:px-3" href="#overview">
              운영 요약
            </a>
            <Link
              className="rounded-md px-2.5 py-2 font-semibold text-[color:var(--muted)] hover:bg-slate-100 sm:px-3"
              href="/dashboard"
            >
              대시보드
            </Link>
            <Link
              className="rounded-md px-2.5 py-2 font-semibold text-[color:var(--muted)] hover:bg-slate-100 sm:px-3"
              href="/factories"
            >
              공장 목록
            </Link>
            <a className="rounded-md px-2.5 py-2 font-semibold text-[color:var(--muted)] hover:bg-slate-100 sm:px-3" href="#alarms">
              알람
            </a>
            <Link
              className="rounded-md px-2.5 py-2 font-semibold text-[color:var(--muted)] hover:bg-slate-100 sm:px-3"
              href="/docs/rendering"
            >
              렌더링 전략
            </Link>
          </nav>
        </div>
      </header>

      <section id="overview" className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 border-b border-[color:var(--line)] pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold text-[color:var(--accent)]">오늘의 운영 기준</p>
            <h2 className="mt-2 text-2xl font-semibold leading-tight text-[color:var(--foreground)] sm:text-3xl">
              공장, 설비, 알람을 한 화면에서 빠르게 판단합니다.
            </h2>
            <p className="mt-3 break-words text-sm leading-6 text-[color:var(--muted)]">
              Factory Pulse는 공장별 상태, 설비 위험도, 알람 우선순위, 생산 리포트를 연결해 운영자가 다음
              확인 대상을 바로 고를 수 있게 만드는 스마트팩토리 모니터링 대시보드입니다.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sky-800">데모 데이터</span>
            <span className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-800">
              기준 시각 15:20
            </span>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((item) => (
            <article key={item.label} className="min-w-0 overflow-hidden rounded-md border border-[color:var(--line)] bg-white p-4 shadow-sm">
              <div className="flex flex-col items-start gap-3 sm:flex-row sm:justify-between">
                <p className="text-sm font-medium text-[color:var(--muted)]">{item.label}</p>
                <span className={`rounded-md border px-2 py-1 text-xs font-semibold ${toneClass[item.tone]}`}>
                  {item.note}
                </span>
              </div>
              <p className="mt-4 text-3xl font-semibold text-[color:var(--foreground)]">{item.value}</p>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-2 rounded-full bg-[color:var(--accent)]" style={{ width: item.progress }} />
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-4 pb-8 sm:px-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.8fr)] lg:px-8">
        <div id="factories">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">공장별 상태</h2>
              <p className="mt-1 text-sm text-[color:var(--muted)]">
                실제 Supabase 기반 목록은 별도 ISR 화면에서 확인합니다.
              </p>
            </div>
            <Link
              className="w-fit rounded-md bg-[color:var(--accent)] px-3 py-2 text-sm font-semibold text-white hover:bg-[color:var(--accent-strong)]"
              href="/factories"
            >
              공장 목록 열기
            </Link>
          </div>

          <div className="grid gap-3">
            {factoryRows.map((factory) => (
              <article
                className="grid gap-4 rounded-md border border-[color:var(--line)] bg-white p-4 shadow-sm md:grid-cols-[minmax(180px,1.2fr)_repeat(4,minmax(80px,0.7fr))] md:items-center"
                key={factory.name}
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-[color:var(--foreground)]">{factory.name}</h3>
                    <span className={`rounded-md border px-2 py-1 text-xs font-semibold ${toneClass[factory.tone]}`}>
                      {factory.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-[color:var(--muted)]">{factory.location}</p>
                </div>
                <Metric label="라인" value={factory.lines} />
                <Metric label="설비" value={factory.machines} />
                <Metric label="열린 알람" value={factory.alarms} />
                <Metric label="최근 리포트" value={factory.reportDate} />
              </article>
            ))}
          </div>
        </div>

        <aside className="grid gap-5">
          <section id="alarms" className="rounded-md border border-[color:var(--line)] bg-white shadow-sm">
            <div className="border-b border-[color:var(--line)] px-4 py-3">
              <h2 className="text-lg font-semibold">알람 우선순위</h2>
              <p className="mt-1 text-sm text-[color:var(--muted)]">위험도가 높은 항목부터 확인합니다.</p>
            </div>
            <div className="divide-y divide-[color:var(--line)]">
              {alarmRows.map((alarm) => (
                <article className="px-4 py-3" key={alarm.title}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold">{alarm.title}</h3>
                      <p className="mt-1 text-xs text-[color:var(--muted)]">{alarm.factory}</p>
                    </div>
                    <span className={`shrink-0 rounded-md border px-2 py-1 text-xs font-semibold ${toneClass[alarm.tone]}`}>
                      {alarm.level}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section id="roadmap" className="rounded-md border border-[color:var(--line)] bg-white shadow-sm">
            <div className="border-b border-[color:var(--line)] px-4 py-3">
              <h2 className="text-lg font-semibold">구현 준비도</h2>
              <p className="mt-1 text-sm text-[color:var(--muted)]">다음 루프의 우선순위를 확인합니다.</p>
            </div>
            <div className="divide-y divide-[color:var(--line)]">
              {readinessRows.map((row) => (
                <article className="px-4 py-3" key={row.title}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold">{row.title}</h3>
                      <p className="mt-1 text-xs leading-5 text-[color:var(--muted)]">{row.detail}</p>
                    </div>
                    <span className="shrink-0 rounded-md border border-[color:var(--line)] bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700">
                      {row.state}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium text-[color:var(--muted)]">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-[color:var(--foreground)]">{value}</p>
    </div>
  );
}
