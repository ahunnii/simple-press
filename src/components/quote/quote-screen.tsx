"use client";

import { useEffect, useRef } from "react";

import type { QuoteAnswer, QuoteAnswerMap } from "./quote-answers";
import type { PublicQuoteScreen } from "~/lib/validators/quote-calculator";
import { cn } from "~/lib/utils";
import { Label } from "~/components/ui/label";

import { useQuoteDensity } from "./quote-display-context";
import { QuoteQuestionField } from "./quote-question-field";

/**
 * Heading for a screen the owner grouped but never titled. Hardcoded rather
 * than owner-editable for the same reason the contact step's heading is: it is
 * only reachable by leaving a field blank, and a blank `<h3>` is worse than a
 * generic one.
 */
const UNTITLED_SCREEN_HEADING = "A few more details";

/**
 * The controls that can take DOM focus when the review step's Edit button
 * points at a question. `[role="radio"][tabindex="0"]` is the roving-tabindex
 * winner inside a choice group — the other radios are `tabindex="-1"` and
 * focusing one of those would move the group's tab stop somewhere the visitor
 * did not choose.
 */
const FOCUSABLE_CONTROL_SELECTOR =
  'input, select, textarea, [role="radio"][tabindex="0"], [role="checkbox"]';

/** Question types whose field renders a single labelable control. */
const TYPES_WITH_LABELABLE_CONTROL: ReadonlySet<
  PublicQuoteScreen["questions"][number]["type"]
> = new Set([
  "dropdown",
  "number",
  "zip",
  "address",
  "text",
  "longtext",
  "date",
]);

export type QuoteScreenProps = {
  /**
   * Already filtered to VISIBLE questions by `visibleScreensFor` — this
   * component never resolves show-if itself, so there is exactly one place
   * that decides what a visitor sees.
   */
  screen: PublicQuoteScreen;
  answers: QuoteAnswerMap;
  /** Per-question validation messages, keyed by question id. */
  errors: Record<string, string>;
  onAnswer: (questionId: string, answer: QuoteAnswer) => void;
  /**
   * Auto-advance hook. Only wired up when this screen holds exactly one
   * question: on a grouped screen, picking the first of three choices and
   * being carried to the next step would skip the other two.
   */
  onCommit: () => void;
  headingId: string;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  uid: string;
  /**
   * A request to put focus on one specific question rather than the heading —
   * set by the review step's Edit buttons and by a failed Next. The `nonce`
   * makes a repeat request for the SAME question a distinct value, so pressing
   * Next twice on an unanswered question re-focuses it both times.
   */
  focusRequest: { questionId: string; nonce: number } | null;
};

export function QuoteScreen({
  screen,
  answers,
  errors,
  onAnswer,
  onCommit,
  headingId,
  headingRef,
  uid,
  focusRequest,
}: QuoteScreenProps) {
  const density = useQuoteDensity();
  const questionRefs = useRef<Record<string, HTMLElement | null>>({});

  // Runs only for a targeted request; the plain step-change case is the
  // runner's heading focus, which it skips whenever a request is pending so
  // the two never fight over the same commit.
  useEffect(() => {
    if (!focusRequest) return;
    const container = questionRefs.current[focusRequest.questionId];
    if (!container) return;
    const control = container.querySelector<HTMLElement>(
      FOCUSABLE_CONTROL_SELECTOR,
    );
    (control ?? headingRef.current)?.focus();
  }, [focusRequest, headingRef]);

  const registerQuestion =
    (questionId: string) => (node: HTMLElement | null) => {
      questionRefs.current[questionId] = node;
    };

  const single =
    screen.questions.length === 1 ? screen.questions[0] : undefined;

  // A lone question on an untitled screen keeps the original one-question-per-
  // slide presentation: the question itself is the heading. Adding a screen
  // title (or a second question) is the owner opting into the labelled form
  // layout below.
  if (single && !screen.title) {
    const descriptionId = `${uid}-desc-${single.id}`;
    const errorId = `${uid}-error-${single.id}`;
    const error = errors[single.id];
    const describedBy =
      [single.description ? descriptionId : null, error ? errorId : null]
        .filter(Boolean)
        .join(" ") || undefined;

    return (
      <div ref={registerQuestion(single.id)} className={density.body}>
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
            {single.title}
            {!single.required && (
              <span className="text-muted-foreground ml-2 text-sm font-normal">
                (optional)
              </span>
            )}
          </h3>
          {single.description && (
            <p id={descriptionId} className="text-muted-foreground text-sm">
              {single.description}
            </p>
          )}
        </div>

        <QuoteQuestionField
          question={single}
          answer={answers[single.id]}
          onChange={(answer) => onAnswer(single.id, answer)}
          onCommit={single.type === "choice" ? onCommit : undefined}
          labelledBy={headingId}
          describedBy={describedBy}
          invalid={error !== undefined}
          fieldId={`${uid}-field-${single.id}`}
        />

        {error !== undefined && (
          <p id={errorId} role="alert" className="text-destructive text-sm">
            {error}
          </p>
        )}
      </div>
    );
  }

  const screenDescriptionId = `${uid}-screen-desc`;

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
          {screen.title ?? UNTITLED_SCREEN_HEADING}
        </h3>
        {screen.description && (
          <p id={screenDescriptionId} className="text-muted-foreground text-sm">
            {screen.description}
          </p>
        )}
      </div>

      <div className={cn("grid", density.fieldGap)}>
        {screen.questions.map((question) => {
          const labelId = `${uid}-label-${question.id}`;
          const descriptionId = `${uid}-desc-${question.id}`;
          const errorId = `${uid}-error-${question.id}`;
          const fieldId = `${uid}-field-${question.id}`;
          const error = errors[question.id];
          const describedBy =
            [
              question.description ? descriptionId : null,
              error ? errorId : null,
            ]
              .filter(Boolean)
              .join(" ") || undefined;

          return (
            <div
              key={question.id}
              ref={registerQuestion(question.id)}
              className="grid gap-2"
            >
              <Label
                id={labelId}
                // Choice and multiselect render a group of buttons, not a
                // labelable control, so `htmlFor` would point at nothing.
                // They are labelled by `aria-labelledby={labelId}` instead.
                htmlFor={
                  TYPES_WITH_LABELABLE_CONTROL.has(question.type)
                    ? fieldId
                    : undefined
                }
                className="text-foreground"
              >
                {question.title}
                {!question.required && (
                  <span className="text-muted-foreground text-xs font-normal">
                    (optional)
                  </span>
                )}
              </Label>

              {question.description && (
                <p id={descriptionId} className="text-muted-foreground text-sm">
                  {question.description}
                </p>
              )}

              <QuoteQuestionField
                question={question}
                answer={answers[question.id]}
                onChange={(answer) => onAnswer(question.id, answer)}
                labelledBy={labelId}
                describedBy={describedBy}
                invalid={error !== undefined}
                fieldId={fieldId}
              />

              {error !== undefined && (
                <p
                  id={errorId}
                  role="alert"
                  className="text-destructive text-sm"
                >
                  {error}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
