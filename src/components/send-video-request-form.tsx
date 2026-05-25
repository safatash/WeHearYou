"use client";

import { useRef, useState, useTransition } from "react";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { sendVideoTestimonialRequest } from "@/app/video-testimonials/actions";

type Contact = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  locationId: string;
};

type Location = {
  id: string;
  name: string;
  city: string;
  state: string;
};

interface SendVideoRequestFormProps {
  locations: Location[];
  contacts: Contact[];
}

export function SendVideoRequestForm({ locations, contacts }: SendVideoRequestFormProps) {
  const [locationId, setLocationId] = useState(locations[0]?.id ?? "");
  const [contactQuery, setContactQuery] = useState("");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [channel, setChannel] = useState<"EMAIL" | "SMS">("EMAIL");
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [prompt, setPrompt] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedLocation = locations.find((l) => l.id === locationId);
  const defaultPrompt = selectedLocation ? `How has ${selectedLocation.name} helped you?` : "";

  const displayPrompt = prompt || defaultPrompt;

  const filteredContacts = contactQuery.length > 0
    ? contacts
        .filter((c) => c.locationId === locationId)
        .filter((c) =>
          c.name.toLowerCase().includes(contactQuery.toLowerCase()) ||
          (c.email ?? "").toLowerCase().includes(contactQuery.toLowerCase()) ||
          (c.phone ?? "").includes(contactQuery)
        )
        .slice(0, 6)
    : [];

  function selectContact(c: Contact) {
    setSelectedContact(c);
    setContactQuery(c.name);
    setRecipientName(c.name);
    setRecipientEmail(c.email ?? "");
    setRecipientPhone(c.phone ?? "");
    setShowDropdown(false);
  }

  function clearContact() {
    setSelectedContact(null);
    setContactQuery("");
    setRecipientName("");
    setRecipientEmail("");
    setRecipientPhone("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    const fd = new FormData();
    fd.append("locationId", locationId);
    fd.append("recipientName", selectedContact ? selectedContact.name : recipientName);
    fd.append("recipientEmail", selectedContact ? (selectedContact.email ?? "") : recipientEmail);
    fd.append("recipientPhone", selectedContact ? (selectedContact.phone ?? "") : recipientPhone);
    fd.append("channel", channel);
    fd.append("prompt", displayPrompt);
    startTransition(async () => {
      try {
        await sendVideoTestimonialRequest(fd);
      } catch (err) {
        if (isRedirectError(err)) throw err;
        setErrorMessage(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  const effectiveName = selectedContact ? selectedContact.name : recipientName;
  const effectiveEmail = selectedContact ? (selectedContact.email ?? "") : recipientEmail;

  return (
    <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
      {/* Left: compose form */}
      <form onSubmit={handleSubmit} className="grid gap-4">
        {/* Location */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-600">Location</label>
          <select
            value={locationId}
            onChange={(e) => { setLocationId(e.target.value); clearContact(); }}
            required
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          >
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>{loc.name} — {loc.city}, {loc.state}</option>
            ))}
          </select>
        </div>

        {/* Contact search */}
        <div className="flex flex-col gap-1 relative">
          <label className="text-xs font-semibold text-slate-600">Contact</label>
          <div className={`flex items-center rounded-xl border px-3 py-2 text-sm ${selectedContact ? "border-indigo-400 ring-2 ring-indigo-100" : "border-slate-200"}`}>
            <input
              value={contactQuery}
              onChange={(e) => {
                setContactQuery(e.target.value);
                if (selectedContact) clearContact();
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
              placeholder="Search by name, email, or phone…"
              className="flex-1 bg-transparent outline-none text-slate-900 placeholder:text-slate-400"
            />
            {selectedContact && (
              <span className="ml-2 text-xs font-semibold text-indigo-600 flex-shrink-0">from contacts ✓</span>
            )}
          </div>
          {showDropdown && filteredContacts.length > 0 && (
            <div ref={dropdownRef} className="absolute top-full left-0 right-0 z-10 mt-1 rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
              {filteredContacts.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onMouseDown={() => selectContact(c)}
                  className="flex w-full items-center justify-between px-4 py-2.5 text-sm hover:bg-slate-50 text-left"
                >
                  <span className="font-medium text-slate-900">{c.name}</span>
                  <span className="text-slate-400 text-xs">{c.email ?? c.phone}</span>
                </button>
              ))}
            </div>
          )}
          {!selectedContact && (
            <p className="text-xs text-slate-400">Or enter manually below if not in contacts</p>
          )}
        </div>

        {/* Manual entry (shown when no contact selected) */}
        {!selectedContact && (
          <div className="grid gap-3 sm:grid-cols-3 bg-slate-50 rounded-xl p-3 border border-slate-100">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500">Name</label>
              <input
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                required
                placeholder="Jane Smith"
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus:border-indigo-400 focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500">Email</label>
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="jane@example.com"
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus:border-indigo-400 focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500">Phone</label>
              <input
                type="tel"
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value)}
                placeholder="+17031234567"
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus:border-indigo-400 focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* Channel toggle */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-600">Channel</label>
          <div className="flex gap-2">
            {(["EMAIL", "SMS"] as const).map((ch) => (
              <button
                key={ch}
                type="button"
                onClick={() => setChannel(ch)}
                className={`flex-1 rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${
                  channel === ch
                    ? "border-indigo-400 bg-indigo-50 text-indigo-700"
                    : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                }`}
              >
                {ch === "EMAIL" ? "✉ Email" : "💬 SMS"}
              </button>
            ))}
          </div>
        </div>

        {/* Recording prompt */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-600">
            Recording prompt{" "}
            <span className="font-normal text-slate-400">(shown to customer while recording)</span>
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={defaultPrompt}
            rows={2}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 resize-none"
          />
          <p className="text-xs text-slate-400">Keep it open-ended. Defaults to &ldquo;{defaultPrompt}&rdquo; if left blank.</p>
        </div>

        {errorMessage && <p className="text-sm text-rose-600">{errorMessage}</p>}

        <button
          type="submit"
          disabled={isPending}
          className="rounded-2xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {isPending ? "Sending…" : "Send Video Request 🎥"}
        </button>
      </form>

      {/* Right: live preview */}
      <div className="hidden lg:block">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
          {channel === "EMAIL" ? "Email preview" : "SMS preview"} — what {effectiveName || "your customer"} receives
        </p>
        {channel === "EMAIL" ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-700 space-y-3 shadow-sm">
            <div className="border-b border-slate-100 pb-3 text-xs text-slate-400 space-y-0.5">
              <div>From: {selectedLocation?.name ?? "Your location"} via WeHearYou</div>
              {effectiveEmail && <div>To: {effectiveEmail}</div>}
              <div className="font-semibold text-slate-600 mt-1">
                {effectiveName ? `${effectiveName}, can you share a quick video?` : "Share a quick video about your experience"}
              </div>
            </div>
            <p className="text-xs leading-relaxed text-slate-600">
              Hi {effectiveName || "there"},<br /><br />
              Thank you for being a customer of {selectedLocation?.name ?? "ours"}. We&apos;d love to hear your experience in your own words — would you be willing to record a short 90-second video?
            </p>
            {displayPrompt && (
              <div className="border-l-4 border-indigo-500 bg-indigo-50 px-3 py-2 text-xs italic text-slate-600 rounded-r-lg">
                &ldquo;{displayPrompt}&rdquo;
              </div>
            )}
            <div className="rounded-lg bg-indigo-600 py-2.5 text-center text-xs font-bold text-white">
              Record My Video →
            </div>
            <p className="text-center text-xs text-slate-400">Nothing to download or install. Takes about 90 seconds.</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
            <div className="inline-block rounded-2xl rounded-tl-sm bg-white border border-slate-200 px-4 py-3 text-sm text-slate-800 shadow-sm max-w-xs">
              Hi {effectiveName || "there"}, {selectedLocation?.name ?? "we"}&apos;d love a short video testimonial from you!{displayPrompt ? ` "${displayPrompt}"` : ""} Record here (90 sec): [link]
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
