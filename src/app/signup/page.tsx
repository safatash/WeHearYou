import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AuthShell } from "@/components/auth-shell";
import { SignUpForm } from "@/app/signup/signup-form";

export default async function SignUpPage() {
  const session = await auth();

  if (session?.user) {
    redirect("/");
  }

  return (
    <AuthShell mode="signup">
      <SignUpForm />
    </AuthShell>
  );
}
