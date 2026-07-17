"use client";

import { useState } from "react";
import { SourceCard } from "./components/source-card";
import { QRGenerator } from "./components/qr-generator";
import { EmailSigTab } from "./components/email-sig-tab";
import { AnalyticsTab } from "./components/analytics-tab";
import { FunnelFlow } from "./components/funnel-flow";

type LocationData = {
  id: string;
  name: string;
  slug: string;
  reviewUrl: string;
  hasGoogleUrl: boolean;
};

const TABS = ["Links", "Email Sig", "QR Code", "Analytics"] as const;
type Tab = (typeof TABS)[number];

import type { IconName } from "@/components/icon";

type SourceDef = {
  id: string;
  label: string;
  icon: IconName;
  color: string;
  param: string;
  tip: string;
};

function buildSources(): SourceDef[] {
  return [
    {
      id: "email-sig",
      label: "Email Signature",
      icon: "mail",
      color: "bg-teal-500",
      param: "src=email_signature&medium=email",
      tip: "Embed in your team's email footer to collect passive feedback with every message.",
    },
    {
      id: "qr-print",
      label: "QR / Print",
      icon: "grid",
      color: "bg-indigo-500",
      param: "src=qr_counter&medium=print",
      tip: "Print on receipts, table cards, or counter stands for in-person feedback.",
    },
    {
      id: "invoice",
      label: "Invoice",
      icon: "fileText",
      color: "bg-amber-500",
      param: "src=invoice&medium=print",
      tip: "Add to invoices and billing emails to follow up while the experience is fresh.",
    },
    {
      id: "website",
      label: "Website",
      icon: "external",
      color: "bg-blue-500",
      param: "src=website&medium=digital",
      tip: "Link from your site's footer or 'Thank you' page to turn visitors into reviewers.",
    },
    {
      id: "sms",
      label: "SMS",
      icon: "phone",
      color: "bg-green-500",
      param: "src=sms&medium=sms",
      tip: "Send via text campaigns for the highest open rate of any channel.",
    },
    {
      id: "direct",
      label: "Direct",
      icon: "arrowRight",
      color: "bg-slate-500",
      param: "src=direct&medium=direct",
      tip: "Share manually or use as the default link when no tracking is needed.",
    },
  ];
}

function LocationCard({
  location,
  appUrl,
}: {
  location: LocationData;
  appUrl: string;
}) {
  const [activeTab, setActiveTab] = useState<Tab>("Links");
  const [copied, setCopied] = useState<Record<string, boolean>>({});

  const base = appUrl.replace(/\/$/, "");
  const defaultUrl = `${base}/review/${location.slug}`;
  const qrUrl = `${base}/review/${location.slug}?src=qr_counter&medium=print`;
  const emailUrl = `${base}/review/${location.slug}?src=email_signature&medium=email`;
  const sources = buildSources();

  async function handleCopy(id: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied((prev) => ({ ...prev, [id]: true }));
      setTimeout(() => setCopied((prev) => ({ ...prev, [id]: false })), 1800);
    } catch {
      // clipboard write failed — do not show "Copied!"
    }
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Card header */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold text-slate-900 text-base">{location.name}</p>
          <p className="text-xs text-slate-400 mt-0.5 font-mono">{location.slug}</p>
          {!location.hasGoogleUrl && (
            <p className="text-xs text-amber-600 mt-1">
              No Google review URL configured — happy card disabled.
            </p>
          )}
        </div>
        <span className="mt-0.5 shrink-0 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
          Active
        </span>
      </div>

      {/* Tab bar */}
      <div className="flex overflow-x-auto border-b border-slate-100 scrollbar-none">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`shrink-0 px-5 py-3 text-xs font-semibold transition whitespace-nowrap ${
              activeTab === tab
                ? "text-indigo-600 border-b-2 border-indigo-600 -mb-px"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="px-6 pb-6">
        {activeTab === "Links" && (
          <div className="space-y-6 pt-5">
            {/* Default link */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mb-2">
                Default link
              </p>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={defaultUrl}
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono text-slate-700 min-w-0"
                />
                <button
                  type="button"
                  onClick={() => handleCopy("default", defaultUrl)}
                  className="shrink-0 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition whitespace-nowrap"
                >
                  {copied["default"] ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>

            {/* Source-tracked links */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mb-3">
                Source-tracked links
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {sources.map((src) => {
                  const url = `${base}/review/${location.slug}?${src.param}`;
                  return (
                    <SourceCard
                      key={src.id}
                      icon={src.icon}
                      label={src.label}
                      color={src.color}
                      url={url}
                      views={null}
                      happy={null}
                      tip={src.tip}
                      onCopy={handleCopy}
                      copied={copied}
                    />
                  );
                })}
              </div>
            </div>

            {/* Funnel explainer */}
            <FunnelFlow />
          </div>
        )}

        {activeTab === "Email Sig" && (
          <EmailSigTab url={emailUrl} onCopy={handleCopy} copied={copied} />
        )}

        {activeTab === "QR Code" && (
          <div className="pt-5">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Left: QR generator */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mb-3">
                  QR Code
                </p>
                <QRGenerator url={qrUrl} size={200} />
              </div>

              {/* Right: Best uses + tracked URL */}
              <div className="space-y-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mb-3">
                    Best uses
                  </p>
                  <ul className="space-y-2">
                    {[
                      "Print on receipts, table cards, or counter signs",
                      "Include in printed invoices or packaging inserts",
                    ].map((use) => (
                      <li key={use} className="flex items-start gap-2 text-sm text-slate-700">
                        <span className="mt-0.5 text-emerald-500 font-bold">✓</span>
                        {use}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mb-2">
                    Tracked URL
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      value={qrUrl}
                      className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono text-slate-600 min-w-0"
                    />
                    <button
                      type="button"
                      onClick={() => handleCopy("qr-url", qrUrl)}
                      className="shrink-0 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition whitespace-nowrap"
                    >
                      {copied["qr-url"] ? "Copied!" : "Copy"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "Analytics" && <AnalyticsTab slug={location.slug} />}
      </div>
    </div>
  );
}

export function ReviewLinksClient({
  locations,
  appUrl,
}: {
  locations: LocationData[];
  appUrl: string;
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
        <LocationCard key={loc.id} location={loc} appUrl={appUrl} />
      ))}
    </div>
  );
}
