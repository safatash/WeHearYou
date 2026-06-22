export function MiniSiteUnavailable({ name }: { name: string }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[var(--page)] px-6 text-center">
      <h1 className="text-2xl font-semibold text-[var(--ink-900)]">{name}</h1>
      <p className="mt-2 text-[var(--ink-500)]">This page isn&apos;t available right now.</p>
    </main>
  );
}
