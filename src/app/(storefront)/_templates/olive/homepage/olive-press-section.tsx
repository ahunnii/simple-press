import Image from "next/image";

import { OliveMarquee, OliveSection, OliveSectionHeading } from "../shared";

export type OlivePressLogo = {
  id: string;
  image: string;
  name: string;
};

type Props = {
  heading: string;
  logos: OlivePressLogo[];
  sectionAttrs?: Record<string, string>;
  headingFieldKey?: string;
};

/**
 * The press strip — logos of publications that have actually covered the shop,
 * drifting past at reading pace and stopping on hover, focus or the pause
 * control. Under reduced motion the chrome's CSS turns the same markup into a
 * static, wrapped, scrollable row.
 *
 * The section ships hidden (`defaultHidden`) and renders nothing without
 * logos: a new store must never appear to claim press it does not have.
 */
export function OlivePressSection({
  heading,
  logos,
  sectionAttrs,
  headingFieldKey,
}: Props) {
  const shown = logos.slice(0, 6);
  if (shown.length === 0) return null;

  return (
    <OliveSection
      tone="white"
      aria-labelledby="olive-press-heading"
      {...sectionAttrs}
    >
      <OliveSectionHeading
        heading={heading}
        id="olive-press-heading"
        align="center"
        headingFieldKey={headingFieldKey}
        className="mb-8"
      />

      <OliveMarquee aria-label="Press coverage">
        {shown.map((logo) => (
          <span
            key={logo.id}
            className="relative block shrink-0"
            style={{
              width: "clamp(88px, 12vw, 136px)",
              height: "clamp(40px, 6vw, 64px)",
            }}
          >
            <Image
              src={logo.image}
              alt={logo.name}
              fill
              sizes="136px"
              className="object-contain"
            />
          </span>
        ))}
      </OliveMarquee>
    </OliveSection>
  );
}
