import type { DefaultHomepageTemplateProps } from "../../types";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";
import { db } from "~/server/db";
import { api, HydrateClient } from "~/trpc/server";

import { resolveFields } from "..";
import { SledgeGetToKnow } from "./sledge-get-to-know";
import { SledgeMosaicHero } from "./sledge-mosaic-hero";
import { SledgeSubscribe } from "./sledge-subscribe";
import { SledgeTestimonials } from "./sledge-testimonials";
import { SledgeWave } from "./sledge-wave";

export async function SledgeHomepage(_props?: DefaultHomepageTemplateProps) {
  const [homepage, flags] = await Promise.all([
    api.business.getHomepage(),
    getBusinessFlags(),
  ]);

  // `listRandom` is behind `featureGate("testimonials")` and FORBIDs when the
  // flag is off — fetched eagerly it 500s the whole homepage for a store that
  // merely disabled testimonials. The render below is already gated on the
  // same flag, so the fetch must be too (same shape as every other template's
  // homepage).
  const testimonials = flags.isEnabled("testimonials")
    ? await api.testimonial.listRandom({ limit: 6 })
    : [];

  const themeFields = homepage?.siteContent?.customFields as
    | Record<string, string>
    | undefined;

  const businessName = homepage?.name ?? "";

  const f = resolveFields(themeFields, [
    "sledge.homepage.intro-gallery",
    "sledge.homepage.hero-tagline",
    "sledge.homepage.hero-primary-button-text",
    "sledge.homepage.hero-primary-button-link",
    "sledge.homepage.get-to-know-overline",
    "sledge.homepage.get-to-know-quote",
    "sledge.homepage.get-to-know-image",
    "sledge.homepage-testimonials-heading",
    "sledge.homepage-guarantee-heading",
    "sledge.homepage-guarantee-quote",
    "sledge.homepage-guarantee-image",
  ]);

  const introGalleryId = f["sledge.homepage.intro-gallery"];
  const introGallery = introGalleryId
    ? await db.gallery.findUnique({
        where: { id: introGalleryId },
        include: { images: { orderBy: { sortOrder: "asc" } } },
      })
    : null;
  const introImages =
    introGallery?.images.map((img) => ({
      url: img.url,
      altText: img.altText,
    })) ?? [];

  const logoUrl = homepage?.siteContent?.logoUrl ?? undefined;

  return (
    <HydrateClient>
      <div className="bg-[var(--sl-cream)]">
        {/* 1. Animated mosaic gallery hero */}
        <SledgeMosaicHero
          images={introImages}
          logoUrl={logoUrl}
          tagline={
            f["sledge.homepage.hero-tagline"] ??
            "BE DIFFERENT. BE UNIQUELY YOU. BE OUTRAGEOUS."
          }
          ctaText={
            f["sledge.homepage.hero-primary-button-text"] ?? "What's New"
          }
          ctaHref={f["sledge.homepage.hero-primary-button-link"] ?? "/shop"}
          businessName={businessName}
          sectionAttrs={sectionGroupAttr("homepage", "hero")}
        />
        {/* Wave cream → green */}
        <div className="bg-[var(--sl-cream)]">
          <SledgeWave to="green" />
        </div>
        {/* 2. Get to Know Judy — grass-green block */}
        <SledgeGetToKnow
          heading={
            f["sledge.homepage.get-to-know-overline"] ?? "Get to Know Judy"
          }
          body={f["sledge.homepage.get-to-know-quote"] ?? undefined}
          image={f["sledge.homepage.get-to-know-image"] ?? undefined}
          primary={{ text: "Find Out More", href: "/about" }}
          secondary={{ text: "Contact Judy", href: "/contact" }}
          sectionAttrs={sectionGroupAttr("homepage", "getToKnow")}
        />
        {/* Wave green → cream */}
        <div className="bg-[var(--sl-green)]">
          <SledgeWave to="cream" />
        </div>
        {/* 3. Testimonials — pale-green block */}
        {flags.isEnabled("testimonials") &&
        isSectionVisible(themeFields, "sledge", "homepage.testimonials") ? (
          <SledgeTestimonials
            heading={
              f["sledge.homepage-testimonials-heading"] ?? "Testimonials"
            }
            testimonials={testimonials}
            image={f["sledge.homepage-guarantee-image"] ?? undefined}
            sectionAttrs={sectionGroupAttr("homepage", "testimonials")}
          />
        ) : null}
        {/* Wave cream → green (or cream → green if testimonials hidden) */}
        <div className="bg-[var(--sl-cream)]">
          <SledgeWave to="green" />
        </div>
        {/* 4. Subscribe — grass-green block */}
        {isSectionVisible(themeFields, "sledge", "homepage.subscribe") ? (
          <SledgeSubscribe
            image={f["sledge.homepage-guarantee-image"] ?? undefined}
            heading={f["sledge.homepage-guarantee-heading"] ?? undefined}
            body={f["sledge.homepage-guarantee-quote"] ?? undefined}
            business={homepage}
            sectionAttrs={sectionGroupAttr("homepage", "subscribe")}
          />
        ) : null}
      </div>
    </HydrateClient>
  );
}
