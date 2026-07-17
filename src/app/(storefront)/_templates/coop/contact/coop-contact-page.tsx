import type { DefaultContactPageTemplateProps } from "../../types";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";

import { resolveFields } from "..";

/**
 * Building Cooperatively's Contact page, transcribed verbatim from
 * `building-clone/src/app/schedule-appointment/page.tsx` (data-cid n35–n72).
 * There is no contact form in the source — this is a plain two-column
 * informational block (left: heading + copy + social prompt; right: small
 * heading + address + mailto link + phone) on the `--coop-surface` page
 * background. The `useContactForm` shared-hook requirement is waived for
 * coop per the build brief (approved deviation — the clone has no form).
 *
 * Bidi note: the clone wraps the phone number in a Left-to-Right Embedding
 * (U+202A) / Pop Directional Formatting (U+202C) pair inside
 * `<strong><em>…</em>(313) 444-9681…</strong>` — a Squarespace copy-paste
 * artifact. Preserved exactly; only the phone digits themselves are the
 * owner-editable field.
 *
 * Hierarchy note: the clone nests each content block one level deeper than
 * strictly necessary via pairs of classless `<div className="block">`
 * wrappers (CMS-block scaffolding artifacts, data-cid n40/n41, n45/n46,
 * n49/n50, n59/n60, n63/n64, n67/n68, plus the outer page wrapper n36).
 * They render identically either way, but are kept per design.md Port rule 7
 * ("keep the clone's exact element hierarchy") and to match the sibling
 * `coop-homepage.tsx`, which explicitly preserves the same class of no-op
 * wrapper divs for the same reason. `box-content` is dropped throughout,
 * matching the convention already established by `coop-header.tsx` /
 * `coop-footer.tsx` / `coop-homepage.tsx` (border-box renders identically
 * for these box-model values since none combine an own explicit
 * width/height with own padding/border).
 */
export function CoopContactPage({ business }: DefaultContactPageTemplateProps) {
  const customFields = business.siteContent?.customFields as
    | Record<string, string>
    | undefined;

  const f = resolveFields(customFields, [
    "coop.contact.heading",
    "coop.contact.intro-line",
    "coop.contact.referral-body",
    "coop.contact.social-line1",
    "coop.contact.social-line2",
    "coop.contact.right-heading",
    "coop.contact.address-line1",
    "coop.contact.address-line2",
    "coop.contact.address-line3",
    "coop.contact.email",
    "coop.contact.phone-label",
    "coop.contact.phone",
  ]);

  const heading = f["coop.contact.heading"] ?? "";
  const introLine = f["coop.contact.intro-line"] ?? "";
  const referralBody = f["coop.contact.referral-body"] ?? "";
  const socialLine1 = f["coop.contact.social-line1"] ?? "";
  const socialLine2 = f["coop.contact.social-line2"] ?? "";
  const rightHeading = f["coop.contact.right-heading"] ?? "";
  const addressLine1 = f["coop.contact.address-line1"] ?? "";
  const addressLine2 = f["coop.contact.address-line2"] ?? "";
  const addressLine3 = f["coop.contact.address-line3"] ?? "";
  const email = f["coop.contact.email"] ?? "";
  const phoneLabel = f["coop.contact.phone-label"] ?? "";
  const phone = f["coop.contact.phone"] ?? "";

  return (
    <div className="coop-surface-page">
      <section
        {...sectionGroupAttr("contact", "main")}
        className="mx-auto block max-w-425 px-[10.9375rem] py-[7.8125rem] max-coop-md:px-5 max-coop-md:py-15 coop-md:max-coop-lg:px-9 coop-md:max-coop-lg:py-30"
      >
        {/* Clone data-cid n36 — no-op page wrapper, kept for exact hierarchy */}
        <div className="block">
          <div className="-mx-[1.0625rem] block h-[29.25rem] before:table before:h-0 before:w-0 before:content-[''] after:table after:h-0 after:w-0 after:content-[''] max-coop-md:h-auto coop-2xl:h-[24.7375rem]">
            {/* ── Left column (642.7px) ─────────────────────────────────── */}
            <div className="float-left block w-[642.7px] max-coop-md:float-none max-coop-md:w-[23.0625rem] coop-md:max-coop-lg:w-[486.7px] coop-2xl:w-[922.7px]">
              <div className="relative block px-[1.0625rem] pb-[1.0625rem] max-coop-md:pt-[1.0625rem]">
                {/* Clone data-cid n40/n41 — no-op wrapper divs, kept for exact hierarchy */}
                <div className="block">
                  <div className="block">
                    <h1 className="block h-20 text-[2.4375rem] leading-[2.4375rem] tracking-[-0.78px] whitespace-pre-wrap text-[var(--coop-color-003)] [font-family:var(--font-coop-heading)] max-coop-md:h-auto max-coop-md:text-[1.75rem] max-coop-md:leading-7 max-coop-md:tracking-[-0.01px] coop-2xl:h-10">
                      <strong
                        className="inline font-bold [overflow-wrap:break-word]"
                        {...fieldAttr("coop.contact.heading")}
                      >
                        {heading}
                      </strong>
                    </h1>
                  </div>
                </div>
              </div>

              <div className="relative clear-both block p-[1.0625rem]">
                {/* Clone data-cid n45/n46 — no-op wrapper divs, kept for exact hierarchy */}
                <div className="block">
                  <div className="block">
                    <hr className="my-[9.5px] block h-px w-[38.0625rem] overflow-hidden bg-[var(--coop-primary)] text-[var(--coop-primary)] max-coop-md:w-[20.9375rem] coop-md:max-coop-lg:w-[28.3125rem] coop-2xl:w-[55.5625rem]" />
                  </div>
                </div>
              </div>

              <div className="relative block p-[1.0625rem]">
                {/* Clone data-cid n49/n50 — no-op wrapper divs, kept for exact hierarchy */}
                <div className="block">
                  <div className="block">
                    <p
                      className="mb-[1.1875rem] block h-[32.3px] whitespace-pre-wrap [overflow-wrap:break-word] max-coop-md:h-[4.0375rem]"
                      {...fieldAttr("coop.contact.intro-line")}
                    >
                      {introLine}
                      <br />
                    </p>

                    {/* Empty paragraph — no field, structural spacing only (clone data-cid n53) */}
                    <p
                      aria-hidden="true"
                      className="my-[1.1875rem] block whitespace-pre-wrap before:inline-block before:h-0 before:w-0 before:content-[''] [overflow-wrap:break-word]"
                    />

                    <p
                      className="my-[1.1875rem] block whitespace-pre-wrap [overflow-wrap:break-word]"
                      {...fieldAttr("coop.contact.referral-body")}
                    >
                      {referralBody}
                    </p>

                    <p className="mt-[1.1875rem] block h-[4.0375rem] whitespace-pre-wrap [overflow-wrap:break-word]">
                      <span {...fieldAttr("coop.contact.social-line1")}>
                        {socialLine1}
                      </span>
                      <br />
                      <span {...fieldAttr("coop.contact.social-line2")}>
                        {socialLine2}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Right column (321.3px) ────────────────────────────────── */}
            <div className="float-left block w-[321.3px] max-coop-md:float-none max-coop-md:w-[23.0625rem] coop-md:max-coop-lg:w-[243.3px] coop-2xl:w-[461.3px]">
              <div className="relative block px-[1.0625rem] pb-[1.0625rem] max-coop-md:pt-[1.0625rem]">
                {/* Clone data-cid n59/n60 — no-op wrapper divs, kept for exact hierarchy */}
                <div className="block">
                  <div className="block">
                    <h2
                      className="block text-[2.4375rem] leading-[2.4375rem] tracking-[-0.78px] whitespace-pre-wrap text-[var(--coop-color-003)] [font-family:var(--font-coop-heading)] max-coop-md:text-[1.75rem] max-coop-md:leading-7 max-coop-md:tracking-[-0.01px]"
                      {...fieldAttr("coop.contact.right-heading")}
                    >
                      {rightHeading}
                    </h2>
                  </div>
                </div>
              </div>

              <div className="relative clear-both block p-[1.0625rem]">
                {/* Clone data-cid n63/n64 — no-op wrapper divs, kept for exact hierarchy */}
                <div className="block">
                  <div className="block">
                    <hr className="my-[9.5px] block h-px w-[17.9375rem] overflow-hidden bg-[var(--coop-primary)] text-[var(--coop-primary)] max-coop-md:w-[20.9375rem] coop-md:max-coop-lg:w-[13.0625rem] coop-2xl:w-[26.6875rem]" />
                  </div>
                </div>
              </div>

              <div className="relative block p-[1.0625rem]">
                {/* Clone data-cid n67/n68 — no-op wrapper divs, kept for exact hierarchy */}
                <div className="block">
                  <div className="block">
                    <h3
                      className="mb-3.5 block text-sm leading-[0.9375rem] tracking-[0.42px] whitespace-pre-wrap uppercase text-[var(--coop-color-002)] [font-family:var(--font-coop-label)]"
                      {...fieldAttr("coop.contact.address-line1")}
                    >
                      {addressLine1}
                    </h3>
                    <h3
                      className="mt-[0.9375rem] mb-3.5 block text-sm leading-[0.9375rem] tracking-[0.42px] whitespace-pre-wrap uppercase text-[var(--coop-color-002)] [font-family:var(--font-coop-label)]"
                      {...fieldAttr("coop.contact.address-line2")}
                    >
                      {addressLine2}
                    </h3>
                    <h3
                      className="mt-[0.9375rem] mb-3.5 block text-sm leading-[0.9375rem] tracking-[0.42px] whitespace-pre-wrap uppercase text-[var(--coop-color-002)] [font-family:var(--font-coop-label)]"
                      {...fieldAttr("coop.contact.address-line3")}
                    >
                      {addressLine3}
                    </h3>

                    <p className="mt-[1.1875rem] block h-[4.0375rem] whitespace-pre-wrap [overflow-wrap:break-word] coop-md:max-coop-lg:h-[8.075rem]">
                      <a
                        href={`mailto:${email}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="coop-mailto-link inline cursor-pointer border-b border-solid border-b-[var(--coop-clr-4)] pb-px text-[var(--coop-clr-1)]"
                        {...fieldAttr("coop.contact.email")}
                      >
                        {email}
                      </a>
                      <br />
                      <span {...fieldAttr("coop.contact.phone-label")}>
                        {phoneLabel}
                      </span>
                      <strong className="inline font-bold">
                        <em className="inline italic">{"‪"}</em>
                        <span {...fieldAttr("coop.contact.phone")}>
                          {phone}
                        </span>
                        {"‬"}
                      </strong>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
