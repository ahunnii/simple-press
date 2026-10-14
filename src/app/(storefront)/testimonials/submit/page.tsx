import { notFound, redirect } from "next/navigation";

import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { getSession } from "~/server/better-auth/server";
import { db } from "~/server/db";
import { api } from "~/trpc/server";

import { TestimonialForm } from "./_components/testimonial-form";
import { TestimonialFormUnauthenticated } from "./_components/testimonial-form-unauthenticated";

export const metadata = {
  title: "Submit a Testimonial",
  robots: { index: false, follow: false },
};

export default async function SubmitTestimonialPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;

  const { isEnabled } = await getBusinessFlags();
  if (!isEnabled("testimonials")) notFound();

  // Get business from subdomain
  const business = await api.business.simplifiedGet();
  if (!business) notFound();
  // Check if using invite code
  if (code) {
    return <TestimonialFormUnauthenticated code={code} business={business} />;
  }

  // Otherwise require authentication
  const session = await getSession();

  if (!session?.user) {
    redirect(`/auth/sign-in?redirectTo=/testimonials/submit`);
  }

  // simplifiedGet doesn't carry the auto-approve setting, so read it here — the
  // form uses it to say whether a submission goes live right away or waits.
  const settings = await db.business.findUnique({
    where: { id: business.id },
    select: { testimonialsAutoApprove: true },
  });

  return (
    <TestimonialForm
      business={business}
      autoApprove={settings?.testimonialsAutoApprove ?? false}
    />
  );
}
