import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";

import { DreamHeading } from "../shared/dream-heading";
import { DreamSection } from "../shared/dream-section";
import { DreamSteps } from "../shared/dream-steps";

type Step = {
  heading: string;
  body: string;
  headingFieldKey: string;
  bodyFieldKey: string;
};

type Props = {
  heading: string;
  lede: string;
  steps: Step[];
};

/** "How the consultation works." — heading+lede left, `DreamSteps` right. Hideable. */
export function DreamAboutConsultation({ heading, lede, steps }: Props) {
  return (
    <DreamSection
      tone="sky"
      sectionAttrs={sectionGroupAttr("about", "consultation")}
      aria-label="How the consultation works"
    >
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_1.2fr] lg:gap-16">
        <div className="max-w-[46ch]">
          <DreamHeading as="h2" fieldKey="dream.about.consultation-heading">
            {heading}
          </DreamHeading>
          <p
            className="mt-6 text-[var(--dream-soft)]"
            {...fieldAttr("dream.about.consultation-lede")}
          >
            {lede}
          </p>
        </div>
        <DreamSteps steps={steps} />
      </div>
    </DreamSection>
  );
}
