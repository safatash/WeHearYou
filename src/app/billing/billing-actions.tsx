"use client";

import { useState } from "react";
import { Icon } from "@/components/icon";
import type { PlanId } from "@/lib/plans";

async function post(url: string, body?: unknown): Promise<{ url?: string; upgraded?: boolean; planId?: string; error?: string }> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json().catch(() => ({ error: "Unexpected response." }));
}

export function SubscribeButton({
  planId,
  label,
  disabled,
  variant = "primary",
}: {
  planId: PlanId;
  label: string;
  disabled?: boolean;
  variant?: "primary" | "secondary";
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    setLoading(true);
    setError(null);
    const data = await post("/api/billing/create-checkout", { planId });
    if (data.url) {
      window.location.assign(data.url);
      return;
    }
    if (data.upgraded) {
      // Subscription was upgraded/downgraded in place — reload to show new plan
      window.location.assign("/billing?success=1");
      return;
    }
    setError(data.error ?? "Could not start checkout.");
    setLoading(false);
  }

  return (
    <div>
      <button
        type="button"
        onClick={go}
        disabled={disabled || loading}
        className={`btn btn-${variant}`}
        style={{ width: "100%", justifyContent: "center" }}
      >
        {loading ? "Please wait…" : label}
      </button>
      {error ? <p style={{ fontSize: 12, color: "var(--danger)", marginTop: 8 }}>{error}</p> : null}
    </div>
  );
}

export function ManageBillingButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    setLoading(true);
    setError(null);
    const data = await post("/api/billing/portal");
    if (data.url) {
      window.location.assign(data.url);
      return;
    }
    setError(data.error ?? "Could not open the billing portal.");
    setLoading(false);
  }

  return (
    <div>
      <button type="button" onClick={go} disabled={loading} className="btn btn-secondary">
        <Icon name="external" size={15} />
        {loading ? "Opening…" : "Manage subscription"}
      </button>
      {error ? <p style={{ fontSize: 12, color: "var(--danger)", marginTop: 8 }}>{error}</p> : null}
    </div>
  );
}
