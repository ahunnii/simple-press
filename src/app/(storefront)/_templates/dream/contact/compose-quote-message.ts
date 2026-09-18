/**
 * Pure composition helpers for the Estimate Quote form's structured extras
 * (design.md "Per-page section concepts › Estimate Quote"). The quote form
 * registers `name`/`email`/`phone`/`preferredContactMethod`/`message` with
 * `useContactForm`, but the event-specific answers (date, time, location,
 * setting, colors, draping/throne-chair/full-decor, a photo link) are local
 * React state, NOT part of that schema. This module folds those extras into
 * a single fixed-format prefix ahead of the free-text theme description, so
 * the one `message` field the platform's `contact.send` mutation understands
 * still carries every structured answer.
 *
 * No React, no DOM — kept framework-free so it's trivially unit-testable and
 * safe to call from both the client form (composing the submission) and its
 * live character-budget display (sizing the theme textarea's remaining-chars
 * counter off `composeQuotePrefix`'s length, before any theme text exists).
 */

export type QuoteSetting = "" | "indoor" | "outdoor" | "both";
export type QuoteYesNo = "" | "yes" | "no" | "unsure";

export type QuoteExtras = {
  eventDate: string;
  eventTime: string;
  location: string;
  setting: QuoteSetting;
  colors: string;
  draping: QuoteYesNo;
  throneChair: QuoteYesNo;
  fullDecor: QuoteYesNo;
  photoLink: string;
};

export const EMPTY_QUOTE_EXTRAS: QuoteExtras = {
  eventDate: "",
  eventTime: "",
  location: "",
  setting: "",
  colors: "",
  draping: "",
  throneChair: "",
  fullDecor: "",
  photoLink: "",
};

const SETTING_LABELS: Record<Exclude<QuoteSetting, "">, string> = {
  indoor: "Indoor",
  outdoor: "Outdoor",
  both: "Both",
};

const YES_NO_LABELS: Record<Exclude<QuoteYesNo, "">, string> = {
  yes: "Yes",
  no: "No",
  unsure: "Not sure",
};

function isSetting(value: QuoteSetting): value is Exclude<QuoteSetting, ""> {
  return value !== "";
}

function isYesNo(value: QuoteYesNo): value is Exclude<QuoteYesNo, ""> {
  return value !== "";
}

/**
 * The fixed-format block describing the structured event answers, WITHOUT
 * the trailing blank line + "Theme: " line. Blank optional fields (event
 * time, colors, an individual draping/throne-chair/full-decor answer, the
 * photo link) drop their line/segment entirely rather than rendering an
 * empty value — see design.md's format spec ("omit blank optional lines").
 *
 * Exported on its own (not just via `composeQuoteMessage`) because the form
 * also uses its `.length` to size the live character budget for the
 * free-text theme description before any theme text is typed.
 */
export function composeQuotePrefix(extras: QuoteExtras): string {
  const lines: string[] = ["Estimate Quote request"];

  const dateSegments = [`Event date: ${extras.eventDate}`];
  if (extras.eventTime.trim()) {
    dateSegments.push(`Event time: ${extras.eventTime.trim()}`);
  }
  lines.push(dateSegments.join(" · "));

  const locationSegments = [`Location: ${extras.location}`];
  if (isSetting(extras.setting)) {
    locationSegments.push(`Setting: ${SETTING_LABELS[extras.setting]}`);
  }
  lines.push(locationSegments.join(" · "));

  if (extras.colors.trim()) {
    lines.push(`Colors: ${extras.colors.trim()}`);
  }

  const decorSegments: string[] = [];
  if (isYesNo(extras.draping)) {
    decorSegments.push(`Draping: ${YES_NO_LABELS[extras.draping]}`);
  }
  if (isYesNo(extras.throneChair)) {
    decorSegments.push(`Throne chair: ${YES_NO_LABELS[extras.throneChair]}`);
  }
  if (isYesNo(extras.fullDecor)) {
    decorSegments.push(
      `Full decor by Dream Your Theme: ${YES_NO_LABELS[extras.fullDecor]}`,
    );
  }
  if (decorSegments.length > 0) {
    lines.push(decorSegments.join(" · "));
  }

  if (extras.photoLink.trim()) {
    lines.push(`Event-space photos: ${extras.photoLink.trim()}`);
  }

  return lines.join("\n");
}

/**
 * The full composed `message` submitted to `contact.send`: the structured
 * prefix, a blank line, then the free-text theme description.
 */
export function composeQuoteMessage(
  extras: QuoteExtras,
  theme: string,
): string {
  return `${composeQuotePrefix(extras)}\n\nTheme: ${theme.trim()}`;
}
