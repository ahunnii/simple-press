import { api } from "~/trpc/server";

import { TrailHeader } from "../_components/trail-header";
import { TestimonialsActions } from "./_components/testimonials-actions";
import { TestimonialsList } from "./_components/testimonials-list";

export default async function TestimonialsPage() {
  const testimonials = await api.testimonial.list({
    publicOnly: false,
  });

  const invites = await api.testimonial.listInvites();

  return (
    <>
      <TrailHeader breadcrumbs={[{ label: "Testimonials" }]} />
      <div className="admin-container">
        <div className="admin-header">
          <div>
            <h1>Testimonials</h1>
            <p>Manage customer testimonials and reviews</p>
          </div>
          <TestimonialsActions />
        </div>

        <TestimonialsList
          testimonials={testimonials ?? []}
          invites={invites ?? []}
        />
      </div>
    </>
  );
}

export const metadata = {
  title: "Testimonials",
};
