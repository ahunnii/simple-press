import Link from "next/link";

import type { DefaultTestimonialsPageTemplateProps } from "../../types";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { api } from "~/trpc/server";

import { resolveFields } from "..";
import { PollenGeneralLayout } from "../layout/pollen-general-layout";
import { PollenTestimonialsWall } from "./pollen-testimonials-wall";

export async function PollenTestimonialsPage({
  business,
}: DefaultTestimonialsPageTemplateProps) {
  const testimonials = await api.testimonial.list({ publicOnly: true });

  const f = resolveFields(business?.siteContent?.customFields, [
    "pollen.testimonials.section-label",
    "pollen.testimonials.section-heading",
    "pollen.testimonials.call-to-action-header",
    "pollen.testimonials.call-to-action-text",
    "pollen.testimonials.call-to-action-button-text",
  ]);

  return (
    <PollenGeneralLayout
      business={business}
      title={f["pollen.testimonials.section-heading"]}
      subtitle={f["pollen.testimonials.section-label"]}
      sectionAttrs={sectionGroupAttr("testimonials", "page")}
    >
      <PollenTestimonialsWall testimonials={testimonials} />
      <section
        className="bg-[#f5f2ee] py-16"
        {...sectionGroupAttr("testimonials", "page")}
      >
        <div className="mx-auto max-w-2xl px-4 text-center">
          <h2 className="text-2xl font-bold text-[#2a351f]">
            {f["pollen.testimonials.call-to-action-header"]}
          </h2>
          <p className="mt-2 text-[#4c566a]">
            {f["pollen.testimonials.call-to-action-text"]}
          </p>
          <Link
            href="/testimonials/submit"
            className="mt-6 inline-block rounded-full bg-[#215935] px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            {f["pollen.testimonials.call-to-action-button-text"]}
          </Link>
        </div>
      </section>
    </PollenGeneralLayout>
  );
}
