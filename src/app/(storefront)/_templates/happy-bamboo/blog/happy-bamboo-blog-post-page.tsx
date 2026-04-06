"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock,
  Leaf,
  Share2,
  Tag,
} from "lucide-react";

import type { DefaultBlogPostPageTemplateProps } from "../../types";
import type { TiptapJSON } from "~/components/tiptap-renderer";
import { formatDate } from "~/lib/utils";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Separator } from "~/components/ui/separator";
import {
  FadeIn,
  PageTransition,
  StaggerContainer,
  StaggerItem,
} from "~/components/page-animations";
import { TiptapRenderer } from "~/components/tiptap-renderer";

const keyTakeaways = [
  "Bamboo grows up to 3 feet per day and needs no replanting",
  "Making bamboo pulp uses up to 30% less water than tree pulp",
  "Bamboo absorbs 35% more CO₂ than equivalent trees",
  "No bleach or harsh chemicals in Happy Bamboo tissue",
  "Our packaging is 100% plastic-free and fully recyclable",
];

// const relatedPosts = [
//   {
//     slug: "sustainable-bathroom-swaps",
//     title: "Simple Sustainable Swaps for a Greener Bathroom",
//     image: "/images/blog-sustainable-living.jpg",
//     category: "Eco Living",
//     readTime: "4 min read",
//   },
//   {
//     slug: "bamboo-vs-regular-toilet-paper",
//     title: "Bamboo vs. Regular Toilet Paper: What the Numbers Say",
//     image: "/images/blog-bamboo-vs-trees.jpg",
//     category: "Education",
//     readTime: "5 min read",
//   },
// ];

export function HappyBambooBlogPostPage({
  page,
  relatedPosts,
}: DefaultBlogPostPageTemplateProps) {
  return (
    <PageTransition>
      {/* Post Header */}
      <section className="pt-12 pb-0 md:pt-16">
        <div className="container mx-auto px-4">
          {/* <FadeIn>
            <Link
              href="/blog"
              className="text-muted-foreground hover:text-primary mb-8 inline-flex items-center gap-2 text-sm font-medium transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Blog
            </Link>
          </FadeIn> */}

          <div className="mx-auto max-w-4xl">
            <FadeIn>
              <Link
                href="/blog"
                className="text-muted-foreground hover:text-primary mb-8 inline-flex items-center gap-2 text-sm font-medium transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Blog
              </Link>
            </FadeIn>
            <FadeIn delay={0.1}>
              <h1 className="mb-6 font-serif text-3xl leading-tight font-bold md:text-4xl lg:text-5xl">
                {page.title}
              </h1>
            </FadeIn>
            <FadeIn delay={0.15}>
              <div className="text-muted-foreground mb-8 flex flex-wrap items-center gap-5 text-sm">
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="text-primary h-4 w-4" />
                  {formatDate(page.createdAt)}
                </span>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Featured Image */}
      {page.image && (
        <section className="pb-16">
          <div className="container mx-auto px-4">
            <FadeIn delay={0.2} className="mx-auto max-w-4xl">
              <div className="relative aspect-16/7 overflow-hidden rounded-2xl shadow-lg">
                <Image
                  src={page.image ?? "/placeholder.svg"}
                  alt={page.title}
                  fill
                  className="object-cover"
                  priority
                />
              </div>
            </FadeIn>
          </div>
        </section>
      )}

      {/* Article Body + Sidebar */}
      <section>
        <div className="container mx-auto px-4">
          <div className="mx-auto grid w-full max-w-4xl grid-cols-1 gap-12">
            {" "}
            {/*lg:grid-cols-[1fr_280px] */}
            {/* Article Content */}
            <FadeIn direction="left">
              <article className="prose-sm md:prose prose-headings: prose-headings:text-foreground prose-p:text-muted-foreground prose-p:leading-relaxed prose-strong:text-foreground w-full max-w-5xl!">
                <TiptapRenderer content={page.content as TiptapJSON} />
              </article>

              {/* CTA */}
              <FadeIn delay={0.1} className="mt-10">
                <div className="border-border bg-muted/50 rounded-2xl border p-6 md:p-8">
                  <div className="flex items-start gap-4">
                    <div className="bg-primary/10 shrink-0 rounded-full p-3">
                      <Leaf className="text-primary h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="mb-2 text-xl font-bold">
                        Try Happy Bamboo Today
                      </h3>
                      <p className="text-muted-foreground mb-4 text-sm leading-relaxed">
                        Experience the softness, strength, and sustainability of
                        our premium bamboo tissue. Free shipping on orders over
                        $30.
                      </p>
                      <Button asChild className="group">
                        <Link href="/shop">
                          Shop Now
                          <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </FadeIn>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Related Posts */}
      <section className="border-border border-t py-16 md:py-20">
        <div className="container mx-auto px-4">
          <FadeIn className="mb-10">
            <h2 className="text-2xl font-bold md:text-3xl">
              You Might Also Like
            </h2>
          </FadeIn>
          <StaggerContainer className="grid max-w-3xl gap-6 sm:grid-cols-2 lg:grid-cols-2">
            {relatedPosts.map((post) => (
              <StaggerItem key={post.slug}>
                <Link
                  href={`/blog/${post.slug}`}
                  className="group block h-full"
                >
                  <Card className="border-border h-full overflow-hidden transition-shadow hover:shadow-lg">
                    <div className="relative aspect-video overflow-hidden">
                      <Image
                        src={post.image ?? "/placeholder.svg"}
                        alt={post.title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                    <CardContent className="p-5">
                      {/* <Badge variant="secondary" className="mb-2 w-fit text-xs">
                        <Tag className="mr-1 h-3 w-3" />
                        {post.category}
                      </Badge> */}
                      <h3 className="group-hover:text-primary text-base leading-snug font-bold transition-colors">
                        {post.title}
                      </h3>
                      {/* <p className="text-muted-foreground mt-2 flex items-center gap-1.5 text-xs">
                        <Clock className="h-3.5 w-3.5" />
                        {post.readTime}
                      </p> */}
                    </CardContent>
                  </Card>
                </Link>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>
    </PageTransition>
  );
}
