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

/**
 * Product options (the customizer) in dream tokens, passed as `classNames` to
 * the shared `ProductCustomizer`: labels like the variant picker's, white
 * tiles with a gold hairline and an ink ring on the selected one, pill
 * inputs. Colors carry `color:` hints so they never read as a font size.
 * Form controls only: nothing here is wrapped in a reveal.
 */
export const DREAM_CUSTOMIZER_CLASSNAMES = {
  legend: "text-[15px] font-semibold text-[color:var(--dream-ink)]",
  help: "text-[14px] text-[color:var(--dream-soft)]",
  count: "text-[13px] text-[color:var(--dream-soft)]",
  value:
    "rounded-[var(--dream-radius-input)] border-[color:var(--dream-line)] bg-[color:var(--dream-white)] text-[color:var(--dream-ink)] hover:border-[color:var(--dream-gold)] hover:bg-[color:var(--dream-white)] data-[selected=true]:border-[color:var(--dream-ink)] data-[selected=true]:ring-1 data-[selected=true]:ring-[color:var(--dream-ink)] has-[:focus-visible]:outline-[color:var(--dream-rose)]",
  valueImage: "rounded-[calc(var(--dream-radius-input)-4px)]",
  valueLabel: "text-[14px] font-medium",
  valuePrice: "text-[13px] text-[color:var(--dream-soft)]",
  clear:
    "text-[13px] text-[color:var(--dream-soft)] hover:text-[color:var(--dream-ink)]",
  limit: "text-[13px] text-[color:var(--dream-soft)]",
  textInput:
    "h-11 rounded-[var(--dream-radius-input)] border-[color:var(--dream-line)] bg-[color:var(--dream-white)] px-4 text-[15px] text-[color:var(--dream-ink)] focus-visible:border-[color:var(--dream-rose)] focus-visible:ring-[color:var(--dream-rose)]/30",
  textCounter: "text-[13px] text-[color:var(--dream-soft)]",
  error: "text-[14px] text-[color:var(--dream-error)]",
};

export const DREAM_CUSTOMIZER_TRAY_CLASSNAMES = {
  item: "border-[color:var(--dream-line)] bg-[color:var(--dream-white)] text-[13px] text-[color:var(--dream-ink)]",
};
