"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import type { DefaultBlogPostPageTemplateProps } from "../../types";
import type { TiptapJSON } from "~/components/tiptap-renderer";
import { formatDate } from "~/lib/utils";
import { TiptapRenderer } from "~/components/tiptap-renderer";
import { PlatformPolicyNotice } from "~/components/platform-policy-notice";

import { DarkTrendGeneralLayout } from "../dark-trend-general-layout";

export function DarkTrendBlogPostPage({
  page,
  relatedPosts,
}: DefaultBlogPostPageTemplateProps) {
  const others = relatedPosts.filter((p) => p.slug !== page.slug);

  return (
    <>
      <DarkTrendGeneralLayout
        title={page.title}
        excerpt={page.excerpt ?? undefined}
        parentBreadcrumb={{ label: "Blog", href: "/blog" }}
        topContent={
          <>
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-sm font-medium text-white/70 transition-colors hover:text-purple-400"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to blog
            </Link>
            <p className="mt-4 text-sm font-medium tracking-wider text-purple-400 uppercase">
              {formatDate(page.createdAt)}
            </p>
          </>
        }
      >
        {page.image ? (
          <div className="relative mx-auto mb-12 aspect-16/7 max-w-4xl overflow-hidden rounded-xl">
            <Image
              src={page.image}
              alt={page.title}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 1024px) 100vw, 896px"
            />
          </div>
        ) : null}

        <div className="mx-auto max-w-4xl">
          <TiptapRenderer
            content={page.content as TiptapJSON}
            className="prose prose-lg prose-invert prose-headings:text-white prose-p:text-white/80 prose-a:text-purple-400 prose-a:no-underline hover:prose-a:text-purple-300 prose-strong:text-white prose-code:text-purple-400 prose-pre:bg-zinc-900/50 prose-pre:border prose-pre:border-white/20 max-w-none"
          />
          <PlatformPolicyNotice slug={page.slug} />
        </div>
      </DarkTrendGeneralLayout>

      {others.length > 0 ? (
        <section className="border-t border-white/10 bg-[#141414] px-4 py-16">
          <div className="mx-auto max-w-7xl">
            <h2 className="mb-10 text-center text-2xl font-bold text-white md:text-left">
              More stories
            </h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {others.slice(0, 6).map((post) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="group block"
                >
                  <div className="overflow-hidden rounded-xl bg-[#1F1F1F] transition-transform group-hover:scale-[1.02]">
                    <div className="relative aspect-4/3 overflow-hidden">
                      <Image
                        src={post.image ?? "/placeholder.svg"}
                        alt={post.title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                      <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent" />
                      <div className="absolute right-0 bottom-0 left-0 p-5">
                        <p className="mb-1 text-xs font-medium tracking-wider text-purple-400 uppercase">
                          {formatDate(post.createdAt)}
                        </p>
                        <h3 className="text-lg font-bold text-white">
                          {post.title}
                        </h3>
                      </div>
                    </div>
                    {post.excerpt ? (
                      <div className="p-5">
                        <p className="line-clamp-2 text-sm text-white/70">
                          {post.excerpt}
                        </p>
                      </div>
                    ) : null}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
