"use client";

interface OptionCardProps {
  icon?: string;
  title: string;
  desc: string;
  on: boolean;
  onClick: () => void;
  kind?: "radio" | "check";
}

export function OptionCard({
  icon,
  title,
  desc,
  on,
  onClick,
  kind = "radio",
}: OptionCardProps) {
  const isRadio = kind === "radio";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full cursor-pointer rounded-2xl border p-4 text-left transition-colors ${
        on
          ? "border-indigo-300 bg-indigo-50"
          : "border-slate-200 bg-slate-50 hover:border-indigo-200 hover:bg-indigo-50"
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Radio or Checkbox */}
        <div className="mt-1 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border border-slate-300">
          {on && (
            <>
              {isRadio ? (
                <div className="h-2 w-2 rounded-full bg-indigo-600" />
              ) : (
                <svg
                  className="h-3 w-3 text-indigo-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </>
          )}
        </div>
        {/* Content */}
        <div className="flex-1">
          {icon && <div className="mb-2 text-2xl">{icon}</div>}
          <p className={`text-sm font-semibold ${on ? "text-indigo-900" : "text-slate-900"}`}>
            {title}
          </p>
          <p className="mt-1 text-sm text-slate-600">{desc}</p>
        </div>
      </div>
    </button>
  );
}
