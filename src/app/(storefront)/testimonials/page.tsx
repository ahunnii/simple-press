import { notFound } from "next/navigation";

import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { buildPageMetadata } from "~/lib/seo";
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
  const business = await api.business.simplifiedGet();
  return buildPageMetadata({
    business,
    path: "/testimonials",
    title: "Testimonials",
    description: "Customer testimonials",
  });
}
