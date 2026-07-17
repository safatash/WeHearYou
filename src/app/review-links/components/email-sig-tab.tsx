"use client";

import { useState } from "react";

interface EmailSigTabProps {
  url: string;
  onCopy: (id: string, text: string) => void;
  copied: Record<string, boolean>;
}

type EmailStyle = "button" | "text" | "minimal";

function htmlEscape(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function generateEmailSignatureHTML(url: string, style: EmailStyle): string {
  const safeUrl = htmlEscape(url);
  if (style === "button") {
    return `<table cellpadding="0" cellspacing="0" border="0"><tr><td><a href="${safeUrl}" style="display:inline-block; background-color:#4f46e5; color:white; padding:10px 20px; border-radius:6px; text-decoration:none; font-weight:600; font-size:14px;">Share Your Feedback</a></td></tr></table>`;
  } else if (style === "text") {
    return `<p style="margin:0; font-size:14px; color:#333;">Have feedback? <a href="${safeUrl}" style="color:#4f46e5; text-decoration:underline;">Click here to share</a></p>`;
  } else {
    // minimal
    return `<a href="${safeUrl}" style="color:#4f46e5; text-decoration:underline; font-size:13px;">Share Feedback</a>`;
  }
}

export function EmailSigTab({
  url,
  onCopy,
  copied,
}: EmailSigTabProps) {
  const [style, setStyle] = useState<EmailStyle>("button");
  const html = generateEmailSignatureHTML(url, style);

  const styles: { value: EmailStyle; label: string }[] = [
    { value: "button", label: "Button CTA" },
    { value: "text", label: "Text link" },
    { value: "minimal", label: "Minimal" },
  ];

  return (
    <div className="pt-4 space-y-4">
      {/* Preview section */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mb-2">
          Preview
        </p>
        <div className="flex gap-2 mb-4">
          {styles.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => setStyle(s.value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                style === s.value
                  ? "bg-teal-600 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div
          className="rounded-xl border border-slate-200 bg-white p-4 font-sans text-sm"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>

      {/* Copy HTML section */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mb-2">
          Copy HTML
        </p>
        <div className="relative">
          <pre className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 whitespace-pre-wrap break-words">
            {html}
          </pre>
          <div className="absolute top-2 right-2">
            <button
              type="button"
              onClick={() => onCopy("email-sig-html", html)}
              className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 transition whitespace-nowrap"
            >
              {copied["email-sig-html"] ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
      </div>

      {/* Install guide placeholder */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mb-2">
          Next steps
        </p>
        <button
          type="button"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition"
        >
          View install guide
        </button>
      </div>

      {/* Tracked URL display */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mb-2">
          Tracked URL
        </p>
        <div className="flex items-center gap-2">
          <input
            readOnly
            value={url}
            className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono text-slate-600"
          />
          <button
            type="button"
            onClick={() => onCopy("email-sig-url", url)}
            className="shrink-0 rounded-lg bg-teal-600 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-700 transition whitespace-nowrap"
          >
            {copied["email-sig-url"] ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>
    </div>
  );
}
