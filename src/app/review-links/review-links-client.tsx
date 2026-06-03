"use client";

import { useState, useEffect, useRef } from "react";
import QRCode from "qrcode";

type LocationData = {
  id: string;
  name: string;
  slug: string;
  reviewUrl: string;
  hasGoogleUrl: boolean;
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition whitespace-nowrap"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

function LinksTab({ slug, appUrl }: { slug: string; appUrl: string }) {
  const base = appUrl.replace(/\/$/, "");
  const defaultUrl = `${base}/review/${slug}`;
  const sources = [
    { label: "Email Signature", src: "email_signature", medium: "email" },
    { label: "QR / Print", src: "qr_counter", medium: "print" },
    { label: "Invoice", src: "invoice", medium: "print" },
    { label: "Website", src: "website", medium: "digital" },
  ];

  return (
    <div className="space-y-4 pt-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mb-2">Default link</p>
        <div className="flex items-center gap-2">
          <input
            readOnly
            value={defaultUrl}
            className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono text-slate-700"
          />
          <CopyButton text={defaultUrl} />
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mb-2">Source-specific links</p>
        <div className="space-y-2">
          {sources.map((s) => {
            const url = `${base}/review/${slug}?src=${s.src}&medium=${s.medium}`;
            return (
              <div key={s.src} className="flex items-center gap-2">
                <span className="w-28 shrink-0 text-xs font-semibold text-slate-600">{s.label}</span>
                <input
                  readOnly
                  value={url}
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono text-slate-600"
                />
                <CopyButton text={url} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function EmailSigTab({ snippet }: { snippet: string }) {
  return (
    <div className="space-y-4 pt-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mb-2">Preview</p>
        <div
          className="rounded-xl border border-slate-200 bg-white p-4 font-sans text-sm"
          dangerouslySetInnerHTML={{ __html: snippet }}
        />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mb-2">HTML snippet</p>
        <div className="relative">
          <pre className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 whitespace-pre-wrap">
            {snippet}
          </pre>
          <div className="absolute top-2 right-2">
            <CopyButton text={snippet} />
          </div>
        </div>
      </div>
    </div>
  );
}

function QrTab({ reviewUrl, locationName }: { reviewUrl: string; locationName: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [qrReady, setQrReady] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, reviewUrl, { width: 200, margin: 2 }, () => {
      setQrReady(true);
    });
  }, [reviewUrl]);

  function handleDownload() {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = `${locationName.replace(/\s+/g, "-").toLowerCase()}-review-qr.png`;
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  }

  return (
    <div className="pt-4 space-y-4">
      <div className="flex flex-col items-center gap-4">
        <canvas ref={canvasRef} className="rounded-xl border border-slate-200" />
        <p className="text-xs text-slate-500 font-mono">{reviewUrl}</p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleDownload}
            disabled={!qrReady}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-40"
          >
            Download PNG
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition"
          >
            Print
          </button>
        </div>
      </div>
    </div>
  );
}

function AnalyticsTab({ slug }: { slug: string }) {
  const [range, setRange] = useState(30);
  const [data, setData] = useState<null | {
    uniqueViews: number;
    happyClicks: number;
    unhappyClicks: number;
    googleRedirects: number;
    feedbackSubmissions: number;
  }>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/review-links/${slug}/analytics?range=${range}`)
      .then((r) => r.json())
      .then((result) => { if (!cancelled) setData(result); })
      .catch(() => {});
    return () => { cancelled = true; setData(null); };
  }, [slug, range]);

  return (
    <div className="pt-4 space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-slate-500">Period:</span>
        {[7, 30, 90].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setRange(d)}
            className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${range === d ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
          >
            {d}d
          </button>
        ))}
      </div>
      {data ? (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Views", value: data.uniqueViews },
            { label: "Happy", value: data.happyClicks },
            { label: "Unhappy", value: data.unhappyClicks },
            { label: "Google Redirects", value: data.googleRedirects },
            { label: "Feedback", value: data.feedbackSubmissions },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
              <p className="text-xl font-bold text-slate-900">{stat.value}</p>
              <p className="text-xs text-slate-500">{stat.label}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-400">Loading&hellip;</p>
      )}
    </div>
  );
}

const TABS = ["Links", "Email Sig", "QR Code", "Analytics"] as const;
type Tab = typeof TABS[number];

function LocationCard({
  location,
  appUrl,
  emailSnippet,
}: {
  location: LocationData;
  appUrl: string;
  emailSnippet: string;
}) {
  const [activeTab, setActiveTab] = useState<Tab>("Links");
  const qrUrl = `${appUrl.replace(/\/$/, "")}/review/${location.slug}?src=qr_counter`;

  return (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100">
        <p className="font-semibold text-slate-900">{location.name}</p>
        <p className="text-xs text-slate-500 mt-0.5 font-mono">{location.slug}</p>
        {!location.hasGoogleUrl && (
          <p className="text-xs text-amber-600 mt-1">No Google review URL configured &mdash; happy card disabled.</p>
        )}
      </div>
      <div className="flex border-b border-slate-100">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 text-xs font-semibold transition ${activeTab === tab ? "text-indigo-600 border-b-2 border-indigo-600" : "text-slate-500 hover:text-slate-700"}`}
          >
            {tab}
          </button>
        ))}
      </div>
      <div className="px-6 pb-6">
        {activeTab === "Links" && <LinksTab slug={location.slug} appUrl={appUrl} />}
        {activeTab === "Email Sig" && <EmailSigTab snippet={emailSnippet} />}
        {activeTab === "QR Code" && <QrTab reviewUrl={qrUrl} locationName={location.name} />}
        {activeTab === "Analytics" && <AnalyticsTab slug={location.slug} />}
      </div>
    </div>
  );
}

export function ReviewLinksClient({
  locations,
  appUrl,
  emailSnippets,
}: {
  locations: LocationData[];
  appUrl: string;
  emailSnippets: Record<string, string>;
}) {
  const [search, setSearch] = useState("");

  const filtered = locations.filter((l) =>
    l.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      {locations.length > 3 && (
        <input
          type="search"
          placeholder="Filter locations…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        />
      )}
      {filtered.length === 0 && (
        <p className="text-sm text-slate-500">No locations match your search.</p>
      )}
      {filtered.map((loc) => (
        <LocationCard
          key={loc.id}
          location={loc}
          appUrl={appUrl}
          emailSnippet={emailSnippets[loc.slug] ?? ""}
        />
      ))}
    </div>
  );
}
