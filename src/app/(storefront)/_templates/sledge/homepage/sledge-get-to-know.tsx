import Image from "next/image";
import Link from "next/link";

type SledgeGetToKnowProps = {
  heading?: string;
  body?: string;
  image?: string;
  primary?: { text: string; href: string };
  secondary?: { text: string; href: string };
  /** Spread on root <section> for preview overlay hotspot. */
  sectionAttrs?: Record<string, string>;
};

export function SledgeGetToKnow({
  heading,
  body,
  image,
  primary,
  secondary,
  sectionAttrs,
}: SledgeGetToKnowProps) {
  return (
    <section className="sl-section-green" {...sectionAttrs}>
      <div className="sl-container grid grid-cols-1 items-center gap-12 md:grid-cols-2">
        {/* Left: product image */}
        {image ? (
          <div className="sl-media-frame sl-media-frame-dark">
            <Image
              src={image}
              alt={heading ?? "Get to Know"}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
        ) : (
          <div className="sl-media-frame sl-media-frame-muted" />
        )}

        {/* Right: text */}
        <div>
          <h2 className="sl-heading-xl font-heading font-bold">
            {heading ?? "Get to Know Judy"}
          </h2>

          {/* Red-bar body text */}
          <div className="sl-quote-bar mb-10">
            <p className="sl-quote-body font-sans italic">{body}</p>
          </div>

          {/* Coral buttons */}
          <div className="flex flex-wrap gap-4">
            <Link href={primary?.href ?? "/about"} className="sl-btn">
              {primary?.text ?? "Find Out More"}
            </Link>
            <Link href={secondary?.href ?? "/contact"} className="sl-btn">
              {secondary?.text ?? "Contact Judy"}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
