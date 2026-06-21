import { VerifiedBadge } from "./verified-badge";

export interface MiniSiteFooterProps {
  businessName: string;
  showVerified?: boolean;
  showPoweredBy?: boolean;
}

export function MiniSiteFooter({
  businessName,
  showVerified = false,
  showPoweredBy = false,
}: MiniSiteFooterProps) {
  return (
    <footer
      className="border-t py-8 text-center text-sm"
      style={{ borderColor: "var(--ink-200)", color: "var(--ink-500)" }}
    >
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="flex flex-col items-center gap-2">
          <p className="font-semibold" style={{ color: "var(--ink-700)" }}>
            {businessName}
          </p>
          {showVerified && <VerifiedBadge />}
          {showPoweredBy && (
            <p className="text-xs" style={{ color: "var(--ink-400)" }}>
              Powered by{" "}
              <a
                href="https://wehearyou.app"
                target="_blank"
                rel="noreferrer"
                className="font-semibold hover:underline"
                style={{ color: "var(--accent)" }}
              >
                WeHearYou
              </a>
            </p>
          )}
        </div>
      </div>
    </footer>
  );
}
