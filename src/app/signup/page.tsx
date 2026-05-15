import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SignUpForm } from "@/app/signup/signup-form";

export default async function SignUpPage() {
  const session = await auth();

  if (session?.user) {
    redirect("/");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">WeHearYou</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Create your account</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Start a new organization workspace, become the owner, and invite your team after setup.
        </p>

        <div className="mt-8">
          <SignUpForm />
        </div>

        <p className="mt-6 text-center text-sm text-slate-600">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-indigo-600 hover:text-indigo-500">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
