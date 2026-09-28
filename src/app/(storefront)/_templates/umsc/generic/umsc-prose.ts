import type { CSSProperties } from "react";

import { cn } from "~/lib/utils";

/**
 * Prose classes for `TiptapRenderer` output, mapped onto umsc tokens
 * (design.md "GenericPage"): Marcellus h2/h3, gold-ink underlined links,
 * gold-hairline blockquotes, 66ch measure, tabular numerals in tables.
 * Shared by the generic page, blog posts and the service detail intro.
 *
 * Lives in a plain (non-`"use client"`) module on purpose: a constant
 * exported from a client module reaches a server component as a client
 * reference, not a string.
 *
 * The blockquote border/face is NOT expressed here — the Typography
 * plugin's own (unlayered) `blockquote` base rule out-specifies the
 * `prose-blockquote:` modifier utility for that property in this codebase
 * (`dream-generic-page.tsx` hit the identical fight first; see its
 * `DREAM_PROSE_CLASSNAME` comment). It's asserted in `UMSC_EMBED_STYLE`
 * below instead, scoped to `.umsc-prose blockquote`, so nothing is added to
 * the shared `globals.css`.
 */
export const UMSC_PROSE_CLASSNAME = cn(
  "umsc-prose prose w-full max-w-[66ch]",
  "prose-headings:umsc-serif prose-headings:font-normal prose-headings:text-[var(--umsc-ink)] prose-headings:tracking-[0.015em] prose-headings:text-balance",
  "prose-h2:text-[clamp(32px,4.2vw,56px)] prose-h2:leading-[1.08] prose-h2:mt-14 prose-h2:mb-4",
  "prose-h3:text-[clamp(22px,2.2vw,30px)] prose-h3:leading-[1.15] prose-h3:mt-10 prose-h3:mb-3",
  "prose-p:umsc-sans prose-p:text-[17px] prose-p:leading-[1.6] prose-p:text-[var(--umsc-ink)]",
  "prose-li:umsc-sans prose-li:text-[17px] prose-li:leading-[1.6] prose-li:text-[var(--umsc-ink)] prose-li:marker:text-[var(--umsc-gold-ink)]",
  "prose-strong:font-semibold prose-strong:text-[var(--umsc-ink)]",
  "prose-a:text-[var(--umsc-gold-ink)] prose-a:underline prose-a:underline-offset-[0.18em] hover:prose-a:text-[var(--umsc-ink)]",
  "prose-hr:border-[var(--umsc-hairline)]",
  "prose-img:border prose-img:border-[var(--umsc-line)]",
  "prose-table:text-[15px] prose-th:text-[var(--umsc-ink)] prose-th:border-[var(--umsc-hairline)] prose-td:border-[var(--umsc-hairline)] prose-td:text-[var(--umsc-ink)]",
  "prose-th:[font-variant-numeric:tabular-nums] prose-td:[font-variant-numeric:tabular-nums]",
  // Full-width embeds (galleries, breakout quote calculators) escape the
  // 66ch article measure — same convention as `dream-generic-page.tsx`.
  "[&_.gallery-container]:max-w-none [&_.sp-quote-breakout]:max-w-none",
);

/**
 * Shadcn-var → umsc-token bridge, applied as inline custom properties on the
 * `.umsc-embed` wrapper (the same variable set as the `.umsc-account` block
 * in globals.css, declared inline so it never touches `globals.css`).
 * Custom properties inherit down the DOM regardless of how they're declared,
 * so an embedded `QuoteCalculatorBlock`'s shared Button/Input/Label/Card —
 * which all read `--background`/`--border`/`--ring`/etc via Tailwind's
 * `bg-background`-style utilities — render in umsc's paper/ink/purple-ring
 * palette without editing those shared files.
 */
export const UMSC_EMBED_VARS = {
  "--background": "var(--umsc-paper)",
  "--foreground": "var(--umsc-ink)",
  "--card": "var(--umsc-white)",
  "--card-foreground": "var(--umsc-ink)",
  "--popover": "var(--umsc-white)",
  "--popover-foreground": "var(--umsc-ink)",
  "--primary": "var(--umsc-black)",
  "--primary-foreground": "var(--umsc-paper)",
  "--secondary": "var(--umsc-cream)",
  "--secondary-foreground": "var(--umsc-ink)",
  "--muted": "var(--umsc-cream)",
  "--muted-foreground": "var(--umsc-muted)",
  "--accent": "var(--umsc-cream)",
  "--accent-foreground": "var(--umsc-ink)",
  "--destructive": "var(--umsc-error)",
  "--border": "var(--umsc-line)",
  "--input": "var(--umsc-line)",
  "--ring": "var(--umsc-purple)",
  "--radius": "0.2rem",
  fontFamily: "var(--font-sans)",
} as CSSProperties;

/**
 * Component-scoped CSS (NOT added to `globals.css`): frames Tiptap `gallery`
 * nodes in the umsc hairline treatment, gives embedded shadcn `Card`s (from
 * `quoteCalculator`) an umsc-styled face, and asserts the gold-hairline
 * blockquote the Typography plugin's own unlayered base rule would otherwise
 * win over a `prose-blockquote:` utility (see `UMSC_PROSE_CLASSNAME`).
 */
export const UMSC_EMBED_STYLE = `
  .umsc-prose blockquote {
    border-left: 2px solid var(--umsc-line-gold);
    padding-left: 1.25rem;
    font-style: normal;
    color: var(--umsc-ink);
  }
  .umsc-embed .gallery-container {
    border: 1px solid var(--umsc-line-gold);
    background: var(--umsc-white);
    padding: 1rem;
  }
  .umsc-embed [data-slot="card"] {
    background: var(--umsc-white);
    border: 1px solid var(--umsc-line);
    border-radius: 0.2rem;
    box-shadow: none;
  }
`;
