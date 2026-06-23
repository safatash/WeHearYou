import Link from "next/link";
import { Icon, type IconName } from "@/components/icon";

export type LocationTab = "public" | "settings" | "assistant" | "reviews" | "requests" | "sources" | "details";

const TABS: { id: LocationTab; label: string; icon: IconName }[] = [
  { id: "public", label: "Public Page", icon: "monitor" },
  { id: "settings", label: "Mini Site Settings", icon: "sliders" },
  { id: "assistant", label: "AI Assistant", icon: "sparkles" },
  { id: "reviews", label: "Reviews", icon: "star" },
  { id: "requests", label: "Request Performance", icon: "send" },
  { id: "sources", label: "Connected Sources", icon: "plug" },
  { id: "details", label: "Location Details", icon: "pin" },
];

export function LocationTabs({ activeTab, reviewCount }: { activeTab: LocationTab; reviewCount: number }) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-[var(--ink-200)]">
      {TABS.map((t) => {
        const active = t.id === activeTab;
        return (
          <Link
            key={t.id}
            href={`?tab=${t.id}`}
            scroll={false}
            aria-current={active ? "page" : undefined}
            className={`-mb-px flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3.5 py-3 text-sm font-semibold transition-colors ${
              active
                ? "border-[var(--accent)] text-[var(--accent-strong)]"
                : "border-transparent text-[var(--ink-500)] hover:text-[var(--ink-800)]"
            }`}
          >
            <Icon name={t.icon} size={15} />
            {t.label}
            {t.id === "reviews" && reviewCount > 0 ? (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${
                  active ? "bg-[var(--accent-soft)] text-[var(--accent-strong)]" : "bg-[var(--ink-100)] text-[var(--ink-500)]"
                }`}
              >
                {reviewCount}
              </span>
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}
