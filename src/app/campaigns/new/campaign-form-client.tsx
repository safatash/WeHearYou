"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { createCampaign, quickCreateContact } from "@/app/campaigns/actions";
import { RCard } from "./components/rcard";
import { OptionCard } from "./components/option-card";
import { MessagePreview } from "./components/message-preview";
import { SendSummary } from "./components/send-summary";
import { RecipientPicker } from "./recipient-picker";

type ContactItem = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  locationId: string;
};

type LocationItem = {
  id: string;
  name: string;
};

interface CampaignFormClientProps {
  initialContacts: ContactItem[];
  locations: LocationItem[];
  defaultLocationId: string | null;
}

export function CampaignFormClient({
  initialContacts,
  locations,
  defaultLocationId,
}: CampaignFormClientProps) {
  // Form state
  const [name, setName] = useState("Manual review request");
  const [destination, setDestination] = useState<"REVIEW" | "VIDEO_TESTIMONIAL">("REVIEW");
  const [locationId, setLocationId] = useState(defaultLocationId ?? locations[0]?.id ?? "");
  const [channels, setChannels] = useState({ sms: false, email: true });
  const [emailSubject, setEmailSubject] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [recipients, setRecipients] = useState<ContactItem[]>([]);
  const [previewChannel, setPreviewChannel] = useState<"sms" | "email">("email");

  const [isPending, startTransition] = useTransition();

  // Adjust previewChannel if selected channel becomes unavailable
  useEffect(() => {
    if (previewChannel === "sms" && !channels.sms) {
      if (channels.email) setPreviewChannel("email");
    } else if (previewChannel === "email" && !channels.email) {
      if (channels.sms) setPreviewChannel("sms");
    }
  }, [channels, previewChannel]);

  // Filter recipients when locationId changes
  useEffect(() => {
    setRecipients((prev) => prev.filter((r) => r.locationId === locationId));
  }, [locationId]);

  const currentLocation = locations.find((l) => l.id === locationId);
  const sampleName = recipients[0]?.name.split(" ")[0] || "Alex";
  const anyChannel = channels.sms || channels.email;
  const canSend = anyChannel && recipients.length > 0;

  function toggleChannel(channel: "sms" | "email") {
    setChannels((prev) => ({ ...prev, [channel]: !prev[channel] }));
  }

  function insertToken(token: string) {
    setMessageBody((prev) => prev + token);
  }

  function handleRecipientsChange(updated: ContactItem[]) {
    setRecipients(updated);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(async () => {
      const fd = new FormData();
      fd.append("name", name);
      fd.append("destination", destination);
      fd.append("locationId", locationId);
      if (channels.sms) fd.append("channels", "SMS");
      if (channels.email) fd.append("channels", "EMAIL");
      if (emailSubject) fd.append("emailSubject", emailSubject);
      if (messageBody) fd.append("messageBody", messageBody);
      for (const r of recipients) {
        fd.append("contactIds", r.id);
      }
      await createCampaign(fd);
    });
  }

  const footerStatus = !anyChannel
    ? "Select a channel to continue..."
    : recipients.length === 0
    ? "Add at least one recipient to send..."
    : `Ready to send to ${recipients.length} recipient${recipients.length !== 1 ? "s" : ""}`;

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className="grid gap-6 lg:grid-cols-[1fr_340px] xl:grid-cols-[1fr_380px]">
        {/* Left pane: form steps */}
        <div className="space-y-4 pb-28">
          {/* Step 1: Campaign */}
          <RCard step={1} title="Campaign" sub="Name your campaign and choose the type.">
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Campaign Name
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. June Follow-up"
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700 focus:border-indigo-300 focus:outline-none"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <OptionCard
                icon="⭐"
                title="Review Request"
                desc="Ask customers to leave a star rating on Google or another platform."
                on={destination === "REVIEW"}
                onClick={() => setDestination("REVIEW")}
                kind="radio"
              />
              <OptionCard
                icon="🎥"
                title="Video Testimonial"
                desc="Invite customers to record a short video sharing their experience."
                on={destination === "VIDEO_TESTIMONIAL"}
                onClick={() => setDestination("VIDEO_TESTIMONIAL")}
                kind="radio"
              />
            </div>
          </RCard>

          {/* Step 2: Sending */}
          <RCard step={2} title="Sending" sub="Choose the location and delivery channels.">
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Sending location
              <select
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700 focus:border-indigo-300 focus:outline-none"
              >
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </label>

            <div>
              <p className="text-sm font-semibold text-slate-700">Delivery channels</p>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                <OptionCard
                  title="SMS"
                  desc="Send a text message to the recipient's phone number."
                  on={channels.sms}
                  onClick={() => toggleChannel("sms")}
                  kind="check"
                />
                <OptionCard
                  title="Email"
                  desc="Send an email to the recipient's email address."
                  on={channels.email}
                  onClick={() => toggleChannel("email")}
                  kind="check"
                />
              </div>
            </div>
          </RCard>

          {/* Step 3: Message */}
          <RCard
            step={3}
            title="Message"
            sub="Customize the message sent to recipients."
            right={
              channels.sms ? (
                <button
                  type="button"
                  onClick={() => setPreviewChannel(previewChannel === "sms" ? "email" : "sms")}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                >
                  Preview: {previewChannel.toUpperCase()}
                </button>
              ) : undefined
            }
          >
            {channels.sms && (
              <div className="space-y-2">
                <label className="grid gap-2 text-sm font-semibold text-slate-700">
                  SMS Message
                  <textarea
                    value={messageBody}
                    onChange={(e) => setMessageBody(e.target.value)}
                    placeholder="Hi {first}, we'd love to hear about your experience at {location}. Leave a review: {link}"
                    rows={3}
                    maxLength={480}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700 focus:border-indigo-300 focus:outline-none"
                  />
                </label>
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    {["{first}", "{location}", "{link}"].map((token) => (
                      <button
                        key={token}
                        type="button"
                        onClick={() => insertToken(token)}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-mono font-semibold text-slate-600 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                      >
                        {token}
                      </button>
                    ))}
                  </div>
                  <span className={`text-xs font-semibold ${messageBody.length > 160 ? "text-amber-600" : "text-slate-400"}`}>
                    {messageBody.length}/160
                  </span>
                </div>
              </div>
            )}

            {channels.email && (
              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                Email Subject
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder={`How was your experience with ${currentLocation?.name ?? "[Location]"}?`}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700 focus:border-indigo-300 focus:outline-none"
                />
                <span className="text-xs font-normal text-slate-500">
                  Leave blank to use the default subject line.
                </span>
              </label>
            )}

            {!channels.sms && !channels.email && (
              <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                Enable at least one delivery channel in Step 2 to configure the message.
              </p>
            )}
          </RCard>

          {/* Step 4: Recipients */}
          <RCard
            step={4}
            title="Recipients"
            sub="Select the contacts to include in this campaign."
            right={
              recipients.length > 0 ? (
                <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700">
                  {recipients.length} selected
                </span>
              ) : undefined
            }
          >
            <RecipientPickerControlled
              initialContacts={initialContacts}
              locations={locations}
              locationId={locationId}
              selectedRecipients={recipients}
              onRecipientsChange={handleRecipientsChange}
            />
          </RCard>
        </div>

        {/* Right pane: sticky preview + summary */}
        <div className="hidden lg:block">
          <div className="sticky space-y-4 pb-28" style={{ top: "var(--gutter, 1.5rem)" }}>
            {/* Live Preview */}
            <div className="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-[0_12px_32px_rgba(15,23,42,0.05)]">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-base font-semibold text-slate-950">Live Preview</h3>
                {channels.sms && channels.email && (
                  <div className="flex rounded-full border border-slate-200 bg-slate-50 p-0.5">
                    <button
                      type="button"
                      onClick={() => setPreviewChannel("sms")}
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${previewChannel === "sms" ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-slate-700"}`}
                    >
                      SMS
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewChannel("email")}
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${previewChannel === "email" ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-slate-700"}`}
                    >
                      Email
                    </button>
                  </div>
                )}
              </div>
              <MessagePreview
                type={destination === "REVIEW" ? "review" : "video"}
                channel={previewChannel}
                subject={emailSubject}
                sms={messageBody}
                sample={sampleName}
                location={currentLocation?.name ?? "Your Business"}
              />
            </div>

            {/* Send Summary */}
            <SendSummary
              type={destination === "REVIEW" ? "Review Request" : "Video Testimonial"}
              location={currentLocation?.name ?? "—"}
              channels={channels}
              recipients={recipients.length}
            />
          </div>
        </div>
      </div>

      {/* Sticky footer action bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <p className={`text-sm font-medium ${canSend ? "text-slate-600" : "text-slate-400"}`}>
            {footerStatus}
          </p>
          <div className="flex shrink-0 gap-3">
            <Link
              href="/campaigns"
              className="rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:border-slate-300"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={!canSend || isPending}
              className="rounded-2xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isPending ? "Sending…" : "Send review request"}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

// ---- Controlled RecipientPicker wrapper ----
// The original RecipientPicker manages its own selection state. We wrap it
// to expose selection changes upward so the parent can track recipients.

interface RecipientPickerControlledProps {
  initialContacts: ContactItem[];
  locations: LocationItem[];
  locationId: string;
  selectedRecipients: ContactItem[];
  onRecipientsChange: (recipients: ContactItem[]) => void;
}

function RecipientPickerControlled({
  initialContacts,
  locations,
  locationId,
  selectedRecipients,
  onRecipientsChange,
}: RecipientPickerControlledProps) {
  const [contacts, setContacts] = useState<ContactItem[]>(initialContacts);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(selectedRecipients.map((r) => r.id)));
  const [showPopup, setShowPopup] = useState(false);
  const [quickName, setQuickName] = useState("");
  const [quickEmail, setQuickEmail] = useState("");
  const [quickPhone, setQuickPhone] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const visibleContacts = contacts.filter((c) => c.locationId === locationId);

  function toggleContact(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
    const selected = contacts.filter((c) => next.has(c.id));
    onRecipientsChange(selected);
  }

  function closePopup() {
    setShowPopup(false);
    setAddError(null);
    setQuickName("");
    setQuickEmail("");
    setQuickPhone("");
  }

  async function handleQuickAdd() {
    setAddError(null);
    if (!quickName.trim()) {
      setAddError("Name is required.");
      return;
    }
    if (!quickEmail.trim() && !quickPhone.trim()) {
      setAddError("Email or phone is required.");
      return;
    }
    setIsAdding(true);
    try {
      const fd = new FormData();
      fd.append("name", quickName.trim());
      fd.append("email", quickEmail.trim());
      fd.append("phone", quickPhone.trim());
      fd.append("locationId", locationId);
      const contact = await quickCreateContact(fd);
      const newContact = { ...contact, locationId };
      setContacts((prev) => [...prev, newContact]);
      const next = new Set(selectedIds);
      next.add(contact.id);
      setSelectedIds(next);
      onRecipientsChange(contacts.filter((c) => next.has(c.id)).concat(newContact));
      closePopup();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Failed to add contact.");
    } finally {
      setIsAdding(false);
    }
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {visibleContacts.length === 0 ? "No contacts for this location." : `${visibleContacts.length} contact${visibleContacts.length !== 1 ? "s" : ""} available`}
        </p>
        <button
          type="button"
          onClick={() => setShowPopup(true)}
          className="text-sm font-semibold text-indigo-600 hover:text-indigo-700"
        >
          + Add recipient
        </button>
      </div>

      {visibleContacts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
          No contacts for this location.{" "}
          <button
            type="button"
            onClick={() => setShowPopup(true)}
            className="font-semibold text-indigo-600 hover:text-indigo-700"
          >
            Add one →
          </button>
        </div>
      ) : (
        <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
          {visibleContacts.map((contact) => (
            <label
              key={contact.id}
              className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 p-4 hover:border-indigo-200 hover:bg-indigo-50 has-[:checked]:border-indigo-300 has-[:checked]:bg-indigo-50"
            >
              <input
                type="checkbox"
                checked={selectedIds.has(contact.id)}
                onChange={() => toggleContact(contact.id)}
                className="mt-0.5 h-4 w-4 accent-indigo-600"
              />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-900">{contact.name}</p>
                <p className="mt-0.5 truncate text-xs text-slate-500">
                  {[contact.email, contact.phone].filter(Boolean).join(" · ") || "No contact info"}
                </p>
              </div>
            </label>
          ))}
        </div>
      )}

      {showPopup && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          onClick={(e) => { if (e.target === e.currentTarget) closePopup(); }}
        >
          <div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-950">Add recipient</h3>
              <button type="button" onClick={closePopup} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <input
                autoFocus
                value={quickName}
                onChange={(e) => setQuickName(e.target.value)}
                placeholder="Full name *"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-indigo-300 focus:outline-none"
              />
              <input
                type="email"
                value={quickEmail}
                onChange={(e) => setQuickEmail(e.target.value)}
                placeholder="Email"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-indigo-300 focus:outline-none"
              />
              <input
                type="tel"
                value={quickPhone}
                onChange={(e) => setQuickPhone(e.target.value)}
                placeholder="Phone"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-indigo-300 focus:outline-none"
              />
              {addError ? (
                <p className="text-sm text-red-600">{addError}</p>
              ) : (
                <p className="text-xs text-slate-400">Email or phone is required.</p>
              )}
            </div>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={closePopup}
                className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:border-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleQuickAdd}
                disabled={isAdding}
                className="flex-1 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {isAdding ? "Adding…" : "Add & select"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
