export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AuthShell } from "@/components/auth-shell";
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
    <AuthShell mode="signin" flash={flash ? { message: flash, tone } : null}>
      <LoginForm />
    </AuthShell>
  );
}
