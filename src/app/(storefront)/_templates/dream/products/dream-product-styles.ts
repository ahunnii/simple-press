/**
 * Class strings handed to the shared product widgets (`NotifyMeForm`,
 * `SubscribePanel`) so they read in dream tokens: paper input with a
 * hairline and a pill button, matching `.dream-input` / `.dream-btn`.
 * Kept in one place so the simple and variant buy paths stay identical.
 */
export const DREAM_NOTIFY_INPUT_CLASSNAME =
  "h-11 rounded-[var(--dream-radius-input)] border-[var(--dream-line)] bg-[var(--dream-white)] px-4 text-[15px] text-[var(--dream-ink)]";

export const DREAM_NOTIFY_BUTTON_CLASSNAME =
  "h-11 rounded-[var(--dream-radius-pill)] border-[var(--dream-ink)] bg-[var(--dream-ink)] px-5 text-[15px] font-semibold text-[var(--dream-paper)]";

export const DREAM_SUBSCRIBE_PANEL_CLASSNAME =
  "rounded-[var(--dream-radius-card)] border-[var(--dream-line)] bg-[var(--dream-white)]";

export const DREAM_SUBSCRIBE_CTA_CLASSNAME = "dream-btn dream-btn--secondary";
