export const dynamic = "force-dynamic";

export default async function ResolveDonePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const contactRequested = query.contact === "1";

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-xl rounded-[32px] border border-slate-200 bg-white p-8 text-center shadow-[0_16px_50px_rgba(15,23,42,0.08)] sm:p-12">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Thank you for sharing your feedback.</h1>
        <p className="mt-4 text-base leading-7 text-slate-600">This feedback helps the business improve.</p>
        {contactRequested && (
          <p className="mt-3 text-sm text-slate-500">The business may contact you regarding your feedback.</p>
        )}
      </div>
    </main>
  );
}
