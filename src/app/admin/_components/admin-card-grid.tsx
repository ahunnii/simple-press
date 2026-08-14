import { cn } from "~/lib/utils";

/**
 * Shared grid geometry and interactive-card treatment for admin list pages
 * that render cards instead of table rows (Galleries is the first consumer).
 *
 * The URL-param pipeline — `AdminFilters`, `AdminPagination`, `AdminEmpty` —
 * is already markup-agnostic: it reads/writes search params and renders
 * generic content, with no assumption that the results underneath are a
 * `<table>`. So a card-grid list page reuses all of that unchanged and only
 * needs a layer for the parts that actually differ — the grid geometry and
 * the "whole card is a link" interaction — which is what lives here.
 *
 * Same philosophy as `admin-table-style.ts`: tokens over components. A
 * <table> and a card grid can't share one component the way two tables can
 * share `<Table>`, so this file exports Tailwind class strings (plus one
 * thin `<ul>` wrapper for the list semantics) rather than a `Card`
 * subcomponent — card *content* (image, title, badges, actions) stays
 * bespoke per page. One consumer is not a pattern; don't abstract it until a
 * second card-grid page shows up and the shared shape becomes provable.
 */

/** Grid geometry. 2-up at md, 3-up at lg — the same breakpoints the admin
 *  tables use for column hiding, so grid and table pages reflow at the same
 *  widths. Exported separately for consumers that need a different element. */
export const CARD_GRID =
  "grid list-none gap-6 p-0 md:grid-cols-2 lg:grid-cols-3";

/** Responsive card-grid container. A <ul> so assistive tech announces
 *  "list, N items" — the row count a table caption gives for free. Children
 *  are the <li> items, one per card. */
export function AdminCardGrid({
  label,
  children,
  className,
}: {
  /** Accessible name for the list, e.g. "Galleries". */
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <ul aria-label={label} className={cn(CARD_GRID, className)}>
      {children}
    </ul>
  );
}

/** A card whose whole surface is one primary link (via CARD_STRETCHED_LINK).
 *  `gap-0 py-0` cancel the shadcn Card base (`gap-6 py-6`) so media can run
 *  edge-to-edge, and `overflow-hidden` clips it to the rounded corners — the
 *  same reasoning as TABLE_CARD. `group` feeds hover styles to inner content
 *  (e.g. group-hover:underline on the name); `relative` anchors the stretched
 *  link's ::after overlay; `focus-within` ring makes keyboard focus on the
 *  inner link visible on the whole card (the link's own outline is suppressed
 *  by CARD_STRETCHED_LINK, because the overlay IS the visual focus bounds). */
export const INTERACTIVE_CARD =
  "group relative gap-0 overflow-hidden py-0 transition-shadow hover:shadow-md focus-within:ring-2 focus-within:ring-ring/50";

/** The stretched-link overlay, applied to the card's primary <Link>. The
 *  ::after pseudo-element covers the whole card, so the entire surface is
 *  clickable while the DOM anchor wraps ONLY the entity name — assistive tech
 *  gets a link named "<name>", not the card's whole text run together. A
 *  whole-card <a> wrapping other buttons would be invalid HTML and an a11y
 *  trap; this is the standard resolution. Interactive siblings must be
 *  raised above the overlay with CARD_RAISED. */
export const CARD_STRETCHED_LINK =
  "after:absolute after:inset-0 after:content-[''] focus-visible:outline-none";

/** Anything interactive inside an INTERACTIVE_CARD other than the stretched
 *  link (dropdown trigger, tooltip badge) — stacks above the click overlay so
 *  it receives its own pointer events. */
export const CARD_RAISED = "relative z-10";
