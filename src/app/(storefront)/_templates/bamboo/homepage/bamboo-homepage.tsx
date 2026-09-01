import type { Product } from "~/types";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";
import {
  genericTextRowSchema,
  getListFieldValue,
  parseTemplateIconListRows,
} from "~/lib/template-fields";
import { api, HydrateClient } from "~/trpc/server";
import { PageTransition } from "~/components/page-animations";

import {
  DEFAULT_BAMBOO_LOCATION_FACTS,
  DEFAULT_BAMBOO_PROMISES,
  DEFAULT_BAMBOO_WHY_BAMBOO_FACTS,
} from ".";
import { resolveFields } from "..";
import { BambooEdge } from "../shared/bamboo-edge";
import { BambooHomeAboutTeaser } from "./sections/bamboo-home-about-teaser";
import { BambooHomeFeatured } from "./sections/bamboo-home-featured";
import { BambooHomeHero } from "./sections/bamboo-home-hero";
import { BambooHomeLocation } from "./sections/bamboo-home-location";
import { BambooHomeTestimonials } from "./sections/bamboo-home-testimonials";
import { BambooHomeWhyBamboo } from "./sections/bamboo-home-why-bamboo";

/**
 * Thin server orchestrator: fetches homepage data, resolves fields, gates
 * hideable sections, and lays out the six homepage sections with the torn-
 * leaf `BambooEdge` dividers between them in mockup order (see
 * `docs/templates/bamboo/build/mockup-refs/mockup-b.elided.html`) — sage(hero)
 * -> paper(featured) -> sage(why-bamboo) -> paper(about+testimonials, no
 * seam, same color) -> sage(location) -> pine(footer, rendered by the
 * template layout that wraps this page's output).
 *
 * Data-fetch contract is unchanged from the pre-redesign monolith — this
 * component keeps its zero-prop signature; it's wired directly in
 * `src/app/page.tsx`, which this build does not touch.
 */

function parseTextListRows(
  raw: unknown,
  defaultList: { title: string; description: string }[],
): { title: string; description: string }[] {
  if (!Array.isArray(raw)) return defaultList;
  const out: { title: string; description: string }[] = [];
  for (const row of raw) {
    const parsed = genericTextRowSchema.safeParse(row);
    if (parsed.success) {
      out.push({
        title: parsed.data.title,
        description: parsed.data.description,
      });
    }
  }
  return out.length > 0 ? out : defaultList;
}

export async function BambooHomepage() {
  const [homepage, flags] = await Promise.all([
    api.business.getHomepage(),
    getBusinessFlags(),
  ]);

  const testimonials = flags.isEnabled("testimonials")
    ? await api.testimonial.listRandom({ limit: 3 })
    : [];

  const customFields = homepage?.siteContent?.customFields;

  const f = resolveFields(customFields, [
    "bamboo.homepage.hero-title",
    "bamboo.homepage.hero-tagline",
    "bamboo.homepage.hero-image",
    "bamboo.homepage.hero-description",
    "bamboo.homepage.hero-primary-button-text",
    "bamboo.homepage.hero-primary-button-link",
    "bamboo.homepage.hero-secondary-button-text",
    "bamboo.homepage.hero-secondary-button-link",
    "bamboo.homepage.featured-title",
    "bamboo.homepage.featured-description",
    "bamboo.homepage.featured-button-text",
    "bamboo.homepage.featured-button-link",
    "bamboo.homepage.sustainability-heading",
    "bamboo.homepage.sustainability-intro",
    "bamboo.homepage.about-teaser-heading",
    "bamboo.homepage.about-teaser-body",
    "bamboo.homepage.about-teaser-button-text",
    "bamboo.homepage.about-teaser-button-link",
    "bamboo.homepage.testimonials-heading",
    "bamboo.homepage.location-heading",
    "bamboo.homepage.location-intro",
    "bamboo.homepage.location-photo",
    "bamboo.homepage.location-photo-caption",
  ]);

  // Icon components can't cross the RSC boundary into the "use client"
  // timeline — pre-render each row's icon to a node here on the server.
  const whyBambooStations = (
    parseTemplateIconListRows(
      getListFieldValue(customFields, "bamboo.homepage.sustainability-list"),
      DEFAULT_BAMBOO_WHY_BAMBOO_FACTS,
    ) ?? DEFAULT_BAMBOO_WHY_BAMBOO_FACTS
  ).map(({ icon: Icon, title, description }) => ({
    title,
    description,
    iconNode: Icon ? (
      <Icon className="h-8 w-8 text-[var(--bamboo-pine)]" aria-hidden="true" />
    ) : undefined,
  }));
  const promises = parseTextListRows(
    getListFieldValue(customFields, "bamboo.homepage.about-teaser-list"),
    DEFAULT_BAMBOO_PROMISES,
  );
  const locationFacts = parseTextListRows(
    getListFieldValue(customFields, "bamboo.homepage.location-list"),
    DEFAULT_BAMBOO_LOCATION_FACTS,
  );

  const products = (homepage?.products ?? []) as Product[];

  const showWhyBamboo = isSectionVisible(
    customFields,
    "bamboo",
    "homepage.sustainability",
  );
  const showTestimonials =
    testimonials.length > 0 &&
    isSectionVisible(customFields, "bamboo", "homepage.testimonials");
  const showLocation = isSectionVisible(
    customFields,
    "bamboo",
    "homepage.location",
  );

  return (
    <HydrateClient>
      <PageTransition>
        <BambooHomeHero
          sectionAttrs={sectionGroupAttr("homepage", "hero")}
          titleFieldKey="bamboo.homepage.hero-title"
          title={f["bamboo.homepage.hero-title"] ?? ""}
          taglineFieldKey="bamboo.homepage.hero-tagline"
          tagline={f["bamboo.homepage.hero-tagline"] ?? ""}
          descriptionFieldKey="bamboo.homepage.hero-description"
          description={f["bamboo.homepage.hero-description"] ?? ""}
          primaryTextFieldKey="bamboo.homepage.hero-primary-button-text"
          primaryText={f["bamboo.homepage.hero-primary-button-text"] ?? ""}
          primaryLink={f["bamboo.homepage.hero-primary-button-link"] ?? "/shop"}
          secondaryTextFieldKey="bamboo.homepage.hero-secondary-button-text"
          secondaryText={f["bamboo.homepage.hero-secondary-button-text"] ?? ""}
          secondaryLink={
            f["bamboo.homepage.hero-secondary-button-link"] ?? "/about"
          }
          heroImage={f["bamboo.homepage.hero-image"] ?? "/placeholder.svg"}
          heroImageLabel="Hero Photo"
        />
        <BambooEdge
          from="sage"
          to="paper"
          variant="a"
          leaves={[
            { id: "s-leaf-d", l: "14%", t: "6%", w: "28px", r: "-24deg" },
            { id: "s-leaf", l: "46%", t: "34%", w: "22px", r: "18deg" },
            { id: "s-leaf-l", l: "73%", t: "2%", w: "25px", r: "-9deg" },
          ]}
        />

        <BambooHomeFeatured
          sectionAttrs={sectionGroupAttr("homepage", "featured")}
          titleFieldKey="bamboo.homepage.featured-title"
          title={f["bamboo.homepage.featured-title"] ?? ""}
          descriptionFieldKey="bamboo.homepage.featured-description"
          description={f["bamboo.homepage.featured-description"] ?? ""}
          buttonTextFieldKey="bamboo.homepage.featured-button-text"
          buttonText={f["bamboo.homepage.featured-button-text"] ?? ""}
          buttonLink={f["bamboo.homepage.featured-button-link"] ?? "/shop"}
          products={products}
        />

        {showWhyBamboo && (
          <>
            <BambooEdge from="paper" to="sage" variant="b" />
            <BambooHomeWhyBamboo
              sectionAttrs={sectionGroupAttr("homepage", "sustainability")}
              headingFieldKey="bamboo.homepage.sustainability-heading"
              heading={f["bamboo.homepage.sustainability-heading"] ?? ""}
              introFieldKey="bamboo.homepage.sustainability-intro"
              intro={f["bamboo.homepage.sustainability-intro"] ?? ""}
              stations={whyBambooStations ?? []}
            />
            <BambooEdge from="sage" to="paper" variant="c" />
          </>
        )}

        <BambooHomeAboutTeaser
          sectionAttrs={sectionGroupAttr("homepage", "aboutTeaser")}
          headingFieldKey="bamboo.homepage.about-teaser-heading"
          heading={f["bamboo.homepage.about-teaser-heading"] ?? ""}
          bodyFieldKey="bamboo.homepage.about-teaser-body"
          body={f["bamboo.homepage.about-teaser-body"] ?? ""}
          buttonTextFieldKey="bamboo.homepage.about-teaser-button-text"
          buttonText={f["bamboo.homepage.about-teaser-button-text"] ?? ""}
          buttonLink={f["bamboo.homepage.about-teaser-button-link"] ?? "/about"}
          promises={promises}
        />

        {showTestimonials && (
          <BambooHomeTestimonials
            sectionAttrs={sectionGroupAttr("homepage", "testimonials")}
            headingFieldKey="bamboo.homepage.testimonials-heading"
            heading={f["bamboo.homepage.testimonials-heading"] ?? ""}
            testimonials={testimonials}
          />
        )}

        {showLocation && (
          <>
            <BambooEdge from="paper" to="sage" variant="b" />
            <BambooHomeLocation
              sectionAttrs={sectionGroupAttr("homepage", "location")}
              headingFieldKey="bamboo.homepage.location-heading"
              heading={f["bamboo.homepage.location-heading"] ?? ""}
              introFieldKey="bamboo.homepage.location-intro"
              intro={f["bamboo.homepage.location-intro"] ?? ""}
              facts={locationFacts}
              photo={f["bamboo.homepage.location-photo"] ?? "/placeholder.svg"}
              photoLabel="Location Photo"
              captionFieldKey="bamboo.homepage.location-photo-caption"
              caption={f["bamboo.homepage.location-photo-caption"] ?? ""}
            />
          </>
        )}

        {/* Location is always the last sage band before the footer — but an
            owner can hide it (or why-bamboo/testimonials), so the actual
            last-rendered section's background isn't fixed. Always close with
            exactly one torn edge into the pine footer, using whichever color
            that last section really is (paper if location is hidden). */}
        <BambooEdge
          from={showLocation ? "sage" : "paper"}
          to="pine"
          variant="c"
        />
      </PageTransition>
    </HydrateClient>
  );
}
