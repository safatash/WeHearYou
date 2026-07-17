import { ReactNode } from "react";

interface RCardProps {
  step: number;
  title: string;
  sub?: string;
  right?: ReactNode;
  children: ReactNode;
}

export function RCard({ step, title, sub, right, children }: RCardProps) {
  return (
    <div className="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-[0_12px_32px_rgba(15,23,42,0.05)]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-4">
          {/* Step Circle */}
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-indigo-600 text-base font-semibold text-white">
            {step}
          </div>
          {/* Title and Subtitle */}
          <div>
            <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
            {sub && <p className="mt-1 text-sm text-slate-500">{sub}</p>}
          </div>
        </div>
        {/* Right Slot */}
        {right && <div className="flex-shrink-0">{right}</div>}
      </div>
      {/* Children */}
      <div className="mt-5 space-y-4">{children}</div>
    </div>
  );
}
