import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { FadeIn, ScaleIn } from "~/components/page-animations";

import { resolveFields } from "..";
import { BambooMap } from "../shared/bamboo-map";
import { BambooSectionHeading } from "./bamboo-section-heading";

type Props = {
  customFields: unknown;
  businessName: string;
  address?: string;
  latitude: number;
  longitude: number;
  viewUrl: string;
  directionsUrl: string;
};

export function BambooLocationSection({
  customFields,
  businessName,
  address,
  latitude,
  longitude,
  viewUrl,
  directionsUrl,
}: Props) {
  const f = resolveFields(customFields, [
    "bamboo.homepage.location-eyebrow",
    "bamboo.homepage.location-heading",
  ]);

  return (
    <section
      {...sectionGroupAttr("homepage", "location")}
      aria-label="Our location"
      className="bg-[var(--bam-cream-deep)]"
    >
      {/* No happy-bamboo analogue exists for the map, so it borrows the
          benefits/testimonials band rhythm verbatim (py-20 md:py-32, mb-16
          heading block) and reads as a native happy-bamboo section. */}
      <div className="mx-auto max-w-7xl px-4 py-20 md:py-32 lg:px-8">
        <FadeIn direction="up">
          <BambooSectionHeading
            eyebrow={f["bamboo.homepage.location-eyebrow"] ?? ""}
            eyebrowFieldKey="bamboo.homepage.location-eyebrow"
            heading={f["bamboo.homepage.location-heading"] ?? ""}
            headingFieldKey="bamboo.homepage.location-heading"
            className="mb-16"
          />
        </FadeIn>

        <ScaleIn>
          <BambooMap
            businessName={businessName}
            address={address}
            latitude={latitude}
            longitude={longitude}
            viewUrl={viewUrl}
            directionsUrl={directionsUrl}
          />
        </ScaleIn>
      </div>
    </section>
  );
}
