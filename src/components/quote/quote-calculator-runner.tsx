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
import type { PublicQuoteCalculatorDefinition } from "~/lib/validators/quote-calculator";
import { useRecaptchaV3 } from "~/lib/captcha/use-recaptcha-v3";
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
import { QuoteQuestionField } from "./quote-question-field";
import { QuoteResult } from "./quote-result";

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

export type QuoteCalculatorRunnerProps = {
  calculator: {
    id: string;
    name: string;
    definition: PublicQuoteCalculatorDefinition;
  };
};

/**
 * The visitor-facing quote flow: one question per screen, then a contact step,
 * then a thank-you or (if the owner opted in) an estimate.
 *
 * **Nothing about pricing lives here.** The definition this component receives
 * has already been through `toPublicCalculatorDefinition`, so there are no
 * option values, no `hiddenDefault`s, no distance variables and no formula in
 * the payload. The runner submits option IDs and raw inputs; the server
 * recomputes the price from the stored definition and decides whether the
 * visitor is told the number at all.
 */
export function QuoteCalculatorRunner({
  calculator,
}: QuoteCalculatorRunnerProps) {
  const { definition } = calculator;
  const uid = useId();

  const [answers, setAnswers] = useState<QuoteAnswerMap>({});
  const [stepIndex, setStepIndex] = useState(0);
  const [stepError, setStepError] = useState<string | null>(null);
  const [contact, setContact] = useState<QuoteContact>({
    name: "",
    email: "",
    phone: "",
  });
  const [contactErrors, setContactErrors] = useState<QuoteContactErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<QuoteSubmitResult | null>(null);

  const { execute: executeRecaptcha } = useRecaptchaV3();

  // ── Visibility → steps ────────────────────────────────────────────────────
  // `resolveVisibility` is the SHARED rule, imported rather than reimplemented:
  // the server uses the same function to decide which answers count and which
  // variables fall back to their hidden default. A local copy that drifted
  // would show the visitor a question whose answer the price ignores.
  const visibleQuestions = useMemo(() => {
    const visibility = resolveVisibility(definition.questions, (questionId) =>
      selectedOptionId(answers, questionId),
    );
    return definition.questions.filter(
      (question) => visibility.get(question.id) === true,
    );
  }, [definition.questions, answers]);

  const totalSteps = visibleQuestions.length + 1;

  // Clamped on READ rather than corrected in an effect. Answering a branching
  // question can hide later questions and shrink the step list underneath a
  // visitor who has already walked past them; deriving the index means the
  // shrink is handled in the same render as the answer change, with no
  // intermediate frame pointing at a step that no longer exists.
  const currentIndex = Math.min(stepIndex, visibleQuestions.length);
  const isContactStep = currentIndex === visibleQuestions.length;
  const currentQuestion = isContactStep ? null : visibleQuestions[currentIndex];

  // ── Step transitions ──────────────────────────────────────────────────────
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearAdvance = useCallback(() => {
    if (advanceTimer.current) {
      clearTimeout(advanceTimer.current);
      advanceTimer.current = null;
    }
  }, []);
  useEffect(() => clearAdvance, [clearAdvance]);

  const goNext = useCallback(() => {
    clearAdvance();
    if (currentQuestion) {
      const error = validateAnswer(
        currentQuestion,
        answers[currentQuestion.id],
      );
      if (error) {
        setStepError(error);
        return;
      }
    }
    setStepError(null);
    setStepIndex(currentIndex + 1);
  }, [answers, clearAdvance, currentIndex, currentQuestion]);

  const goBack = useCallback(() => {
    clearAdvance();
    setStepError(null);
    setSubmitError(null);
    setStepIndex(Math.max(0, currentIndex - 1));
  }, [clearAdvance, currentIndex]);

  // Held in a ref so the auto-advance timeout runs the LATEST `goNext` — the
  // one that has already seen the selection that triggered it, and therefore
  // the recomputed visible-question list.
  const goNextRef = useRef(goNext);
  useEffect(() => {
    goNextRef.current = goNext;
  });

  const scheduleAdvance = useCallback(() => {
    clearAdvance();
    advanceTimer.current = setTimeout(() => {
      advanceTimer.current = null;
      goNextRef.current();
    }, AUTO_ADVANCE_MS);
  }, [clearAdvance]);

  const setAnswer = useCallback((questionId: string, answer: QuoteAnswer) => {
    setStepError(null);
    setAnswers((previous) => ({ ...previous, [questionId]: answer }));
  }, []);

  // ── Focus + announcement ──────────────────────────────────────────────────
  const headingRef = useRef<HTMLHeadingElement>(null);
  const stepKey = isContactStep ? "__contact__" : (currentQuestion?.id ?? "");
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Skip the initial mount: focusing on first paint would yank the page down
    // to a widget the visitor has not scrolled to yet.
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [stepKey]);

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
    const errors = validateContact(contact, definition.requirePhone);
    setContactErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitError(null);

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
    definition.requirePhone,
    executeRecaptcha,
    submitMutation,
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
    if (isContactStep) {
      void handleSubmit();
    } else {
      goNext();
    }
  };

  // ── Derived ids / labels ──────────────────────────────────────────────────
  const headingId = `${uid}-heading`;
  const descriptionId = `${uid}-description`;
  const errorId = `${uid}-error`;

  const describedByParts: string[] = [];
  if (currentQuestion?.description) describedByParts.push(descriptionId);
  if (stepError) describedByParts.push(errorId);
  const describedBy =
    describedByParts.length > 0 ? describedByParts.join(" ") : undefined;

  const currentAnswer = currentQuestion
    ? answers[currentQuestion.id]
    : undefined;
  const currentAnswered = currentQuestion
    ? isAnswered(currentQuestion, currentAnswer)
    : false;
  const nextLabel =
    currentQuestion && !currentQuestion.required && !currentAnswered
      ? "Skip"
      : "Next";

  const progressPercent = Math.round(((currentIndex + 1) / totalSteps) * 100);

  if (result) {
    return (
      <div className="border-input bg-background text-foreground rounded-lg border p-4 shadow-xs sm:p-6">
        <QuoteResult
          result={result}
          thankYouMessage={definition.thankYouMessage}
          responseDays={definition.responseDays}
        />
      </div>
    );
  }

  return (
    <div
      className="border-input bg-background text-foreground rounded-lg border p-4 shadow-xs sm:p-6"
      onKeyDown={handleKeyDown}
    >
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

      {/* Step body */}
      {currentQuestion ? (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <h3
              id={headingId}
              ref={headingRef}
              tabIndex={-1}
              className="text-foreground text-lg font-semibold outline-none sm:text-xl"
            >
              {currentQuestion.title}
              {!currentQuestion.required && (
                <span className="text-muted-foreground ml-2 text-sm font-normal">
                  (optional)
                </span>
              )}
            </h3>
            {currentQuestion.description && (
              <p id={descriptionId} className="text-muted-foreground text-sm">
                {currentQuestion.description}
              </p>
            )}
          </div>

          <QuoteQuestionField
            question={currentQuestion}
            answer={currentAnswer}
            onChange={(answer) => setAnswer(currentQuestion.id, answer)}
            onCommit={
              currentQuestion.type === "choice" ? scheduleAdvance : undefined
            }
            labelledBy={headingId}
            describedBy={describedBy}
            invalid={stepError !== null}
            fieldId={`${uid}-field`}
          />

          {stepError && (
            <p id={errorId} role="alert" className="text-destructive text-sm">
              {stepError}
            </p>
          )}
        </div>
      ) : (
        <ContactStep
          headingId={headingId}
          headingRef={headingRef}
          uid={uid}
          contact={contact}
          errors={contactErrors}
          requirePhone={definition.requirePhone}
          onChange={(patch) => {
            setSubmitError(null);
            setContact((previous) => ({ ...previous, ...patch }));
          }}
        />
      )}

      {submitError && (
        <p role="alert" className="text-destructive mt-4 text-sm">
          {submitError}
        </p>
      )}

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

        {isContactStep ? (
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
          question; this names the position in the flow. */}
      <div aria-live="polite" className="sr-only">
        {`Step ${currentIndex + 1} of ${totalSteps}`}
      </div>
    </div>
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
  onChange,
}: {
  headingId: string;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  uid: string;
  contact: QuoteContact;
  errors: QuoteContactErrors;
  requirePhone: boolean;
  onChange: (patch: Partial<QuoteContact>) => void;
}) {
  const nameId = `${uid}-contact-name`;
  const emailId = `${uid}-contact-email`;
  const phoneId = `${uid}-contact-phone`;

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <h3
          id={headingId}
          ref={headingRef}
          tabIndex={-1}
          className="text-foreground text-lg font-semibold outline-none sm:text-xl"
        >
          Where should we send it?
        </h3>
        <p className="text-muted-foreground text-sm">
          Tell us how to reach you and we&apos;ll take it from here.
        </p>
      </div>

      <div className="grid gap-4 sm:max-w-md">
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
      <RecaptchaDisclosure />
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
