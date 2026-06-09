import Image from "next/image";
import Link from "next/link";

import type { SledgeBlogPostSummary } from "./sledge-blog-post-card";

import { fmtBlogDate, SledgeBlogImagePlaceholder } from "./sledge-blog-utils";

type Props = {
  post: SledgeBlogPostSummary;
};

export function SledgeBlogFeaturedCard({ post }: Props) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="sl-card-shadow group grid grid-cols-1 overflow-hidden rounded-sm border border-[var(--sl-border)] md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]"
    >
      <div className="relative min-h-[clamp(260px,42vw,420px)] overflow-hidden bg-[var(--sl-green)]">
        {post.image ? (
          <Image
            src={post.image}
            alt={post.title}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
            priority
            sizes="(max-width: 768px) 100vw, 55vw"
          />
        ) : (
          <SledgeBlogImagePlaceholder label="★" />
        )}
      </div>

      <div className="flex flex-col justify-between gap-8 bg-white p-8 lg:p-10">
        <div className="flex flex-col gap-4">
          {/* N-2: aria-hidden — decorative within the big link; post title is the accessible name */}
          <span
            aria-hidden="true"
            className="self-start rounded-sm bg-[var(--sl-cream)] px-2.5 py-1 font-sans text-[10px] tracking-[0.18em] text-[var(--sl-coral-aa)] uppercase"
          >
            Latest
          </span>
          <h2 className="font-serif text-2xl leading-tight tracking-tight text-[var(--sl-ink)] transition-opacity group-hover:opacity-70 md:text-3xl lg:text-4xl">
            {post.title}
          </h2>
          {post.excerpt ? (
            <p className="sl-eyebrow max-w-2xl font-sans text-sm leading-relaxed md:text-[15px] md:leading-[1.85]">
              {post.excerpt}
            </p>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-[var(--sl-border)] pt-6">
          <p className="sl-eyebrow font-sans text-xs tracking-[0.14em] uppercase">
            {fmtBlogDate(post.createdAt)}
          </p>
          <span className="sl-btn text-xs">Read Post →</span>
        </div>
      </div>
    </Link>
  );
}
