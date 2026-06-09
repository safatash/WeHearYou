import Link from "next/link";

export function LegalPage({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <Link href="/login" className="text-sm font-semibold text-white">
            WeHearYou
          </Link>
          <div className="flex gap-4 text-sm text-slate-300">
            <Link href="/privacy" className="hover:text-white">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-white">
              Terms
            </Link>
            <Link href="/data-deletion" className="hover:text-white">
              Data Deletion
            </Link>
          </div>
        </div>

        <section className="rounded-[32px] border border-white/10 bg-white p-8 text-slate-700 shadow-2xl shadow-indigo-950/30 sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">
            WeHearYou
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            {title}
          </h1>
          <div className="mt-8 space-y-6 text-sm leading-7 text-slate-600 sm:text-base">
            {children}
          </div>
        </section>
      </div>
    </main>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
