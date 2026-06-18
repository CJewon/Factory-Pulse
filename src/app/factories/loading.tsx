const skeletonRows = ["row-1", "row-2", "row-3"];

export default function FactoriesLoading() {
  return (
    <main className="min-h-screen bg-[color:var(--background)]">
      <header className="border-b border-[color:var(--line)] bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="h-4 w-24 rounded bg-slate-200" />
          <div className="mt-2 h-8 w-40 rounded bg-slate-200" />
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="h-4 w-28 rounded bg-slate-200" />
        <div className="mt-3 h-9 max-w-2xl rounded bg-slate-200" />
        <div className="mt-3 h-5 max-w-xl rounded bg-slate-100" />

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {skeletonRows.concat("row-4").map((row) => (
            <div className="rounded-md border border-[color:var(--line)] bg-white p-4 shadow-sm" key={row}>
              <div className="h-4 w-24 rounded bg-slate-100" />
              <div className="mt-4 h-8 w-20 rounded bg-slate-200" />
            </div>
          ))}
        </div>

        <section className="mt-5 rounded-md border border-[color:var(--line)] bg-white p-4 shadow-sm">
          <div className="h-5 w-36 rounded bg-slate-200" />
          <div className="mt-4 grid gap-3">
            {skeletonRows.map((row) => (
              <div className="h-20 rounded-md bg-slate-100" key={row} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
