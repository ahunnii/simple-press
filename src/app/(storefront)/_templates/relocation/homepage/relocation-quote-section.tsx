import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";

import { resolveFields } from "..";
import { RelocationReveal } from "../shared/relocation-reveal";
import { RelocationQuoteForm } from "./relocation-quote-form";

/**
 * Homepage §2 — "GET YOUR FREE / MOVING QUOTES HERE" (design.md → Homepage).
 * Tall U-Haul crew photo on the left, centred heading and the free-estimate
 * form on the right. The form itself is the `"use client"` island; everything
 * around it stays on the server.
 */
export function RelocationQuoteSection({
  customFields,
}: {
  customFields: unknown;
}) {
  const f = resolveFields(customFields, [
    "relocation.homepage.quote-image",
    "relocation.homepage.quote-image-alt",
    "relocation.homepage.quote-heading",
    "relocation.homepage.quote-name-label",
    "relocation.homepage.quote-first-label",
    "relocation.homepage.quote-last-label",
    "relocation.homepage.quote-email-label",
    "relocation.homepage.quote-email-placeholder",
    "relocation.homepage.quote-phone-label",
    "relocation.homepage.quote-submit-label",
    "relocation.homepage.quote-success-heading",
    "relocation.homepage.quote-success-body",
    "relocation.homepage.quote-success-again-label",
  ]);

  const photo = f["relocation.homepage.quote-image"] ?? "";

  return (
    <section
      {...sectionGroupAttr("homepage", "quote-form")}
      aria-labelledby="relocation-quote-heading"
      className="w-full bg-[var(--relocation-paper)] py-14 min-[1025px]:py-21"
    >
      <div className="mx-auto w-full max-w-[85rem] px-6 min-[572px]:px-10 min-[1025px]:px-16">
        <div className="grid gap-10 min-[1025px]:grid-cols-2 min-[1025px]:items-center min-[1025px]:gap-16">
          {photo !== "" ? (
            <RelocationReveal className="flex justify-center min-[1025px]:justify-start">
              <img
                src={photo}
                alt={f["relocation.homepage.quote-image-alt"] ?? ""}
                width={828}
                height={1094}
                loading="lazy"
                decoding="async"
                className="block aspect-[828/1094] w-full max-w-[22rem] object-cover"
              />
            </RelocationReveal>
          ) : null}

          <RelocationReveal className="w-full">
            <h2
              id="relocation-quote-heading"
              {...fieldAttr("relocation.homepage.quote-heading")}
              className="text-center [font-family:var(--font-relocation-body)] text-[1.1875rem] leading-[1.875rem] font-medium tracking-[-0.19px] whitespace-pre-line text-[var(--relocation-ink)] min-[1025px]:text-[1.4375rem] min-[1025px]:leading-[2.25rem] min-[1025px]:tracking-[-0.23px]"
            >
              {f["relocation.homepage.quote-heading"] ?? ""}
            </h2>

            <div className="mt-8">
              <RelocationQuoteForm
                nameLabel={f["relocation.homepage.quote-name-label"] ?? ""}
                firstLabel={f["relocation.homepage.quote-first-label"] ?? ""}
                lastLabel={f["relocation.homepage.quote-last-label"] ?? ""}
                emailLabel={f["relocation.homepage.quote-email-label"] ?? ""}
                emailPlaceholder={
                  f["relocation.homepage.quote-email-placeholder"] ?? ""
                }
                phoneLabel={f["relocation.homepage.quote-phone-label"] ?? ""}
                submitLabel={f["relocation.homepage.quote-submit-label"] ?? ""}
                successHeading={
                  f["relocation.homepage.quote-success-heading"] ?? ""
                }
                successBody={f["relocation.homepage.quote-success-body"] ?? ""}
                successAgainLabel={
                  f["relocation.homepage.quote-success-again-label"] ?? ""
                }
                nameLabelAttrs={fieldAttr(
                  "relocation.homepage.quote-name-label",
                )}
                firstLabelAttrs={fieldAttr(
                  "relocation.homepage.quote-first-label",
                )}
                lastLabelAttrs={fieldAttr(
                  "relocation.homepage.quote-last-label",
                )}
                emailLabelAttrs={fieldAttr(
                  "relocation.homepage.quote-email-label",
                )}
                phoneLabelAttrs={fieldAttr(
                  "relocation.homepage.quote-phone-label",
                )}
                submitLabelAttrs={fieldAttr(
                  "relocation.homepage.quote-submit-label",
                )}
                successHeadingAttrs={fieldAttr(
                  "relocation.homepage.quote-success-heading",
                )}
                successBodyAttrs={fieldAttr(
                  "relocation.homepage.quote-success-body",
                )}
                successAgainLabelAttrs={fieldAttr(
                  "relocation.homepage.quote-success-again-label",
                )}
              />
            </div>
          </RelocationReveal>
        </div>
      </div>
    </section>
  );
}
