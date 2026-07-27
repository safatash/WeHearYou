"use client";

import { useFormStatus } from "react-dom";

export function FormSubmitButton({
  idleLabel,
  pendingLabel,
  disabled = false,
  className,
  style,
}: {
  idleLabel: string;
  pendingLabel: string;
  disabled?: boolean;
  className: string;
  style?: React.CSSProperties;
}) {
  const { pending } = useFormStatus();
  const isDisabled = disabled || pending;

  return (
    <button type="submit" disabled={isDisabled} className={className} style={{ color: "inherit", ...style }}>
      {pending ? pendingLabel : idleLabel}
    </button>
  );
}
