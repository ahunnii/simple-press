import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import type { DefaultBlogPostPageTemplateProps } from "../../types";
import type { TiptapJSON } from "~/components/tiptap-renderer";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";
import { formatDate } from "~/lib/utils";
import { TiptapRenderer } from "~/components/tiptap-renderer";

import { resolveFields } from "../index";
import { BambooEdge } from "../shared/bamboo-edge";
import { BambooGlyph } from "../shared/bamboo-glyph";
import { BambooReveal, BambooRevealGroup } from "../shared/bamboo-reveal";
import { BambooPostCard } from "./bamboo-post-card";

type Props = DefaultBlogPostPageTemplateProps & {
  customFields?: Record<string, string>;
};

export function BambooBlogPostPage({
  page,
  relatedPosts,
  customFields,
}: Props) {
  const f = resolveFields(customFields, [
    "animated-bamboo.blog.post-cta-heading",
    "animated-bamboo.blog.post-cta-body",
    "animated-bamboo.blog.post-cta-button-text",
    "animated-bamboo.blog.post-cta-button-link",
  ]);

  const ctaHeading = f["animated-bamboo.blog.post-cta-heading"] ?? "";
  const ctaBody = f["animated-bamboo.blog.post-cta-body"] ?? "";
  const ctaButtonText = f["animated-bamboo.blog.post-cta-button-text"] ?? "";
  const ctaHref = f["animated-bamboo.blog.post-cta-button-link"] ?? "";

  // The section is hideable, so the rail's eye toggle gates it; an owner who
  // empties both copy fields also gets nothing rather than an empty sage band.
  const showCta =
    isSectionVisible(customFields, "animated-bamboo", "blog.post") &&
    (ctaHeading.length > 0 || ctaBody.length > 0);

  const others = relatedPosts.filter((p) => p.slug !== page.slug);

  return (
    <>
      {/* ── Masthead — calm paper, no band ─────────────────────────────── */}
      <section className="pt-[clamp(30px,3.8vw,58px)]">
        <div className="mx-auto w-full max-w-[1200px] px-6">
          <div className="mx-auto max-w-[760px]">
            <BambooReveal>
              <Link
                href="/blog"
                className="bamboo-swipe inline-flex items-center gap-2 text-[0.92rem] text-[var(--bamboo-pine)]"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Back to Insights
              </Link>
            </BambooReveal>

            <BambooReveal style={{ "--rd": "80ms" } as React.CSSProperties}>
              <h1 className="font-heading mt-7 text-[clamp(2.1rem,4vw,3.1rem)] leading-[1.08] font-bold tracking-[-0.026em] text-balance text-[var(--bamboo-pine)]">
                {page.title}
              </h1>

              {/* byline row — her wreath mark stands in for an author avatar */}
              <p className="mt-6 flex flex-wrap items-center gap-3">
                <BambooGlyph id="s-wreath" className="h-8 w-auto shrink-0" />
                <time
                  className="text-[0.92rem] font-medium text-[var(--bamboo-muted)]"
                  dateTime={new Date(page.createdAt).toISOString()}
                >
                  {formatDate(page.createdAt)}
                </time>
              </p>

              {page.excerpt ? (
                <p className="mt-5 max-w-[60ch] text-[1.08rem] leading-[1.6] text-[var(--bamboo-ink-soft)]">
                  {page.excerpt}
                </p>
              ) : null}
            </BambooReveal>
          </div>
        </div>
      </section>

      {/* `isolate` on the cover section: the photo frame's ground-shadow
          `::after` sits at z-index:-1, which without a stacking context here
          would paint beneath the template root's paper background and vanish. */}
      {page.image ? (
        <section className="isolate mt-[clamp(26px,3.2vw,46px)]">
          <div className="mx-auto w-full max-w-[1200px] px-6">
            <BambooReveal className="mx-auto max-w-[760px]">
              <figure className="bamboo-photo-card">
                <span className="relative block aspect-[16/9] w-full overflow-hidden rounded-lg">
                  <Image
                    src={page.image}
                    alt=""
                    fill
                    priority
                    sizes="(max-width: 820px) 92vw, 760px"
                    className="object-cover"
                  />
                </span>
                <span className="bamboo-photo-badge" aria-hidden="true">
                  <BambooGlyph id="s-wreath" className="block h-auto w-full" />
                </span>
              </figure>
            </BambooReveal>
          </div>
        </section>
      ) : null}

      {/* ── The read ───────────────────────────────────────────────────── */}
      <section className="pt-[clamp(30px,3.6vw,54px)] pb-[clamp(48px,5.4vw,84px)]">
        <div className="mx-auto w-full max-w-[1200px] px-6">
          <BambooReveal className="mx-auto max-w-[760px]">
            <article>
              <TiptapRenderer
                content={page.content as TiptapJSON}
                className="bamboo-prose"
              />
            </article>
          </BambooReveal>
        </div>
      </section>

      {/* ── Keep reading ───────────────────────────────────────────────── */}
      {others.length > 0 ? (
        <section
          aria-labelledby="bamboo-related-heading"
          className="pb-[clamp(52px,5.6vw,88px)]"
        >
          <div className="mx-auto w-full max-w-[1200px] px-6">
            <BambooReveal>
              <h2
                id="bamboo-related-heading"
                className="font-heading text-[clamp(1.4rem,2.2vw,1.9rem)] font-bold tracking-[-0.018em] text-[var(--bamboo-pine)]"
              >
                Keep reading
              </h2>
            </BambooReveal>
            <BambooRevealGroup className="mt-[clamp(20px,2.4vw,34px)] grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
              {others.slice(0, 3).map((post, i) => (
                <BambooPostCard key={post.slug} post={post} index={i} />
              ))}
            </BambooRevealGroup>
          </div>
        </section>
      ) : null}

      {/* ── Closing CTA (hideable) → torn edge into the pine footer ────── */}
      {showCta ? (
        <>
          <BambooEdge
            from="paper"
            to="sage"
            variant="b"
            leaves={[
              { id: "s-leaf", l: "22%", t: "10%", w: "24px", r: "-16deg" },
              { id: "s-leaf-l", l: "68%", t: "4%", w: "26px", r: "12deg" },
            ]}
          />

          <section
            {...sectionGroupAttr("blog", "post")}
            className="relative overflow-hidden"
            style={{
              background: "var(--bamboo-sage)",
              paddingBlock: "clamp(52px,6vw,88px)",
            }}
          >
            <div
              className="pointer-events-none absolute inset-0"
              aria-hidden="true"
            >
              <span
                className="bamboo-drift"
                style={
                  {
                    "--l": "12%",
                    "--t": "-6%",
                    "--w": "26px",
                    "--dur": "17s",
                    "--dl": "-5s",
                    "--dx": "92px",
                    "--dy": "300px",
                    "--dr": "160deg",
                  } as React.CSSProperties
                }
              >
                <BambooGlyph id="s-leaf" />
              </span>
              <span className="hidden md:block">
                <span
                  className="bamboo-drift"
                  style={
                    {
                      "--l": "82%",
                      "--t": "-8%",
                      "--w": "22px",
                      "--dur": "21s",
                      "--dl": "-13s",
                      "--dx": "-70px",
                      "--dy": "320px",
                      "--dr": "-140deg",
                    } as React.CSSProperties
                  }
                >
                  <BambooGlyph id="s-leaf-d" />
                </span>
              </span>
            </div>

            <div className="relative mx-auto w-full max-w-[1200px] px-6 text-center">
              <BambooReveal className="mx-auto max-w-[620px]">
                <BambooGlyph id="s-wreath" className="mx-auto h-11 w-auto" />
                {ctaHeading ? (
                  <h2
                    className="font-heading mt-4 text-[clamp(1.75rem,3vw,2.6rem)] leading-[1.1] font-bold tracking-[-0.022em] text-balance text-[var(--bamboo-pine)]"
                    {...fieldAttr("animated-bamboo.blog.post-cta-heading")}
                  >
                    {ctaHeading}
                  </h2>
                ) : null}
                {ctaBody ? (
                  <p
                    className="mx-auto mt-4 max-w-[46ch] text-[1.05rem] leading-[1.6] whitespace-pre-line text-[var(--bamboo-ink)]"
                    {...fieldAttr("animated-bamboo.blog.post-cta-body")}
                  >
                    {ctaBody}
                  </p>
                ) : null}
                {ctaButtonText && ctaHref ? (
                  <Link
                    href={ctaHref}
                    className="bamboo-btn bamboo-btn-primary mt-8 inline-flex"
                  >
                    <span
                      {...fieldAttr(
                        "animated-bamboo.blog.post-cta-button-text",
                      )}
                    >
                      {ctaButtonText}
                    </span>
                  </Link>
                ) : null}
              </BambooReveal>
            </div>
          </section>

          <BambooEdge from="sage" to="pine" variant="c" />
        </>
      ) : (
        <BambooEdge from="paper" to="pine" variant="c" />
      )}
    </>
  );
}
