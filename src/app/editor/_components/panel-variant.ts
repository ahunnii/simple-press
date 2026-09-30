/**
 * Shared chrome for the editor's contextual panels (field, theme, CMS page,
 * notes), which render in one of two containers:
 *
 * - `"sidebar"` (default): the 380px right-hand column of the desktop editor.
 * - `"sheet"`: full-width content inside the compact (phone / portrait
 *   tablet) editor's bottom sheet — no border or slide-in, since the sheet
 *   animates itself.
 */
export type PanelVariant = "sidebar" | "sheet";

/** Outer `<aside>` classes per variant. */
export const PANEL_ASIDE_CLASS: Record<PanelVariant, string> = {
  sidebar:
    "bg-card animate-in slide-in-from-right-8 fade-in flex w-[380px] shrink-0 flex-col border-l duration-200",
  sheet: "bg-card flex min-h-0 w-full flex-1 flex-col",
};

/**
 * Extra classes for a panel's scrolling body in the `"sheet"` variant: contain
 * overscroll so the sheet (not the page behind it) owns the gesture,
 * re-enable text selection (vaul sets `user-select: none` on the drawer for
 * fine pointers), and clear the home indicator.
 */
export const PANEL_SHEET_BODY_CLASS =
  "overscroll-contain select-text pb-[max(1rem,env(safe-area-inset-bottom))]";

/** Header close-button size: a larger tap target in the sheet. */
export const PANEL_CLOSE_BUTTON_CLASS: Record<PanelVariant, string> = {
  sidebar: "h-7 w-7 shrink-0",
  sheet: "h-9 w-9 shrink-0",
};

/**
 * How long the compact edit sheet takes to settle after opening or snapping
 * (vaul's 0.5s transform transition, matched by the sheet's `duration-500`
 * height transition). Programmatic scroll/focus inside a sheet panel waits
 * this long so it measures the final, visible body — not a mid-slide one.
 */
export const PANEL_SHEET_SETTLE_MS = 500;
