import { notFound } from "next/navigation";

import { api } from "~/trpc/server";

import { TrailHeader } from "../_components/trail-header";
import { SendInviteDialog } from "./_components/send-invite-dialog";
import { TestimonialsList } from "./_components/testimonials-list";

export default async function TestimonialsPage() {
  const business = await api.business.get();

  if (!business) {
    notFound();
  }

  return (
    <>
      <TrailHeader breadcrumbs={[{ label: "Testimonials" }]} />
      <div className="admin-container">
        <div className="admin-header">
          <div>
            <h1>Testimonials</h1>
            <p>Manage customer testimonials and reviews</p>
          </div>
          <div className="flex gap-3">
            <SendInviteDialog businessId={business.id} />
          </div>
        </div>

        <TestimonialsList businessId={business.id} />
      </div>
    </>
  );
}

export const metadata = {
  title: "Testimonials",
};
