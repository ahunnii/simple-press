import Image from "next/image";
import { Clock, Mail, MapPin, Phone } from "lucide-react";

import type { DefaultContactPageTemplateProps } from "../../types";
import { formatBusinessHours, parseBusinessHours } from "~/lib/business-hours";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";
import { resolveFaqPickerItems } from "~/lib/template-fields";
import { api } from "~/trpc/server";
import { FadeIn } from "~/components/page-animations";

import { resolveFields } from "../index";
import { SledgeAccordionItem } from "../shared/sledge-accordion";
import { SledgeProductRail } from "../shared/sledge-product-rail";
import { SledgeContactForm } from "./sledge-contact-form";
import { SledgeContactInfoRow } from "./sledge-contact-info-row";

export async function SledgeContactPage({
  business,
  faqItems,
}: DefaultContactPageTemplateProps) {
  const customFields = business.siteContent?.customFields as
    | Record<string, unknown>
    | undefined;

  const f = resolveFields(customFields as Record<string, string> | undefined, [
    "sledge.contact-image",
    "sledge.contact.location-heading",
    "sledge.contact.location-note",
    "sledge.contact.email-heading",
    "sledge.contact.phone-heading",
    "sledge.contact.hours-heading",
    "sledge.contact.form-title",
    "sledge.contact.trending-heading",
    "sledge.contact.faq-heading",
    "sledge.contact.faq-intro",
    "sledge.global.shop-cta-text",
    "sledge.global.shop-cta-link",
  ]);

  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- cleared field resolves to "", not null/undefined
  const heroImage = f["sledge.contact-image"] || "/placeholder.svg";
  const locationHeading = f["sledge.contact.location-heading"] ?? "";
  const locationNote = f["sledge.contact.location-note"] ?? "";
  const emailHeading = f["sledge.contact.email-heading"] ?? "";
  const phoneHeading = f["sledge.contact.phone-heading"] ?? "";
  const hoursHeading = f["sledge.contact.hours-heading"] ?? "";
  const formTitle = f["sledge.contact.form-title"] ?? "";
  const shopCtaText = f["sledge.global.shop-cta-text"] ?? "";
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- url field: "" means unsafe/cleared, must still fall back
  const shopCtaHref = f["sledge.global.shop-cta-link"] || "/shop";

  const email = business.supportEmail;
  const phone = business.phoneNumber;
  const address = business.businessAddress;
  const hoursRows = formatBusinessHours(parseBusinessHours(business.businessHours));

  const faq = resolveFaqPickerItems(
    customFields?.["sledge.contact.faq"],
    faqItems,
    10,
  );
  const trendingVisible = isSectionVisible(
    customFields,
    "sledge",
    "contact.trending",
  );
  const faqVisible = isSectionVisible(customFields, "sledge", "contact.faq");

  const homepage = await api.business.getHomepage();
  const products = homepage?.products ?? [];

  return (
    <>
      {/* ── Hero banner ── */}
      <section
        className="sl-hero-banner-sm relative w-full"
        {...sectionGroupAttr("contact", "info")}
      >
        {/* M-9: decorative banner image */}
        <Image
          src={heroImage}
          alt=""
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
      </section>

      {/* M-2: sr-only page h1 so AT has a document landmark heading */}
      <h1 className="sr-only">Contact</h1>

      {/* ── Info + form (form card overlaps hero only) ── */}
      <section
        className="bg-white px-7 pt-10 pb-16 md:pt-12"
        {...sectionGroupAttr("contact", "info")}
      >
        <FadeIn className="relative z-10 mx-auto max-w-7xl">
          <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-2 lg:gap-14">
            {/* Left: contact details — stays below hero */}
            <div className="flex flex-col gap-10">
              {address && (
                <SledgeContactInfoRow
                  icon={MapPin}
                  title={locationHeading}
                  titleFieldKey="sledge.contact.location-heading"
                  lines={[address, ...(locationNote ? [locationNote] : [])]}
                />
              )}
              {email && (
                <SledgeContactInfoRow
                  icon={Mail}
                  title={emailHeading}
                  titleFieldKey="sledge.contact.email-heading"
                  lines={[email]}
                  links={[`mailto:${email}`]}
                />
              )}
              {phone && (
                <SledgeContactInfoRow
                  icon={Phone}
                  title={phoneHeading}
                  titleFieldKey="sledge.contact.phone-heading"
                  lines={[phone]}
                  links={[`tel:${phone.replace(/[^\d+]/g, "")}`]}
                />
              )}
              {hoursRows.length > 0 && (
                <SledgeContactInfoRow
                  icon={Clock}
                  title={hoursHeading}
                  titleFieldKey="sledge.contact.hours-heading"
                  lines={hoursRows.map((row) => `${row.label}: ${row.value}`)}
                />
              )}
            </div>

            {/* Right: form card — overlaps hero */}
            <div className="sl-card-shadow rounded-sm bg-white px-6 py-8 lg:-mt-28 lg:px-10 lg:py-10">
              <SledgeContactForm formTitle={formTitle} />
            </div>
          </div>
        </FadeIn>
      </section>

      {faq.length > 0 && faqVisible ? (
        <section
          {...sectionGroupAttr("contact", "faq")}
          className="bg-white px-7 py-16 md:py-20"
        >
          <div className="mx-auto max-w-3xl">
            <FadeIn>
              <h2
                className="sl-heading-xl font-heading mb-4"
                {...fieldAttr("sledge.contact.faq-heading")}
              >
                {f["sledge.contact.faq-heading"]}
              </h2>
              {f["sledge.contact.faq-intro"]?.trim() ? (
                <p
                  className="sl-eyebrow mb-8 font-sans text-sm leading-relaxed"
                  {...fieldAttr("sledge.contact.faq-intro")}
                >
                  {f["sledge.contact.faq-intro"]}
                </p>
              ) : null}
            </FadeIn>
            <FadeIn>
              <div className="mt-4">
                {faq.map((row) => (
                  <SledgeAccordionItem key={row.id} title={row.question}>
                    {row.answer}
                  </SledgeAccordionItem>
                ))}
              </div>
            </FadeIn>
          </div>
        </section>
      ) : null}

      {trendingVisible ? (
        <SledgeProductRail
          heading={f["sledge.contact.trending-heading"] ?? ""}
          headingFieldKey="sledge.contact.trending-heading"
          ctaText={shopCtaText}
          ctaHref={shopCtaHref}
          products={products}
          sectionAttrs={sectionGroupAttr("contact", "trending")}
        />
      ) : null}
    </>
  );
}
