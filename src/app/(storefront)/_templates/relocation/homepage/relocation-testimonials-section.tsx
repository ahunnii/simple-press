import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";

import { resolveFields } from "..";
import { RelocationReveal } from "../shared/relocation-reveal";
import { RelocationSectionHeading } from "../shared/relocation-section-heading";
import { RelocationTestimonialCarousel } from "../shared/relocation-testimonial-carousel";

/**
 * Homepage §7 — "Our Client Testimonials!" (design.md → Homepage): a
 * right-aligned charcoal heading over the grey-card carousel.
 *
 * Rows come from the business's approved testimonials, so the caller fetches
 * them; the section renders nothing at all when there are none, rather than
 * showing an empty carousel shell.
 */
export function RelocationTestimonialsSection({
  customFields,
  testimonials,
}: {
  customFields: unknown;
  testimonials: { id: string; text: string; customerName: string }[];
}) {
  const f = resolveFields(customFields, [
    "relocation.homepage.testimonials-heading",
  ]);

  if (testimonials.length === 0) return null;

  return (
    <section
      {...sectionGroupAttr("homepage", "testimonials")}
      aria-labelledby="relocation-testimonials-heading"
      className="w-full bg-[var(--relocation-paper)] py-14 min-[1025px]:py-21"
    >
      <div className="mx-auto w-full max-w-[85rem] px-6 min-[572px]:px-10 min-[1025px]:px-16">
        <RelocationReveal>
          <RelocationSectionHeading
            id="relocation-testimonials-heading"
            dark
            fieldAttrs={fieldAttr("relocation.homepage.testimonials-heading")}
            className="text-right text-[2.8125rem] leading-[3.375rem] min-[1025px]:text-[4rem] min-[1025px]:leading-[4.8125rem]"
          >
            {f["relocation.homepage.testimonials-heading"] ?? ""}
          </RelocationSectionHeading>
        </RelocationReveal>

        <RelocationReveal className="mt-12 min-[1025px]:mt-16">
          <RelocationTestimonialCarousel testimonials={testimonials} />
        </RelocationReveal>
      </div>
    </section>
  );
}
