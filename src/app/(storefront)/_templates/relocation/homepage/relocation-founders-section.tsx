import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";

import { resolveFields } from "..";
import { RelocationReveal } from "../shared/relocation-reveal";

/**
 * Homepage §4 — the founders block (design.md → Homepage): the Handy badge
 * over the Emile Vincent / Jarrel Lowman paragraph on the left, tall crew
 * portrait on the right.
 */
export function RelocationFoundersSection({
  customFields,
}: {
  customFields: unknown;
}) {
  const f = resolveFields(customFields, [
    "relocation.homepage.founders-badge",
    "relocation.homepage.founders-badge-alt",
    "relocation.homepage.founders-body",
    "relocation.homepage.founders-image",
    "relocation.homepage.founders-image-alt",
  ]);

  const badge = f["relocation.homepage.founders-badge"] ?? "";
  const photo = f["relocation.homepage.founders-image"] ?? "";

  return (
    <section
      {...sectionGroupAttr("homepage", "founders")}
      aria-label="How Handy Relocations started"
      className="w-full bg-[var(--relocation-paper)] py-14 min-[1025px]:py-21"
    >
      <div className="mx-auto w-full max-w-[85rem] px-6 min-[572px]:px-10 min-[1025px]:px-16">
        <div className="grid gap-10 min-[1025px]:grid-cols-2 min-[1025px]:items-center min-[1025px]:gap-16">
          <RelocationReveal>
            {badge !== "" ? (
              <img
                src={badge}
                alt={f["relocation.homepage.founders-badge-alt"] ?? ""}
                width={160}
                height={160}
                loading="lazy"
                decoding="async"
                className="mx-auto mb-8 block w-[6.5rem] object-contain min-[1025px]:w-[8.25rem]"
              />
            ) : null}

            <p
              {...fieldAttr("relocation.homepage.founders-body")}
              className="[font-family:var(--font-relocation-body)] text-[1.1875rem] leading-[1.875rem] font-medium tracking-[-0.19px] text-[var(--relocation-ink)] min-[1025px]:text-[1.4375rem] min-[1025px]:leading-[2.25rem] min-[1025px]:tracking-[-0.23px]"
            >
              {f["relocation.homepage.founders-body"] ?? ""}
            </p>
          </RelocationReveal>

          {photo !== "" ? (
            <RelocationReveal className="flex justify-center min-[1025px]:justify-end">
              <img
                src={photo}
                alt={f["relocation.homepage.founders-image-alt"] ?? ""}
                width={828}
                height={1097}
                loading="lazy"
                decoding="async"
                className="block aspect-[828/1097] w-full max-w-[22rem] object-cover"
              />
            </RelocationReveal>
          ) : null}
        </div>
      </div>
    </section>
  );
}
