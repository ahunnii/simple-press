import { notFound } from "next/navigation";

import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { buildPageMetadata, loadSeoBusiness } from "~/lib/seo";
import { db } from "~/server/db";
import { api } from "~/trpc/server";

import { getTemplate } from "../_templates/registry";

export default async function TestimonialsPage() {
  const { isEnabled } = await getBusinessFlags();
  if (!isEnabled("testimonials")) notFound();

  const business = await api.business.simplifiedGet();
  if (!business) notFound();

  const t = getTemplate(business.templateId);

  return <t.TestimonialsPage business={business} />;
}

export async function generateMetadata() {
  const business = await loadSeoBusiness("/testimonials");
  // No approved testimonials yet is a thin page: keep it out of the index
  // (the sitemap omits it on the same count — see `loadSitemapRows`).
  const visibleCount = business
    ? await db.testimonial.count({
        where: { businessId: business.id, isApproved: true, isHidden: false },
      })
    : 0;
  return buildPageMetadata({
    business,
    path: "/testimonials",
    pageMetaKey: "testimonials",
    title: "Testimonials",
    description: "Customer testimonials",
    noindex: visibleCount === 0,
  });
}
