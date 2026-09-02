"use client";

import type { QuoteAnswerMap, QuoteContact } from "./quote-answers";
import type { PublicQuoteScreen } from "~/lib/validators/quote-calculator";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { RecaptchaDisclosure } from "~/components/inputs/recaptcha-field";

import { answerDisplay } from "./quote-answers";
import { useQuoteDensity } from "./quote-display-context";

export type QuoteReviewStepProps = {
  /** The VISIBLE screens, in step order — the same list the runner walked. */
  screens: PublicQuoteScreen[];
  answers: QuoteAnswerMap;
  contact: QuoteContact;
  /**
   * Set when a jump away from review was forced (an edit revealed a new
   * required question). Rendered here as well as on the step the visitor was
   * routed to, so the reason survives the trip back.
   */
  reviewNote: string | null;
  headingId: string;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  onEditQuestion: (questionId: string) => void;
  onEditContact: () => void;
  uid: string;
  /**
   * The tab the visitor picked, when this calculator has any — `null` (or
   * omitted) for a tabs-less calculator, which renders no row for it at all
   * rather than a section with nothing under it.
   */
  tab?: { prompt: string; label: string } | null;
  /** Edit → the tabs step. Required whenever `tab` is set; there is no tabs
   *  step to jump back to otherwise. */
  onEditTab?: () => void;
};

/**
 * "Review & send" — the last step when the owner turns it on.
 *
 * Shows what the visitor said, in their own words: `answerDisplay` resolves
 * option ids to the labels the owner wrote. Nothing priced appears here, and
 * nothing on this screen is recomputed — the submit button in the runner's nav
 * sends exactly the answers these rows were rendered from.
 *
 * Unanswered optional questions are omitted rather than shown blank: a list of
 * empty rows makes the visitor hunt for the ones that matter, and skipping an
 * optional question is not something to be reminded about at the finish line.
 */
export function QuoteReviewStep({
  screens,
  answers,
  contact,
  reviewNote,
  headingId,
  headingRef,
  onEditQuestion,
  onEditContact,
  uid,
  tab = null,
  onEditTab,
}: QuoteReviewStepProps) {
  const density = useQuoteDensity();
  const phone = contact.phone.trim();
  // "Type" is the fallback term, not the fallback VALUE: `tab.label` (the
  // owner-written tab name) is never blank by the time it reaches here, but
  // `tabsPrompt` is optional and frequently left empty.
  const tabTerm = tab ? tab.prompt.trim() || "Type" : null;

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
          Review &amp; send
        </h3>
        <p className="text-muted-foreground text-sm">
          Check everything over — you can still change any answer.
        </p>
      </div>

      {reviewNote && (
        <p
          role="alert"
          className="border-input bg-muted/40 text-foreground rounded-md border px-3 py-2 text-sm"
        >
          {reviewNote}
        </p>
      )}

      <div className="space-y-5">
        {/* The tab, when there is one, is what decided which of the sections
            below even exist — it goes first for the same reason the tabs
            step itself comes before every screen. */}
        {tab && tabTerm && onEditTab && (
          <section aria-labelledby={`${uid}-review-tab`}>
            <h4
              id={`${uid}-review-tab`}
              className="text-muted-foreground sr-only mb-1 text-xs font-semibold tracking-wide uppercase"
            >
              {tabTerm}
            </h4>
            <dl className="divide-input/60 divide-y">
              <ReviewRow
                term={tabTerm}
                value={tab.label}
                editLabel={`Edit ${tabTerm}`}
                onEdit={onEditTab}
              />
            </dl>
          </section>
        )}

        {screens.map((screen) => {
          // `flatMap` rather than `map().filter()` so the narrowing is
          // structural: a type predicate here would have to name the row shape
          // twice and drift the moment a column is added.
          const rows = screen.questions.flatMap((question) => {
            const display = answerDisplay(question, answers[question.id]);
            return display === null ? [] : [{ question, display }];
          });

          if (rows.length === 0) return null;

          const sectionHeadingId = `${uid}-review-screen-${screen.id}`;
          // A screen the owner never titled has no heading worth printing —
          // on a one-question screen it would just repeat the question sitting
          // directly beneath it. The heading still exists for assistive tech so
          // the section is not an unnamed region.
          const headingText =
            screen.title ?? screen.questions[0]?.title ?? "Your answers";

          return (
            <section key={screen.id} aria-labelledby={sectionHeadingId}>
              <h4
                id={sectionHeadingId}
                className={cn(
                  "text-muted-foreground mb-1 text-xs font-semibold tracking-wide uppercase",
                  !screen.title && "sr-only",
                )}
              >
                {headingText}
              </h4>
              <dl className="divide-input/60 divide-y">
                {rows.map(({ question, display }) => (
                  <ReviewRow
                    key={question.id}
                    term={question.title}
                    value={display}
                    editLabel={`Edit ${question.title}`}
                    onEdit={() => onEditQuestion(question.id)}
                  />
                ))}
              </dl>
            </section>
          );
        })}

        <section aria-labelledby={`${uid}-review-contact`}>
          <h4
            id={`${uid}-review-contact`}
            className="text-muted-foreground mb-1 text-xs font-semibold tracking-wide uppercase"
          >
            Your details
          </h4>
          <dl className="divide-input/60 divide-y">
            <ReviewRow
              term="Name"
              value={contact.name.trim()}
              editLabel="Edit your details"
              onEdit={onEditContact}
            />
            <ReviewRow
              term="Email"
              value={contact.email.trim()}
              editLabel="Edit your details"
              onEdit={onEditContact}
            />
            {phone !== "" && (
              <ReviewRow
                term="Phone"
                value={phone}
                editLabel="Edit your details"
                onEdit={onEditContact}
              />
            )}
          </dl>
        </section>
      </div>

      {/* Required by Google's terms: the v3 badge is hidden platform-wide
          (globals.css), which is only permitted with this disclosure in-flow.
          It lives on whichever step actually holds the submit button — here
          when the owner enabled review, on the contact step otherwise. */}
      <RecaptchaDisclosure />
    </div>
  );
}

function ReviewRow({
  term,
  value,
  editLabel,
  onEdit,
}: {
  term: string;
  value: string;
  editLabel: string;
  onEdit: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-2">
      <div className="min-w-0">
        <dt className="text-muted-foreground text-xs">{term}</dt>
        <dd className="text-foreground text-sm break-words">{value}</dd>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="shrink-0"
        aria-label={editLabel}
        onClick={onEdit}
      >
        Edit
      </Button>
    </div>
  );
}
