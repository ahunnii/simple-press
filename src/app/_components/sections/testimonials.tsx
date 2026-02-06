import { Quote } from "lucide-react";

const testimonials = [
  {
    quote:
      "Since we organized the Keep It Clean – Riopelle St. club, the illegal dumping on our corner has completely stopped. CCA gave us the resources to take our block back.",
    author: "Robert Williams",
    role: "Riopelle St. Resident",
  },
  {
    quote:
      "Being part of the Neighborhood Safety Alliance has connected us directly with District 3 leadership. We finally feel like our voices are being heard at City Hall.",
    author: "Linda Grosse",
    role: "Grixdale Farms Coordinator",
  },
  {
    quote:
      "The beautification projects at Charleston Little Gardens have transformed our street. It’s not just about the flowers; it’s about the pride our kids now have in where they live.",
    author: "Jameson Parks",
    role: "Exeter St. Resident",
  },
];

export function Testimonials() {
  return (
    <section id="community" className="bg-primary/5 py-20 md:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <p className="text-primary mb-4 text-sm font-medium tracking-wider uppercase">
            Community Impact
          </p>
          <h2 className="text-foreground text-3xl font-bold text-balance md:text-4xl">
            Real Stories from the Community
          </h2>
          <p className="text-muted-foreground mt-4">
            See how resident-led action is transforming northeast Detroit, one
            street at a time.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {testimonials.map((testimonial) => (
            <div
              key={testimonial.author}
              className="bg-card border-border relative rounded-2xl border p-8"
            >
              <Quote className="text-primary/20 mb-4 h-10 w-10" />
              <blockquote className="text-foreground mb-6 leading-relaxed">
                {`"${testimonial.quote}"`}
              </blockquote>
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-full">
                  <span className="text-primary text-sm font-semibold">
                    {testimonial.author
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </span>
                </div>
                <div>
                  <p className="text-foreground text-sm font-medium">
                    {testimonial.author}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {testimonial.role}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
