import Image from "next/image";
import Link from "next/link";

import type { DefaultBlogPostPageTemplateProps } from "../../types";
import type { TiptapJSON } from "~/components/tiptap-renderer";
import { formatDate } from "~/lib/utils";
import { TiptapRenderer } from "~/components/tiptap-renderer";

export function DefaultBlogPostPage({
  page,
  relatedPosts,
}: DefaultBlogPostPageTemplateProps) {
  const others = relatedPosts.filter((p) => p.slug !== page.slug).slice(0, 3);

  return (
    <div>
      {/* Page header */}
      <section className="border-b border-[#e8e8e8] px-6 pt-20 pb-14 lg:px-8">
        <div className="mx-auto max-w-[760px]">
          <div className="mb-5 flex items-center gap-2 text-[11px] font-medium tracking-[0.14em] uppercase text-[#6b6b6b]">
            <Link href="/" className="hover:text-[#0a0a0a] transition-colors">
              Home
            </Link>
            <span>/</span>
            <Link href="/blog" className="hover:text-[#0a0a0a] transition-colors">
              Journal
            </Link>
            <span>/</span>
            <span className="normal-case tracking-normal text-[#0a0a0a] truncate max-w-[200px]">
              {page.title}
            </span>
          </div>

          <p className="text-xs font-medium tracking-[0.14em] uppercase text-[#6b6b6b]">
            {formatDate(page.createdAt)}
          </p>
          <h1 className="font-serif mt-3 text-[clamp(32px,4vw,56px)] font-semibold leading-[1.08] tracking-[-0.025em] text-balance">
            {page.title}
          </h1>
          {page.excerpt && (
            <p className="mt-5 text-[18px] leading-[1.6] text-[#6b6b6b]">
              {page.excerpt}
            </p>
          )}
        </div>
      </section>

      {/* Hero image */}
      {page.image && (
        <div className="px-6 pt-12 lg:px-8">
          <div className="mx-auto max-w-[1440px]">
            <div className="relative aspect-16/7 overflow-hidden rounded-[var(--radius)] bg-[#f6f6f6]">
              <Image
                src={page.image}
                alt={page.title}
                fill
                className="object-cover"
                priority
                sizes="(max-width: 1440px) 100vw, 1440px"
              />
            </div>
          </div>
        </div>
      )}

      {/* Article body */}
      <article className="px-6 py-16 lg:px-8">
        <div className="mx-auto max-w-[760px]">
          <TiptapRenderer
            content={page.content as TiptapJSON}
            className="prose prose-lg max-w-none prose-headings:font-serif prose-headings:font-medium prose-headings:tracking-tight prose-p:text-[#6b6b6b] prose-p:leading-[1.75] prose-a:text-[#0a0a0a] prose-a:underline hover:prose-a:no-underline prose-blockquote:border-[#e8e8e8] prose-blockquote:text-[#6b6b6b]"
          />
        </div>
      </article>

      {/* Back link + related posts */}
      <div className="border-t border-[#e8e8e8] px-6 pb-24 pt-16 lg:px-8">
        <div className="mx-auto max-w-[1440px]">
          <div className="mb-10 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-1.5 text-xs font-medium tracking-[0.14em] uppercase text-[#6b6b6b]">
                Continue reading
              </p>
              <h2 className="font-serif text-3xl font-medium tracking-tight">
                More articles
              </h2>
            </div>
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-sm font-medium border-b border-current pb-0.5 transition-[gap] hover:gap-3 shrink-0"
            >
              All posts →
            </Link>
          </div>

          {others.length === 0 ? (
            <p className="text-[#6b6b6b] text-sm">No other posts yet.</p>
          ) : (
            <div className="grid gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
              {others.map((post) => (
                <Link key={post.slug} href={`/blog/${post.slug}`} className="group block">
                  <div className="relative mb-4 aspect-4/3 overflow-hidden rounded-[var(--radius)] bg-[#f6f6f6]">
                    <Image
                      src={post.image ?? "/placeholder.svg"}
                      alt={post.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.015]"
                      sizes="(max-width: 640px) 100vw, 432px"
                    />
                  </div>
                  <p className="mb-2 text-xs font-medium tracking-[0.14em] uppercase text-[#6b6b6b]">
                    {formatDate(post.createdAt)}
                  </p>
                  <h3 className="font-serif text-[18px] font-medium leading-snug tracking-[-0.01em] group-hover:opacity-70 transition-opacity">
                    {post.title}
                  </h3>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
