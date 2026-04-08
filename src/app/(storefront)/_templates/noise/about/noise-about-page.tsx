import Image from "next/image";
import Link from "next/link";

import type { DefaultAboutPageTemplateProps } from "../../types";
import { getRichTextFieldValue, parseTemplateIconListRows } from "~/lib/template-fields";
import { FadeIn, PageTransition, StaggerContainer, StaggerItem } from "~/components/page-animations";
import { TiptapRenderer } from "~/components/tiptap-renderer";
import type { TiptapJSON } from "~/components/tiptap-renderer";

import { resolveFields } from "../index";

export function NoiseAboutPage({ business }: DefaultAboutPageTemplateProps) {
  const customFields = business.siteContent?.customFields as Record<string, unknown> | undefined;

  const storyBodyContent = getRichTextFieldValue(customFields as unknown, "noise.about-story-body");

  const craftsmanshipListRaw = Array.isArray(customFields?.["noise.about-craftsmanship-list"])
    ? customFields["noise.about-craftsmanship-list"]
    : null;
  const craftsmanshipItems = parseTemplateIconListRows(craftsmanshipListRaw);

  const f = resolveFields(customFields as Record<string, string> | undefined, [
    "noise.about-hero-heading",
    "noise.about-hero-image",
    "noise.about-hero-mission",
    "noise.about-hero-vision",
    "noise.about-story-heading",
    "noise.about-story-image-1",
    "noise.about-story-image-2",
    "noise.about-craftsmanship-heading",
    "noise.about-craftsmanship-banner",
    "noise.about-cta-heading",
    "noise.about-cta-button-text",
    "noise.about-cta-button-link",
  ]);

  return (
    <PageTransition>
      {/* Hero */}
      <section className="relative flex min-h-[60vh] w-full items-end overflow-hidden bg-foreground">
        {f["noise.about-hero-image"] && (
          <Image
            src={f["noise.about-hero-image"]}
            alt={f["noise.about-hero-heading"] ?? "About"}
            fill
            className="object-cover opacity-40"
            priority
            sizes="100vw"
          />
        )}
        {/* Grain overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "var(--noise-grain)",
            backgroundRepeat: "repeat",
            backgroundSize: "200px 200px",
          }}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-foreground/90 to-transparent" />
        <div className="relative z-10 w-full px-6 pb-16 md:px-12 lg:px-20">
          <FadeIn>
            <p className="mb-3 font-sans text-[9px] tracking-[0.4em] uppercase text-background/40">
              The Brand
            </p>
            <h1 className="font-serif text-5xl font-light leading-tight text-background md:text-7xl">
              {f["noise.about-hero-heading"] ?? "Visual Noise Detroit"}
            </h1>
          </FadeIn>
        </div>
      </section>

      {/* Mission + Vision */}
      <section className="mx-auto max-w-7xl px-4 py-20 lg:px-8">
        <FadeIn>
          <div className="grid gap-10 md:grid-cols-2">
            <div className="border-t border-border pt-6">
              <p className="mb-3 font-sans text-[9px] tracking-[0.4em] uppercase text-muted-foreground">
                Mission
              </p>
              <p className="font-serif text-xl font-light italic leading-relaxed text-foreground">
                {f["noise.about-hero-mission"] ??
                  "Haute Couture, High Fashion, Elegantly Sewn, The creation of exclusivity."}
              </p>
            </div>
            <div className="border-t border-border pt-6">
              <p className="mb-3 font-sans text-[9px] tracking-[0.4em] uppercase text-muted-foreground">
                Vision
              </p>
              <p className="font-serif text-xl font-light italic leading-relaxed text-foreground">
                {f["noise.about-hero-vision"] ?? "...because fashion shouldn't be quiet."}
              </p>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* Brand Story */}
      <section className="bg-secondary py-20">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="grid gap-16 lg:grid-cols-2 lg:items-start">
            {/* Images */}
            <FadeIn direction="left">
              <div className="grid grid-cols-2 gap-4">
                {f["noise.about-story-image-1"] && (
                  <div className="relative aspect-[3/4] overflow-hidden">
                    <Image
                      src={f["noise.about-story-image-1"]}
                      alt="Brand story"
                      fill
                      className="object-cover"
                      sizes="(max-width: 1024px) 50vw, 25vw"
                    />
                  </div>
                )}
                {f["noise.about-story-image-2"] && (
                  <div className="relative mt-8 aspect-[3/4] overflow-hidden">
                    <Image
                      src={f["noise.about-story-image-2"]}
                      alt="Brand story"
                      fill
                      className="object-cover"
                      sizes="(max-width: 1024px) 50vw, 25vw"
                    />
                  </div>
                )}
                {!f["noise.about-story-image-1"] && !f["noise.about-story-image-2"] && (
                  <div className="col-span-2 aspect-[4/3] bg-muted" />
                )}
              </div>
            </FadeIn>

            {/* Text */}
            <FadeIn direction="right" delay={0.15}>
              <p className="mb-4 font-sans text-[9px] tracking-[0.4em] uppercase text-muted-foreground">
                Our Story
              </p>
              <h2 className="mb-8 font-serif text-3xl font-light leading-tight text-foreground md:text-4xl">
                {f["noise.about-story-heading"] ?? "...because fashion shouldn't be quiet"}
              </h2>
              {storyBodyContent ? (
                <TiptapRenderer
                  content={storyBodyContent as TiptapJSON}
                  className="prose prose-sm max-w-none text-muted-foreground [&_p]:font-sans [&_p]:text-muted-foreground"
                />
              ) : (
                <p className="font-sans text-base leading-relaxed text-muted-foreground">
                  Visual Noise was born in the streets of Detroit — a city that refuses to
                  be ignored. Our crochet haute couture pieces are more than garments.
                  They&apos;re declarations. Each stitch is placed with purpose, each silhouette
                  designed to command attention.
                </p>
              )}
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Craftsmanship */}
      {(craftsmanshipItems ?? f["noise.about-craftsmanship-heading"]) && (
        <section className="py-20">
          <div className="mx-auto max-w-7xl px-4 lg:px-8">
            <FadeIn className="mb-12">
              <p className="mb-3 font-sans text-[9px] tracking-[0.4em] uppercase text-muted-foreground">
                Craftsmanship
              </p>
              <h2 className="font-serif text-3xl font-light text-foreground md:text-4xl">
                {f["noise.about-craftsmanship-heading"] ?? "Handcrafted Excellence"}
              </h2>
              {f["noise.about-craftsmanship-banner"] && (
                <p className="mt-4 font-serif italic text-lg text-muted-foreground">
                  {f["noise.about-craftsmanship-banner"]}
                </p>
              )}
            </FadeIn>

            {craftsmanshipItems && craftsmanshipItems.length > 0 && (
              <StaggerContainer
                className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4"
                staggerDelay={0.08}
              >
                {craftsmanshipItems.map((item, i) => (
                  <StaggerItem key={i}>
                    <div className="border-t border-border pt-5">
                      <item.icon className="mb-3 size-5 text-muted-foreground" />
                      <h3 className="font-sans text-xs tracking-[0.15em] uppercase text-foreground">
                        {item.title}
                      </h3>
                      <p className="mt-2 font-sans text-sm leading-relaxed text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                  </StaggerItem>
                ))}
              </StaggerContainer>
            )}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="bg-foreground py-20">
        <FadeIn className="mx-auto max-w-7xl px-4 text-center lg:px-8">
          <h2 className="font-serif text-4xl font-light text-background md:text-5xl">
            {f["noise.about-cta-heading"] ?? "Wear the Noise"}
          </h2>
          <div className="mt-8">
            <Link
              href={f["noise.about-cta-button-link"] ?? "/shop"}
              className="inline-block border border-background/50 px-10 py-3 font-sans text-[10px] tracking-[0.3em] uppercase text-background transition-all hover:border-background hover:bg-background hover:text-foreground"
            >
              {f["noise.about-cta-button-text"] ?? "Shop Now"}
            </Link>
          </div>
        </FadeIn>
      </section>
    </PageTransition>
  );
}
