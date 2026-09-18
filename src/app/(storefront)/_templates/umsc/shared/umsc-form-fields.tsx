import type {
  HTMLAttributes,
  InputHTMLAttributes,
  LabelHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { forwardRef } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "~/lib/utils";

/**
 * Shared, token-only umsc form primitives — promoted from the two local
 * field files each page agent built ad hoc (`contact/umsc-contact-fields.tsx`
 * and `cart-checkout/umsc-checkout-inputs.tsx`) once design.md's shared
 * component inventory (`UmscInput` / `UmscTextarea` / `UmscSelect` /
 * `UmscTogglePills`) was confirmed as never having shipped in chrome.
 * Superset of both local files' APIs so contact/ and cart-checkout/ can
 * point at these without a behaviour change. Token-only styling (no hex
 * literals), scoped to the `.umsc` root class which already supplies the
 * purple focus ring (`.umsc *:focus-visible`) and gold-ink caret
 * (`.umsc { caret-color: var(--umsc-gold-ink) }`) from globals.css — this
 * file adds `caret-[var(--umsc-gold-ink)]` directly on each field too, so
 * the caret is correct even if a field is ever rendered outside `.umsc`.
 */

type FieldShape = "rounded" | "square";

/**
 * `rounded` matches the contact form's original field treatment
 * (`rounded-[var(--radius)]`, roomier padding). `square` matches the
 * checkout form's boxy fieldset aesthetic (flush corners, fixed 44px
 * height) — same shape its `SelectTrigger`s and card shells already use.
 */
function fieldClass(shape: FieldShape) {
  return cn(
    "w-full min-h-11 border border-[var(--umsc-line)] bg-[var(--umsc-white)] umsc-sans text-[15px] text-[var(--umsc-ink)] outline-none transition-colors placeholder:text-[var(--umsc-muted)] caret-[var(--umsc-gold-ink)] aria-[invalid=true]:border-[var(--umsc-error)]",
    shape === "rounded" ? "rounded-[var(--radius)] px-4 py-2.5" : "px-3.5",
  );
}

/**
 * Square-shaped field class as a plain string, for non-native controls that
 * must match the field look visually (checkout's shadcn `SelectTrigger` for
 * state/country). Mirrors what `cart-checkout/umsc-checkout-inputs.tsx`
 * exported as `umscInputClass`.
 */
export const umscInputClass = fieldClass("square");

type UmscLabelProps = LabelHTMLAttributes<HTMLLabelElement> & {
  children: ReactNode;
  /** Appends a muted " (required)" suffix — the contact form's convention. */
  required?: boolean;
  /**
   * `"label"` (default) renders a real `<label>` — pass `htmlFor` to
   * associate it explicitly. `"span"` renders inline text only, for the
   * common pattern of a native `<label>` already wrapping the field (no
   * `htmlFor` needed, and a nested `<label>` would be invalid HTML).
   */
  as?: "label" | "span";
};

export function UmscLabel({
  children,
  required,
  as = "label",
  className,
  ...rest
}: UmscLabelProps) {
  const content = (
    <>
      {children}
      {required && (
        <span className="text-[var(--umsc-muted)]"> (required)</span>
      )}
    </>
  );

  if (as === "span") {
    const { htmlFor, ...spanRest } = rest;
    void htmlFor;
    return (
      <span
        className={cn(
          "umsc-sans text-[13px] font-medium text-[var(--umsc-ink)]",
          className,
        )}
        {...(spanRest as HTMLAttributes<HTMLSpanElement>)}
      >
        {content}
      </span>
    );
  }

  return (
    <label
      className={cn(
        "umsc-sans mb-1.5 block text-[13px] font-medium text-[var(--umsc-muted)]",
        className,
      )}
      {...rest}
    >
      {content}
    </label>
  );
}

export const UmscInput = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { shape?: FieldShape }
>(({ className, shape = "rounded", ...rest }, ref) => {
  // Tabular numerals per design.md "Typography → Numerals" — only for
  // fields that actually hold numerals, not every text input.
  const isNumeric =
    rest.type === "number" ||
    rest.inputMode === "numeric" ||
    rest.inputMode === "decimal";
  return (
    <input
      ref={ref}
      className={cn(fieldClass(shape), isNumeric && "umsc-tabular", className)}
      {...rest}
    />
  );
});
UmscInput.displayName = "UmscInput";

export const UmscTextarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & { shape?: FieldShape }
>(({ className, shape = "rounded", ...rest }, ref) => (
  <textarea
    ref={ref}
    className={cn(fieldClass(shape), "resize-y", className)}
    {...rest}
  />
));
UmscTextarea.displayName = "UmscTextarea";

export const UmscSelect = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement> & { shape?: FieldShape }
>(({ className, shape = "rounded", children, ...rest }, ref) => (
  <span className="relative block w-full">
    <select
      ref={ref}
      className={cn(
        fieldClass(shape),
        "cursor-pointer appearance-none bg-[var(--umsc-white)] pr-10",
        className,
      )}
      {...rest}
    >
      {children}
    </select>
    <ChevronDown
      aria-hidden="true"
      className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-[var(--umsc-gold-ink)]"
    />
  </span>
));
UmscSelect.displayName = "UmscSelect";

export function UmscFieldHint({
  children,
  id,
  className,
}: {
  children: ReactNode;
  id?: string;
  className?: string;
}) {
  return (
    <p
      id={id}
      className={cn(
        "umsc-sans text-[12px] leading-[1.4] text-[var(--umsc-muted)]",
        className,
      )}
    >
      {children}
    </p>
  );
}

export function UmscFieldError({
  children,
  id,
  className,
}: {
  children: ReactNode;
  id?: string;
  className?: string;
}) {
  return (
    <p
      role="alert"
      id={id}
      className={cn(
        "umsc-sans text-[12px] leading-[1.4] text-[var(--umsc-error)]",
        className,
      )}
    >
      {children}
    </p>
  );
}

export type UmscTogglePillOption<T extends string> = {
  value: T;
  /** Static content, or a render function fed the option's pressed state. */
  label: ReactNode | ((active: boolean) => ReactNode);
};

type UmscTogglePillsProps<T extends string> = {
  options: UmscTogglePillOption<T>[];
  value: T;
  onChange: (value: T) => void;
  "aria-label": string;
  className?: string;
  /** Per-pill class overrides (layout only — active-state colors stay canonical). */
  pillClassName?: string;
};

/**
 * `role="group"` of `aria-pressed` toggle buttons — 44px min height, black
 * fill + gold-soft text when pressed (design.md's canonical toggle
 * treatment). Used for both the contact form's general/custom mode switch
 * and the checkout form's ship/pickup delivery-method switch.
 */
export function UmscTogglePills<T extends string>({
  options,
  value,
  onChange,
  className,
  pillClassName,
  ...rest
}: UmscTogglePillsProps<T>) {
  return (
    <div
      role="group"
      aria-label={rest["aria-label"]}
      className={cn("flex flex-wrap gap-3", className)}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "umsc-toggle-pill umsc-sans inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[var(--umsc-line)] px-5 py-2.5 text-[13px] font-semibold text-[var(--umsc-ink)] transition-colors hover:border-[var(--umsc-ink)]",
              active &&
                "border-[var(--umsc-ink)] bg-[var(--umsc-ink)] text-[var(--umsc-gold-soft)] hover:border-[var(--umsc-ink)]",
              pillClassName,
            )}
          >
            {typeof option.label === "function"
              ? option.label(active)
              : option.label}
          </button>
        );
      })}
    </div>
  );
}
