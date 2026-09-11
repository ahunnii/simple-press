import Image from "next/image";
import Link from "next/link";

import type { DefaultFooterTemplateProps } from "../../types";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { api } from "~/trpc/server";

import { resolveWealthFields } from "../lib/resolve-fields";
import { WealthLink } from "../shared/wealth-link";
import { WealthNewsletter } from "./wealth-newsletter";

export async function WealthFooter({ business }: DefaultFooterTemplateProps) {
  const name = business?.name ?? "";
  const customFields = business?.siteContent?.customFields as
    | Record<string, string>
    | undefined;

  const f = resolveWealthFields(customFields, [
    "wealth.global.footer-address-line1",
    "wealth.global.footer-address-line2",
    "wealth.global.footer-appointment-label",
    "wealth.global.footer-email",
    "wealth.global.footer-ein",
    "wealth.global.footer-farm-logo",
    "wealth.global.footer-farm-url",
    "wealth.global.footer-farm-alt",
    "wealth.global.newsletter-heading",
    "wealth.global.newsletter-body",
    "wealth.global.newsletter-privacy",
  ]);

  // `f` is keyed by the exact strings requested above, so every lookup here
  // is present — `?? ""` only satisfies `noUncheckedIndexedAccess`, not a
  // real fallback (resolveWealthFields already applies the real defaults).
  const addressLine1 = f["wealth.global.footer-address-line1"] ?? "";
  const addressLine2 = f["wealth.global.footer-address-line2"] ?? "";
  const appointmentLabel = f["wealth.global.footer-appointment-label"] ?? "";
  const generalEmail = f["wealth.global.footer-email"] ?? "";
  const ein = f["wealth.global.footer-ein"] ?? "";
  const farmLogo = f["wealth.global.footer-farm-logo"] ?? "";
  const farmUrl = f["wealth.global.footer-farm-url"] ?? "";
  const farmAlt = f["wealth.global.footer-farm-alt"] ?? "";
  const newsletterHeading = f["wealth.global.newsletter-heading"] ?? "";
  const newsletterBody = f["wealth.global.newsletter-body"] ?? "";
  const newsletterPrivacy = f["wealth.global.newsletter-privacy"] ?? "";

  // Raw customFields value (not defaulted): an owner clearing this field
  // hides the farm logo link entirely, distinct from "unset" which shows
  // the default DCWF partner logo.
  const farmLogoRaw = customFields?.["wealth.global.footer-farm-logo"];
  const showFarmLogo = farmLogoRaw?.trim() !== "";

  const policies = await api.content.getSimplifiedPages({ type: "policy" });
  const privacyPolicy = policies.find((p) => p.slug === "privacy-policy");
  const termsOfService = policies.find((p) => p.slug === "terms-of-service");

  return (
    <footer
      {...sectionGroupAttr("global", "branding")}
      style={{
        background: "var(--wealth-paper)",
        color: "var(--wealth-ink)",
        borderTop: "1px solid var(--wealth-surface-2)",
      }}
    >
      <div
        className="mx-auto grid gap-[var(--wealth-rhythm)] px-[var(--wealth-gutter)] py-[calc(var(--wealth-rhythm)*2)] md:grid-cols-2"
        style={{ maxWidth: "var(--wealth-container)" }}
      >
        {/* Left column */}
        <div className="flex flex-col gap-3">
          <p>
            © {new Date().getFullYear()} {name}
          </p>
          {addressLine1 ? <p>{addressLine1}</p> : null}
          {addressLine2 ? <p>{addressLine2}</p> : null}
          {appointmentLabel ? (
            <p style={{ fontStyle: "italic" }}>
              <WealthLink href="/contact">{appointmentLabel}</WealthLink>
            </p>
          ) : null}
          {generalEmail ? (
            <p>
              General Inquiries:{" "}
              <a href={`mailto:${generalEmail}`} className="wealth-link">
                {generalEmail}
              </a>
            </p>
          ) : null}
          {ein ? <p>EIN: {ein}</p> : null}

          {showFarmLogo && farmLogo ? (
            <a
              href={farmUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="relative mt-4 block h-[147px] w-[250px] max-w-full"
              aria-label={farmAlt}
            >
              <Image
                src={farmLogo}
                alt={farmAlt}
                fill
                sizes="250px"
                className="object-contain object-left"
              />
              <span className="sr-only"> (opens in new tab)</span>
            </a>
          ) : null}
        </div>

        {/* Right column: newsletter */}
        <WealthNewsletter
          heading={newsletterHeading}
          body={newsletterBody}
          privacyNote={newsletterPrivacy}
          generalInquiriesEmail={generalEmail}
        />
      </div>

      {/* Policy links row */}
      <div
        className="mx-auto flex flex-wrap gap-5 px-[var(--wealth-gutter)] py-[var(--wealth-rhythm)]"
        style={{
          maxWidth: "var(--wealth-container)",
          borderTop: "1px solid var(--wealth-surface-2)",
        }}
      >
        <div
          className="flex flex-wrap gap-5"
          style={{
            fontFamily: "var(--font-wealth-mono)",
            fontSize: "11px",
            letterSpacing: "1.6px",
            textTransform: "uppercase",
            color: "var(--wealth-muted)",
          }}
        >
          {privacyPolicy ? (
            <Link href={`/${privacyPolicy.slug}`} className="hover:opacity-80">
              Privacy Policy
            </Link>
          ) : (
            <Link
              href="/platform/policies/privacy-policy"
              className="hover:opacity-80"
            >
              Privacy Policy
            </Link>
          )}

          {termsOfService ? (
            <Link
              href={`/${termsOfService.slug}`}
              className="hover:opacity-80"
            >
              Terms of Service
            </Link>
          ) : (
            <Link
              href="/platform/policies/terms-of-service"
              className="hover:opacity-80"
            >
              Terms of Service
            </Link>
          )}

          <Link href="/platform/policies/" className="hover:opacity-80">
            Platform Policies
          </Link>
        </div>
      </div>
    </footer>
  );
}
