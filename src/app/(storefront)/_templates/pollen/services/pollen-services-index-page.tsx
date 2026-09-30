import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Leaf } from "lucide-react";

import type { PollenResourceRow } from "./pollen-services-sections";
import type { RouterOutputs } from "~/trpc/react";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import {
  getListFieldValue,
  parseTemplateListRows,
  resolveFaqPickerItems,
} from "~/lib/template-fields";
import { api } from "~/trpc/server";
import { buttonVariants } from "~/components/ui/button";
import {
  FadeIn,
  StaggerContainer,
  StaggerItem,
} from "~/components/page-animations";

import { resolveFields } from "..";
import { PollenGeneralLayout } from "../layout/pollen-general-layout";
import {
  PollenServicesFaqBand,
  PollenServicesResourcesBand,
  PollenServicesTestimonialsBand,
} from "./pollen-services-sections";

type Props = {
  business: NonNullable<RouterOutputs["business"]["simplifiedGet"]>;
  services: RouterOutputs["services"]["getAllPublic"];
  /** Published Content → FAQ items (from `services/page.tsx`). */
  faqItems?: RouterOutputs["faq"]["list"];
};

const FIELD_KEYS = [
  "pollen.services.page-title",
  "pollen.services.page-subtitle",
  "pollen.services.list-heading",
  "pollen.services.list-intro",
  "pollen.services.card-link-text",
  "pollen.services.options-label",
  "pollen.services.empty-heading",
  "pollen.services.empty-body",
  "pollen.services.empty-button-text",
  "pollen.services.faq-label",
  "pollen.services.faq-heading",
  "pollen.services.faq-description",
  "pollen.services.faq-image",
  "pollen.services.faq-contact-button-text",
  "pollen.services.faq-contact-button-link",
  "pollen.services.resources-label",
  "pollen.services.resources-title",
  "pollen.global.testimonials-label",
  "pollen.global.testimonials-heading",
  "pollen.testimonials.view-all-text",
];

/**
 * `/services` — the data-driven pollen services index, shown once a
 * business turns the `services` feature flag on (real Service rows from
 * Admin → Services, each with its own detail page). The flag-off legacy
 * page (`pollen-services-page.tsx`, live on Detroit Pollinator Company)
 * still uses a template-field icon list instead — the two pages are
 * intentionally different content models, so the "Services overview" icon
 * cards from the legacy page are NOT repeated here to avoid showing two
 * competing "services" listings on one page. FAQ, Helpful Resources, and
 * Testimonials bands are shared via `pollen-services-sections.tsx`.
 */
export async function PollenServicesIndexPage({
  business,
  services,
  faqItems = [],
}: Props) {
  const customFields = business?.siteContent?.customFields;
  const f = resolveFields(customFields, FIELD_KEYS);

  const { isEnabled } = await getBusinessFlags();
  const testimonials = isEnabled("testimonials")
    ? ((await api.testimonial.listRandom({ limit: 3 })) ?? [])
    : [];

  const resources = parseTemplateListRows(
    getListFieldValue(customFields, "pollen.services.resources-list"),
  ) as PollenResourceRow[];

  // Content → FAQ picker. An unset value — or a legacy saved list of
  // `{question, answer}` rows from before the picker — falls back to the
  // first published questions; none published hides the section.
  const faqs = resolveFaqPickerItems(
    (customFields as Record<string, unknown> | null | undefined)?.[
      "pollen.services.faq-list"
    ],
    faqItems,
    10,
  );

  const listIntro = f["pollen.services.list-intro"];
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- || is intentional so an empty saved value also falls back
  const optionsLabel = f["pollen.services.options-label"] || "option";

  return (
    <PollenGeneralLayout
      business={business}
      title={f["pollen.services.page-title"]}
      subtitle={f["pollen.services.page-subtitle"]}
      titleFieldKey="pollen.services.page-title"
      subtitleFieldKey="pollen.services.page-subtitle"
    >
      {/* Services grid */}
      <section
        className="bg-white py-20 md:py-32"
        {...sectionGroupAttr("products", "list")}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <FadeIn direction="up" className="mb-12">
            <h2
              className="mb-4 text-3xl font-bold text-[#374151] md:text-4xl"
              {...fieldAttr("pollen.services.list-heading")}
            >
              {f["pollen.services.list-heading"]}
            </h2>
            {!!listIntro && (
              <p
                className="max-w-2xl leading-relaxed text-[#6b7280]"
                {...fieldAttr("pollen.services.list-intro")}
              >
                {listIntro}
              </p>
            )}
          </FadeIn>

          {services.length > 0 ? (
            <StaggerContainer className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((service) => {
                const itemCount = service.items.length;
                return (
                  <StaggerItem key={service.id}>
                    <Link
                      href={`/services/${service.slug}`}
                      className="group block h-full"
                    >
                      <article className="flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-sm transition-shadow duration-300 hover:shadow-md">
                        <div className="relative aspect-4/3 overflow-hidden">
                          {service.image ? (
                            <Image
                              src={service.image}
                              alt={service.name}
                              fill
                              className="object-cover transition-transform duration-500 group-hover:scale-105"
                              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-[#5e8b4a] to-[#2a351f]">
                              <Leaf
                                className="h-12 w-12 text-white/40"
                                aria-hidden="true"
                              />
                            </div>
                          )}
                          {itemCount > 0 && (
                            <div className="absolute right-4 bottom-4 left-4">
                              <span className="inline-flex items-center rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-[#374151]">
                                {itemCount} {optionsLabel}
                                {itemCount === 1 ? "" : "s"}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-1 flex-col p-6">
                          <h3 className="mb-2 font-bold text-[#374151] transition-colors group-hover:text-[#5e8b4a]">
                            {service.name}
                          </h3>
                          {service.description && (
                            <p className="mb-4 line-clamp-3 min-h-0 flex-1 text-sm leading-relaxed text-[#6b7280]">
                              {service.description}
                            </p>
                          )}
                          <div
                            className="flex items-center gap-2 text-sm font-semibold text-[#2a351f]"
                            {...fieldAttr("pollen.services.card-link-text")}
                          >
                            {f["pollen.services.card-link-text"]}
                            <ArrowRight
                              className="h-4 w-4 transition-transform group-hover:translate-x-1"
                              aria-hidden="true"
                            />
                          </div>
                        </div>
                      </article>
                    </Link>
                  </StaggerItem>
                );
              })}
            </StaggerContainer>
          ) : (
            <FadeIn>
              <div className="flex flex-col items-center justify-center rounded-2xl bg-[#d4e8d4] py-24 text-center">
                {!!f["pollen.services.empty-heading"] && (
                  <p
                    className="text-lg font-medium text-[#374151]"
                    {...fieldAttr("pollen.services.empty-heading")}
                  >
                    {f["pollen.services.empty-heading"]}
                  </p>
                )}
                {!!f["pollen.services.empty-body"] && (
                  <p
                    className="mt-2 max-w-md text-sm text-[#6b7280]"
                    {...fieldAttr("pollen.services.empty-body")}
                  >
                    {f["pollen.services.empty-body"]}
                  </p>
                )}
                {!!f["pollen.services.empty-button-text"] && (
                  <Link
                    href="/contact"
                    className={buttonVariants({
                      size: "lg",
                      className:
                        "mt-6 gap-2 bg-[#2a351f]! text-white hover:bg-[#3d4d2f]!",
                    })}
                    {...fieldAttr("pollen.services.empty-button-text")}
                  >
                    {f["pollen.services.empty-button-text"]}
                  </Link>
                )}
              </div>
            </FadeIn>
          )}
        </div>
      </section>

      <PollenServicesFaqBand f={f} faqs={faqs} customFields={customFields} />
      <PollenServicesResourcesBand
        f={f}
        resources={resources}
        customFields={customFields}
      />
      <PollenServicesTestimonialsBand
        f={f}
        testimonials={testimonials}
        customFields={customFields}
      />
    </PollenGeneralLayout>
  );
}
