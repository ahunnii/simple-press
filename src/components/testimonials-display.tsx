"use client";

import { Star } from "lucide-react";

import { Card, CardContent } from "~/components/ui/card";

type Testimonial = {
  id: string;
  customerName: string;
  rating: number;
  text: string;
  photoUrl: string | null;
  videoUrl: string | null;
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
  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-5 w-5 ${
              star <= rating
                ? "fill-yellow-400 text-yellow-400"
                : "text-gray-300"
            }`}
          />
        ))}
      </div>
    );
  };

  if (layout === "grid") {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {testimonials.map((testimonial) => (
          <Card key={testimonial.id}>
            <CardContent className="pt-6">
              {renderStars(testimonial.rating)}
              <p className="mt-4 mb-4 text-gray-700">{testimonial.text}</p>
              <div className="flex items-center gap-3">
                {testimonial.photoUrl && (
                  <img
                    src={testimonial.photoUrl}
                    alt={testimonial.customerName}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                )}
                <div>
                  <p className="font-medium">{testimonial.customerName}</p>
                  <p className="text-sm text-gray-500">Verified Customer</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Add carousel and list layouts as needed
  return null;
}
