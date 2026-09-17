import type { CSSProperties } from "react";

import { fieldAttr } from "~/lib/preview/section-attrs";
import { cn } from "~/lib/utils";

import { DreamRevealGroup } from "./dream-reveal";

type DreamStep = {
  heading: string;
  body: string;
  headingFieldKey?: string;
  bodyFieldKey?: string;
};

type DreamStepsProps = {
  steps: DreamStep[];
  className?: string;
};

/**
 * Numbered 3-step list, numerals in Italiana `--dream-gold-ink` (design.md:
 * "the sequence carries meaning" — the one place section numbers are
 * allowed per the craft floor). Used by homepage "From idea to theme",
 * about "Consultation", and the contact "What happens next" aside.
 */
export function DreamSteps({ steps, className }: DreamStepsProps) {
  return (
    <DreamRevealGroup className={cn("dream-steps", className)}>
      <ol className="dream-steps-list">
        {steps.map((step, i) => (
          <li
            key={step.heading + i}
            className="dream-reveal-item dream-steps-item"
            style={{ "--i": Math.min(i, 7) } as CSSProperties}
          >
            <span className="dream-steps-num" aria-hidden="true">
              {String(i + 1).padStart(2, "0")}
            </span>
            <div className="dream-steps-text">
              <h3
                className="dream-steps-heading"
                {...(step.headingFieldKey
                  ? fieldAttr(step.headingFieldKey)
                  : {})}
              >
                {step.heading}
              </h3>
              <p
                className="dream-steps-body"
                {...(step.bodyFieldKey ? fieldAttr(step.bodyFieldKey) : {})}
              >
                {step.body}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </DreamRevealGroup>
  );
}
