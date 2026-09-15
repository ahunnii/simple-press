import type { ComponentPropsWithRef, ReactElement, ReactNode } from "react";
import { cloneElement } from "react";

import { cn } from "~/lib/utils";

/**
 * OliveInput — the paper-faced text control.
 *
 * Composes the chrome's `olive-input` (paper ground, hairline-strong border
 * that clears 3:1, warms to white on hover, sage-bright border plus a
 * sage-tint ring on keyboard focus, error border and tint on `aria-invalid`).
 * Everything a native input accepts passes straight through, `ref` included.
 */
export function OliveInput({
  className,
  ...rest
}: ComponentPropsWithRef<"input">) {
  return <input className={cn("olive-input", className)} {...rest} />;
}

/**
 * OliveSelect — the same face with the template's own chevron baked into the
 * class, so no wrapper or icon layer is needed.
 */
export function OliveSelect({
  className,
  children,
  ...rest
}: ComponentPropsWithRef<"select">) {
  return (
    <select className={cn("olive-select", className)} {...rest}>
      {children}
    </select>
  );
}

/** OliveTextarea — the same face, 8rem tall, resizable vertically only. */
export function OliveTextarea({
  className,
  ...rest
}: ComponentPropsWithRef<"textarea">) {
  return <textarea className={cn("olive-textarea", className)} {...rest} />;
}

type OliveFieldProps = {
  /** Required: it becomes the control's `id` and the label's `htmlFor`. */
  id: string;
  label: string;
  /** Exactly one control — `OliveInput`, `OliveSelect`, `OliveTextarea`, or your own. */
  children: ReactElement<Record<string, unknown>>;
  /** Quiet helper line under the label. Wired into `aria-describedby`. */
  hint?: string;
  /** Names the problem. Sets `aria-invalid` and joins `aria-describedby`. */
  error?: string;
  /** Draws the marker and sets `aria-required` on the control. */
  required?: boolean;
  className?: string;
};

/**
 * OliveField — label, control, hint and error, wired together.
 *
 * The control is cloned with `id`, `aria-describedby`, `aria-invalid` and
 * `aria-required` so the three parts are actually connected rather than merely
 * adjacent — the failure that leaves a screen-reader user hearing "edit text"
 * and nothing else. Anything you set on the control yourself wins, so a
 * hand-wired case can still opt out.
 *
 * The error names the problem in the page's own words; it is a prop because
 * only the page knows what went wrong.
 */
export function OliveField({
  id,
  label,
  children,
  hint,
  error,
  required = false,
  className,
}: OliveFieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const described = [hintId, errorId].filter(
    (value): value is string => value !== undefined,
  );
  const describedBy = described.length > 0 ? described.join(" ") : undefined;

  const given = children.props;
  const control = cloneElement(children, {
    id: asAttr(given.id) ?? id,
    "aria-describedby": asAttr(given["aria-describedby"]) ?? describedBy,
    "aria-invalid": asAttr(given["aria-invalid"]) ?? (error ? true : undefined),
    "aria-required":
      asAttr(given["aria-required"]) ?? (required ? true : undefined),
  });

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="olive-label">
        {label}
        {required ? (
          <>
            <span aria-hidden="true" style={{ color: "var(--olive-leaf)" }}>
              {" *"}
            </span>
            <span className="sr-only"> (required)</span>
          </>
        ) : null}
      </label>

      {hint ? (
        <span id={hintId} className="olive-caption">
          {hint}
        </span>
      ) : null}

      {control}

      {error ? (
        <span
          id={errorId}
          className="text-[0.8125rem] leading-snug"
          style={{ color: "var(--olive-error)" }}
        >
          {error}
        </span>
      ) : null}
    </div>
  );
}

/** Wrap a group of fields so they share the form grid. */
export function OliveFieldRow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-4 sm:grid-cols-2", className)}>{children}</div>
  );
}

/**
 * Read a prop the caller may or may not have set. The child's props are
 * `unknown`-valued, so narrow to the shapes an ARIA attribute can legally
 * take before letting it win over the field's own wiring.
 */
function asAttr(value: unknown): string | boolean | undefined {
  return typeof value === "string" || typeof value === "boolean"
    ? value
    : undefined;
}
