import Link from "next/link";

const renderingRows = [
  {
    strategy: "정적 생성 SSG",
    routes: "/, /docs/rendering",
    reason: "모든 사용자에게 같은 설명과 기준을 보여주며 변경 빈도가 낮은 화면입니다."
  },
  {
    strategy: "주기 갱신 ISR",
    routes: "/factories, /factories/[factoryId], /reports",
    reason: "목록과 리포트처럼 빠른 응답이 중요하지만 초단위 최신성까지 필요하지 않은 데이터입니다."
  },
  {
    strategy: "동적 렌더링",
    routes: "/dashboard, /machines/[machineId]",
    reason: "요청 시점의 최신 설비 상태, 알람, 권한 조건을 반영해야 하는 화면입니다."
  },
  {
    strategy: "클라이언트 렌더링 CSR",
    routes: "/alarms, /settings, 검색/필터/정렬 영역",
    reason: "사용자 입력에 따라 즉시 바뀌는 UI는 클라이언트 상태와 URL 파라미터를 함께 사용합니다."
  },
  {
    strategy: "Streaming과 Suspense",
    routes: "/dashboard",
    reason: "요약 shell을 먼저 보여주고 차트, 최근 알람, 설비 보드를 독립적으로 로딩합니다."
  },
  {
    strategy: "Server Action",
    routes: "알람 확인, 설정 저장, 향후 관리자성 변경 작업",
    reason: "RLS와 검증이 필요한 mutation은 서버에서 처리하고 성공 시 관련 경로를 갱신합니다."
  }
];

const rules = [
  "공개 설명 페이지는 정적으로 유지합니다.",
  "공장 목록은 ISR 기준으로 구현하고 revalidate = 600을 사용합니다.",
  "ISR 페이지에서는 cookies 기반 Supabase server client를 직접 사용하지 않습니다.",
  "알람 확인과 설정 저장은 인증 이후 Server Action으로 분리합니다."
];

export default function RenderingDocsPage() {
  return (
    <main className="min-h-screen bg-[color:var(--background)]">
      <header className="border-b border-[color:var(--line)] bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <p className="text-xs font-semibold text-[color:var(--accent)]">Factory Pulse</p>
            <h1 className="mt-1 text-2xl font-semibold">렌더링 전략</h1>
          </div>
          <Link
            className="w-fit rounded-md border border-[color:var(--line)] bg-white px-3 py-2 text-sm font-semibold text-[color:var(--foreground)] hover:border-[color:var(--accent)]"
            href="/"
          >
            운영 현황으로 돌아가기
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="border-b border-[color:var(--line)] pb-5">
          <p className="text-sm font-semibold text-[color:var(--accent)]">화면별 데이터 최신성 기준</p>
          <h2 className="mt-2 max-w-3xl text-3xl font-semibold leading-tight">
            화면마다 필요한 최신성이 다르기 때문에 렌더링 방식을 분리합니다.
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[color:var(--muted)]">
            Factory Pulse는 정적인 설명, 주기 갱신 목록, 요청 시점 데이터, 사용자 조작 중심 화면을 분리해
            성능과 정확성의 균형을 맞춥니다.
          </p>
        </section>

        <section className="mt-5 overflow-hidden rounded-md border border-[color:var(--line)] bg-white shadow-sm">
          <div className="grid border-b border-[color:var(--line)] bg-slate-50 px-4 py-3 text-sm font-semibold text-[color:var(--muted)] md:grid-cols-[0.9fr_1.4fr_1.8fr]">
            <span>전략</span>
            <span className="hidden md:block">적용 경로</span>
            <span className="hidden md:block">결정 이유</span>
          </div>

          <div className="divide-y divide-[color:var(--line)]">
            {renderingRows.map((row) => (
              <article
                className="grid gap-3 px-4 py-4 md:grid-cols-[0.9fr_1.4fr_1.8fr] md:items-start"
                key={row.strategy}
              >
                <h2 className="text-base font-semibold">{row.strategy}</h2>
                <p className="break-words text-sm leading-6 text-[color:var(--muted)]">{row.routes}</p>
                <p className="text-sm leading-6 text-[color:var(--muted)]">{row.reason}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-5 grid gap-3 md:grid-cols-2">
          {rules.map((rule, index) => (
            <article className="rounded-md border border-[color:var(--line)] bg-white p-4 shadow-sm" key={rule}>
              <p className="text-xs font-semibold text-[color:var(--accent)]">원칙 {index + 1}</p>
              <p className="mt-2 text-sm leading-6 text-[color:var(--foreground)]">{rule}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
