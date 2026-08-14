import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { getListFieldValue } from "~/lib/template-fields";

import { DEFAULT_RELOCATION_GALLERY } from ".";
import { resolveFields } from "..";
import { RelocationCircleImage } from "../shared/relocation-circle-image";
import {
  RelocationReveal,
  RelocationRevealGroup,
} from "../shared/relocation-reveal";
import { RelocationSectionHeading } from "../shared/relocation-section-heading";
import { toRelocationPhotoRows } from "./rows";

/**
 * Homepage §8 — "HANDY RELOCATIONS MOVERS IN ACTION" (design.md → Homepage):
 * the charcoal heading variant over a row of circular crew photos.
 */
export function RelocationGallerySection({
  customFields,
}: {
  customFields: unknown;
}) {
  const f = resolveFields(customFields, [
    "relocation.homepage.gallery-heading",
  ]);

  const photos = toRelocationPhotoRows(
    getListFieldValue(customFields, "relocation.homepage.gallery-list"),
    DEFAULT_RELOCATION_GALLERY,
  );

  return (
    <section
      {...sectionGroupAttr("homepage", "gallery")}
      aria-labelledby="relocation-gallery-heading"
      className="w-full bg-[var(--relocation-paper)] py-10 min-[1025px]:py-[2.6375rem]"
    >
      <div className="mx-auto w-full max-w-[85rem] px-6 min-[572px]:px-10 min-[1025px]:px-16">
        <RelocationReveal>
          <RelocationSectionHeading
            id="relocation-gallery-heading"
            dark
            fieldAttrs={fieldAttr("relocation.homepage.gallery-heading")}
          >
            {f["relocation.homepage.gallery-heading"] ?? ""}
          </RelocationSectionHeading>
        </RelocationReveal>

        {photos.length > 0 ? (
          <RelocationRevealGroup className="mt-10">
            <ul className="flex flex-wrap items-center justify-center gap-8 min-[1025px]:justify-between min-[1025px]:gap-10">
              {photos.map((photo, i) => (
                <li
                  key={`${photo.image}-${i}`}
                  className="relocation-reveal-item flex justify-center"
                  style={{ ["--i" as string]: Math.min(i, 7) }}
                >
                  <RelocationCircleImage
                    src={photo.image}
                    alt={photo.alt}
                    size={230}
                  />
                </li>
              ))}
            </ul>
          </RelocationRevealGroup>
        ) : null}
      </div>
    </section>
  );
}
