"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CalendarDays, Leaf } from "lucide-react";

import type { DefaultBlogPostPageTemplateProps } from "../../types";
import type { TiptapJSON } from "~/components/tiptap-renderer";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { formatDate } from "~/lib/utils";
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

  const others = relatedPosts.filter((p) => p.slug !== page.slug);

  return (
    <PageTransition>
      <section className="bg-secondary mb-6 pt-12 pb-6">
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
              <h1 className="text-foreground font-heading text-3xl leading-tight font-bold tracking-tight md:text-4xl lg:text-5xl">
                {page.title}
              </h1>
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
              <div className="border-border/60 relative aspect-16/7 overflow-hidden rounded-2xl border shadow-lg">
                <Image
                  src={page.image ?? "/placeholder.svg"}
                  alt={page.title}
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
              <article className="prose-sm md:prose prose-headings:font-heading prose-headings:text-foreground prose-p:text-muted-foreground prose-p:leading-relaxed prose-strong:text-foreground w-full max-w-none">
                <TiptapRenderer content={page.content as TiptapJSON} />
              </article>

              {(ctaHeading ?? ctaBody) && (
                <FadeIn delay={0.1} className="mt-10">
                  <div
                    {...sectionGroupAttr("blog", "post")}
                    className="border-border/60 bg-muted/50 rounded-2xl border p-6 md:p-8"
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className="bg-primary/10 shrink-0 rounded-full p-3"
                        aria-hidden="true"
                      >
                        <Leaf className="text-primary h-6 w-6" />
                      </div>
                      <div>
                        {ctaHeading ? (
                          <h2 className="text-foreground font-heading mb-2 text-xl font-bold">
                            {ctaHeading}
                          </h2>
                        ) : null}
                        {ctaBody ? (
                          <p className="text-muted-foreground mb-4 text-sm leading-relaxed whitespace-pre-line">
                            {ctaBody}
                          </p>
                        ) : null}
                        <Button asChild className="group">
                          <Link href={ctaHref!}>
                            {ctaButtonText}
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
        <section className="border-border mt-16 border-t py-16 md:py-20">
          <div className="mx-auto max-w-7xl px-4 lg:px-8">
            <FadeIn className="mb-10">
              <h2 className="text-foreground font-heading text-2xl font-bold tracking-tight md:text-3xl">
                You might also like
              </h2>
            </FadeIn>
            <StaggerContainer className="grid max-w-5xl gap-6 sm:grid-cols-2">
              {others.map((post) => (
                <StaggerItem key={post.slug}>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="group block h-full"
                  >
                    <Card className="border-border/60 bg-card h-full overflow-hidden transition-shadow hover:shadow-lg">
                      <div className="relative aspect-video overflow-hidden">
                        <Image
                          src={post.image ?? "/placeholder.svg"}
                          alt={post.title}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
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
