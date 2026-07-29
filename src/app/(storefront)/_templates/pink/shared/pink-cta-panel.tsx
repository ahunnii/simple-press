import Image from "next/image";
import Link from "next/link";

import { fieldAttr } from "~/lib/preview/section-attrs";

import { PinkEyebrow } from "./pink-eyebrow";

type PinkCtaLink = { label: string; href: string };

type PinkCtaPanelProps = {
  eyebrow?: string;
  eyebrowFieldKey?: string;
  heading: string;
  headingFieldKey?: string;
  body?: string;
  bodyFieldKey?: string;
  primaryCta?: PinkCtaLink;
  secondaryCta?: PinkCtaLink;
  /** Optional 2-up image grid alongside the copy. */
  images?: { src: string; alt: string }[];
  sectionAttrs?: Record<string, string>;
  className?: string;
};

/**
 * The `--pink-panel` inset closing block: eyebrow + heading + body + button
 * pair, with an optional 2-up image grid. Used to close out about,
 * testimonials, services and product pages (design.md → Shared component
 * inventory). Server-safe.
 */
export function PinkCtaPanel({
  eyebrow,
  eyebrowFieldKey,
  heading,
  headingFieldKey,
  body,
  bodyFieldKey,
  primaryCta,
  secondaryCta,
  images,
  sectionAttrs,
  className,
}: PinkCtaPanelProps) {
  const hasImages = images && images.length > 0;
  return (
    <div
      className={`grid gap-8 p-8 md:p-12 ${hasImages ? "md:grid-cols-2 md:items-center" : ""}${className ? ` ${className}` : ""}`}
      style={{ background: "var(--pink-panel)" }}
      {...sectionAttrs}
    >
      <div className="flex flex-col gap-4">
        {eyebrow && (
          <PinkEyebrow tone="paper" fieldKey={eyebrowFieldKey}>
            {eyebrow}
          </PinkEyebrow>
        )}
        <h2
          className="pink-display max-w-[24ch]"
          style={{
            fontSize: "clamp(26px, 2.8vw, 38px)",
            fontWeight: 600,
            letterSpacing: "-0.025em",
            lineHeight: 1.1,
          }}
          {...(headingFieldKey ? fieldAttr(headingFieldKey) : {})}
        >
          {heading}
        </h2>
        {body && (
          <p
            className="max-w-[46ch] text-[16px] leading-[1.7]"
            style={{ color: "var(--pink-body)" }}
            {...(bodyFieldKey ? fieldAttr(bodyFieldKey) : {})}
          >
            {body}
          </p>
        )}
        {(primaryCta ?? secondaryCta) && (
          <div className="mt-2 flex flex-wrap gap-3">
            {primaryCta && (
              <Link href={primaryCta.href} className="pink-btn pink-btn-solid">
                {primaryCta.label}
              </Link>
            )}
            {secondaryCta && (
              <Link href={secondaryCta.href} className="pink-btn pink-btn-ghost">
                {secondaryCta.label}
              </Link>
            )}
          </div>
        )}
      </div>

      {hasImages && (
        <div className="grid grid-cols-2 gap-3">
          {images.slice(0, 2).map((img, i) => (
            <div key={img.src + i} className="relative aspect-square overflow-hidden">
              <Image
                src={img.src || "/placeholder.svg"}
                alt={img.alt}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 50vw, 25vw"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
