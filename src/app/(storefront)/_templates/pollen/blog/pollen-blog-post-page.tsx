import Image from "next/image";
import Link from "next/link";
import { CalendarDays } from "lucide-react";

import type { DefaultBlogPostPageTemplateProps } from "../../types";
import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { RouterOutputs } from "~/trpc/react";
import { formatDate } from "~/lib/utils";
import { FadeIn } from "~/components/page-animations";
import { TiptapRenderer } from "~/components/tiptap-renderer";

import { PollenGeneralLayout } from "../layout/pollen-general-layout";

type Props = DefaultBlogPostPageTemplateProps & {
  business: NonNullable<RouterOutputs["business"]["simplifiedGet"]>;
};

export function PollenBlogPostPage({ page, relatedPosts, business }: Props) {
  const others = relatedPosts.filter((p) => p.slug !== page.slug);

  return (
    <PollenGeneralLayout business={business} title={page.title} subtitle="Blog">
      <FadeIn direction="up">
        <section className="bg-background py-8">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-sm font-medium text-[#3d5a28] hover:underline"
            >
              ← Back to blog
            </Link>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-[#6b7280]">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4" aria-hidden />
                {formatDate(page.createdAt)}
              </span>
            </div>
          </div>
        </section>

        <section className="bg-background pb-16">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
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
              className="prose prose-lg prose-headings:text-[#374151] prose-p:text-[#4b5563] prose-a:text-[#215935] prose-a:underline hover:prose-a:text-[#1a4729] prose-strong:text-[#374151] prose-code:text-green-700 prose-pre:border prose-pre:border-black/20 prose-pre:bg-zinc-900/50 max-w-none"
            />

            {others.length > 0 ? (
              <section className="mt-16 border-t border-[#e5e7eb] pt-12">
                <h2 className="mb-8 text-2xl font-bold tracking-wide text-[#374151]">
                  More articles
                </h2>
                <div className="grid gap-8 sm:grid-cols-2">
                  {others.map((post) => (
                    <Link
                      key={post.slug}
                      href={`/blog/${post.slug}`}
                      className="group bg-card block overflow-hidden rounded-2xl border border-[#e5e7eb] shadow-sm transition hover:border-[#A8D081]/50 hover:shadow-md"
                    >
                      <div className="relative aspect-video w-full overflow-hidden">
                        <Image
                          src={post.image ?? "/placeholder.svg"}
                          alt=""
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                          sizes="(max-width: 640px) 100vw, 432px"
                        />
                      </div>
                      <div className="p-5">
                        <p className="mb-1 text-xs text-[#6b7280]">
                          {formatDate(post.createdAt)}
                        </p>
                        <h3 className="font-semibold tracking-wide text-[#374151] transition-colors group-hover:text-[#3d5a28]">
                          {post.title}
                        </h3>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        </section>
      </FadeIn>
    </PollenGeneralLayout>
  );
}
