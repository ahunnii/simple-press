import type { DefaultTestimonialsPageTemplateProps } from "../../types";
import type { TemplateListRow } from "~/lib/template-fields";
import { isSectionVisible } from "~/lib/sp-meta";
import { parseTemplateListRows } from "~/lib/template-fields";
import { api } from "~/trpc/server";

import { resolveFields } from "..";
import { WealthHr } from "../shared/wealth-hr";
import { WealthTestimonialsCoops } from "./wealth-testimonials-coops";
import { WealthTestimonialsCta } from "./wealth-testimonials-cta";
import { WealthTestimonialsHero } from "./wealth-testimonials-hero";
import { WealthTestimonialsQuotes } from "./wealth-testimonials-quotes";

// Built-in example co-ops, used when the owner hasn't configured any.
// Sourced from docs/templates/wealth/build/assets-manifest.md; names for
// logos 1/2/7 were confirmed from the wordmarks visible in the logo art
// during runtime QA (Stuffed Detroit, Black Bottom Garden Center, Handy
// Relocations).
const DEFAULT_COOPS: TemplateListRow[] = [
  {
    _id: "default-coop-1",
    logo: "/templates/wealth/images/coop-logo-1.png",
    name: "Stuffed Detroit",
    url: "",
  },
  {
    _id: "default-coop-2",
    logo: "/templates/wealth/images/coop-logo-2.png",
    name: "Black Bottom Garden Center",
    url: "",
  },
  {
    _id: "default-coop-3",
    logo: "/templates/wealth/images/coop-logo-3.png",
    name: "Brick and Mortar Cooperative",
    url: "http://brickandmortar.che.coop/about/",
  },
  {
    _id: "default-coop-4",
    logo: "/templates/wealth/images/coop-logo-4.png",
    name: "Building Cooperatively",
    url: "https://www.buildingcooperatively.com/",
  },
  {
    _id: "default-coop-5",
    logo: "/templates/wealth/images/coop-logo-5.png",
    name: "The Spoons Consultancy",
    url: "https://thespoonsconsultancy.com/",
  },
  {
    _id: "default-coop-6",
    logo: "/templates/wealth/images/coop-logo-6.png",
    name: "For Everyone",
    url: "",
  },
  {
    _id: "default-coop-7",
    logo: "/templates/wealth/images/coop-logo-7.png",
    name: "Handy Relocations",
    url: "",
  },
  {
    _id: "default-coop-8",
    logo: "/templates/wealth/images/coop-logo-8.png",
    name: "Oakland Avenue Urban Farm",
    url: "https://www.oaklandurbanfarm.org/",
  },
];

export async function WealthTestimonialsPage({
  business,
}: DefaultTestimonialsPageTemplateProps) {
  const testimonials = await api.testimonial.list({ publicOnly: true });

  const customFields = business.siteContent?.customFields as
    | Record<string, unknown>
    | undefined;

  const f = resolveFields(customFields, [
    "wealth.testimonials.hero-heading",
    "wealth.testimonials.hero-intro",
    "wealth.testimonials.hero-link-label",
    "wealth.testimonials.hero-link-url",
    "wealth.testimonials.hero-image",
    "wealth.testimonials.hero-image-alt",
    "wealth.testimonials.quotes-heading",
    "wealth.testimonials.quotes-empty-message",
    "wealth.testimonials.cta-heading",
    "wealth.testimonials.cta-body",
    "wealth.testimonials.cta-button-label",
  ]);

  const parsedCoops = parseTemplateListRows(
    customFields?.["wealth.testimonials.coops"],
  );
  const coops = parsedCoops.length > 0 ? parsedCoops : DEFAULT_COOPS;

  return (
    <div>
      {/* 1. Co-ops We Support — not hideable */}
      <WealthTestimonialsHero
        heading={f["wealth.testimonials.hero-heading"] ?? "Co-ops We Support"}
        intro={f["wealth.testimonials.hero-intro"] ?? ""}
        linkLabel={f["wealth.testimonials.hero-link-label"] ?? ""}
        linkUrl={f["wealth.testimonials.hero-link-url"] ?? ""}
        image={f["wealth.testimonials.hero-image"] ?? ""}
        imageAlt={f["wealth.testimonials.hero-image-alt"] ?? ""}
      />

      {isSectionVisible(customFields, "wealth", "testimonials.coops") && (
        <>
          <WealthHr />
          <WealthTestimonialsCoops coops={coops} />
        </>
      )}

      <WealthHr />

      {/* 3. In their words — approved testimonials, or the empty state */}
      <WealthTestimonialsQuotes
        heading={f["wealth.testimonials.quotes-heading"] ?? "In their words"}
        emptyMessage={f["wealth.testimonials.quotes-empty-message"] ?? ""}
        testimonials={testimonials}
      />

      {isSectionVisible(customFields, "wealth", "testimonials.cta") && (
        <>
          <WealthHr />
          <WealthTestimonialsCta
            heading={f["wealth.testimonials.cta-heading"] ?? ""}
            body={f["wealth.testimonials.cta-body"] ?? ""}
            buttonLabel={f["wealth.testimonials.cta-button-label"] ?? ""}
          />
        </>
      )}
    </div>
  );
}
