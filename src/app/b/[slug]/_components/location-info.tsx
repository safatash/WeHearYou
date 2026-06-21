export interface HoursRow {
  day: string;
  hours: string;
  isToday?: boolean;
}

export interface LocationInfoProps {
  address?: string | null;
  mapUrl?: string | null;
  mapEmbedUrl?: string | null;
  phone?: string | null;
  websiteUrl?: string | null;
  email?: string | null;
  hours?: HoursRow[];
  services?: string[];
  showServices?: boolean;
}

export function LocationInfo({
  address,
  mapUrl,
  mapEmbedUrl,
  phone,
  websiteUrl,
  email,
  hours = [],
  services = [],
  showServices = true,
}: LocationInfoProps) {
  const hasContent = address || phone || websiteUrl || email || mapUrl || services.length > 0 || hours.length > 0;
  if (!hasContent) return null;

  return (
    <div className="space-y-5">
      {/* Business info card */}
      {hasContent && (
        <div
          className="rounded-3xl border p-5 shadow-sm"
          style={{ borderColor: "var(--ink-200)", background: "var(--white)" }}
        >
          <h2 className="text-base font-semibold" style={{ color: "var(--ink-950)" }}>
            Business info
          </h2>
          <div className="mt-4 space-y-3 text-sm">
            {address && (
              <div className="flex gap-3">
                <span className="mt-0.5 shrink-0" style={{ color: "var(--ink-400)" }}>
                  📍
                </span>
                <div>
                  <p style={{ color: "var(--ink-700)" }}>{address}</p>
                  {mapUrl && (
                    <a
                      href={mapUrl}
                      target="_blank"
                      rel="noreferrer"
                      data-track="directions"
                      className="mt-1 inline-block text-xs font-semibold hover:underline"
                      style={{ color: "var(--accent)" }}
                    >
                      Get directions →
                    </a>
                  )}
                </div>
              </div>
            )}

            {phone && (
              <div className="flex gap-3">
                <span className="shrink-0" style={{ color: "var(--ink-400)" }}>
                  📞
                </span>
                <a
                  href={`tel:${phone}`}
                  data-track="call"
                  className="hover:underline"
                  style={{ color: "var(--ink-700)" }}
                >
                  {phone}
                </a>
              </div>
            )}

            {email && (
              <div className="flex gap-3">
                <span className="shrink-0" style={{ color: "var(--ink-400)" }}>
                  ✉️
                </span>
                <a
                  href={`mailto:${email}`}
                  className="truncate hover:underline"
                  style={{ color: "var(--ink-700)" }}
                >
                  {email}
                </a>
              </div>
            )}

            {websiteUrl && (
              <div className="flex gap-3">
                <span className="shrink-0" style={{ color: "var(--ink-400)" }}>
                  🌐
                </span>
                <a
                  href={websiteUrl}
                  target="_blank"
                  rel="noreferrer"
                  data-track="website"
                  className="truncate hover:underline"
                  style={{ color: "var(--ink-700)" }}
                >
                  {websiteUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hours card */}
      {hours.length > 0 && (
        <div
          className="rounded-3xl border p-5 shadow-sm"
          style={{ borderColor: "var(--ink-200)", background: "var(--white)" }}
        >
          <h2 className="text-base font-semibold" style={{ color: "var(--ink-950)" }}>
            Business hours
          </h2>
          <table className="mt-4 w-full text-sm">
            <tbody>
              {hours.map(({ day, hours: h, isToday }) => (
                <tr
                  key={day}
                  style={
                    isToday
                      ? { fontWeight: 600, color: "var(--accent-strong)" }
                      : { color: "var(--ink-600)" }
                  }
                >
                  <td className="py-1 pr-4 w-10">{day}</td>
                  <td className="py-1">{h || "Closed"}</td>
                  {isToday && (
                    <td className="py-1 pl-2 text-xs" style={{ color: "var(--accent)" }}>
                      Today
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Map card */}
      {mapUrl && (
        <div
          className="rounded-3xl border p-5 shadow-sm"
          style={{ borderColor: "var(--ink-200)", background: "var(--white)" }}
        >
          <h2 className="text-base font-semibold" style={{ color: "var(--ink-950)" }}>
            Location
          </h2>
          <div className="mt-3 overflow-hidden rounded-2xl">
            {mapEmbedUrl ? (
              <iframe
                title="Map"
                width="100%"
                height="180"
                style={{ border: 0 }}
                loading="lazy"
                allowFullScreen
                src={mapEmbedUrl}
              />
            ) : (
              <a
                href={mapUrl}
                target="_blank"
                rel="noreferrer"
                className="flex h-36 items-center justify-center rounded-2xl text-sm font-semibold transition hover:opacity-80"
                style={{ background: "var(--ink-100)", color: "var(--accent)" }}
              >
                View on Google Maps →
              </a>
            )}
          </div>
          <a
            href={mapUrl}
            target="_blank"
            rel="noreferrer"
            data-track="directions"
            className="mt-3 inline-flex w-full items-center justify-center rounded-2xl border px-4 py-2.5 text-sm font-semibold shadow-sm transition hover:opacity-80"
            style={{
              borderColor: "var(--ink-200)",
              background: "var(--white)",
              color: "var(--ink-700)",
            }}
          >
            Get directions
          </a>
        </div>
      )}

      {/* Services chips */}
      {showServices && services.length > 0 && (
        <div
          className="rounded-3xl border p-5 shadow-sm"
          style={{ borderColor: "var(--ink-200)", background: "var(--white)" }}
        >
          <h2 className="text-base font-semibold" style={{ color: "var(--ink-950)" }}>
            Services
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {services.map((svc) => (
              <span
                key={svc}
                className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
                style={{ background: "var(--ink-100)", color: "var(--ink-700)" }}
              >
                {svc}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
