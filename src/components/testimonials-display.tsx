"use client";

import { Card, CardContent } from "~/components/ui/card";

type Testimonial = {
  id: string;
  customerName: string;
  text: string;
  photoUrls: string[];
  createdAt: Date;
};

type TestimonialsDisplayProps = {
  testimonials: Testimonial[];
  layout?: "grid" | "carousel" | "list";
};

export function TestimonialsDisplay({
  testimonials,
  layout = "grid",
}: TestimonialsDisplayProps) {
  if (layout === "grid") {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {testimonials.map((testimonial) => (
          <Card key={testimonial.id}>
            <CardContent className="pt-6">
              <p className="mb-4 text-gray-700">{testimonial.text}</p>
              <div className="flex items-center gap-3">
                {testimonial.photoUrls?.[0] ? (
                  <img
                    src={testimonial.photoUrls[0]}
                    alt={testimonial.customerName}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : null}
                <div>
                  <p className="font-medium">{testimonial.customerName}</p>
                  <p className="text-sm text-gray-500">Customer</p>
                </div>
              </div>
              {testimonial.photoUrls && testimonial.photoUrls.length > 1 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {testimonial.photoUrls.slice(1, 5).map((url, i) => (
                    <img
                      key={i}
                      src={url}
                      alt=""
                      className="h-16 w-16 rounded object-cover"
                    />
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return null;
}
