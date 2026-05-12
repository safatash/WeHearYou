"use client";

import { useFormStatus } from "react-dom";

export function FormSubmitButton({
  idleLabel,
  pendingLabel,
  disabled = false,
  className,
}: {
  idleLabel: string;
  pendingLabel: string;
  disabled?: boolean;
  className: string;
}) {
  const { pending } = useFormStatus();
  const isDisabled = disabled || pending;

  return (
    <button type="submit" disabled={isDisabled} className={className} style={{ color: "inherit" }}>
      {pending ? pendingLabel : idleLabel}
    </button>
  );
}
