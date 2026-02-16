import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "~/server/better-auth";
import { db } from "~/server/db";
import { api } from "~/trpc/server";

import { TestimonialForm } from "./_components/testimonial-form";
import { TestimonialFormUnauthenticated } from "./_components/testimonial-form-unauthenticated";

export default async function SubmitTestimonialPage({
  searchParams,
}: {
  searchParams: { code?: string };
}) {
  // Get business from subdomain
  const business = await api.business.get();

  if (!business) {
    redirect("/");
  }

  // Check if using invite code
  if (searchParams.code) {
    return (
      <TestimonialFormWithCode code={searchParams.code} business={business} />
    );
  }

  // Otherwise require authentication
  const session = await auth.api.getSession();

  if (!session?.user) {
    redirect(`/auth/sign-in?redirect=/testimonials/submit`);
  }

  return <TestimonialForm business={business} />;
}

// Component for invite code flow
async function TestimonialFormWithCode({
  code,
  business,
}: {
  code: string;
  business: { id: string; name: string };
}) {
  return <TestimonialFormUnauthenticated code={code} business={business} />;
}
