export default function SettingsLoading() {
  return (
    <main className="min-h-screen bg-[color:var(--background)]">
      <header className="border-b border-[color:var(--line)] bg-white">
        <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="h-4 w-28 rounded bg-slate-100" />
          <div className="mt-2 h-8 w-52 rounded bg-slate-200" />
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="h-28 rounded-md border border-[color:var(--line)] bg-white shadow-sm" />
        <div className="mt-5 h-64 rounded-md border border-[color:var(--line)] bg-white shadow-sm" />
      </div>
    </main>
  );
}
