"use client";

import { useState } from "react";
import { quickCreateContact } from "@/app/campaigns/actions";

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

interface RecipientPickerProps {
  initialContacts: ContactItem[];
  locations: LocationItem[];
  defaultLocationId: string | null;
}

export function RecipientPicker({ initialContacts, locations, defaultLocationId }: RecipientPickerProps) {
  const [selectedLocationId, setSelectedLocationId] = useState(defaultLocationId ?? locations[0]?.id ?? "");
  const [contacts, setContacts] = useState<ContactItem[]>(initialContacts);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showPopup, setShowPopup] = useState(false);
  const [quickName, setQuickName] = useState("");
  const [quickEmail, setQuickEmail] = useState("");
  const [quickPhone, setQuickPhone] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const visibleContacts = contacts.filter((c) => c.locationId === selectedLocationId);

  const toggleContact = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const closePopup = () => {
    setShowPopup(false);
    setAddError(null);
    setQuickName("");
    setQuickEmail("");
    setQuickPhone("");
  };

  const handleQuickAdd = async () => {
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
      fd.append("locationId", selectedLocationId);

      const contact = await quickCreateContact(fd);
      setContacts((prev) => [...prev, { ...contact, locationId: selectedLocationId }]);
      setSelectedIds((prev) => new Set([...prev, contact.id]));
      closePopup();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Failed to add contact.");
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <>
      {/* Setup */}
      <section className="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-[0_12px_32px_rgba(15,23,42,0.05)]">
        <h3 className="text-lg font-semibold text-slate-950">Setup</h3>
        <div className="mt-5 space-y-4">
          <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
            Sending location
            <select
              name="locationId"
              value={selectedLocationId}
              onChange={(e) => setSelectedLocationId(e.target.value)}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700 focus:border-indigo-300 focus:outline-none"
            >
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </label>

          <fieldset>
            <legend className="text-sm font-semibold text-slate-700">Delivery channels</legend>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              {[
                { value: "SMS", label: "SMS" },
                { value: "EMAIL", label: "Email" },
              ].map(({ value, label }) => (
                <label
                  key={value}
                  className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-medium text-slate-700 hover:border-indigo-200 hover:bg-indigo-50 has-[:checked]:border-indigo-300 has-[:checked]:bg-indigo-50 has-[:checked]:text-indigo-800"
                >
                  <input type="checkbox" name="channels" value={value} className="h-4 w-4 accent-indigo-600" />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      </section>

      {/* Recipients */}
      <section className="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-[0_12px_32px_rgba(15,23,42,0.05)]">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">Recipients</h3>
            <p className="mt-1 text-sm text-slate-500">Select the contacts to include in this send.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowPopup(true)}
            className="text-sm font-semibold text-indigo-600 hover:text-indigo-700"
          >
            + Add recipient
          </button>
        </div>

        {visibleContacts.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
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
          <div className="mt-4 max-h-96 space-y-2 overflow-y-auto pr-1">
            {visibleContacts.map((contact) => (
              <label
                key={contact.id}
                className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 p-4 hover:border-indigo-200 hover:bg-indigo-50 has-[:checked]:border-indigo-300 has-[:checked]:bg-indigo-50"
              >
                <input
                  type="checkbox"
                  name="contactIds"
                  value={contact.id}
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
      </section>

      {/* Quick-add popup */}
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
