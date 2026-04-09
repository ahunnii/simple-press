import Image from "next/image";
import Link from "next/link";
import { CalendarDays } from "lucide-react";

import type { DefaultBlogPostPageTemplateProps } from "../types";
import type { TiptapJSON } from "~/components/tiptap-renderer";
import { formatDate } from "~/lib/utils";
import { TiptapRenderer } from "~/components/tiptap-renderer";

export function ElegantBlogPostPage({
  page,
  relatedPosts,
}: DefaultBlogPostPageTemplateProps) {
  const others = relatedPosts.filter((p) => p.slug !== page.slug);

  return (
    <div className="min-h-screen">
      <section className="bg-secondary/30 py-12">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <Link
            href="/blog"
            className="text-primary mb-8 inline-flex items-center gap-2 text-sm font-medium hover:underline"
          >
            ← Back to journal
          </Link>
          <div className="text-center">
            <h1 className="text-foreground font-serif text-4xl font-light tracking-wide md:text-5xl">
              {page.title}
            </h1>
            <div className="text-muted-foreground mt-4 flex flex-wrap items-center justify-center gap-2 text-sm">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4" aria-hidden />
                {formatDate(page.createdAt)}
              </span>
            </div>
            {page.excerpt ? (
              <p className="text-muted-foreground mt-4 text-lg">{page.excerpt}</p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        {page.image ? (
          <div className="relative mb-10 aspect-video w-full overflow-hidden rounded-2xl">
            <Image
              src={page.image}
              alt={page.title}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 768px) 100vw, 768px"
            />
          </div>
        ) : null}

        <TiptapRenderer
          content={page.content as TiptapJSON}
          className="prose prose-lg prose-headings:font-serif prose-headings:font-light prose-headings:tracking-wide prose-p:text-muted-foreground prose-a:text-foreground prose-a:underline prose-a:underline-offset-4 hover:prose-a:text-muted-foreground max-w-none"
        />

        {others.length > 0 ? (
          <section className="border-border mt-16 border-t pt-12">
            <h2 className="text-foreground mb-8 font-serif text-2xl font-light tracking-wide">
              More articles
            </h2>
            <div className="grid gap-8 sm:grid-cols-2">
              {others.map((post) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="group bg-card text-card-foreground block overflow-hidden rounded-2xl border border-border shadow-sm transition hover:shadow-md"
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
                    <p className="text-muted-foreground mb-1 text-xs">
                      {formatDate(post.createdAt)}
                    </p>
                    <h3 className="text-foreground group-hover:text-primary font-serif font-light tracking-wide transition-colors">
                      {post.title}
                    </h3>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </section>
    </div>
  );
}
