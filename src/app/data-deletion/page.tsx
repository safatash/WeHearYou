import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Data Deletion Instructions | WeHearYou",
  description: "How to request deletion of personal data associated with WeHearYou or a connected Meta account.",
};

export default function DataDeletionPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12 text-slate-900 sm:py-20">
      <article className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:p-12">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">WeHearYou</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Data Deletion Instructions</h1>
        <p className="mt-6 text-base leading-7 text-slate-700">
          You may request deletion of personal data associated with a WeHearYou account or a connected Meta/Facebook account.
          This page does not collect a deletion request or display account information.
        </p>

        <section className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-6">
          <h2 className="text-lg font-semibold">How to make a request</h2>
          <p className="mt-3 leading-7 text-slate-700">
            Email <a className="font-semibold text-teal-700 underline" href="mailto:safa@novaadvertising.com?subject=WeHearYou%20Data%20Deletion%20Request">safa@novaadvertising.com</a> from the email address associated with your account. Use the subject line <strong>WeHearYou Data Deletion Request</strong> and identify the organization or Facebook Page connection, if applicable.
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-semibold">What happens next</h2>
          <p className="mt-3 leading-7 text-slate-700">
            We will verify the request before taking action and will communicate the outcome using the contact details supplied with the request. We may retain only the minimum information required to meet security, fraud-prevention, and legal obligations.
          </p>
        </section>

        <p className="mt-10 border-t border-slate-200 pt-6 text-sm leading-6 text-slate-600">
          For general privacy questions, use the contact details in the WeHearYou privacy policy.
        </p>
      </article>
    </main>
  );
}
