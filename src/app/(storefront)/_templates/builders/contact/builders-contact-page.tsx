import { TwitterLogoIcon } from "@radix-ui/react-icons";

import type { DefaultContactPageTemplateProps } from "../../types";
import { formatBusinessHours, parseBusinessHours } from "~/lib/business-hours";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { FacebookIcon } from "~/components/icons/facebook-icon";
import { InstagramIcon } from "~/components/icons/instagram-icon";
import { TikTokIcon } from "~/components/icons/tiktok-icon";
import { YouTubeIcon } from "~/components/icons/youtube-icon";

import { resolveFields } from "../index";
import { BuildersContactForm } from "./builders-contact-form";

export function BuildersContactPage({
  business,
}: DefaultContactPageTemplateProps) {
  const customFields = business.siteContent?.customFields as
    | Record<string, unknown>
    | undefined;

  const f = resolveFields(customFields, [
    "builders.contact.header",
    "builders.contact.subheader",
    "builders.contact.shop-label",
    "builders.contact.socials-label",
  ]);

  const address = business.businessAddress;
  const email = business.supportEmail;
  const phone = business.phoneNumber;

  const hourRows = formatBusinessHours(
    parseBusinessHours(business.businessHours),
  );

  const contactHeader = f["builders.contact.header"] ?? "Let's build together.";
  const contactSubheader =
    f["builders.contact.subheader"] ??
    "Whether you have a specific restoration project in mind, want to learn more about our cooperative model, or just want to say hello, we're here. We believe in direct, honest communication—no corporate speak, just real people doing hard work.";
  const shopLabel = f["builders.contact.shop-label"] ?? "The Shop";
  const socialsLabel = f["builders.contact.socials-label"] ?? "";

  const socialLinks = business.siteContent?.socialLinks as
    | {
        instagram?: string;
        facebook?: string;
        twitter?: string;
        tiktok?: string;
        youtube?: string;
      }
    | undefined;

  return (
    <div className="flex flex-col gap-24 pb-24">
      {/* ── Page header ── */}
      <section
        className="mx-auto w-full max-w-[1280px] px-4 pt-24 md:px-12"
        {...sectionGroupAttr("contact", "info")}
      >
        <header className="max-w-3xl">
          <h1
            {...fieldAttr("builders.contact.header")}
            className="mb-6 text-4xl leading-none tracking-tight uppercase md:text-6xl"
            style={{
              fontFamily: "var(--font-builders-display, 'Jost', sans-serif)",
              fontWeight: 300,
              color: "var(--builders-ink, #131313)",
            }}
          >
            {contactHeader}
          </h1>
          <p
            {...fieldAttr("builders.contact.subheader")}
            className="border-l pl-8 text-lg leading-relaxed md:text-xl"
            style={{
              fontFamily: "var(--font-builders-body, 'Agdasima', sans-serif)",
              borderColor: "var(--builders-accent, #FFC5B6)",
              color: "var(--builders-muted, #6B7280)",
            }}
          >
            {contactSubheader}
          </p>
        </header>
      </section>

      {/* ── Two-column layout: form + info ── */}
      <section className="mx-auto w-full max-w-[1280px] px-4 md:px-12">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-12">
          {/* Form — 7/12 columns */}
          <div className="md:col-span-7">
            <div
              className="border p-8"
              style={{
                background: "var(--builders-surface, #fff)",
                borderColor: "var(--builders-rule, #e5e7eb)",
              }}
            >
              <BuildersContactForm />
            </div>
          </div>

          {/* Info — 5/12 columns */}
          <div
            className="flex flex-col gap-12 md:col-span-5"
            {...sectionGroupAttr("contact", "info")}
          >
            {/* The Shop (address) */}
            {address && (
              <div
                className="flex flex-col gap-4 border-l pl-8"
                style={{ borderColor: "var(--builders-rule, #e5e7eb)" }}
              >
                <h2
                  {...fieldAttr("builders.contact.shop-label")}
                  className="text-xl font-semibold"
                  style={{
                    fontFamily:
                      "var(--font-builders-display, 'Jost', sans-serif)",
                    color: "var(--builders-ink, #131313)",
                  }}
                >
                  {shopLabel}
                </h2>
                <address
                  className="flex flex-col gap-1 text-base leading-relaxed not-italic"
                  style={{
                    fontFamily:
                      "var(--font-builders-body, 'Agdasima', sans-serif)",
                    color: "var(--builders-muted, #6B7280)",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {address}
                </address>
              </div>
            )}

            {/* Direct Lines (email + phone) */}
            {(email ?? phone) && (
              <div
                className="flex flex-col gap-4 border-l pl-8"
                style={{ borderColor: "var(--builders-rule, #e5e7eb)" }}
              >
                <h2
                  className="text-xl font-semibold"
                  style={{
                    fontFamily:
                      "var(--font-builders-display, 'Jost', sans-serif)",
                    color: "var(--builders-ink, #131313)",
                  }}
                >
                  Direct Lines
                </h2>
                <div
                  className="flex flex-col gap-3 text-base"
                  style={{
                    fontFamily:
                      "var(--font-builders-body, 'Agdasima', sans-serif)",
                    color: "var(--builders-muted, #6B7280)",
                  }}
                >
                  {email && (
                    <a
                      href={`mailto:${email}`}
                      className="transition-colors hover:text-[var(--builders-accent-ink)]"
                    >
                      {email}
                    </a>
                  )}
                  {phone && (
                    <a
                      href={`tel:${phone.replace(/\D/g, "")}`}
                      className="transition-colors hover:text-[var(--builders-accent-ink)]"
                    >
                      {phone}
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Hours */}
            {hourRows.length > 0 && (
              <div
                className="flex flex-col gap-4 border-l pl-8"
                style={{ borderColor: "var(--builders-rule, #e5e7eb)" }}
              >
                <h2
                  className="text-xl font-semibold"
                  style={{
                    fontFamily:
                      "var(--font-builders-display, 'Jost', sans-serif)",
                    color: "var(--builders-ink, #131313)",
                  }}
                >
                  Hours
                </h2>
                <dl
                  className="flex flex-col gap-2 text-base"
                  style={{
                    fontFamily:
                      "var(--font-builders-body, 'Agdasima', sans-serif)",
                    color: "var(--builders-muted, #6B7280)",
                  }}
                >
                  {hourRows.map((row) => (
                    <div
                      key={row.label}
                      className="flex justify-between"
                      style={{
                        maxWidth: "220px",
                      }}
                    >
                      <dt>{row.label}</dt>
                      <dd>{row.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            {/* Follow us on socials */}
            {(socialLinks?.instagram ??
              socialLinks?.facebook ??
              socialLinks?.twitter ??
              socialLinks?.tiktok ??
              socialLinks?.youtube) && (
              <div
                className="flex flex-col gap-4 border-l pl-8"
                style={{ borderColor: "var(--builders-rule, #e5e7eb)" }}
              >
                <h2
                  className="text-xl font-semibold"
                  style={{
                    fontFamily:
                      "var(--font-builders-display, 'Jost', sans-serif)",
                    color: "var(--builders-ink, #131313)",
                  }}
                >
                  {socialsLabel || "Follow Along"}
                </h2>
                <div className="flex gap-4">
                  {socialLinks?.instagram && (
                    <a
                      href={socialLinks.instagram}
                      className="-m-2 flex items-center justify-center p-2 text-gray-500 transition-colors hover:text-gray-900"
                      aria-label="Instagram"
                    >
                      <InstagramIcon className="h-5 w-5" />
                    </a>
                  )}
                  {socialLinks?.facebook && (
                    <a
                      href={socialLinks.facebook}
                      className="-m-2 flex items-center justify-center p-2 text-gray-500 transition-colors hover:text-gray-900"
                      aria-label="Facebook"
                    >
                      <FacebookIcon className="h-5 w-5" />
                    </a>
                  )}
                  {socialLinks?.twitter && (
                    <a
                      href={socialLinks.twitter}
                      className="-m-2 flex items-center justify-center p-2 text-gray-500 transition-colors hover:text-gray-900"
                      aria-label="X / Twitter"
                    >
                      <TwitterLogoIcon className="h-5 w-5" />
                    </a>
                  )}
                  {socialLinks?.tiktok && (
                    <a
                      href={socialLinks.tiktok}
                      className="-m-2 flex items-center justify-center p-2 text-gray-500 transition-colors hover:text-gray-900"
                      aria-label="TikTok"
                    >
                      <TikTokIcon className="h-5 w-5" />
                    </a>
                  )}
                  {socialLinks?.youtube && (
                    <a
                      href={socialLinks.youtube}
                      className="-m-2 flex items-center justify-center p-2 text-gray-500 transition-colors hover:text-gray-900"
                      aria-label="YouTube"
                    >
                      <YouTubeIcon className="h-5 w-5" />
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
