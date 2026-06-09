import { cn } from "~/lib/utils";

type SledgeTestimonialCardProps = {
  label?: string;
  quote: string;
  attribution?: string;
  className?: string;
};

export function SledgeTestimonialCard({
  label = "What People Say",
  quote,
  attribution,
  className,
}: SledgeTestimonialCardProps) {
  return (
    <article className={cn("sl-testimonial-card", className)}>
      <p className="sl-testimonial-card-label text-lg">{label}</p>

      <blockquote className="sl-testimonial-card-quote font-sans leading-[1.4rem] font-medium italic">
        {quote}
      </blockquote>

      {attribution && (
        <p className="sl-testimonial-card-attribution">{attribution}</p>
      )}
    </article>
  );
}
