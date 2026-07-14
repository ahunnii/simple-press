import Image from "next/image";
import { Mail, MapPin, Phone } from "lucide-react";

import type { DefaultContactPageTemplateProps } from "../../types";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { api } from "~/trpc/server";
import { FadeIn } from "~/components/page-animations";

import { resolveFields } from "../index";
import { SledgeProductRail } from "../shared/sledge-product-rail";
import { SledgeContactForm } from "./sledge-contact-form";
import { SledgeContactInfoRow } from "./sledge-contact-info-row";

export async function SledgeContactPage({
  business,
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
    "sledge.contact.form-title",
    "sledge.contact.trending-heading",
    "sledge.global.shop-cta-text",
    "sledge.global.shop-cta-link",
  ]);

  const heroImage = f["sledge.contact-image"]?.trim() ?? "/placeholder.svg";
  const locationHeading =
    f["sledge.contact.location-heading"] ?? "Shop Location";
  const locationNote = f["sledge.contact.location-note"] ?? "";
  const emailHeading = f["sledge.contact.email-heading"] ?? "Email Address";
  const phoneHeading = f["sledge.contact.phone-heading"] ?? "Phone Number";
  const formTitle = f["sledge.contact.form-title"] ?? "Send Us A Message";
  const shopCtaText = f["sledge.global.shop-cta-text"] ?? "Browse Shop";
  const shopCtaHref = f["sledge.global.shop-cta-link"] ?? "/shop";

  const email = business.supportEmail;
  const phone = business.phoneNumber;
  const address = business.businessAddress;

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
                  links={[`tel:${phone.replace(/\D/g, "")}`]}
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

      <SledgeProductRail
        heading={f["sledge.contact.trending-heading"] ?? "Trending Now"}
        headingFieldKey="sledge.contact.trending-heading"
        ctaText={shopCtaText}
        ctaHref={shopCtaHref}
        products={products}
        sectionAttrs={sectionGroupAttr("contact", "info")}
      />
    </>
  );
}
