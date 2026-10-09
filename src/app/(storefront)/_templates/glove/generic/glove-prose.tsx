import type { TiptapJSON } from "~/components/tiptap-renderer";
import { cn } from "~/lib/utils";
import { TiptapRenderer } from "~/components/tiptap-renderer";

/**
 * Rich-text (Tiptap) prose mapped onto glove tokens: Poppins H2/H3, Lato
 * body, purple underlined links, purple-disc bullets, bordered tables.
 * Tailwind arbitrary descendant variants over `--glove-*` tokens (no global
 * CSS needed, no stock colors).
 */
export const GLOVE_PROSE_CLASS = cn(
  "glove-prose glove-body text-[15px] leading-[1.7] text-[var(--glove-text)] md:text-[16px]",
  "[overflow-wrap:anywhere] [&>*+*]:mt-5",
  // Headings
  "[&_h1]:[font-family:var(--glove-font-display)] [&_h1]:text-[clamp(28px,3.4vw,40px)] [&_h1]:leading-[1.2] [&_h1]:font-medium [&_h1]:text-[var(--glove-ink)]",
  "[&_h2]:[font-family:var(--glove-font-display)] [&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:text-[clamp(24px,3vw,32px)] [&_h2]:leading-[1.2] [&_h2]:font-medium [&_h2]:text-[var(--glove-ink)]",
  "[&_h3]:[font-family:var(--glove-font-display)] [&_h3]:mt-8 [&_h3]:mb-2 [&_h3]:text-[clamp(19px,2.2vw,22px)] [&_h3]:leading-[1.3] [&_h3]:font-medium [&_h3]:text-[var(--glove-ink)]",
  "[&_h4]:[font-family:var(--glove-font-display)] [&_h4]:mt-6 [&_h4]:text-[17px] [&_h4]:font-medium [&_h4]:text-[var(--glove-ink)]",
  // Inline
  "[&_a]:text-[var(--glove-primary)] [&_a]:underline [&_a]:underline-offset-[3px] [&_a:hover]:text-[var(--glove-primary-hover)]",
  "[&_strong]:font-bold [&_strong]:text-[var(--glove-ink)]",
  "[&_em]:italic",
  // Lists — purple-disc bullets, purple numerals
  "[&_ul]:list-none [&_ul]:pl-0 [&_ul>li]:relative [&_ul>li]:pl-6",
  "[&_ul>li::before]:absolute [&_ul>li::before]:top-[0.62em] [&_ul>li::before]:left-1 [&_ul>li::before]:size-2 [&_ul>li::before]:rounded-full [&_ul>li::before]:bg-[var(--glove-primary)] [&_ul>li::before]:content-['']",
  "[&_ol]:list-decimal [&_ol]:pl-6 [&_ol>li]:pl-1 [&_ol>li]:marker:font-bold [&_ol>li]:marker:text-[var(--glove-primary)]",
  "[&_li+li]:mt-2 [&_li>p+p]:mt-2",
  // Blocks
  "[&_blockquote]:rounded-r-[8px] [&_blockquote]:border-l-[3px] [&_blockquote]:border-[var(--glove-primary)] [&_blockquote]:bg-[var(--glove-mist)] [&_blockquote]:px-5 [&_blockquote]:py-3 [&_blockquote]:text-[var(--glove-ink)] [&_blockquote]:italic",
  "[&_hr]:my-8 [&_hr]:border-[var(--glove-line)]",
  "[&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-[12px]",
  "[&_pre]:overflow-x-auto [&_pre]:rounded-[8px] [&_pre]:bg-[var(--glove-mist)] [&_pre]:p-4 [&_pre]:text-[14px]",
  "[&_code]:rounded-[4px] [&_code]:bg-[var(--glove-mist)] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[0.9em]",
  "[&_pre_code]:bg-transparent [&_pre_code]:p-0",
  // Tables — hairline-bordered, scroll sideways on phones instead of the page
  "[&_table]:block [&_table]:w-full [&_table]:max-w-full [&_table]:overflow-x-auto [&_table]:border-collapse [&_table]:text-[14px]",
  "[&_th]:border [&_th]:border-[var(--glove-line)] [&_th]:bg-[var(--glove-mist)] [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-bold [&_th]:text-[var(--glove-ink)]",
  "[&_td]:border [&_td]:border-[var(--glove-line)] [&_td]:px-3 [&_td]:py-2 [&_td]:align-top",
);

type GloveProseProps = {
  content: unknown;
  className?: string;
};

/** Renders a CMS page/post body (`Page.content`, Tiptap JSON) on glove tokens. */
export function GloveProse({ content, className }: GloveProseProps) {
  return (
    <TiptapRenderer
      content={content as TiptapJSON}
      className={cn(GLOVE_PROSE_CLASS, className)}
    />
  );
}

/** True when a Tiptap doc has any text, embed, image or other non-empty node. */
export function hasProseContent(content: unknown): boolean {
  const walk = (node: unknown): boolean => {
    if (node == null || typeof node !== "object") return false;
    const n = node as {
      type?: string;
      text?: string;
      content?: unknown;
    };
    if (typeof n.text === "string" && n.text.trim().length > 0) return true;
    if (
      n.type &&
      [
        "image",
        "gallery",
        "embed",
        "video",
        "form",
        "quoteCalculator",
      ].includes(n.type)
    ) {
      return true;
    }
    return Array.isArray(n.content) && n.content.some(walk);
  };
  return walk(content);
}
