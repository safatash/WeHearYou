export default function SuspendedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-rose-600">Account Suspended</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
          Your account has been suspended
        </h1>
        <p className="mt-4 text-sm leading-7 text-slate-600">
          Access to your WeHearYou account has been temporarily suspended. Please contact support to resolve this.
        </p>
        <a
          href="mailto:support@wehearyou.com"
          className="mt-6 inline-block rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
        >
          Contact support
        </a>
      </div>
    </div>
  );
}
