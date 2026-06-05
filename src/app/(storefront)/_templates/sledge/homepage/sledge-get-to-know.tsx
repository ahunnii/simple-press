import Image from "next/image";
import Link from "next/link";

import { cn } from "~/lib/utils";
import { buttonVariants } from "~/components/ui/button";

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
    <section
      style={{ background: "var(--sl-green)", padding: "4rem 1.75rem" }}
      {...sectionAttrs}
    >
      <div
        className="grid grid-cols-1 items-center gap-12 md:grid-cols-2"
        style={{ maxWidth: "1100px", margin: "0 auto" }}
      >
        {/* Left: product image */}
        {image ? (
          <div
            style={{
              position: "relative",
              aspectRatio: "4/5",
              borderRadius: "0.75rem",
              overflow: "hidden",
              background: "rgba(0,0,0,0.15)",
            }}
          >
            <Image
              src={image}
              alt={heading ?? "Get to Know"}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
        ) : (
          <div
            style={{
              aspectRatio: "4/5",
              borderRadius: "0.75rem",
              background: "rgba(0,0,0,0.12)",
            }}
          />
        )}

        {/* Right: text */}
        <div>
          <h2
            className="font-heading font-bold"
            style={{
              fontSize: "clamp(3rem, 7vw, 6rem)",
              color: "var(--sl-coral)",
              lineHeight: 1.05,
              marginBottom: "2rem",
            }}
          >
            {heading ?? "Get to Know Judy"}
          </h2>

          {/* Red-bar body text */}
          <div
            style={{
              borderLeft: "4px solid var(--sl-red)",
              paddingLeft: "1.25rem",
              marginBottom: "2.5rem",
            }}
          >
            <p
              className="font-sans italic"
              style={{
                fontSize: "clamp(17.5px, 2.25vw, 21.25px)",
                color: "var(--sl-ink)",
                lineHeight: 1.85,
                maxWidth: "52ch",
              }}
            >
              {body}
            </p>
          </div>

          {/* Coral buttons */}
          <div className="flex flex-wrap gap-4">
            <Link href={primary?.href ?? "/about"} className={"sl-btn"}>
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
