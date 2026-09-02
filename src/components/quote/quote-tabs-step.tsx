"use client";

import { useRef } from "react";

import type { PublicQuoteTab } from "~/lib/validators/quote-calculator";
import { cn } from "~/lib/utils";

import { useQuoteDensity } from "./quote-display-context";

/**
 * The tabs step and the compact tab bar that replaces it once a choice has
 * been made.
 *
 * A "tab" (e.g. Commercial vs. Residential) is a fork the visitor resolves
 * BEFORE any screen renders — see `resolveVisibility` in
 * `~/lib/quote/visibility.ts` for why it cannot be expressed as an ordinary
 * `showIf`: a show-if answers "does THIS question apply", a tab answers
 * "does this whole SCREEN apply", and it has to be known before the first
 * screen is even selected to show. Both components here are presentational
 * only — nothing about price crosses into this file, matching every other
 * piece under `src/components/quote/`.
 *
 * Styled from design TOKENS only, same rule as `quote-question-field.tsx`:
 * this renders inside whichever storefront template the owner is running.
 */

/** Shown when the owner left `tabsPrompt` blank — a tabs step with no heading
 *  at all would read as broken, since the switcher is the first thing a
 *  visitor sees. */
const DEFAULT_TABS_PROMPT = "What are you looking for?";

/**
 * Restated rather than imported from `quote-question-field.tsx`: that
 * module's option-card constants are file-private, and a tab card is the
 * same affordance (a large selectable tile) but is never a
 * `QuoteQuestionField` — it has no `question` to be one.
 */
const tabCardBase =
  "flex w-full flex-col items-start gap-1 rounded-lg border text-left transition-colors outline-none focus-visible:ring-ring/50 focus-visible:border-ring focus-visible:ring-[3px]";
const tabCardIdle =
  "border-input bg-background text-foreground hover:bg-muted/60";
const tabCardSelected = "border-primary bg-primary/5 text-foreground";

export type QuoteTabsStepProps = {
  /** `definition.tabsPrompt` — falls back to `DEFAULT_TABS_PROMPT` when the
   *  owner left it blank. */
  prompt: string;
  tabs: PublicQuoteTab[];
  value: string | null;
  onChange: (id: string) => void;
  /** Set by the runner when Next was pressed with nothing picked, or after
   *  an `unknown-tab` server rejection routed back here. */
  error?: string | null;
  headingId: string;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
};

/**
 * The forced-choice step — a `role="radiogroup"` of large cards, styled and
 * behaved like the `choice` question type's own option cards (roving
 * tabindex, arrow-key movement) because that is exactly what this is: a
 * single-answer choice that happens to gate whole screens instead of feeding
 * a formula variable.
 */
export function QuoteTabsStep({
  prompt,
  tabs,
  value,
  onChange,
  error,
  headingId,
  headingRef,
}: QuoteTabsStepProps) {
  const density = useQuoteDensity();
  const buttonsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const errorId = `${headingId}-error`;

  const handleKeyDown = (event: React.KeyboardEvent, index: number) => {
    let next: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      next = (index + 1) % tabs.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      next = (index - 1 + tabs.length) % tabs.length;
    } else if (event.key === "Home") {
      next = 0;
    } else if (event.key === "End") {
      next = tabs.length - 1;
    }
    if (next === null) return;

    event.preventDefault();
    event.stopPropagation();
    const target = tabs[next];
    if (!target) return;
    onChange(target.id);
    buttonsRef.current[next]?.focus();
  };

  const focusIndex = tabs.findIndex((tab) => tab.id === value);

  return (
    <div className={density.body}>
      <div className="space-y-1.5">
        <h3
          id={headingId}
          ref={headingRef}
          tabIndex={-1}
          className={cn(
            "text-foreground focus-visible:ring-ring rounded-sm font-semibold focus-visible:ring-2 focus-visible:outline-none",
            density.heading,
          )}
        >
          {prompt || DEFAULT_TABS_PROMPT}
        </h3>
      </div>

      <div
        role="radiogroup"
        aria-labelledby={headingId}
        aria-describedby={error ? errorId : undefined}
        aria-invalid={!!error}
        aria-required={true}
        className={cn("grid grid-cols-1 sm:grid-cols-2", density.optionGap)}
      >
        {tabs.map((tab, index) => {
          const isSelected = tab.id === value;
          return (
            <button
              key={tab.id}
              ref={(node) => {
                buttonsRef.current[index] = node;
              }}
              type="button"
              role="radio"
              aria-checked={isSelected}
              tabIndex={
                isSelected || (focusIndex === -1 && index === 0) ? 0 : -1
              }
              onClick={() => onChange(tab.id)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              className={cn(
                tabCardBase,
                density.optionCard,
                isSelected ? tabCardSelected : tabCardIdle,
              )}
            >
              <span className="text-sm font-semibold">{tab.label}</span>
              {tab.description && (
                <span className="text-muted-foreground text-xs font-normal">
                  {tab.description}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {error && (
        <p id={errorId} role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Compact switcher rendered above a SCREEN step once a tab is already
 * active — lets the visitor change their mind (Commercial → Residential)
 * without walking all the way back to the tabs step. Deliberately plain
 * buttons with `aria-pressed`, not `role="radio"`: this is a set of
 * independent activation controls layered on top of an in-progress flow, not
 * the initial forced choice `QuoteTabsStep` renders.
 */
export function QuoteTabBar({
  prompt,
  tabs,
  value,
  onChange,
}: {
  prompt: string;
  tabs: PublicQuoteTab[];
  value: string | null;
  onChange: (id: string) => void;
}) {
  return (
    <div
      role="group"
      aria-label={prompt || DEFAULT_TABS_PROMPT}
      className="mb-4 flex flex-wrap gap-2"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === value;
        return (
          <button
            key={tab.id}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(tab.id)}
            className={cn(
              "focus-visible:ring-ring/50 focus-visible:border-ring rounded-full border px-3 py-1.5 text-sm font-medium transition-colors outline-none focus-visible:ring-[3px]",
              isActive
                ? "border-primary bg-primary text-primary-foreground"
                : "border-input bg-background text-foreground hover:bg-muted/60",
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
