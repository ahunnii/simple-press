import Image from "next/image";
import Link from "next/link";

import { fmtBlogDate, SledgeBlogImagePlaceholder } from "./sledge-blog-utils";

export type SledgeBlogPostSummary = {
  slug: string;
  title: string;
  excerpt?: string | null;
  image?: string | null;
  createdAt: Date | string;
};

type Props = {
  post: SledgeBlogPostSummary;
  index?: number;
  showExcerpt?: boolean;
};

export function SledgeBlogPostCard({
  post,
  index = 0,
  showExcerpt = true,
}: Props) {
  const placeholderLabel = String.fromCharCode(65 + (index % 6));

  return (
    <Link href={`/blog/${post.slug}`} className="group block">
      <div className="relative aspect-[4/3] overflow-hidden rounded-sm bg-[var(--sl-green)]">
        {post.image ? (
          <Image
            src={post.image}
            alt={post.title}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <SledgeBlogImagePlaceholder label={placeholderLabel} />
        )}
        {/* N-2: aria-hidden — the card's link name (post title) already provides context */}
        <span aria-hidden="true" className="absolute top-2.5 left-2.5 rounded-sm bg-[var(--sl-cream)] px-2 py-1 font-sans text-[9px] tracking-[0.16em] text-[var(--sl-coral-aa)] uppercase">
          Blog
        </span>
      </div>

      <p className="sl-eyebrow mt-4 font-sans text-xs tracking-[0.12em] uppercase">
        {fmtBlogDate(post.createdAt)}
      </p>

      <h3 className="mt-2 font-serif text-lg leading-tight tracking-tight text-[var(--sl-ink)] transition-opacity group-hover:opacity-70 md:text-xl">
        {post.title}
      </h3>

      {showExcerpt && post.excerpt ? (
        <p className="sl-eyebrow mt-2 line-clamp-2 font-sans text-sm leading-relaxed">
          {post.excerpt}
        </p>
      ) : null}

      {/* N-2: aria-hidden — the card's wrapping link already conveys destination */}
      <span aria-hidden="true" className="mt-3 inline-block font-sans text-xs tracking-[0.14em] text-[var(--sl-coral-aa)] uppercase transition-opacity group-hover:opacity-60">
        Read →
      </span>
    </Link>
  );
}
