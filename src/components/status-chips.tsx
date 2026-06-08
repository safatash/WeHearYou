type TestimonialForChips = {
  videoUrl: string | null;
  status: string;
  caption: string | null;
  thumbnailSource: string;
};

type Chip = { label: string; className: string };

export function computeStatusChips(vt: TestimonialForChips): Chip[] {
  const chips: Chip[] = [];

  if (!vt.videoUrl) {
    chips.push({ label: "Awaiting Video", className: "bg-slate-100 text-slate-500" });
    return chips;
  }

  if (vt.status === "APPROVED") {
    chips.push({ label: "Published", className: "bg-emerald-50 text-emerald-700" });
  } else if (vt.status === "REJECTED") {
    chips.push({ label: "Rejected", className: "bg-rose-50 text-rose-700" });
  } else {
    // PENDING with video
    if (vt.caption) {
      chips.push({ label: "Ready to Publish", className: "bg-teal-50 text-teal-700" });
    } else {
      chips.push({ label: "Pending Review", className: "bg-amber-50 text-amber-700" });
      chips.push({ label: "Needs Caption", className: "bg-orange-50 text-orange-700" });
    }
  }

  // Thumbnail source chip
  if (vt.thumbnailSource === "CUSTOM") {
    chips.push({ label: "Custom Thumbnail", className: "bg-indigo-50 text-indigo-600" });
  } else if (vt.thumbnailSource === "CAPTURED") {
    chips.push({ label: "Captured Frame", className: "bg-blue-50 text-blue-600" });
  } else if (vt.videoUrl) {
    chips.push({ label: "Auto Thumbnail", className: "bg-slate-50 text-slate-400" });
  }

  return chips;
}

export function StatusChips({ vt }: { vt: TestimonialForChips }) {
  const chips = computeStatusChips(vt);
  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((chip) => (
        <span
          key={chip.label}
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${chip.className}`}
        >
          {chip.label}
        </span>
      ))}
    </div>
  );
}
