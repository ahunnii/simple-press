import type { ReactNode } from "react";

import { fieldAttr } from "~/lib/preview/section-attrs";
import { cn } from "~/lib/utils";

type GloveNoticeProps = {
  children: ReactNode;
  className?: string;
  /** Field key when the children are exactly one text field's value. */
  fieldKey?: string;
  /** Small Poppins heading above the text (e.g. "Please note"). */
  label?: string;
};

/**
 * Hairline mist panel with a small purple label and ink text, for the PDP's
 * made-to-order notice ("Sizes run small ..."). Replaces the old solid purple
 * block (`.glove-notice`).
 */
export function GloveNotice({
  children,
  className,
  fieldKey,
  label,
}: GloveNoticeProps) {
  return (
    <div
      role="note"
      className={cn(
        "rounded-[var(--glove-radius-card)] border border-[var(--glove-mist-line)] bg-[var(--glove-mist)] px-4 py-3.5 md:px-5",
        className,
      )}
    >
      {label ? (
        <p className="glove-display m-0 mb-1 text-[13px] leading-snug font-semibold text-[var(--glove-primary)]">
          {label}
        </p>
      ) : null}
      <p
        className="glove-body m-0 text-[14px] leading-[1.6] text-[var(--glove-ink)]"
        {...(fieldKey ? fieldAttr(fieldKey) : {})}
      >
        {children}
      </p>
    </div>
  );
}
