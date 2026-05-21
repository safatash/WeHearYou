"use client";

import { useState } from "react";
import { createReviewWidget } from "@/app/widgets/actions";

interface CreateWidgetModalProps {
  locations: Array<{
    id: string;
    name: string;
    canCreateWidget: boolean;
    guidance: string;
    reviewCount: number;
  }>;
}

export function CreateWidgetModal({ locations }: CreateWidgetModalProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const eligibleLocations = locations.filter((loc) => loc.canCreateWidget);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    try {
      await createReviewWidget(formData);
      setOpen(false);
      e.currentTarget.reset();
    } catch (error) {
      console.error("Failed to create widget:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 px-5 py-3 text-sm font-semibold text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
      >
        <span className="mr-2">✨</span>
        Create New Widget
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-2xl font-bold text-slate-950">Create a Widget</h2>
          <p className="mt-1 text-sm text-slate-600">
            Add a new embeddable review widget to showcase your customer feedback.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-900">Widget name</label>
            <input
              type="text"
              name="name"
              placeholder="e.g., Main reviews widget"
              disabled={isLoading}
              required
              className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm text-slate-900 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/10"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-900">Select location</label>
            <select
              name="locationId"
              disabled={isLoading}
              required
              className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/10"
            >
              <option value="">Choose a location...</option>
              {eligibleLocations.length > 0 ? (
                eligibleLocations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name} ({location.reviewCount} reviews)
                  </option>
                ))
              ) : (
                <option disabled>No eligible locations available</option>
              )}
            </select>
          </div>

          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={isLoading}
              className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {isLoading ? "Creating..." : "Create Widget"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
