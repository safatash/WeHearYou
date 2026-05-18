"use client";

import { useState } from "react";
import { addStep, deleteStep, deleteAutomation } from "@/app/automation/actions";

export function AddStepForm({ automationId }: { automationId: string }) {
  const [stepType, setStepType] = useState("");

  return (
    <form action={addStep} className="mt-5 space-y-4">
      <input type="hidden" name="automationId" value={automationId} />

      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700">Step Type</label>
        <select
          name="stepType"
          required
          value={stepType}
          onChange={(e) => setStepType(e.target.value)}
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        >
          <option value="">Select step type...</option>
          <option value="DELAY">Delay</option>
          <option value="SEND_REQUEST">Send Review Request</option>
          <option value="TAG_CONTACT">Tag Contact</option>
          <option value="NOTIFY_TEAM">Notify Team</option>
          <option value="WEBHOOK">Webhook</option>
        </select>
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700">Step Title</label>
        <input
          name="title"
          type="text"
          required
          placeholder="e.g. Wait 24 hours, Send email request..."
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700">Description (optional)</label>
        <input
          name="description"
          type="text"
          placeholder="Brief description of this step..."
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        />
      </div>

      {stepType === "DELAY" && (
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <label className="mb-2 block text-sm font-semibold text-slate-700">Delay (hours)</label>
          <input
            name="delayHours"
            type="number"
            min="0"
            step="0.5"
            placeholder="e.g. 24"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>
      )}

      {stepType === "SEND_REQUEST" && (
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
          <p className="text-sm text-indigo-700">
            Review request will be sent using the email subject, message, and destination configured in each location's <strong>Funnel Settings</strong>.
          </p>
        </div>
      )}

      {stepType === "NOTIFY_TEAM" && (
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <label className="mb-2 block text-sm font-semibold text-slate-700">Notify Email</label>
          <input
            name="notifyEmail"
            type="email"
            placeholder="team@example.com"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>
      )}

      {stepType === "WEBHOOK" && (
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <label className="mb-2 block text-sm font-semibold text-slate-700">Webhook URL</label>
          <input
            name="webhookUrl"
            type="url"
            placeholder="https://..."
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>
      )}

      <button
        type="submit"
        className="rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
      >
        Add Step
      </button>
    </form>
  );
}

export function DeleteStepButton({ stepId, automationId }: { stepId: string; automationId: string }) {
  return (
    <form
      action={deleteStep}
      onSubmit={(e) => {
        if (!confirm("Delete this step?")) e.preventDefault();
      }}
    >
      <input type="hidden" name="stepId" value={stepId} />
      <input type="hidden" name="automationId" value={automationId} />
      <button type="submit" className="rounded-xl px-2 py-1 text-xs text-slate-400 hover:bg-red-50 hover:text-red-600 transition">
        ✕
      </button>
    </form>
  );
}

export function DeleteAutomationButton({ automationId }: { automationId: string }) {
  return (
    <form
      action={deleteAutomation}
      onSubmit={(e) => {
        if (!confirm("Delete this automation and all its steps? This cannot be undone.")) e.preventDefault();
      }}
    >
      <input type="hidden" name="automationId" value={automationId} />
      <button type="submit" className="rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-600 hover:bg-red-100 transition">
        Delete Automation
      </button>
    </form>
  );
}
