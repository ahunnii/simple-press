"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CalendarDays, Leaf } from "lucide-react";

import type { DefaultBlogPostPageTemplateProps } from "../../types";
import type { TiptapJSON } from "~/components/tiptap-renderer";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";
import { cn, formatDate } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import {
  FadeIn,
  PageTransition,
  StaggerContainer,
  StaggerItem,
} from "~/components/page-animations";
import { TiptapRenderer } from "~/components/tiptap-renderer";

import { resolveFields } from "../index";

type Props = DefaultBlogPostPageTemplateProps & {
  customFields?: Record<string, string>;
};

export function BambooBlogPostPage({
  page,
  relatedPosts,
  customFields,
}: Props) {
  const f = resolveFields(customFields, [
    "bamboo.blog.post-cta-heading",
    "bamboo.blog.post-cta-body",
    "bamboo.blog.post-cta-button-text",
    "bamboo.blog.post-cta-button-link",
  ]);

  const ctaHeading = f["bamboo.blog.post-cta-heading"];
  const ctaBody = f["bamboo.blog.post-cta-body"];
  const ctaButtonText = f["bamboo.blog.post-cta-button-text"];
  const ctaHref = f["bamboo.blog.post-cta-button-link"];
  const ctaVisible = isSectionVisible(customFields, "bamboo", "blog.post");

  const others = relatedPosts.filter((p) => p.slug !== page.slug).slice(0, 2);

  return (
    <PageTransition>
      <section
        className={cn(
          "bg-[var(--bam-cream-deep)] pt-12 md:pt-16",
          page?.image ? "pb-24 md:pb-28" : "pb-14 md:pb-16",
        )}
      >
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="mx-auto max-w-4xl">
            <FadeIn>
              <Link
                href="/blog"
                className="text-muted-foreground hover:text-primary mb-8 inline-flex items-center gap-2 text-sm font-medium transition-colors"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Back to blog
              </Link>
            </FadeIn>
            <FadeIn delay={0.1}>
              <h1 className="text-foreground font-serif text-3xl leading-tight font-bold md:text-4xl lg:text-5xl">
                {page.title}
              </h1>
            </FadeIn>
            <FadeIn delay={0.12}>
              <div
                className="mt-6 h-px w-16 bg-[var(--bam-gold)]/40"
                aria-hidden="true"
              />
            </FadeIn>
            <FadeIn delay={0.15}>
              <div className="text-muted-foreground mt-6 mb-8 flex flex-wrap items-center gap-5 text-sm">
                <span className="flex items-center gap-1.5">
                  <CalendarDays
                    className="text-primary h-4 w-4"
                    aria-hidden="true"
                  />
                  {formatDate(page.createdAt)}
                </span>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {page?.image && (
        <section className="pb-16">
          <div className="mx-auto max-w-7xl px-4 lg:px-8">
            <FadeIn delay={0.2} className="mx-auto max-w-4xl">
              <div className="relative -mt-14 aspect-16/7 overflow-hidden rounded-2xl border border-[var(--bam-hairline)] shadow-lg md:-mt-16">
                {/* Decorative: the article h1 right above already names it. */}
                <Image
                  src={page.image ?? "/placeholder.svg"}
                  alt=""
                  fill
                  className="object-cover"
                  priority
                  sizes="(max-width: 896px) 100vw, 896px"
                />
              </div>
            </FadeIn>
          </div>
        </section>
      )}

      <section>
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="mx-auto grid w-full max-w-4xl grid-cols-1 gap-12">
            <FadeIn direction="left">
              <article className="prose-sm md:prose prose-headings:font-heading prose-headings:text-foreground prose-p:text-muted-foreground prose-p:leading-relaxed prose-strong:text-foreground mx-auto w-full max-w-[70ch]">
                <TiptapRenderer content={page.content as TiptapJSON} />
              </article>

              {(ctaHeading ?? ctaBody) && ctaVisible && (
                <FadeIn
                  delay={0.1}
                  className={cn(others.length > 0 ? "mt-10" : "my-10")}
                >
                  <div
                    {...sectionGroupAttr("blog", "post")}
                    className="mx-auto max-w-[70ch] rounded-2xl bg-[var(--bam-forest)] p-6 text-[var(--bam-cream)] md:p-8"
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className="shrink-0 rounded-full bg-[var(--bam-gold-soft)]/20 p-3"
                        aria-hidden="true"
                      >
                        <Leaf className="h-6 w-6 text-[var(--bam-gold-soft)]" />
                      </div>
                      <div>
                        {ctaHeading ? (
                          <h2
                            className="font-heading mb-2 text-xl font-bold text-[var(--bam-cream)]"
                            {...fieldAttr("bamboo.blog.post-cta-heading")}
                          >
                            {ctaHeading}
                          </h2>
                        ) : null}
                        {ctaBody ? (
                          <p
                            className="mb-4 text-sm leading-relaxed whitespace-pre-line text-[var(--bam-cream)]/80"
                            {...fieldAttr("bamboo.blog.post-cta-body")}
                          >
                            {ctaBody}
                          </p>
                        ) : null}
                        <Button
                          asChild
                          className="group rounded-full bg-[var(--bam-cream)] text-[var(--bam-forest)] hover:bg-[var(--bam-gold-soft)]"
                        >
                          <Link href={ctaHref!}>
                            <span
                              {...fieldAttr("bamboo.blog.post-cta-button-text")}
                            >
                              {ctaButtonText}
                            </span>
                            <ArrowRight
                              className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1"
                              aria-hidden="true"
                            />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                </FadeIn>
              )}
            </FadeIn>
          </div>
        </div>
      </section>

      {others.length > 0 ? (
        <section className="bg-[var(--bam-cream-deep)] py-16 md:py-20">
          <div className="mx-auto max-w-7xl px-4 lg:px-8">
            <FadeIn className="mb-10">
              <h2 className="text-foreground font-heading text-2xl font-bold tracking-tight md:text-3xl">
                You might also like
              </h2>
            </FadeIn>
            <StaggerContainer className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {others.map((post) => (
                <StaggerItem key={post.slug}>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="group block h-full"
                  >
                    <Card className="bg-card h-full overflow-hidden border-[var(--bam-hairline)] transition-shadow hover:shadow-md">
                      <div className="relative aspect-video overflow-hidden">
                        {/* Decorative: the card shows the title as text. */}
                        <Image
                          src={post.image ?? "/placeholder.svg"}
                          alt=""
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                          sizes="(max-width: 640px) 100vw, 432px"
                        />
                      </div>
                      <CardContent className="p-5">
                        <h3 className="text-foreground font-heading group-hover:text-primary text-base leading-snug font-bold transition-colors">
                          {post.title}
                        </h3>
                      </CardContent>
                    </Card>
                  </Link>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </section>
      ) : null}
    </PageTransition>
  );
}
