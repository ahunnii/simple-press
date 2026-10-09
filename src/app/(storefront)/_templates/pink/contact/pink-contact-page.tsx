import Image from "next/image";
import Link from "next/link";

import type { DefaultContactPageTemplateProps } from "../../types";
import type { PinkFactRow } from "../shared/pink-fact-rows";
import type { PinkContactTopic } from "./pink-contact-form";
import { navHrefOffFlag } from "~/app/(storefront)/_components/nav/nav-flags";
import { formatBusinessHours, parseBusinessHours } from "~/lib/business-hours";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import {
  fieldAttr,
  listItemAttr,
  sectionGroupAttr,
} from "~/lib/preview/section-attrs";
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
import { DEFAULT_PINK_CONTACT_SHORTCUTS } from "./index";
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
  "pink.contact.form-success-heading",
  "pink.contact.form-success-body",
  "pink.contact.form-success-again-label",
  "pink.contact.studio-image",
  "pink.contact.studio-label",
  "pink.contact.studio-access-note",
  "pink.contact.shortcuts-heading",
];

type FactRow = { label?: string; value?: string; _id?: string };
type ShortcutItem = { label?: string; href?: string; _id?: string };

/** Trims `value` and maps blank to `undefined`, for plain `??` chains. */
function nonBlank(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed?.length ? trimmed : undefined;
}

/**
 * The header facts shown when the owner hasn't saved any
 * `pink.contact.header-facts` rows: a single Location row built from
 * Settings → General (city, plus state when set — e.g. "Detroit, MI"). No
 * city means no default rows at all, and the header drops its right slot.
 * (Until 2026-09-26 this was a hardcoded "Response time: 1–2 business days"
 * + "Location: Detroit, Michigan" pair.)
 */
function defaultHeaderFacts(business: {
  addressCity?: string | null;
  addressState?: string | null;
}): PinkFactRow[] {
  const city = nonBlank(business.addressCity);
  if (!city) return [];
  const state = nonBlank(business.addressState);
  return [{ label: "Location", value: state ? `${city}, ${state}` : city }];
}

export async function PinkContactPage({
  business,
}: DefaultContactPageTemplateProps) {
  const customFields = business.siteContent?.customFields;
  const rawCustomFields = customFields as Record<string, unknown> | undefined;
  const f = resolveFields(customFields, FIELD_KEYS);

  const { isEnabled } = await getBusinessFlags();

  const headerFactsRaw = parseTemplateListRows(
    rawCustomFields?.["pink.contact.header-facts"],
  ) as FactRow[];
  // Only saved rows are a real `header-facts` list item — the Settings
  // location fallback isn't part of the saved list, so it never gets a
  // `data-sp-item` (there's nothing in the list editor for it to focus).
  const headerFactsFromSaved = headerFactsRaw.length > 0;
  const headerFacts = headerFactsFromSaved
    ? headerFactsRaw.map((r) => ({
        label: r.label ?? "",
        value: r.value ?? "",
        _id: r._id,
      }))
    : defaultHeaderFacts(business);

  const topics = parseTemplateListRows(
    rawCustomFields?.["pink.contact.topics-items"],
  ) as PinkContactTopic[];

  const shortcutsRaw = parseTemplateListRows(
    rawCustomFields?.["pink.contact.shortcuts-items"],
  ) as ShortcutItem[];
  const shortcutsSource: ShortcutItem[] =
    shortcutsRaw.length > 0 ? shortcutsRaw : DEFAULT_PINK_CONTACT_SHORTCUTS;
  // PF15 (B2.5): drop — never redirect — a shortcut whose own href names a
  // flag that's off (e.g. the default "Ask about a make & take" → /services
  // row, with `services` off).
  const shortcuts: ShortcutItem[] = shortcutsSource.filter((item) => {
    const href = item.href ?? "";
    const flag = navHrefOffFlag(href, isEnabled);
    return flag === null || isEnabled(flag);
  });

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
  // PF15 (B2.5): if every shortcut got filtered out above (e.g. both
  // defaults' flags are off), don't render an empty wrapper around a heading
  // with nothing under it.
  const shortcutsVisible =
    isSectionVisible(customFields, "pink", "contact.shortcuts") &&
    shortcuts.length > 0;

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
        rightSlot={
          headerFacts.length > 0 ? (
            <PinkFactRows
              rows={headerFacts}
              surface="paper"
              itemAttr={
                headerFactsFromSaved
                  ? (i) => listItemAttr("pink.contact.header-facts", i)
                  : undefined
              }
            />
          ) : undefined
        }
        sectionAttrs={sectionGroupAttr("contact", "header")}
      />

      <div className="mx-auto grid max-w-[1480px] grid-cols-1 gap-12 px-5 md:grid-cols-[1.15fr_0.85fr] md:px-10 md:pt-16">
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
            successHeading={f["pink.contact.form-success-heading"] ?? ""}
            successBody={f["pink.contact.form-success-body"] ?? ""}
            successAgainLabel={f["pink.contact.form-success-again-label"] ?? ""}
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
                        {...listItemAttr("pink.contact.shortcuts-items", i)}
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
