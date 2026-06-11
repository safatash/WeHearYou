"use client";

import { useActionState, useEffect } from "react";
import { FormSubmitButton } from "@/components/form-submit-button";
import { saveFunnelBuilderSettings, type FunnelBuilderActionState } from "@/app/locations/actions";

const initialState: FunnelBuilderActionState = {
  success: false,
};

export function FunnelBuilderForm({
  locationId,
  locationName,
  locationSlug,
  defaultValues,
}: {
  locationId: string;
  locationName: string;
  locationSlug: string;
  defaultValues: {
    funnelRatingStyle: string;
    funnelPromptTitle: string;
    funnelPromptBody: string;
    funnelPrivateTitle: string;
    funnelPrivateBody: string;
    funnelPrivateSubmitLabel: string;
    funnelThanksPublicTitle: string;
    funnelThanksPublicBody: string;
    funnelThanksPrivateTitle: string;
    funnelThanksPrivateBody: string;
    funnelReviewButtonLabel: string;
  };
}) {
  const [state, formAction] = useActionState(saveFunnelBuilderSettings, initialState);

  useEffect(() => {
    if (state.success) {
      window.location.assign(`/funnel-builder?location=${locationId}&flash=Funnel+settings+saved&tone=success`);
    }
  }, [locationId, state.success]);

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="locationId" value={locationId} />

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-slate-950">Funnel Settings</h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Edit the live funnel for <span className="font-semibold text-slate-900">{locationName}</span>. This controls what customers see first, how they are routed, and what they see after leaving feedback.
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">/f/{locationSlug}</span>
        </div>

        <div className="mt-6 space-y-8">
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">What customers see first</p>
              <p className="mt-1 text-sm text-slate-600">This is the live funnel entry page and first impression.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold text-slate-700 md:col-span-2">
                Funnel prompt title
                <input name="funnelPromptTitle" defaultValue={defaultValues.funnelPromptTitle} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700" />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-slate-700 md:col-span-2">
                Funnel prompt body
                <textarea name="funnelPromptBody" defaultValue={defaultValues.funnelPromptBody} className="min-h-24 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal leading-7 text-slate-700" />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                Rating style
                <select name="funnelRatingStyle" defaultValue={defaultValues.funnelRatingStyle} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700">
                  <option value="stars">Stars (1 to 5)</option>
                  <option value="faces">Happy / neutral / sad faces</option>
                  <option value="thumbs">Thumbs up / thumbs down</option>
                </select>
              </label>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-8 space-y-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">What happens after rating</p>
              <p className="mt-1 text-sm text-slate-600">Control the actual review funnel behavior after someone selects a rating.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600 md:col-span-2">
              Review routing (where low and high ratings go — Google, Facebook, WeHearYou, custom links, or a choice page) is configured in the{" "}
              <a href="/campaign-wizard" className="font-semibold text-indigo-600 hover:underline">Campaign Wizard → Review Routing</a> step.
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                Public review button label
                <input name="funnelReviewButtonLabel" defaultValue={defaultValues.funnelReviewButtonLabel} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700" />
              </label>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-8 space-y-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Private feedback</p>
              <p className="mt-1 text-sm text-slate-600">This appears when someone leaves a lower rating and stays in the private feedback flow.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold text-slate-700 md:col-span-2">
                Private feedback title
                <input name="funnelPrivateTitle" defaultValue={defaultValues.funnelPrivateTitle} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700" />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-slate-700 md:col-span-2">
                Private feedback body
                <textarea name="funnelPrivateBody" defaultValue={defaultValues.funnelPrivateBody} className="min-h-24 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal leading-7 text-slate-700" />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                Private submit button label
                <input name="funnelPrivateSubmitLabel" defaultValue={defaultValues.funnelPrivateSubmitLabel} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700" />
              </label>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-8 space-y-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Thank-you states</p>
              <p className="mt-1 text-sm text-slate-600">Customize what customers see after public review routing and after private feedback submission.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold text-slate-700 md:col-span-2">
                Public thank-you title
                <input name="funnelThanksPublicTitle" defaultValue={defaultValues.funnelThanksPublicTitle} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700" />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-slate-700 md:col-span-2">
                Public thank-you body
                <textarea name="funnelThanksPublicBody" defaultValue={defaultValues.funnelThanksPublicBody} className="min-h-24 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal leading-7 text-slate-700" />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-slate-700 md:col-span-2">
                Private thank-you title
                <input name="funnelThanksPrivateTitle" defaultValue={defaultValues.funnelThanksPrivateTitle} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700" />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-slate-700 md:col-span-2">
                Private thank-you body
                <textarea name="funnelThanksPrivateBody" defaultValue={defaultValues.funnelThanksPrivateBody} className="min-h-24 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal leading-7 text-slate-700" />
              </label>
            </div>
          </div>

        </div>
      </section>

      {state.error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{state.error}</div>
      ) : null}

      <div className="flex justify-end">
        <FormSubmitButton
          idleLabel="Save Funnel Settings"
          pendingLabel="Saving..."
          className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold !text-white shadow-sm visited:!text-white hover:!text-white"
        />
      </div>
    </form>
  );
}
