import Image from "next/image";
import Link from "next/link";

import type { DefaultContactPageTemplateProps } from "../../types";
import type { PinkFactRow } from "../shared/pink-fact-rows";
import type { PinkContactTopic } from "./pink-contact-form";
import { formatBusinessHours, parseBusinessHours } from "~/lib/business-hours";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { resolveSocialLinks } from "~/lib/social-links";
import { isSectionVisible } from "~/lib/sp-meta";
import { telHref } from "~/lib/tel-href";
import { parseTemplateListRows } from "~/lib/template-fields";

import { resolveFields } from "..";
import { PinkFactRows } from "../shared/pink-fact-rows";
import {
  hasCustomImage,
  PinkImageFallback,
} from "../shared/pink-image-fallback";
import { PinkPageHeader } from "../shared/pink-page-header";
import { PinkReveal } from "../shared/pink-reveal";
import { PinkSocialLinks } from "../shared/pink-social-links";
import { PinkContactForm } from "./pink-contact-form";

const FIELD_KEYS = [
  "pink.contact.header-heading",
  "pink.contact.header-intro",
  "pink.contact.topics-heading",
  "pink.contact.form-heading",
  "pink.contact.form-reference-label",
  "pink.contact.form-reference-placeholder",
  "pink.contact.form-marketing-label",
  "pink.contact.form-message-label",
  "pink.contact.form-message-placeholder",
  "pink.contact.form-submit-label",
  "pink.contact.form-email-note",
  "pink.contact.studio-image",
  "pink.contact.studio-label",
  "pink.contact.studio-access-note",
  "pink.contact.shortcuts-heading",
];

type FactRow = { label?: string; value?: string; _id?: string };
type ShortcutItem = { label?: string; href?: string; _id?: string };

const DEFAULT_HEADER_FACTS: PinkFactRow[] = [
  { label: "Response time", value: "1–2 business days" },
  { label: "Location", value: "Detroit, Michigan" },
];

const DEFAULT_SHORTCUTS: ShortcutItem[] = [
  { label: "Ask about a make & take", href: "/services" },
  { label: "Browse what's ready now", href: "/shop" },
];

export function PinkContactPage({ business }: DefaultContactPageTemplateProps) {
  const customFields = business.siteContent?.customFields;
  const rawCustomFields = customFields as Record<string, unknown> | undefined;
  const f = resolveFields(customFields, FIELD_KEYS);

  const headerFactsRaw = parseTemplateListRows(
    rawCustomFields?.["pink.contact.header-facts"],
  ) as FactRow[];
  const headerFacts =
    headerFactsRaw.length > 0
      ? headerFactsRaw.map((r) => ({
          label: r.label ?? "",
          value: r.value ?? "",
          _id: r._id,
        }))
      : DEFAULT_HEADER_FACTS;

  const topics = parseTemplateListRows(
    rawCustomFields?.["pink.contact.topics-items"],
  ) as PinkContactTopic[];

  const shortcutsRaw = parseTemplateListRows(
    rawCustomFields?.["pink.contact.shortcuts-items"],
  ) as ShortcutItem[];
  const shortcuts = shortcutsRaw.length > 0 ? shortcutsRaw : DEFAULT_SHORTCUTS;

  const socialLinks = resolveSocialLinks(business.siteContent?.socialLinks);

  const topicsVisible = isSectionVisible(
    customFields,
    "pink",
    "contact.topics",
  );
  const studioVisible = isSectionVisible(
    customFields,
    "pink",
    "contact.studio",
  );
  const shortcutsVisible = isSectionVisible(
    customFields,
    "pink",
    "contact.shortcuts",
  );

  const hoursRows = formatBusinessHours(
    parseBusinessHours(business.businessHours),
  );

  const phoneHref = business.phoneNumber ? telHref(business.phoneNumber) : "";

  const hasContactLinks =
    Boolean(business.supportEmail) ||
    phoneHref !== "" ||
    socialLinks.length > 0;

  return (
    <>
      {/* ── contact.header ─────────────────────────────────────────────── */}
      <PinkPageHeader
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Contact" }]}
        heading={f["pink.contact.header-heading"] ?? ""}
        headingFieldKey="pink.contact.header-heading"
        intro={f["pink.contact.header-intro"] ?? ""}
        introFieldKey="pink.contact.header-intro"
        rightSlot={<PinkFactRows rows={headerFacts} surface="paper" />}
        sectionAttrs={sectionGroupAttr("contact", "header")}
      />

      <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-12 px-5 md:grid-cols-[1.15fr_0.85fr] md:px-10 md:pt-16">
        {/* ── contact.topics + contact.form (interactive) ─────────────── */}
        <div className="order-2 md:order-1 md:col-span-1">
          <PinkContactForm
            topicsVisible={topicsVisible}
            topicsHeading={f["pink.contact.topics-heading"] ?? ""}
            topics={topics}
            formHeading={f["pink.contact.form-heading"] ?? ""}
            referenceLabel={f["pink.contact.form-reference-label"] ?? ""}
            referencePlaceholder={
              f["pink.contact.form-reference-placeholder"] ?? ""
            }
            marketingLabel={f["pink.contact.form-marketing-label"] ?? ""}
            defaultMessageLabel={f["pink.contact.form-message-label"] ?? ""}
            defaultMessagePlaceholder={
              f["pink.contact.form-message-placeholder"] ?? ""
            }
            submitLabel={f["pink.contact.form-submit-label"] ?? ""}
            emailNotePrefix={f["pink.contact.form-email-note"] ?? ""}
            supportEmail={business.supportEmail}
          />
        </div>

        {/* ── contact.studio + contact.shortcuts (aside) ──────────────── */}
        {(studioVisible || shortcutsVisible) && (
          <div className="order-1 flex flex-col gap-6 pb-16 md:order-2 md:pt-24 md:pb-24">
            {studioVisible && (
              <div {...sectionGroupAttr("contact", "studio")}>
                <PinkReveal index={1} className="flex flex-col gap-[2px]">
                  <div
                    className="relative w-full overflow-hidden"
                    style={{
                      aspectRatio: "16 / 10",
                      background: "var(--pink-panel)",
                    }}
                  >
                    {hasCustomImage(f["pink.contact.studio-image"]) ? (
                      <Image
                        src={f["pink.contact.studio-image"]!}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 33vw"
                      />
                    ) : (
                      <PinkImageFallback
                        surface="paper"
                        className="absolute inset-0"
                      />
                    )}
                  </div>

                  <div
                    className="flex flex-col gap-4 p-6"
                    style={{ background: "var(--pink-ink)" }}
                  >
                    <span
                      className="pink-label-dark"
                      {...fieldAttr("pink.contact.studio-label")}
                    >
                      {f["pink.contact.studio-label"] ?? ""}
                    </span>

                    {business.businessAddress && (
                      <p
                        className="pink-display"
                        style={{
                          fontSize: "20px",
                          fontWeight: 600,
                          color: "var(--pink-paper)",
                        }}
                      >
                        {business.businessAddress}
                      </p>
                    )}

                    {f["pink.contact.studio-access-note"] && (
                      <p
                        className="text-[14px] leading-[1.6]"
                        style={{ color: "var(--pink-ink-muted)" }}
                        {...fieldAttr("pink.contact.studio-access-note")}
                      >
                        {f["pink.contact.studio-access-note"]}
                      </p>
                    )}

                    {hoursRows.length > 0 && (
                      <dl
                        className="flex flex-col gap-1.5 border-t pt-4"
                        style={{ borderColor: "var(--pink-ink-line)" }}
                      >
                        {hoursRows.map((row, i) => (
                          <div
                            key={row.label + String(i)}
                            className="flex items-baseline justify-between gap-4 text-[13px]"
                          >
                            <dt style={{ color: "var(--pink-ink-subtle)" }}>
                              {row.label}
                            </dt>
                            <dd style={{ color: "var(--pink-ink-body)" }}>
                              {row.value}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    )}

                    {hasContactLinks && (
                      <div
                        className="flex flex-col gap-1.5 border-t pt-4"
                        style={{ borderColor: "var(--pink-ink-line)" }}
                      >
                        {business.supportEmail && (
                          <a
                            href={`mailto:${business.supportEmail}`}
                            className="text-[14px]"
                            style={{ color: "var(--pink-blush)" }}
                          >
                            {business.supportEmail}
                          </a>
                        )}
                        {business.phoneNumber && phoneHref !== "" && (
                          <a
                            href={phoneHref}
                            className="text-[14px]"
                            style={{ color: "var(--pink-blush)" }}
                          >
                            {business.phoneNumber}
                          </a>
                        )}
                        <PinkSocialLinks
                          socialLinks={business.siteContent?.socialLinks}
                          tone="dark"
                          className="mt-1"
                        />
                      </div>
                    )}
                  </div>
                </PinkReveal>
              </div>
            )}

            {/* ── contact.shortcuts ────────────────────────────────────── */}
            {shortcutsVisible && (
              <div {...sectionGroupAttr("contact", "shortcuts")}>
                <PinkReveal
                  index={2}
                  className="p-6"
                  style={{ background: "var(--pink-panel)" }}
                >
                  <h2
                    className="pink-display mb-3"
                    style={{ fontSize: "17px", fontWeight: 600 }}
                    {...fieldAttr("pink.contact.shortcuts-heading")}
                  >
                    {f["pink.contact.shortcuts-heading"] ?? ""}
                  </h2>
                  <ul className="flex flex-col">
                    {shortcuts.map((item, i) => (
                      <li
                        key={item._id ?? i}
                        style={
                          i > 0
                            ? { borderTop: "1px solid var(--pink-line-button)" }
                            : undefined
                        }
                      >
                        <Link
                          href={item.href ?? "/contact"}
                          className="flex items-center justify-between gap-3 py-3 text-[15px]"
                          style={{ color: "var(--pink-ink)" }}
                        >
                          <span>{item.label ?? ""}</span>
                          <span
                            aria-hidden="true"
                            style={{ color: "var(--pink-rose)" }}
                          >
                            →
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </PinkReveal>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
