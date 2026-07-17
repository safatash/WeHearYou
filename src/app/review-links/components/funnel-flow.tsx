export function FunnelFlow() {
  return (
    <div className="rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50 to-teal-50 p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">
        ⚡ How the funnel works
      </h3>

      <div className="space-y-4">
        {/* Step 1 */}
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center text-sm font-bold">
            1
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-900">
              Customer clicks review link
            </p>
            <p className="text-xs text-slate-600 mt-0.5">
              They see a simple rating interface
            </p>
          </div>
        </div>

        {/* Arrow down */}
        <div className="flex justify-center">
          <div className="text-teal-400">↓</div>
        </div>

        {/* Step 2 */}
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center text-sm font-bold">
            2
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-900">
              Customer rates their experience
            </p>
            <p className="text-xs text-slate-600 mt-0.5">
              1-3 stars or 4-5 stars
            </p>
          </div>
        </div>

        {/* Arrow down and fork */}
        <div className="flex justify-center my-2">
          <div className="text-teal-400">↓</div>
        </div>

        {/* Fork into two paths */}
        <div className="grid grid-cols-2 gap-4">
          {/* Happy path (4-5 stars) */}
          <div className="rounded-xl border border-green-300 bg-green-50 p-4">
            <p className="text-sm font-semibold text-green-900">
              ✓ 4-5 Stars (Happy)
            </p>
            <p className="text-xs text-green-700 mt-2">
              Directed to Google Review page. Easy wins for your business!
            </p>
          </div>

          {/* Unhappy path (1-3 stars) */}
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-900">
              ⚠ 1-3 Stars (Feedback)
            </p>
            <p className="text-xs text-amber-700 mt-2">
              Sent to private feedback form. Capture issues before they become reviews.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
