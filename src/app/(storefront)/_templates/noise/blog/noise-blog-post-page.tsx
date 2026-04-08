"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import type { DefaultBlogPostPageTemplateProps } from "../../types";
import type { TiptapJSON } from "~/components/tiptap-renderer";
import { formatDate } from "~/lib/utils";
import { FadeIn, PageTransition, StaggerContainer, StaggerItem } from "~/components/page-animations";
import { TiptapRenderer } from "~/components/tiptap-renderer";

export function NoiseBlogPostPage({
  page,
  relatedPosts,
}: DefaultBlogPostPageTemplateProps) {
  return (
    <PageTransition>
      {/* Article Header */}
      <section className="relative overflow-hidden bg-foreground pb-16 pt-24">
        {/* Grain overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "var(--noise-grain)",
            backgroundRepeat: "repeat",
            backgroundSize: "200px 200px",
          }}
        />
        <div className="relative z-10 mx-auto max-w-4xl px-4 lg:px-8">
          <FadeIn>
            <Link
              href="/blog"
              className="mb-10 inline-flex items-center gap-2 font-sans text-[10px] tracking-[0.25em] uppercase text-white/40 transition-colors hover:text-white/80"
            >
              <ArrowLeft className="h-3 w-3" />
              The Edit
            </Link>
          </FadeIn>
          <FadeIn delay={0.08}>
            <p className="mb-4 font-sans text-[9px] tracking-[0.4em] uppercase text-white/40">
              {formatDate(page.createdAt)}
            </p>
            <h1 className="font-serif text-4xl font-light leading-tight text-white md:text-5xl lg:text-6xl">
              {page.title}
            </h1>
          </FadeIn>
          {page.excerpt && (
            <FadeIn delay={0.14}>
              <p className="mt-6 max-w-2xl font-serif text-lg font-light italic text-white/60">
                {page.excerpt}
              </p>
            </FadeIn>
          )}
        </div>
      </section>

      {/* Hero image */}
      {page.image && (
        <FadeIn delay={0.1}>
          <div className="mx-auto max-w-4xl px-4 lg:px-8">
            <div className="relative -mt-8 aspect-[16/7] overflow-hidden">
              <Image
                src={page.image}
                alt={page.title}
                fill
                className="object-cover"
                priority
                sizes="(max-width: 1024px) 100vw, 896px"
              />
            </div>
          </div>
        </FadeIn>
      )}

      {/* Article body */}
      <section className="mx-auto max-w-4xl px-4 py-16 lg:px-8">
        <FadeIn>
          <article className="prose prose-sm md:prose-base max-w-none prose-headings:font-serif prose-headings:font-light prose-headings:tracking-tight prose-headings:text-foreground prose-p:font-sans prose-p:text-muted-foreground prose-p:leading-relaxed prose-strong:text-foreground prose-a:text-foreground prose-a:underline prose-a:underline-offset-4">
            <TiptapRenderer content={page.content as TiptapJSON} />
          </article>
        </FadeIn>

        {/* CTA band */}
        <FadeIn delay={0.1} className="mt-16 border-t border-b border-border py-10">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-serif text-2xl font-light text-foreground">
                Wear the Noise.
              </p>
              <p className="mt-1 font-sans text-sm text-muted-foreground">
                Fashion that dances. Garments that fly.
              </p>
            </div>
            <Link
              href="/shop"
              className="shrink-0 border border-foreground px-8 py-2.5 font-sans text-[10px] tracking-[0.25em] uppercase text-foreground transition-all hover:bg-foreground hover:text-background"
            >
              Shop the Collection
            </Link>
          </div>
        </FadeIn>
      </section>

      {/* Related posts */}
      {relatedPosts.length > 0 && (
        <section className="border-t border-border bg-secondary py-16">
          <div className="mx-auto max-w-7xl px-4 lg:px-8">
            <FadeIn className="mb-10">
              <p className="mb-2 font-sans text-[9px] tracking-[0.4em] uppercase text-muted-foreground">
                Continue Reading
              </p>
              <h2 className="font-serif text-2xl font-light text-foreground">
                More from The Edit
              </h2>
            </FadeIn>
            <StaggerContainer
              className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3"
              staggerDelay={0.08}
            >
              {relatedPosts
                .filter((p) => p.slug !== page.slug)
                .slice(0, 3)
                .map((post) => (
                  <StaggerItem key={post.slug}>
                    <Link href={`/blog/${post.slug}`} className="group block">
                      <div className="relative mb-4 aspect-[4/3] overflow-hidden">
                        <Image
                          src={post.image ?? "/placeholder.svg"}
                          alt={post.title}
                          fill
                          className="object-cover transition-transform duration-700 group-hover:scale-105"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        />
                      </div>
                      <p className="mb-1.5 font-sans text-[9px] tracking-[0.3em] uppercase text-muted-foreground">
                        {formatDate(post.createdAt)}
                      </p>
                      <h3 className="font-serif text-lg font-light leading-snug text-foreground transition-opacity group-hover:opacity-70">
                        {post.title}
                      </h3>
                    </Link>
                  </StaggerItem>
                ))}
            </StaggerContainer>
          </div>
        </section>
      )}
    </PageTransition>
  );
}
