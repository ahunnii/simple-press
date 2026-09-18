import { Star } from "lucide-react";

import { fieldAttr } from "~/lib/preview/section-attrs";

type Props = {
  href?: string;
  label?: string;
  labelFieldKey?: string;
  className?: string;
};

/**
 * UmscGoogleReviewLink — "G" roundel + label + a row of 5 gold stars.
 * Renders `null` when `href` is blank (the field's description says "leave
 * blank to hide" — used in the footer Follow column and the reviews section).
 */
export function UmscGoogleReviewLink({
  href,
  label,
  labelFieldKey,
  className,
}: Props) {
  if (!href?.trim()) return null;
  const text = label?.trim() ? label : "Click to leave us a Google Review";

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={`umsc-sans inline-flex items-center gap-2 text-[13px] text-inherit no-underline hover:opacity-80 ${className ?? ""}`}
    >
      <span
        aria-hidden="true"
        className="umsc-sans flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--umsc-white)] text-[11px] font-bold text-[var(--umsc-ink)]"
      >
        G
      </span>
      <span {...(labelFieldKey ? fieldAttr(labelFieldKey) : {})}>{text}</span>
      <span aria-hidden="true" className="flex gap-0.5 text-[var(--umsc-gold)]">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className="size-3"
            fill="currentColor"
            strokeWidth={0}
          />
        ))}
      </span>
      <span className="sr-only"> (opens in new tab)</span>
    </a>
  );
}
