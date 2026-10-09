import type { ReactNode } from "react";

import { cn } from "~/lib/utils";

type GloveFieldProps = {
  /** Id of the control inside; wires the label and the error message. */
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  /** Rendered under the control in the alert colour when set. */
  error?: string | null;
  className?: string;
  children: ReactNode;
};

/**
 * Label + control + hint/error wrapper for the checkout form. The control
 * sets its own `id` and `aria-invalid`; this only lays the pieces out.
 */
export function GloveField({
  id,
  label,
  required,
  hint,
  error,
  className,
  children,
}: GloveFieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label
        htmlFor={id}
        className="glove-body text-[14px] font-bold text-[var(--glove-ink)]"
      >
        {label}
        {required ? (
          <span aria-hidden="true" className="text-[var(--glove-alert)]">
            {" "}
            *
          </span>
        ) : null}
      </label>
      {children}
      {hint && !error ? (
        <p id={`${id}-hint`} className="text-[13px] text-[var(--glove-muted)]">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} role="alert" className="glove-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
