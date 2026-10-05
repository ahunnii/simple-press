import { fieldAttr } from "~/lib/preview/section-attrs";
import { cn } from "~/lib/utils";

import { DreamMark } from "../shared/dream-mark";

type Props = {
  heading: string;
  /** Field key whose value is exactly `heading` (live text in the editor). */
  headingFieldKey?: string;
  /** Blank hides the paragraph. */
  body?: string;
  bodyFieldKey?: string;
  className?: string;
};

/**
 * Designed empty state for dream's optional pages (no events, no videos, no
 * FAQ items, donations not set up) — design.md craft floor: "every list has
 * a designed empty state". The empty-state panel ground design.md names
 * (sky → paper gradient), a rounded-26 hairline frame like `DreamPhoto`,
 * and the business mark on a paper badge (the account empty state's
 * "mark, not a lucide icon" rule), over an Italiana h2 and a soft line.
 *
 * Deliberately NOT inside a reveal: an empty state is the whole page body,
 * so it must never start hidden.
 */
export function DreamOptionalEmptyState({
  heading,
  headingFieldKey,
  body,
  bodyFieldKey,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-5 rounded-[var(--dream-radius-photo)] border border-[var(--dream-line)] px-6 py-16 text-center sm:px-10 sm:py-20",
        className,
      )}
      style={{
        background:
          "linear-gradient(180deg, var(--dream-sky) 0%, var(--dream-paper) 100%)",
      }}
    >
      <div
        aria-hidden="true"
        className="flex h-16 w-16 items-center justify-center rounded-full border border-[var(--dream-line)] bg-[var(--dream-paper)]"
      >
        <DreamMark className="block h-8 w-8 opacity-40" />
      </div>
      <h2
        className="max-w-[24ch] text-[clamp(26px,2.6vw,34px)] leading-[1.1]"
        {...(headingFieldKey ? fieldAttr(headingFieldKey) : {})}
      >
        {heading}
      </h2>
      {body?.trim() ? (
        <p
          className="max-w-[44ch] text-[17px] leading-[1.7] text-[var(--dream-soft)]"
          {...(bodyFieldKey ? fieldAttr(bodyFieldKey) : {})}
        >
          {body}
        </p>
      ) : null}
    </div>
  );
}
