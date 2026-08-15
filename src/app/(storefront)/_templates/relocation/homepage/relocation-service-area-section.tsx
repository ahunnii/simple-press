import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";

import { resolveFields } from "..";
import { RelocationReveal } from "../shared/relocation-reveal";
import { RelocationSectionHeading } from "../shared/relocation-section-heading";

/**
 * Homepage §5 — service area (design.md → Homepage): the Michigan county map
 * beside "WE SERVE THE DETROIT AREA!".
 *
 * The heading leads on mobile and sits to the right of the map from 1025px,
 * matching the source's `max-md` row order.
 */
export function RelocationServiceAreaSection({
  customFields,
}: {
  customFields: unknown;
}) {
  const f = resolveFields(customFields, [
    "relocation.homepage.service-area-image",
    "relocation.homepage.service-area-image-alt",
    "relocation.homepage.service-area-heading",
  ]);

  const map = f["relocation.homepage.service-area-image"] ?? "";

  return (
    <section
      {...sectionGroupAttr("homepage", "service-area")}
      aria-labelledby="relocation-service-area-heading"
      className="w-full bg-[var(--relocation-paper)] py-14 min-[1025px]:py-21"
    >
      <div className="mx-auto w-full max-w-[85rem] px-6 min-[572px]:px-10 min-[1025px]:px-16">
        <div className="grid gap-10 min-[1025px]:grid-cols-2 min-[1025px]:items-center min-[1025px]:gap-16">
          <RelocationReveal className="min-[1025px]:order-2">
            <RelocationSectionHeading
              id="relocation-service-area-heading"
              fieldAttrs={fieldAttr("relocation.homepage.service-area-heading")}
            >
              {f["relocation.homepage.service-area-heading"] ?? ""}
            </RelocationSectionHeading>
          </RelocationReveal>

          {map !== "" ? (
            <RelocationReveal className="flex justify-center min-[1025px]:order-1">
              <img
                src={map}
                alt={f["relocation.homepage.service-area-image-alt"] ?? ""}
                width={1080}
                height={1080}
                loading="lazy"
                decoding="async"
                className="block w-full max-w-[30rem] object-contain"
              />
            </RelocationReveal>
          ) : null}
        </div>
      </div>
    </section>
  );
}
