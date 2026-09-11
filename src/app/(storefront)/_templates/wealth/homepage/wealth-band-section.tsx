import Image from "next/image";

import { sectionGroupAttr } from "~/lib/preview/section-attrs";

import { WealthSection } from "../shared/wealth-section";

type Props = {
  image: string;
  imageAlt: string;
  /**
   * "bleed" — standalone full-bleed band (used when the What Is a
   * Cooperative? section is hidden). "inset" — rendered as the left column
   * of the shared band+cooperative desktop row, matching the live site's
   * float pair (photo left, definition copy right).
   */
  variant?: "bleed" | "inset";
  className?: string;
};

/** Community-event photo. No text overlay (design.md). */
export function WealthBandSection({
  image,
  imageAlt,
  variant = "bleed",
  className,
}: Props) {
  if (!image) return null;

  if (variant === "inset") {
    return (
      <WealthSection
        sectionAttrs={sectionGroupAttr("homepage", "band")}
        contained={false}
        className={className ?? "py-0"}
      >
        <div className="relative h-[clamp(200px,22vw,320px)] w-full overflow-hidden">
          <Image
            src={image}
            alt={imageAlt}
            fill
            sizes="(min-width: 1024px) 45vw, 100vw"
            className="object-cover"
          />
        </div>
      </WealthSection>
    );
  }

  return (
    <WealthSection
      sectionAttrs={sectionGroupAttr("homepage", "band")}
      contained={false}
      className="py-0"
    >
      <div className="relative h-[clamp(240px,30vw,480px)] w-full overflow-hidden">
        <Image
          src={image}
          alt={imageAlt}
          fill
          sizes="100vw"
          className="object-cover"
        />
      </div>
    </WealthSection>
  );
}
