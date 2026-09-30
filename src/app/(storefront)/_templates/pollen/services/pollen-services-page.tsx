import type { PollenResourceRow } from "./pollen-services-sections";
import type { RouterOutputs } from "~/trpc/react";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import {
  getListFieldValue,
  parseTemplateIconListRows,
  parseTemplateListRows,
  resolveFaqPickerItems,
} from "~/lib/template-fields";
import { api } from "~/trpc/server";

import { DEFAULT_POLLEN_SERVICES } from ".";
import { resolveFields } from "..";
import { PollenGeneralLayout } from "../layout/pollen-general-layout";
import {
  PollenServicesFaqBand,
  PollenServicesOverviewBand,
  PollenServicesResourcesBand,
  PollenServicesTestimonialsBand,
} from "./pollen-services-sections";

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

  return (
    <PollenGeneralLayout
      business={business}
      title={f["pollen.services.page-title"]}
      subtitle={f["pollen.services.page-subtitle"]}
      titleFieldKey="pollen.services.page-title"
      subtitleFieldKey="pollen.services.page-subtitle"
    >
      <PollenServicesOverviewBand f={f} services={services} />
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
