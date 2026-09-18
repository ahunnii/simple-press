import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";

import { DreamHeading } from "../shared/dream-heading";
import { DreamSection } from "../shared/dream-section";
import { DreamSteps } from "../shared/dream-steps";

type DreamStep = { heading: string; body: string };

type DreamHomepageProcessProps = {
  heading: string;
  lede: string;
  steps: DreamStep[];
};

/**
 * design.md "Per-page section concepts › Homepage" #4 ("From idea to
 * theme"): heading + lede left, `DreamSteps` right.
 */
export function DreamHomepageProcess({
  heading,
  lede,
  steps,
}: DreamHomepageProcessProps) {
  return (
    <DreamSection
      sectionAttrs={sectionGroupAttr("homepage", "process")}
      aria-label="From Idea to Theme"
    >
      <div className="grid items-start gap-12 lg:grid-cols-[1fr_1.3fr] lg:gap-20">
        <div>
          <DreamHeading as="h2" fieldKey="dream.homepage.process-heading">
            {heading}
          </DreamHeading>
          <p
            className="mt-4 max-w-[60ch] text-[var(--dream-soft)]"
            {...fieldAttr("dream.homepage.process-lede")}
          >
            {lede}
          </p>
        </div>
        <DreamSteps
          steps={steps.map((step, i) => ({
            heading: step.heading,
            body: step.body,
            headingFieldKey: `dream.homepage.process-step-${i + 1}-heading`,
            bodyFieldKey: `dream.homepage.process-step-${i + 1}-body`,
          }))}
        />
      </div>
    </DreamSection>
  );
}
