export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LoginForm } from "@/app/login/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  const params = (await searchParams) ?? {};
  const flash = typeof params.flash === "string" ? params.flash : null;
  const tone = params.tone === "error" ? "error" : "success";

  if (session?.user) {
    redirect("/");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">WeHearYou</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Sign in</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Sign in with your email and password to access your organization, locations, reviews, and campaigns.
        </p>

        {flash ? (
          <div className={`mt-6 rounded-2xl border px-4 py-3 text-sm ${tone === "error" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
            {flash}
          </div>
        ) : null}

        <div className="mt-8">
          <LoginForm />
        </div>

        <p className="mt-6 text-center text-sm text-slate-600">
          New to WeHearYou?{" "}
          <Link href="/signup" className="font-semibold text-indigo-600 hover:text-indigo-500">
            Create an account
          </Link>
        </p>

        {/* <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
          <p className="font-semibold text-slate-900">Demo account</p>
          <p className="mt-2">Email: safa@wehearyou.app</p>
          <p>Password: demo1234</p>
        </div> */}
      </div>
    </main>
  );
}
