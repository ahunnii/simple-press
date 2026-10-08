import Image from "next/image";

import type { GloveStep, GloveStepsFields } from "./glove-steps-data";
import {
  fieldAttr,
  listItemAttr,
  sectionGroupAttr,
} from "~/lib/preview/section-attrs";

import {
  GloveButton,
  GloveHeading,
  GloveMedallion,
  GloveRevealGroup,
  gloveRevealItemStyle,
  GloveSection,
} from "../shared";
import { gloveIsExternal } from "./glove-links";
import {
  GLOVE_STEPS_CLOSING_HEADING_KEY,
  GLOVE_STEPS_CLOSING_LABEL_KEY,
  GLOVE_STEPS_HEADING_KEY,
  GLOVE_STEPS_LIST_KEY,
} from "./glove-steps-fields";

const STEPS_PER_ROW = 3;
const HEADING_ID = "glove-steps-heading";

/** Splits `**bold**` markup into text and <strong> nodes. */
function renderBold(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") && part.length > 4 ? (
      <strong key={i} className="font-bold text-[var(--glove-ink)]">
        {part.slice(2, -2)}
      </strong>
    ) : (
      part
    ),
  );
}

function chunk<T>(items: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size)
    rows.push(items.slice(i, i + size));
  return rows;
}

type GloveStepsProps = {
  /** From `resolveGloveStepsFields(customFields, isEnabled)`. */
  fields: GloveStepsFields;
  /** Show each step's own button (easy guide page). The homepage hides them. */
  showStepButtons: boolean;
  /** The easy guide page renders the heading as its page `h1`. */
  headingAs: "h1" | "h2";
  /** Defaults to `sectionGroupAttr("homepage", "steps")`. */
  sectionAttrs?: Record<string, string>;
};

function StepItem({
  step,
  popIndex,
  number,
  showButton,
  titleAs: TitleTag,
}: {
  step: GloveStep;
  popIndex: number;
  number: number;
  showButton: boolean;
  /** One level below the block heading (h2 on the easy-guide page). */
  titleAs: "h2" | "h3";
}) {
  return (
    <li
      className="glove-reveal-item flex flex-col items-center text-center"
      style={gloveRevealItemStyle(popIndex)}
      {...listItemAttr(GLOVE_STEPS_LIST_KEY, step.index)}
    >
      <GloveMedallion size="lg" popIndex={popIndex} className="mb-5">
        <span aria-hidden="true">{number}</span>
      </GloveMedallion>

      <div className="relative aspect-[600/288] w-full overflow-hidden bg-[var(--glove-cloud)]">
        {step.image ? (
          <Image
            src={step.image}
            alt={step.imageAlt}
            fill
            sizes="(max-width: 768px) 92vw, (max-width: 1280px) 30vw, 390px"
            className="object-cover"
          />
        ) : null}
      </div>

      <TitleTag className="glove-display mt-5 text-[19px] leading-snug font-semibold text-[var(--glove-ink)] md:text-[20px]">
        <span className="sr-only">Step {number}: </span>
        {step.title}
        {step.accent ? (
          <>
            {" "}
            <em className="font-medium italic">{step.accent}</em>
          </>
        ) : null}
      </TitleTag>

      {step.body ? (
        <p className="mt-3 max-w-[40ch] text-[15px] leading-[1.7] text-[var(--glove-text)] md:text-[16px]">
          {renderBold(step.body)}
        </p>
      ) : null}

      {showButton && step.buttonLabel && step.buttonUrl ? (
        <GloveButton
          href={step.buttonUrl}
          external={gloveIsExternal(step.buttonUrl)}
          variant="wooOutline"
          size="sm"
          className="mt-5"
        >
          {step.buttonLabel}
        </GloveButton>
      ) : null}
    </li>
  );
}

/**
 * The numbered "6 easy steps" block, shared by the homepage and the easy-guide
 * page. Server-safe. Purple medallions pop in sequence as each row of three
 * enters the viewport (signature moment 1).
 */
export function GloveSteps({
  fields,
  showStepButtons,
  headingAs,
  sectionAttrs,
}: GloveStepsProps) {
  const rows = chunk(fields.steps, STEPS_PER_ROW);

  return (
    <GloveSection
      tone="paper"
      aria-labelledby={fields.heading ? HEADING_ID : undefined}
      aria-label={fields.heading ? undefined : "Easy steps"}
      sectionAttrs={sectionAttrs ?? sectionGroupAttr("homepage", "steps")}
      revealThreshold={0}
    >
      {fields.heading ? (
        <GloveHeading
          as={headingAs}
          id={HEADING_ID}
          fieldKey={GLOVE_STEPS_HEADING_KEY}
        >
          {fields.heading}
        </GloveHeading>
      ) : null}

      <div className="mt-10 flex flex-col gap-12 md:mt-12 md:gap-14">
        {rows.map((row, rowIndex) => (
          <GloveRevealGroup key={rowIndex} threshold={0}>
            <ol className="m-0 grid list-none grid-cols-1 gap-12 p-0 md:grid-cols-3 md:gap-x-6 lg:gap-x-10">
              {row.map((step, i) => (
                <StepItem
                  key={step.id}
                  step={step}
                  popIndex={i}
                  number={rowIndex * STEPS_PER_ROW + i + 1}
                  showButton={showStepButtons}
                  titleAs={headingAs === "h1" ? "h2" : "h3"}
                />
              ))}
            </ol>
          </GloveRevealGroup>
        ))}
      </div>

      {fields.closingHeading || fields.closingLabel ? (
        <div className="mt-14 flex flex-col items-center gap-6 text-center md:mt-16">
          {fields.closingHeading ? (
            <h2
              className="glove-heading"
              {...fieldAttr(GLOVE_STEPS_CLOSING_HEADING_KEY)}
            >
              {fields.closingHeading}
            </h2>
          ) : null}
          {fields.closingLabel && fields.closingUrl ? (
            <GloveButton
              href={fields.closingUrl}
              external={gloveIsExternal(fields.closingUrl)}
              variant="story"
            >
              <span {...fieldAttr(GLOVE_STEPS_CLOSING_LABEL_KEY)}>
                {fields.closingLabel}
              </span>
            </GloveButton>
          ) : null}
        </div>
      ) : null}
    </GloveSection>
  );
}
