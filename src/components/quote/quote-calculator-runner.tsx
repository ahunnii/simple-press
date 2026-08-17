"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { ArrowLeft, LoaderCircle } from "lucide-react";

import type {
  QuoteAnswer,
  QuoteAnswerMap,
  QuoteContact,
  QuoteContactErrors,
} from "./quote-answers";
import type { QuoteSubmitResult } from "./quote-result";
import type { QuoteStep } from "./quote-steps";
import type { QuoteDensity, QuoteHeight } from "~/lib/quote/quote-display";
import type {
  PublicQuoteCalculatorDefinition,
  PublicQuoteScreen,
} from "~/lib/validators/quote-calculator";
import { useRecaptchaV3 } from "~/lib/captcha/use-recaptcha-v3";
import {
  quoteDensityClasses,
  quoteHeightClass,
} from "~/lib/quote/quote-display";
import { flattenScreens, visibleScreensFor } from "~/lib/quote/screens";
import { resolveVisibility } from "~/lib/quote/visibility";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { RecaptchaDisclosure } from "~/components/inputs/recaptcha-field";

import {
  isAnswered,
  selectedOptionId,
  toWireAnswers,
  validateAnswer,
  validateContact,
} from "./quote-answers";
import { QuoteDisplayProvider, useQuoteDensity } from "./quote-display-context";
import { QuoteLiveEstimatePanel } from "./quote-live-estimate";
import { QuoteResult } from "./quote-result";
import { QuoteReviewStep } from "./quote-review-step";
import { QuoteScreen } from "./quote-screen";
import {
  buildSteps,
  findScreenStepIndex,
  firstIncompleteStepIndex,
} from "./quote-steps";
import { useLiveEstimate } from "./use-live-estimate";

/**
 * reCAPTCHA v3 action asserted server-side by `quoteSubmission.submit`. One
 * site key serves every form on the platform, so a token minted without this
 * binding would let a contact-form token replay against the quote endpoint.
 */
const RECAPTCHA_ACTION = "quote";

/**
 * Pause before a single-choice pick advances the slide. Long enough that the
 * selected state is visibly acknowledged, short enough that it reads as the
 * card doing the advancing rather than a lag.
 */
const AUTO_ADVANCE_MS = 260;

/**
 * Shown when the visitor edits an answer from the review step and that edit
 * reveals something else that still has to be filled in. Without it, being
 * bounced to an unfamiliar screen after pressing "Return to review" reads as
 * the widget losing their place.
 */
const RETURN_TO_REVIEW_NOTE =
  "One more answer is needed before you can return to review.";
const INCOMPLETE_BEFORE_SEND_NOTE =
  "One more answer is needed before you can send this.";

export type QuoteCalculatorRunnerProps = {
  calculator: {
    id: string;
    name: string;
    definition: PublicQuoteCalculatorDefinition;
  };
  /**
   * Per-embed sizing set on the tiptap node. `width` is applied by
   * `QuoteCalculatorBlock`'s wrapper, not here — a `max-w-*` on this card
   * would not centre itself.
   */
  height?: QuoteHeight;
  density?: QuoteDensity;
};

/**
 * The visitor-facing quote flow: one step per screen, then a contact step,
 * then (if the owner opted in) a review step, then a thank-you or an estimate.
 *
 * **Nothing about pricing lives here.** The definition this component receives
 * has already been through `toPublicCalculatorDefinition`, so there are no
 * option values, no `hiddenDefault`s, no distance variables and no formula in
 * the payload. The runner submits option IDs and raw inputs; the server
 * recomputes the price from the stored definition and decides whether the
 * visitor is told the number at all — including for the live running estimate,
 * which is a server round trip precisely so that it can be.
 */
export function QuoteCalculatorRunner({
  calculator,
  height,
  density,
}: QuoteCalculatorRunnerProps) {
  const { definition } = calculator;
  const uid = useId();
  const densityClasses = useMemo(() => quoteDensityClasses(density), [density]);

  const [answers, setAnswers] = useState<QuoteAnswerMap>({});
  const [stepIndex, setStepIndex] = useState(0);
  /** Per-question validation messages for the CURRENT step, keyed by id. */
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({});
  const [contact, setContact] = useState<QuoteContact>({
    name: "",
    email: "",
    phone: "",
  });
  const [contactErrors, setContactErrors] = useState<QuoteContactErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<QuoteSubmitResult | null>(null);
  /** Set while the visitor is out editing one answer from the review step. */
  const [returnToReview, setReturnToReview] = useState(false);
  const [reviewNote, setReviewNote] = useState<string | null>(null);
  const [focusRequest, setFocusRequest] = useState<{
    questionId: string;
    nonce: number;
  } | null>(null);

  const { execute: executeRecaptcha } = useRecaptchaV3();

  // ── Visibility → screens → steps ──────────────────────────────────────────
  // `resolveVisibility` and `flattenScreens` are the SHARED rules, imported
  // rather than reimplemented: the server uses the same two functions to decide
  // which answers count and which variables fall back to their hidden default.
  // A local copy that drifted would show the visitor a question whose answer
  // the price ignores.
  const flatQuestions = useMemo(
    () => flattenScreens(definition.screens),
    [definition.screens],
  );

  const visibleScreens = useMemo(() => {
    const visibility = resolveVisibility(flatQuestions, (questionId) =>
      selectedOptionId(answers, questionId),
    );
    return visibleScreensFor(definition.screens, visibility);
  }, [answers, definition.screens, flatQuestions]);

  const visibleQuestions = useMemo(
    () => flattenScreens(visibleScreens),
    [visibleScreens],
  );

  const steps = useMemo(
    () =>
      buildSteps({ showReviewStep: definition.showReviewStep }, visibleScreens),
    [definition.showReviewStep, visibleScreens],
  );

  // Clamped on READ rather than corrected in an effect. Answering a branching
  // question can hide later questions and shrink the step list underneath a
  // visitor who has already walked past them; deriving the index means the
  // shrink is handled in the same render as the answer change, with no
  // intermediate frame pointing at a step that no longer exists.
  const currentIndex = Math.min(stepIndex, steps.length - 1);
  // Memoised so the `useCallback`s below do not see a fresh object every
  // render. `steps` always ends with at least the contact step, so the
  // fallback is unreachable — it exists to satisfy `noUncheckedIndexedAccess`.
  const currentStep = useMemo<QuoteStep>(
    () => steps[currentIndex] ?? { kind: "contact" },
    [currentIndex, steps],
  );

  const contactStepIndex = steps.findIndex((step) => step.kind === "contact");
  const reviewStepIndex = steps.findIndex((step) => step.kind === "review");
  const isSubmitStep =
    currentStep.kind === "review" ||
    (currentStep.kind === "contact" && reviewStepIndex === -1);

  // ── Live estimate ─────────────────────────────────────────────────────────
  // `definition.showLiveEstimate` is already the EFFECTIVE value
  // (`showEstimateToCustomer && showLiveEstimate`) — the projection ANDs them
  // so this never has to, and the endpoint re-checks both server-side anyway.
  const { estimate: liveEstimate, isFetching: liveEstimateFetching } =
    useLiveEstimate({
      calculatorId: calculator.id,
      enabled: definition.showLiveEstimate && result === null,
      visibleQuestions,
      answers,
    });

  // ── Step transitions ──────────────────────────────────────────────────────
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearAdvance = useCallback(() => {
    if (advanceTimer.current) {
      clearTimeout(advanceTimer.current);
      advanceTimer.current = null;
    }
  }, []);
  useEffect(() => clearAdvance, [clearAdvance]);

  const focusNonce = useRef(0);
  const requestFocus = useCallback((questionId: string) => {
    focusNonce.current += 1;
    setFocusRequest({ questionId, nonce: focusNonce.current });
  }, []);

  /** Validation messages for every question on one screen. */
  const validateScreen = useCallback(
    (screen: PublicQuoteScreen): Record<string, string> => {
      const errors: Record<string, string> = {};
      for (const question of screen.questions) {
        const error = validateAnswer(question, answers[question.id]);
        if (error) errors[question.id] = error;
      }
      return errors;
    },
    [answers],
  );

  const goNext = useCallback(() => {
    clearAdvance();

    if (currentStep.kind === "screen") {
      const errors = validateScreen(currentStep.screen);
      if (Object.keys(errors).length > 0) {
        setStepErrors(errors);
        const firstInvalid = currentStep.screen.questions.find(
          (question) => errors[question.id] !== undefined,
        );
        if (firstInvalid) requestFocus(firstInvalid.id);
        return;
      }
    }

    if (currentStep.kind === "contact") {
      // Only reachable when a review step follows — otherwise contact holds the
      // submit button. Blocking here keeps the review summary from printing a
      // blank "Your details" block.
      const errors = validateContact(contact, definition.requirePhone);
      setContactErrors(errors);
      if (Object.keys(errors).length > 0) return;
    }

    setStepErrors({});
    setSubmitError(null);

    if (returnToReview) {
      const incomplete = firstIncompleteStepIndex(
        steps,
        answers,
        contact,
        definition.requirePhone,
      );
      if (incomplete !== -1 && incomplete !== currentIndex) {
        // The edit revealed something new. Route there, say why, and KEEP the
        // flag so the next Next tries to get back to review again. The
        // field-level messages are set NOW, not on the next click: on a
        // grouped screen the banner alone does not say which of several
        // questions is the one still waiting (mirrors `handleSubmit`).
        const target = steps[incomplete];
        if (target?.kind === "screen") {
          const targetErrors = validateScreen(target.screen);
          setStepErrors(targetErrors);
          const firstInvalid = target.screen.questions.find(
            (question) => targetErrors[question.id] !== undefined,
          );
          if (firstInvalid) requestFocus(firstInvalid.id);
          else setFocusRequest(null);
        } else {
          // Contact step: `validateContact` messages render on entry via
          // `contactErrors`, so only the focus request needs clearing.
          setContactErrors(validateContact(contact, definition.requirePhone));
          setFocusRequest(null);
        }
        setStepIndex(incomplete);
        setReviewNote(RETURN_TO_REVIEW_NOTE);
        return;
      }
      if (reviewStepIndex !== -1) {
        setStepIndex(reviewStepIndex);
        setReturnToReview(false);
        setReviewNote(null);
        setFocusRequest(null);
        return;
      }
    }

    setFocusRequest(null);
    setStepIndex(currentIndex + 1);
  }, [
    answers,
    clearAdvance,
    contact,
    currentIndex,
    currentStep,
    definition.requirePhone,
    requestFocus,
    returnToReview,
    reviewStepIndex,
    steps,
    validateScreen,
  ]);

  const goBack = useCallback(() => {
    clearAdvance();
    setStepErrors({});
    setSubmitError(null);
    setFocusRequest(null);
    setStepIndex(Math.max(0, currentIndex - 1));
  }, [clearAdvance, currentIndex]);

  /** Review-step "Edit" on one question. */
  const jumpToQuestion = useCallback(
    (questionId: string) => {
      clearAdvance();
      const index = findScreenStepIndex(steps, questionId);
      if (index === -1) return;
      setStepErrors({});
      setSubmitError(null);
      setReviewNote(null);
      setReturnToReview(true);
      setStepIndex(index);
      requestFocus(questionId);
    },
    [clearAdvance, requestFocus, steps],
  );

  /** Review-step "Edit" on the contact details. */
  const jumpToContact = useCallback(() => {
    clearAdvance();
    if (contactStepIndex === -1) return;
    setStepErrors({});
    setSubmitError(null);
    setReviewNote(null);
    setReturnToReview(true);
    setFocusRequest(null);
    setStepIndex(contactStepIndex);
  }, [clearAdvance, contactStepIndex]);

  // Held in a ref so the auto-advance timeout runs the LATEST `goNext` — the
  // one that has already seen the selection that triggered it, and therefore
  // the recomputed visible-screen list.
  const goNextRef = useRef(goNext);
  // Same trick for the guard below: by the time the timeout fires, a same-screen
  // show-if reveal may have turned this one-question screen into a two-question
  // screen. Auto-advancing then would carry the visitor straight past a
  // required question they never saw, into an error on the way back.
  const singleQuestionScreenRef = useRef(false);
  useEffect(() => {
    goNextRef.current = goNext;
    singleQuestionScreenRef.current =
      currentStep.kind === "screen" &&
      currentStep.screen.questions.length === 1;
  });

  const scheduleAdvance = useCallback(() => {
    clearAdvance();
    advanceTimer.current = setTimeout(() => {
      advanceTimer.current = null;
      if (!singleQuestionScreenRef.current) return;
      goNextRef.current();
    }, AUTO_ADVANCE_MS);
  }, [clearAdvance]);

  const setAnswer = useCallback((questionId: string, answer: QuoteAnswer) => {
    // Clear only THIS question's message: on a grouped screen, fixing the city
    // must not wipe the error still sitting under the bedroom count.
    setStepErrors((previous) => {
      if (previous[questionId] === undefined) return previous;
      const next = { ...previous };
      delete next[questionId];
      return next;
    });
    setAnswers((previous) => ({ ...previous, [questionId]: answer }));
  }, []);

  // ── Focus + announcement ──────────────────────────────────────────────────
  const headingRef = useRef<HTMLHeadingElement>(null);
  const stepKey =
    currentStep.kind === "screen" ? currentStep.screen.id : currentStep.kind;
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Skip the initial mount: focusing on first paint would yank the page down
    // to a widget the visitor has not scrolled to yet.
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    // A pending focus request names a specific control on the incoming screen
    // and `QuoteScreen` focuses it; child effects run first, so stealing focus
    // back to the heading here would undo it every time. Every transition that
    // does NOT target a question clears the request, so this cannot get stuck.
    if (focusRequest) return;
    headingRef.current?.focus();
  }, [focusRequest, stepKey]);

  // ── Submit ────────────────────────────────────────────────────────────────
  const submitMutation = api.quoteSubmission.submit.useMutation({
    onSuccess: (data) => {
      setSubmitError(null);
      setResult(data);
    },
    onError: (error) => {
      // Answers and contact details are deliberately left intact so a retry is
      // one click, not a refill. The token is NOT reused — `handleSubmit`
      // mints a fresh one on every attempt (v3 tokens are single-use and the
      // server burns them at /siteverify even on an unrelated rejection).
      setSubmitError(
        error.data?.code === "TOO_MANY_REQUESTS"
          ? "Too many requests — please wait a moment and try again."
          : error.message,
      );
    },
  });

  const handleSubmit = useCallback(async () => {
    clearAdvance();
    setSubmitError(null);

    // Re-validate EVERY visible screen, not just the one on screen. With a
    // review step the visitor can reach submit without ever having pressed
    // Next on a screen a late branch change revealed.
    for (let index = 0; index < steps.length; index++) {
      const step = steps[index];
      if (step?.kind !== "screen") continue;
      const errors = validateScreen(step.screen);
      if (Object.keys(errors).length === 0) continue;

      setStepErrors(errors);
      setStepIndex(index);
      setReviewNote(
        reviewStepIndex === -1
          ? INCOMPLETE_BEFORE_SEND_NOTE
          : RETURN_TO_REVIEW_NOTE,
      );
      if (reviewStepIndex !== -1) setReturnToReview(true);
      const firstInvalid = step.screen.questions.find(
        (question) => errors[question.id] !== undefined,
      );
      if (firstInvalid) requestFocus(firstInvalid.id);
      else setFocusRequest(null);
      return;
    }
    setStepErrors({});

    const errors = validateContact(contact, definition.requirePhone);
    setContactErrors(errors);
    if (Object.keys(errors).length > 0) {
      if (contactStepIndex !== -1 && contactStepIndex !== currentIndex) {
        setStepIndex(contactStepIndex);
        if (reviewStepIndex !== -1) setReturnToReview(true);
        setFocusRequest(null);
      }
      return;
    }

    setReviewNote(null);

    const token = await executeRecaptcha(RECAPTCHA_ACTION);
    const phone = contact.phone.trim();

    submitMutation.mutate({
      calculatorId: calculator.id,
      // VISIBLE questions only. A hidden question's answer stays in state (so
      // flipping the branch back restores it) but never ships.
      answers: toWireAnswers(visibleQuestions, answers),
      contactName: contact.name.trim(),
      contactEmail: contact.email.trim(),
      contactPhone: phone === "" ? undefined : phone,
      // `?? ""` rather than an early return: the server owns the verdict on a
      // missing token and returns a user-safe message we already surface.
      captchaToken: token ?? "",
    });
  }, [
    answers,
    calculator.id,
    clearAdvance,
    contact,
    contactStepIndex,
    currentIndex,
    definition.requirePhone,
    executeRecaptcha,
    requestFocus,
    reviewStepIndex,
    steps,
    submitMutation,
    validateScreen,
    visibleQuestions,
  ]);

  // ── Enter to advance ──────────────────────────────────────────────────────
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" || event.shiftKey) return;
    const target = event.target as HTMLElement | null;
    const tag = target?.tagName;
    // Textareas keep Enter for newlines; buttons and links already activate on
    // Enter themselves and must not also advance the step.
    if (tag === "TEXTAREA" || tag === "BUTTON" || tag === "A") return;
    event.preventDefault();
    if (isSubmitStep) {
      void handleSubmit();
    } else {
      goNext();
    }
  };

  // ── Derived ids / labels ──────────────────────────────────────────────────
  const headingId = `${uid}-heading`;
  const totalSteps = steps.length;

  const nextLabel = returnToReview
    ? "Return to review"
    : currentStep.kind === "screen" &&
        currentStep.screen.questions.every(
          (question) =>
            !question.required && !isAnswered(question, answers[question.id]),
        )
      ? "Skip"
      : "Next";

  const progressPercent = Math.round(((currentIndex + 1) / totalSteps) * 100);

  const cardClass = cn(
    "border-input bg-background text-foreground flex flex-col rounded-lg border shadow-xs",
    densityClasses.card,
    quoteHeightClass(height),
  );

  if (result) {
    return (
      <div className={cn(cardClass, "justify-center")}>
        <QuoteResult
          result={result}
          thankYouMessage={definition.thankYouMessage}
          responseDays={definition.responseDays}
        />
      </div>
    );
  }

  return (
    <QuoteDisplayProvider density={density}>
      <div className={cardClass} onKeyDown={handleKeyDown}>
        {/* Progress chrome */}
        <div className="mb-5 space-y-2">
          <div className="text-muted-foreground flex items-baseline justify-between gap-3 text-xs font-medium">
            <span>
              Step {currentIndex + 1} of {totalSteps}
            </span>
            <span className="truncate">{calculator.name}</span>
          </div>
          <div
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={totalSteps}
            aria-valuenow={currentIndex + 1}
            aria-valuetext={`Step ${currentIndex + 1} of ${totalSteps}`}
            className="bg-muted h-1.5 w-full overflow-hidden rounded-full"
          >
            <div
              className="bg-primary h-full rounded-full transition-[width] duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* The note follows the visitor to wherever they were routed. On the
            review step itself `QuoteReviewStep` renders it, inside its own
            heading block. */}
        {reviewNote !== null && currentStep.kind !== "review" && (
          <p
            role="alert"
            className="border-input bg-muted/40 text-foreground mb-4 rounded-md border px-3 py-2 text-sm"
          >
            {reviewNote}
          </p>
        )}

        {/* Step body. `flex-1` so the nav pins to the bottom of the card when
            a min-height preset leaves slack. */}
        <div className="flex-1">
          {currentStep.kind === "screen" && (
            <QuoteScreen
              screen={currentStep.screen}
              answers={answers}
              errors={stepErrors}
              onAnswer={setAnswer}
              onCommit={scheduleAdvance}
              headingId={headingId}
              headingRef={headingRef}
              uid={uid}
              focusRequest={focusRequest}
            />
          )}

          {currentStep.kind === "contact" && (
            <ContactStep
              headingId={headingId}
              headingRef={headingRef}
              uid={uid}
              contact={contact}
              errors={contactErrors}
              requirePhone={definition.requirePhone}
              showRecaptchaDisclosure={reviewStepIndex === -1}
              onChange={(patch) => {
                setSubmitError(null);
                setContact((previous) => ({ ...previous, ...patch }));
              }}
            />
          )}

          {currentStep.kind === "review" && (
            <QuoteReviewStep
              screens={visibleScreens}
              answers={answers}
              contact={contact}
              reviewNote={reviewNote}
              headingId={headingId}
              headingRef={headingRef}
              onEditQuestion={jumpToQuestion}
              onEditContact={jumpToContact}
              uid={uid}
            />
          )}
        </div>

        {submitError && (
          <p role="alert" className="text-destructive mt-4 text-sm">
            {submitError}
          </p>
        )}

        <QuoteLiveEstimatePanel
          estimate={liveEstimate}
          isFetching={liveEstimateFetching}
          disclaimer={definition.liveEstimateDisclaimer}
        />

        {/* Navigation */}
        <div className="mt-6 flex items-center justify-between gap-3">
          {currentIndex > 0 ? (
            <Button
              type="button"
              variant="ghost"
              onClick={goBack}
              disabled={submitMutation.isPending}
            >
              <ArrowLeft aria-hidden="true" />
              Back
            </Button>
          ) : (
            <span />
          )}

          {isSubmitStep ? (
            <Button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={submitMutation.isPending}
            >
              {submitMutation.isPending && (
                <LoaderCircle className="animate-spin" aria-hidden="true" />
              )}
              {submitMutation.isPending ? "Sending…" : "Get my quote"}
            </Button>
          ) : (
            <Button type="button" onClick={goNext}>
              {nextLabel}
            </Button>
          )}
        </div>

        {/* Screen-reader step announcement. Focusing the heading names the new
            step; this names the position in the flow. */}
        <div aria-live="polite" className="sr-only">
          {`Step ${currentIndex + 1} of ${totalSteps}`}
        </div>
      </div>
    </QuoteDisplayProvider>
  );
}

// ── Contact step ────────────────────────────────────────────────────────────

function ContactStep({
  headingId,
  headingRef,
  uid,
  contact,
  errors,
  requirePhone,
  showRecaptchaDisclosure,
  onChange,
}: {
  headingId: string;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  uid: string;
  contact: QuoteContact;
  errors: QuoteContactErrors;
  requirePhone: boolean;
  /** False when a review step follows — the disclosure belongs on the step
   *  that holds the submit button, and duplicating it looks like a bug. */
  showRecaptchaDisclosure: boolean;
  onChange: (patch: Partial<QuoteContact>) => void;
}) {
  const density = useQuoteDensity();
  const nameId = `${uid}-contact-name`;
  const emailId = `${uid}-contact-email`;
  const phoneId = `${uid}-contact-phone`;

  return (
    <div className={density.body}>
      <div className="space-y-1.5">
        <h3
          id={headingId}
          ref={headingRef}
          tabIndex={-1}
          className={cn(
            "text-foreground font-semibold outline-none",
            density.heading,
          )}
        >
          Where should we send it?
        </h3>
        <p className="text-muted-foreground text-sm">
          Tell us how to reach you and we&apos;ll take it from here.
        </p>
      </div>

      <div className={cn("grid sm:max-w-md", density.fieldGap)}>
        <ContactField
          id={nameId}
          label="Name"
          error={errors.name}
          required
          inputProps={{
            value: contact.name,
            autoComplete: "name",
            maxLength: 120,
            onChange: (event) => onChange({ name: event.target.value }),
          }}
        />
        <ContactField
          id={emailId}
          label="Email"
          error={errors.email}
          required
          inputProps={{
            type: "email",
            value: contact.email,
            autoComplete: "email",
            maxLength: 254,
            onChange: (event) => onChange({ email: event.target.value }),
          }}
        />
        {/* Phone is always offered — `requirePhone` only decides whether it
            gates submission, matching the server's own rule. */}
        <ContactField
          id={phoneId}
          label="Phone"
          error={errors.phone}
          required={requirePhone}
          inputProps={{
            type: "tel",
            value: contact.phone,
            autoComplete: "tel",
            maxLength: 30,
            onChange: (event) => onChange({ phone: event.target.value }),
          }}
        />
      </div>

      {/* Required by Google's terms: the v3 badge is hidden platform-wide
          (globals.css), which is only permitted with this disclosure in-flow. */}
      {showRecaptchaDisclosure && <RecaptchaDisclosure />}
    </div>
  );
}

function ContactField({
  id,
  label,
  error,
  required,
  inputProps,
}: {
  id: string;
  label: string;
  error?: string;
  required: boolean;
  inputProps: React.ComponentProps<typeof Input>;
}) {
  const errorId = `${id}-error`;
  return (
    <div className="grid gap-2">
      <Label htmlFor={id} className="text-foreground">
        {label}
        {!required && (
          <span className="text-muted-foreground text-xs font-normal">
            (optional)
          </span>
        )}
      </Label>
      <Input
        id={id}
        required={required}
        aria-invalid={error !== undefined}
        aria-describedby={error === undefined ? undefined : errorId}
        className={cn(error !== undefined && "border-destructive")}
        {...inputProps}
      />
      {error !== undefined && (
        <p id={errorId} role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
