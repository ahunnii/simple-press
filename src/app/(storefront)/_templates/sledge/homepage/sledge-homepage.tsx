import type { ReactNode } from "react";

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
    "sledge.homepage.get-to-know-button-1-text",
    "sledge.homepage.get-to-know-button-1-link",
    "sledge.homepage.get-to-know-button-2-text",
    "sledge.homepage.get-to-know-button-2-link",
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

  // Section visibility — drives which wave dividers below are needed so no
  // orphan wave renders between two hidden (or two same-color) sections.
  const getToKnowVisible = isSectionVisible(
    themeFields,
    "sledge",
    "homepage.getToKnow",
  );
  const testimonialsVisible =
    flags.isEnabled("testimonials") &&
    isSectionVisible(themeFields, "sledge", "homepage.testimonials");
  const subscribeVisible = isSectionVisible(
    themeFields,
    "sledge",
    "homepage.subscribe",
  );

  type BlockColor = "cream" | "green";
  const bgClass = (color: BlockColor) =>
    color === "cream" ? "bg-[var(--sl-cream)]" : "bg-[var(--sl-green)]";

  let current: BlockColor = "cream"; // the hero block's color
  const blocks: ReactNode[] = [];

  if (getToKnowVisible) {
    blocks.push(
      <div key="wave-getToKnow" className={bgClass(current)}>
        <SledgeWave to="green" />
      </div>,
      <SledgeGetToKnow
        key="getToKnow"
        heading={f["sledge.homepage.get-to-know-overline"]}
        body={f["sledge.homepage.get-to-know-quote"]}
        image={
          // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- cleared field resolves to "", not null/undefined
          f["sledge.homepage.get-to-know-image"] || undefined
        }
        button1Text={f["sledge.homepage.get-to-know-button-1-text"]}
        button1Href={f["sledge.homepage.get-to-know-button-1-link"]}
        button2Text={f["sledge.homepage.get-to-know-button-2-text"]}
        button2Href={f["sledge.homepage.get-to-know-button-2-link"]}
        sectionAttrs={sectionGroupAttr("homepage", "getToKnow")}
      />,
    );
    current = "green";
  }

  if (testimonialsVisible) {
    if (current !== "cream") {
      blocks.push(
        <div key="wave-testimonials" className={bgClass(current)}>
          <SledgeWave to="cream" />
        </div>,
      );
    }
    blocks.push(
      <SledgeTestimonials
        key="testimonials"
        heading={f["sledge.homepage-testimonials-heading"] ?? ""}
        testimonials={testimonials}
        // Reuses the Subscribe section's image field so the same photo can
        // bookend both blocks. Not tagged with its own field/group attribute
        // here — only the Subscribe render below carries that, so the
        // editor's "which section owns this field" lookup for
        // `sledge.homepage-guarantee-image` points at Subscribe, not here.
        image={
          // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- cleared field resolves to "", not null/undefined
          f["sledge.homepage-guarantee-image"] || undefined
        }
        sectionAttrs={sectionGroupAttr("homepage", "testimonials")}
      />,
    );
    current = "cream";
  }

  if (subscribeVisible) {
    if (current !== "green") {
      blocks.push(
        <div key="wave-subscribe" className={bgClass(current)}>
          <SledgeWave to="green" />
        </div>,
      );
    }
    blocks.push(
      <SledgeSubscribe
        key="subscribe"
        image={
          // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- cleared field resolves to "", not null/undefined
          f["sledge.homepage-guarantee-image"] || undefined
        }
        heading={f["sledge.homepage-guarantee-heading"] ?? ""}
        body={f["sledge.homepage-guarantee-quote"]}
        business={homepage}
        sectionAttrs={sectionGroupAttr("homepage", "subscribe")}
      />,
    );
  }

  return (
    <HydrateClient>
      <div className="bg-[var(--sl-cream)]">
        {/* 1. Animated mosaic gallery hero */}
        <SledgeMosaicHero
          images={introImages}
          logoUrl={logoUrl}
          tagline={f["sledge.homepage.hero-tagline"] ?? ""}
          ctaText={f["sledge.homepage.hero-primary-button-text"] ?? ""}
          ctaHref={f["sledge.homepage.hero-primary-button-link"] ?? ""}
          businessName={businessName}
          sectionAttrs={sectionGroupAttr("homepage", "hero")}
        />
        {blocks}
      </div>
    </HydrateClient>
  );
}
