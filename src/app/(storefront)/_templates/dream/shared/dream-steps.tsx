import type { CSSProperties } from "react";

import type { DreamStepItem } from "./dream-steps-list";
import { listItemAttr } from "~/lib/preview/section-attrs";
import { cn } from "~/lib/utils";

import { DreamRevealGroup } from "./dream-reveal";

type DreamStepsProps = {
  steps: DreamStepItem[];
  /**
   * The list field these steps come from. Each `<li>` gets
   * `listItemAttr(itemFieldKey, i)` so the visual editor can open that row.
   */
  itemFieldKey?: string;
  className?: string;
};

/**
 * Numbered step list (one row per step of an owner-editable list field), numerals in Italiana `--dream-gold-ink` (design.md:
 * "the sequence carries meaning" — the one place section numbers are
 * allowed per the craft floor). Used by homepage "From idea to theme",
 * about "Consultation", and the contact "What happens next" aside.
 */
export function DreamSteps({
  steps,
  itemFieldKey,
  className,
}: DreamStepsProps) {
  return (
    <DreamRevealGroup className={cn("dream-steps", className)}>
      <ol className="dream-steps-list">
        {steps.map((step, i) => (
          <li
            key={step.heading + i}
            className="dream-reveal-item dream-steps-item"
            style={{ "--i": Math.min(i, 7) } as CSSProperties}
            {...(itemFieldKey ? listItemAttr(itemFieldKey, i) : {})}
          >
            <span className="dream-steps-num" aria-hidden="true">
              {String(i + 1).padStart(2, "0")}
            </span>
            <div className="dream-steps-text">
              <h3 className="dream-steps-heading">{step.heading}</h3>
              <p className="dream-steps-body">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </DreamRevealGroup>
  );
}
