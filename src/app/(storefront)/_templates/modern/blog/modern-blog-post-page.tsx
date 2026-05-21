import Image from "next/image";
import Link from "next/link";
import { CalendarDays } from "lucide-react";

import type { DefaultBlogPostPageTemplateProps } from "../../types";
import type { TiptapJSON } from "~/components/tiptap-renderer";
import { formatDate } from "~/lib/utils";
import { TiptapRenderer } from "~/components/tiptap-renderer";

import { ModernGeneralLayout } from "../layout/modern-general-layout";
import { ModernBlogPostCard } from "./modern-blog-post-card";

export function ModernBlogPostPage({
  page,
  relatedPosts,
}: DefaultBlogPostPageTemplateProps) {
  const others = relatedPosts.filter((p) => p.slug !== page.slug);

  return (
    <ModernGeneralLayout
      title={page.title}
      subtitle="Blog"
      excerpt={page.excerpt ?? undefined}
    >
      <section className="bg-background py-8">
        <div className="mx-auto max-w-4xl px-6 lg:px-8">
          <Link
            href="/blog"
            className="text-primary inline-flex items-center gap-2 text-sm font-medium hover:underline"
          >
            ← Back to blog
          </Link>
          <div className="text-muted-foreground mt-4 flex flex-wrap items-center gap-2 text-sm">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4" aria-hidden />
              {formatDate(page.createdAt)}
            </span>
          </div>
        </div>
      </section>

      <section className="bg-background pb-16">
        <div className="mx-auto max-w-4xl px-6 lg:px-8">
          {page.image ? (
            <div className="relative mb-10 aspect-video w-full overflow-hidden rounded-2xl">
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
            className="prose prose-lg prose-headings:font-serif prose-headings:font-normal prose-headings:text-foreground prose-p:text-muted-foreground prose-a:text-foreground prose-a:underline prose-a:underline-offset-4 hover:prose-a:opacity-70 prose-strong:font-medium prose-strong:text-foreground max-w-none"
          />

          {others.length > 0 ? (
            <section className="border-border mt-16 border-t pt-12">
              <h2 className="text-foreground mb-8 font-serif text-2xl font-light tracking-wide">
                More articles
              </h2>
              <div className="grid gap-8 sm:grid-cols-2">
                {others.map((post) => (
                  <ModernBlogPostCard key={post.slug} post={post} />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </section>
    </ModernGeneralLayout>
  );
}
