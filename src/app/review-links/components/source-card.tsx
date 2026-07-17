import { Icon } from "@/components/icon";

interface SourceCardProps {
  icon: string;
  label: string;
  color: string;
  url: string;
  views: number;
  happy: number;
  tip: string;
  onCopy: (id: string, text: string) => void;
  copied: Record<string, boolean>;
}

export function SourceCard({
  icon,
  label,
  color,
  url,
  views,
  happy,
  tip,
  onCopy,
  copied,
}: SourceCardProps) {
  const id = label.toLowerCase().replace(/\s+/g, "-");
  const happyPercentage = views > 0 ? Math.round((happy / views) * 100) : 0;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition">
      <div className="flex gap-4 mb-4">
        {/* Icon with colored background */}
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${color}`}
        >
          <Icon name={icon as any} size={24} style={{ color: "white" }} />
        </div>

        {/* Title and tip */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-900">{label}</h3>
          <p className="text-xs text-slate-500 mt-1">{tip}</p>
        </div>
      </div>

      {/* URL with copy button */}
      <div className="mb-4 flex items-center gap-2">
        <input
          readOnly
          value={url}
          className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono text-slate-600 truncate"
        />
        <button
          type="button"
          onClick={() => {
            onCopy(id, url);
          }}
          className="shrink-0 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition whitespace-nowrap"
        >
          {copied[id] ? "Copied!" : "Copy"}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 text-center">
        <div className="rounded-lg bg-slate-50 p-2">
          <p className="text-lg font-bold text-slate-900">{views}</p>
          <p className="text-xs text-slate-500">Views</p>
        </div>
        <div className="rounded-lg bg-slate-50 p-2">
          <p className="text-lg font-bold text-slate-900">{happy}</p>
          <p className="text-xs text-slate-500">Happy ({happyPercentage}%)</p>
        </div>
      </div>
    </div>
  );
}
