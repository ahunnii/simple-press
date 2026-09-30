import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";

import type { GenericIconRow } from "~/lib/template-fields";
import type { RouterOutputs } from "~/trpc/react";
import {
  fieldAttr,
  listItemAttr,
  sectionGroupAttr,
} from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { buttonVariants } from "~/components/ui/button";
import {
  FadeIn,
  StaggerContainer,
  StaggerItem,
} from "~/components/page-animations";

import { PollenTestimonialsSection } from "../testimonials/pollen-testimonials-section";

/** A single row from the `pollen.services.resources-list` template field. */
export type PollenResourceRow = { name: string; url: string };

/**
 * Reusable, server-safe bands shared by the legacy `pollen-services-page.tsx`
 * (flag OFF) and `pollen-services-index-page.tsx` (flag ON). Every
 * `fieldAttr`/`sectionGroupAttr`/`listItemAttr`/`isSectionVisible` call below
 * is unchanged from the original monolithic page — only the JSX was lifted
 * out into standalone components so both pages can compose it identically.
 */

// ─── Services overview (group products.main) ───────────────────────────────

export function PollenServicesOverviewBand({
  f,
  services,
}: {
  f: Record<string, string>;
  services: GenericIconRow[] | null;
}) {
  return (
    <section
      className="bg-[#d4e8d4] py-20 md:py-32"
      {...sectionGroupAttr("products", "main")}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-16">
          <FadeIn direction="up">
            <div className="lg:max-w-lg">
              <p
                className="mb-4 text-sm font-semibold tracking-wider text-[#2a351f] uppercase"
                {...fieldAttr("pollen.services.subtitle")}
              >
                {f["pollen.services.subtitle"]}
              </p>
              <h2
                className="mb-6 text-3xl leading-tight font-bold text-balance text-[#374151] md:text-4xl"
                {...fieldAttr("pollen.services.title")}
              >
                {f["pollen.services.title"]}
              </h2>
              <p
                className="mb-8 leading-relaxed whitespace-pre-line text-[#4b5563]"
                {...fieldAttr("pollen.services.text")}
              >
                {f["pollen.services.text"]}
              </p>
              <Link
                // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- || is intentional so an empty saved value also falls back
                href={f["pollen.services.contact-button-link"] || "/contact"}
                className={buttonVariants({
                  size: "lg",
                  className:
                    "gap-2 bg-[#2a351f]! text-white hover:bg-[#3d4d2f]!",
                })}
              >
                <span {...fieldAttr("pollen.services.contact-button-text")}>
                  {f["pollen.services.contact-button-text"]}
                </span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </FadeIn>

          <StaggerContainer className="grid gap-6 sm:grid-cols-2">
            {services?.map((service, index) => (
              <StaggerItem key={service.title}>
                <div
                  className="flex h-full flex-col rounded-2xl bg-white p-6 shadow-sm"
                  {...listItemAttr("pollen.services.services-list", index)}
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center">
                    <service.icon className="h-6 w-6 text-[#5e8b4a]" />
                  </div>
                  <h3 className="mb-3 font-bold text-[#374151]">
                    {service.title}
                  </h3>
                  <p className="min-h-0 flex-1 text-sm leading-relaxed text-[#6b7280]">
                    {service.description}
                  </p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </div>
    </section>
  );
}

// ─── FAQ (group products.faq) ───────────────────────────────────────────────

export function PollenServicesFaqBand({
  f,
  faqs,
  customFields,
}: {
  f: Record<string, string>;
  faqs: RouterOutputs["faq"]["list"];
  customFields: unknown;
}) {
  if (
    !(
      faqs.length > 0 &&
      isSectionVisible(customFields, "pollen", "products.faq")
    )
  ) {
    return null;
  }

  return (
    <section
      className="bg-white py-20 md:py-32"
      {...sectionGroupAttr("products", "faq")}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <FadeIn
            direction="right"
            className="relative aspect-square overflow-hidden rounded-2xl"
          >
            <Image
              src={f["pollen.services.faq-image"]!}
              alt=""
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </FadeIn>

          <FadeIn direction="left" delay={0.1}>
            <div>
              <p
                className="mb-4 text-sm font-semibold tracking-wider text-[#2a351f] uppercase"
                {...fieldAttr("pollen.services.faq-label")}
              >
                {f["pollen.services.faq-label"]}
              </p>
              <h2
                className="mb-4 text-3xl font-bold text-[#374151] md:text-4xl"
                {...fieldAttr("pollen.services.faq-heading")}
              >
                {f["pollen.services.faq-heading"]}
              </h2>
              <p
                className="mb-8 leading-relaxed text-[#6b7280]"
                {...fieldAttr("pollen.services.faq-description")}
              >
                {f["pollen.services.faq-description"]}
              </p>

              <Accordion type="single" collapsible className="mb-8">
                {faqs.map((faq) => (
                  <AccordionItem key={faq.id} value={faq.id}>
                    <AccordionTrigger className="text-left text-[#374151]">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-[#6b7280]">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>

              <Link
                href={
                  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- || is intentional so an empty saved value also falls back
                  f["pollen.services.faq-contact-button-link"] || "/contact"
                }
                className={buttonVariants({
                  size: "lg",
                  variant: "outline",
                  className:
                    "border-[#374151] text-[#374151] hover:bg-[#374151] hover:text-white",
                })}
                {...fieldAttr("pollen.services.faq-contact-button-text")}
              >
                {f["pollen.services.faq-contact-button-text"]}
              </Link>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}

// ─── Helpful Resources (group products.resources) ──────────────────────────

export function PollenServicesResourcesBand({
  f,
  resources,
  customFields,
}: {
  f: Record<string, string>;
  resources: PollenResourceRow[];
  customFields: unknown;
}) {
  if (
    !(
      resources.length > 0 &&
      isSectionVisible(customFields, "pollen", "products.resources")
    )
  ) {
    return null;
  }

  return (
    <section
      className="bg-[#E5E8E0] py-20 md:py-32"
      {...sectionGroupAttr("products", "resources")}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeIn direction="up">
          <p
            className="mb-4 text-sm font-semibold tracking-wider text-[#2a351f] uppercase"
            {...fieldAttr("pollen.services.resources-label")}
          >
            {f["pollen.services.resources-label"]}
          </p>
          <h2
            className="mb-12 text-3xl font-bold text-[#374151] md:text-4xl"
            {...fieldAttr("pollen.services.resources-title")}
          >
            {f["pollen.services.resources-title"]}
          </h2>
        </FadeIn>
        <StaggerContainer
          className={`grid gap-6 ${
            resources.length === 1
              ? "mx-auto max-w-md grid-cols-1"
              : resources.length === 2
                ? "mx-auto max-w-3xl sm:grid-cols-2"
                : "sm:grid-cols-2 lg:grid-cols-3"
          }`}
        >
          {resources.map((resource, index) => (
            <StaggerItem key={resource.url} className="h-full">
              <Link
                {...listItemAttr("pollen.services.resources-list", index)}
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-full items-center gap-3 rounded-2xl bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <ExternalLink
                  className="h-5 w-5 shrink-0 text-[#5e8b4a]"
                  aria-hidden="true"
                />
                <span className="font-medium text-[#374151]">
                  {resource.name}
                </span>
                <span className="sr-only">(opens in new tab)</span>
              </Link>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}

// ─── Testimonials (group global.testimonials) ──────────────────────────────

export function PollenServicesTestimonialsBand({
  f,
  testimonials,
  customFields,
}: {
  f: Record<string, string>;
  testimonials: RouterOutputs["testimonial"]["listRandom"];
  customFields: unknown;
}) {
  if (!isSectionVisible(customFields, "pollen", "global.testimonials")) {
    return null;
  }

  return (
    <PollenTestimonialsSection
      testimonials={testimonials}
      sectionLabel={f["pollen.global.testimonials-label"]}
      sectionHeading={f["pollen.global.testimonials-heading"]}
      viewAllText={f["pollen.testimonials.view-all-text"]}
      sectionAttrs={sectionGroupAttr("global", "testimonials")}
    />
  );
}
