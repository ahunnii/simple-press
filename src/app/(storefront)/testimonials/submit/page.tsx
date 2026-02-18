import { redirect } from "next/navigation";

import { getSession } from "~/server/better-auth/server";
import { api } from "~/trpc/server";

import { TestimonialForm } from "./_components/testimonial-form";
import { TestimonialFormUnauthenticated } from "./_components/testimonial-form-unauthenticated";

export default async function SubmitTestimonialPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  // Get business from subdomain
  const business = await api.business.simplifiedGet();

  // Check if using invite code
  if (code) {
    return <TestimonialFormUnauthenticated code={code} business={business} />;
  }

  // Otherwise require authentication
  const session = await getSession();

  if (!session?.user) {
    redirect(`/auth/sign-in?redirect=/testimonials/submit`);
  }

  return <TestimonialForm business={business} />;
}
