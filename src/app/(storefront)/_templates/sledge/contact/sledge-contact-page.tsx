import Image from "next/image";
import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";

import type { DefaultContactPageTemplateProps } from "../../types";
import type { Product } from "~/types";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { api } from "~/trpc/server";
import {
  FadeIn,
  StaggerContainer,
  StaggerItem,
} from "~/components/page-animations";

import { resolveFields } from "../index";
import { NoiseProductCard } from "../shared/sledge-product-card";
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
  const trendingHeading =
    f["sledge.contact.trending-heading"] ?? "Trending Now";
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
        className="relative w-full"
        style={{ height: "clamp(220px, 35vw, 380px)" }}
        {...sectionGroupAttr("contact", "hero")}
      >
        <Image
          src={heroImage}
          alt="Contact"
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
      </section>

      {/* ── Info + form (form card overlaps hero only) ── */}
      <section
        className="px-7 pt-10 pb-16 md:pt-12"
        style={{ background: "#ffffff" }}
        {...sectionGroupAttr("contact", "info")}
      >
        <FadeIn
          className="relative z-10 mx-auto"
          style={{ maxWidth: "1100px" }}
        >
          <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-2 lg:gap-14">
            {/* Left: contact details — stays below hero */}
            <div className="flex flex-col gap-10">
              {address && (
                <SledgeContactInfoRow
                  icon={MapPin}
                  title={locationHeading}
                  lines={[address, ...(locationNote ? [locationNote] : [])]}
                />
              )}
              {email && (
                <SledgeContactInfoRow
                  icon={Mail}
                  title={emailHeading}
                  lines={[email]}
                  links={[`mailto:${email}`]}
                />
              )}
              {phone && (
                <SledgeContactInfoRow
                  icon={Phone}
                  title={phoneHeading}
                  lines={[phone]}
                  links={[`tel:${phone.replace(/\D/g, "")}`]}
                />
              )}
            </div>

            {/* Right: form card — overlaps hero */}
            <div
              className="rounded-sm bg-white px-6 py-8 lg:-mt-28 lg:px-10 lg:py-10"
              style={{
                boxShadow: "0 4px 24px rgba(0, 0, 0, 0.1)",
              }}
            >
              <SledgeContactForm formTitle={formTitle} />
            </div>
          </div>
        </FadeIn>
      </section>

      {/* ── Trending Now product rail ── */}
      {products.length > 0 && (
        <section
          className="px-7 py-16 md:py-20"
          style={{ background: "#ffffff" }}
          {...sectionGroupAttr("about", "products")}
        >
          <div className="mx-auto max-w-7xl">
            <FadeIn className="mb-12 flex items-end justify-between gap-6">
              <h2
                className="font-heading font-bold uppercase"
                style={{
                  fontSize: "clamp(2.6rem, 5.85vw, 4.2rem)",
                  color: "var(--sl-orange)",
                  letterSpacing: "0.02em",
                  lineHeight: 1.05,
                }}
              >
                Trending Now
              </h2>
              <Link
                href={shopCtaHref}
                className="flex shrink-0 items-center gap-2 px-4 py-2.5 font-sans text-[14px] font-medium tracking-[.18em] uppercase transition-opacity hover:opacity-70"
                style={{
                  background: "#ececec",
                  color: "var(--sl-ink)",
                }}
              >
                {shopCtaText} →
              </Link>
            </FadeIn>

            <StaggerContainer
              className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4"
              staggerDelay={0.07}
            >
              {products.slice(0, 4).map((product, index) => (
                <StaggerItem key={product.id}>
                  <NoiseProductCard
                    product={product as unknown as Product}
                    index={index}
                  />
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </section>
      )}
    </>
  );
}
