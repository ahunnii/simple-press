import { cn } from "~/lib/utils";

/**
 * Prose classes for `TiptapRenderer` output, mapped onto dream tokens
 * (Italiana h2/h3, rose-underline links, gold-hairline blockquotes,
 * `--dream-measure` width, styled lists/tables).
 *
 * `.dream h1/h2/h3` and `.dream p` (globals.css, Phase 2) unconditionally
 * set `margin: 0` — written for `DreamH1`/`DreamHeading`'s flex-gap spacing
 * model, as plain unlayered CSS that beats any Tailwind Typography margin
 * utility regardless of specificity (Tailwind's generated utilities live in
 * `@layer utilities`, and unlayered rules always win over layered ones).
 * Rather than fight that with `!important` variants, heading/paragraph
 * rhythm below rides `padding` instead of `margin`, which that rule never
 * touches — see the E-phase3 report for the full note.
 */
export const DREAM_PROSE_CLASSNAME = cn(
  "prose w-full max-w-[var(--dream-measure)]",
  "prose-headings:[font-family:var(--font-dream-display)] prose-headings:font-normal prose-headings:text-[var(--dream-ink)] prose-headings:tracking-[-0.01em]",
  "prose-h2:m-0 prose-h2:pt-14 prose-h2:pb-4 prose-h2:text-[clamp(28px,3.2vw,38px)] prose-h2:leading-[1.15]",
  "prose-h3:m-0 prose-h3:pt-10 prose-h3:pb-3 prose-h3:text-[clamp(22px,2.4vw,27px)] prose-h3:leading-[1.2]",
  "prose-p:m-0 prose-p:pt-5 prose-p:text-[18px] prose-p:leading-[1.7] prose-p:text-[var(--dream-ink)]",
  "prose-li:[font-family:var(--font-dream-body)] prose-li:text-[18px] prose-li:leading-[1.7] prose-li:text-[var(--dream-ink)] prose-li:marker:text-[var(--dream-gold)] prose-li:my-1.5",
  "prose-ul:mt-3 prose-ul:pl-6 prose-ol:mt-3 prose-ol:pl-6",
  "prose-strong:font-semibold prose-strong:text-[var(--dream-ink)]",
  "prose-a:text-[var(--dream-soft)] prose-a:no-underline prose-a:pb-px prose-a:bg-no-repeat prose-a:[background-position:0_100%] prose-a:bg-[length:0%_1px] prose-a:[background-image:linear-gradient(var(--dream-rose),var(--dream-rose))] prose-a:transition-[background-size,color] prose-a:duration-200 hover:prose-a:text-[var(--dream-ink)] hover:prose-a:bg-[length:100%_1px]",
  // `prose-p:*` above (18px/1.7 Mulish) otherwise wins the cascade on the
  // `<p>` Tiptap nests inside `<blockquote>`, since Typography-plugin
  // modifier utilities are equal-specificity `:where()` rules — so the
  // pull-quote scale/face is reasserted directly on `blockquote > p` via an
  // arbitrary-variant descendant selector (same pattern as the
  // `sp-quote-breakout` override below), matching the testimonials
  // featured-quote voice rather than body-copy scale.
  "prose-blockquote:m-0 prose-blockquote:mt-8 prose-blockquote:border-l prose-blockquote:border-[var(--dream-line)] prose-blockquote:pl-6",
  "[&_blockquote>p]:pt-0 [&_blockquote>p]:font-[family-name:var(--font-dream-display)] [&_blockquote>p]:not-italic [&_blockquote>p]:text-[1.25rem] [&_blockquote>p]:leading-[1.55] [&_blockquote>p]:text-[var(--dream-ink)]",
  "prose-hr:my-10 prose-hr:border-[var(--dream-line)]",
  "prose-img:rounded-[var(--dream-radius-photo)] prose-img:border prose-img:border-[var(--dream-line)] prose-img:mt-8",
  "prose-table:text-[16px] prose-th:text-[var(--dream-ink)] prose-th:border-[var(--dream-line)] prose-td:border-[var(--dream-line)] prose-td:text-[var(--dream-ink)]",
  // Quote-calculator breakout blocks escape the article measure.
  "[&_.sp-quote-breakout]:max-w-none",
);
