export const dynamic = "force-dynamic";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { FormSubmitButton } from "@/components/form-submit-button";
import { requireActiveMembershipPage } from "@/lib/page-guards";
import { decryptToken } from "@/lib/token-encryption";
import { fetchMetaUserPages } from "@/lib/meta-oauth";
import { connectSelectedMetaPage } from "./actions";

const USER_TOKEN_COOKIE = "meta_user_token";

export default async function SelectFacebookPage() {
  await requireActiveMembershipPage();

  const cookieStore = await cookies();
  const userToken = decryptToken(cookieStore.get(USER_TOKEN_COOKIE)?.value);
  if (!userToken) {
    redirect("/integrations?facebook=auth-error&message=Your+Facebook+session+expired.+Please+connect+again.");
  }

  const pages = await fetchMetaUserPages(userToken);
  if (pages.length === 0) {
    redirect("/integrations?facebook=auth-error&message=No+Facebook+Pages+found+for+this+account.");
  }

  return (
    <AppShell activeScreen="integrations">
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">Facebook</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Choose a Page to connect</h2>
          <p className="mt-2 text-sm text-slate-600">
            Your Facebook account manages multiple Pages. Pick the one whose reviews you want to bring into WeHearYou. You can connect another Page later by reconnecting.
          </p>
        </div>

        <form action={connectSelectedMetaPage} className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <fieldset className="space-y-3">
            {pages.map((page, index) => (
              <label
                key={page.id}
                className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 hover:border-indigo-300 has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-50"
              >
                <input
                  type="radio"
                  name="pageId"
                  value={page.id}
                  defaultChecked={index === 0}
                  required
                  className="h-4 w-4 accent-indigo-600"
                />
                <span className="flex flex-col">
                  <span className="text-sm font-semibold text-slate-900">{page.name}</span>
                  <span className="text-xs text-slate-500">Page ID: {page.id}</span>
                </span>
              </label>
            ))}
          </fieldset>

          <div className="flex gap-3">
            <FormSubmitButton
              idleLabel="Connect this Page"
              pendingLabel="Connecting..."
              className="rounded-2xl border border-blue-600 bg-blue-600 px-4 py-3 text-sm font-semibold !text-white visited:!text-white hover:!text-white disabled:cursor-not-allowed disabled:opacity-70"
            />
          </div>
        </form>
      </div>
    </AppShell>
  );
}
