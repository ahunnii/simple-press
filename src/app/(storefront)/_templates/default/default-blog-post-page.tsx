import Image from "next/image";
import Link from "next/link";
import { CalendarDays } from "lucide-react";

import type { DefaultBlogPostPageTemplateProps } from "../types";
import type { TiptapJSON } from "~/components/tiptap-renderer";
import { formatDate } from "~/lib/utils";
import { TiptapRenderer } from "~/components/tiptap-renderer";

export function DefaultBlogPostPage({
  page,
  relatedPosts,
}: DefaultBlogPostPageTemplateProps) {
  const others = relatedPosts.filter((p) => p.slug !== page.slug);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <Link
        href="/blog"
        className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-[#5e8b4a] hover:underline"
      >
        ← Back to blog
      </Link>

      <h1 className="mb-4 text-4xl font-bold text-[#374151]">{page.title}</h1>

      <div className="mb-6 flex flex-wrap items-center gap-2 text-sm text-gray-600">
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays className="h-4 w-4" aria-hidden />
          {formatDate(page.createdAt)}
        </span>
      </div>

      {page.excerpt ? (
        <p className="mb-8 text-xl text-gray-600">{page.excerpt}</p>
      ) : null}

      {page.image ? (
        <div className="relative mb-10 aspect-video w-full overflow-hidden rounded-xl">
          <Image
            src={page.image}
            alt={page.title}
            fill
            className="object-cover"
            priority
            sizes="(max-width: 896px) 100vw, 896px"
          />
        </div>
      ) : null}

      <TiptapRenderer
        content={page.content as TiptapJSON}
        className="prose prose-lg max-w-none"
      />

      {others.length > 0 ? (
        <section className="mt-16 border-t border-gray-200 pt-12">
          <h2 className="mb-8 text-2xl font-bold text-[#374151]">
            More articles
          </h2>
          <div className="grid gap-8 sm:grid-cols-2">
            {others.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group block overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition hover:shadow-md"
              >
                <div className="relative aspect-video w-full overflow-hidden">
                  <Image
                    src={post.image ?? "/placeholder.svg"}
                    alt={post.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 640px) 100vw, 432px"
                  />
                </div>
                <div className="p-5">
                  <p className="mb-1 text-xs text-gray-500">
                    {formatDate(post.createdAt)}
                  </p>
                  <h3 className="font-bold text-[#374151] transition-colors group-hover:text-[#5e8b4a]">
                    {post.title}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
