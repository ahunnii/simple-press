/** Prose styles tuned for long-form blog articles */
export const SLEDGE_BLOG_PROSE =
  "prose max-w-none prose-headings:font-serif prose-headings:tracking-tight prose-headings:text-[var(--sl-ink)] prose-h2:text-[1.75rem] prose-h2:leading-snug prose-h2:mt-12 prose-h2:mb-5 prose-h3:text-[1.25rem] prose-h3:leading-snug prose-h3:mt-10 prose-h3:mb-4 prose-p:font-sans prose-p:text-[15px] prose-p:leading-[1.85] prose-p:text-[var(--sl-ink-soft)] prose-p:mt-0 prose-p:mb-6 prose-strong:font-semibold prose-strong:text-[var(--sl-ink)] prose-a:text-[var(--sl-coral)] prose-a:underline prose-a:underline-offset-4 hover:prose-a:opacity-70 prose-li:font-sans prose-li:text-[15px] prose-li:leading-[1.85] prose-li:text-[var(--sl-ink-soft)] prose-ul:my-4 prose-ol:my-4 prose-blockquote:border-l-4 prose-blockquote:border-[var(--sl-coral)] prose-blockquote:pl-6 prose-blockquote:font-serif prose-blockquote:italic prose-blockquote:text-[var(--sl-ink-soft)] prose-hr:border-[#e8e8e8] prose-hr:my-10";

export function fmtBlogDate(d: Date | string) {
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

type BlogPostImageProps = {
  label: string;
};

export function SledgeBlogImagePlaceholder({ label }: BlogPostImageProps) {
  return (
    <div className="sledge-card-placeholder absolute inset-0 flex items-center justify-center bg-[var(--sl-green)]">
      <span className="sledge-card-placeholder-num select-none">{label}</span>
    </div>
  );
}
