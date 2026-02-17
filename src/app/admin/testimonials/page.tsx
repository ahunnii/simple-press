import { TrailHeader } from "../_components/trail-header";
import { TestimonialsActions } from "./_components/testimonials-actions";
import { TestimonialsList } from "./_components/testimonials-list";

export default async function TestimonialsPage() {
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

        <TestimonialsList />
      </div>
    </>
  );
}

export const metadata = {
  title: "Testimonials",
};
