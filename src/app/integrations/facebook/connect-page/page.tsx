export const dynamic = "force-dynamic";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { FormSubmitButton } from "@/components/form-submit-button";
import { requireTeamAccessPage } from "@/lib/page-guards";
import { decryptToken } from "@/lib/token-encryption";
import { connectMetaPageById } from "./actions";

const USER_TOKEN_COOKIE = "meta_user_token";

type ConnectFacebookPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function ConnectFacebookPage({ searchParams }: ConnectFacebookPageProps) {
  await requireTeamAccessPage();

  const cookieStore = await cookies();
  const userToken = decryptToken(cookieStore.get(USER_TOKEN_COOKIE)?.value);
  if (!userToken) {
    redirect("/integrations?facebook=auth-error&message=Your+Facebook+session+expired.+Please+connect+again.");
  }

  const { error } = await searchParams;

  return (
    <AppShell activeScreen="integrations">
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <p className="eyebrow">Facebook</p>
          <h2 className="page-title">Connect a Facebook Page</h2>
          <p className="mt-2 text-sm text-slate-600">
            Meta authorized your Facebook account but did not return its managed-Page list. Enter the
            numeric ID for the business Page you explicitly authorized. WeHearYou verifies access with
            Meta before saving anything, so an ID alone cannot connect an unauthorized Page.
          </p>
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {error}
          </div>
        ) : null}

        <form action={connectMetaPageById} className="space-y-5 panel">
          <div className="space-y-2">
            <label htmlFor="pageId" className="text-sm font-semibold text-slate-900">
              Facebook Page ID
            </label>
            <input
              id="pageId"
              name="pageId"
              inputMode="numeric"
              pattern="[0-9]{5,25}"
              autoComplete="off"
              required
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-indigo-500 focus:ring-2"
              placeholder="Example: 123456789012345"
              aria-describedby="page-id-help"
            />
            <p id="page-id-help" className="text-xs text-slate-500">
              Find this numeric ID in the Page&apos;s About or business settings. Do not enter a Page URL,
              access token, or any customer data.
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600">
            The Page is connected only after Meta issues a Page access token for the current authorized
            Facebook user. The token stays encrypted on the server and is scoped to your current
            organization. You will choose the specific WeHearYou location before syncing reviews.
          </div>

          <FormSubmitButton
            idleLabel="Verify and connect Page"
            pendingLabel="Verifying with Facebook..."
            className="rounded-2xl border border-blue-600 bg-blue-600 px-4 py-3 text-sm font-semibold !text-white visited:!text-white hover:!text-white disabled:cursor-not-allowed disabled:opacity-70"
          />
        </form>
      </div>
    </AppShell>
  );
}
