import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";

import type { RouterOutputs } from "~/trpc/react";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import {
  fieldAttr,
  listItemAttr,
  sectionGroupAttr,
} from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";
import {
  getListFieldValue,
  parseTemplateIconListRows,
  parseTemplateListRows,
  resolveFaqPickerItems,
} from "~/lib/template-fields";
import { api } from "~/trpc/server";
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

import { DEFAULT_POLLEN_SERVICES } from ".";
import { resolveFields } from "..";
import { PollenGeneralLayout } from "../layout/pollen-general-layout";
import { PollenTestimonialsSection } from "../testimonials/pollen-testimonials-section";

type Props = {
  business: NonNullable<RouterOutputs["business"]["simplifiedGet"]>;
  /** Published Content → FAQ items (from `services/page.tsx`). */
  faqItems?: RouterOutputs["faq"]["list"];
};

export async function PollenServicesPage({ business, faqItems = [] }: Props) {
  const customFields = business?.siteContent?.customFields;

  const f = resolveFields(customFields, [
    "pollen.services.page-title",
    "pollen.services.page-subtitle",
    "pollen.services.title",
    "pollen.services.subtitle",
    "pollen.services.text",
    "pollen.services.contact-button-text",
    "pollen.services.contact-button-link",
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
  ]);

  const { isEnabled } = await getBusinessFlags();
  const testimonials = isEnabled("testimonials")
    ? ((await api.testimonial.listRandom({ limit: 3 })) ?? [])
    : [];

  const services = parseTemplateIconListRows(
    getListFieldValue(customFields, "pollen.services.services-list"),
    DEFAULT_POLLEN_SERVICES,
  );

  const resources = parseTemplateListRows(
    getListFieldValue(customFields, "pollen.services.resources-list"),
  ) as { name: string; url: string }[];

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

  return (
    <PollenGeneralLayout
      business={business}
      title={f["pollen.services.page-title"]}
      subtitle={f["pollen.services.page-subtitle"]}
      titleFieldKey="pollen.services.page-title"
      subtitleFieldKey="pollen.services.page-subtitle"
    >
      {/* Services Overview */}
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

      {/* FAQ Section */}
      {faqs.length > 0 &&
        isSectionVisible(customFields, "pollen", "products.faq") && (
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
                        f["pollen.services.faq-contact-button-link"] ||
                        "/contact"
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
        )}

      {/* Helpful Resources Section */}
      {resources?.length > 0 &&
        isSectionVisible(customFields, "pollen", "products.resources") && (
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
        )}

      {/* Testimonials Section */}
      {isSectionVisible(customFields, "pollen", "global.testimonials") && (
        <PollenTestimonialsSection
          testimonials={testimonials}
          sectionLabel={f["pollen.global.testimonials-label"]}
          sectionHeading={f["pollen.global.testimonials-heading"]}
          viewAllText={f["pollen.testimonials.view-all-text"]}
          sectionAttrs={sectionGroupAttr("global", "testimonials")}
        />
      )}
    </PollenGeneralLayout>
  );
}
