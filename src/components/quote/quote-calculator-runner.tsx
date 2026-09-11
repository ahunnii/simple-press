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
import type { RouterOutputs } from "~/trpc/react";
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
  clearQuoteSession,
  hasQuoteSessionContent,
  loadQuoteSession,
  saveQuoteSession,
} from "./quote-session";
import {
  buildSteps,
  findScreenStepIndex,
  firstIncompleteStepIndex,
} from "./quote-steps";
import { QuoteTabBar, QuoteTabsStep } from "./quote-tabs-step";
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

/**
 * Shown when the SERVER rejected one specific answer at submit — a ZIP that is
 * not in the lookup table, an option the owner deleted mid-session. The
 * server's own message says what is wrong; this says why the visitor was moved.
 */
const FIX_ANSWER_NOTE =
  "One answer needs your attention before we can price this.";

/**
 * Shown on the tabs step when Next is pressed with nothing picked. Mirrors
 * the server's own `unknown-tab` message (`evaluate.ts`) on purpose — a
 * visitor who somehow reaches submit without a tab chosen sees the identical
 * wording whether the client or the server was the one to catch it.
 */
const CHOOSE_TAB_NOTE = "Choose an option to continue";

/**
 * The visitor-fixable half of `quoteSubmission.submit`'s discriminated union.
 *
 * Read off `RouterOutputs` rather than restated, so the four codes and the
 * optional `questionId` cannot drift from the server that produces them.
 */
type QuoteSubmitFailure = Extract<
  RouterOutputs["quoteSubmission"]["submit"],
  { success: false }
>["error"];

/**
 * A stable identity for "which step is showing" — the screen id, or the
 * synthetic step's kind. Used as the focus effect's dependency, so it must be
 * derived the same way everywhere it is needed (the render path and the
 * restore effect both call this).
 */
function stepKeyOf(step: QuoteStep): string {
  return step.kind === "screen" ? step.screen.id : step.kind;
}

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
  /**
   * The visitor's tab choice — `null` until the tabs step is answered, and
   * for the (overwhelmingly common) tabs-less calculator, forever. Seeded
   * from a restored draft's `tabId` by the restore effect below, and reset
   * to `null` on "Start over".
   */
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  /** Set on the tabs step only — see `CHOOSE_TAB_NOTE`. */
  const [tabsError, setTabsError] = useState<string | null>(null);
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
  /**
   * Set while the visitor is out editing one answer and heading back to the
   * step that sends the form — the review step when the owner turned it on,
   * the contact step otherwise (it holds the submit button in that case).
   */
  const [returnToSend, setReturnToSend] = useState(false);
  const [reviewNote, setReviewNote] = useState<string | null>(null);
  const [focusRequest, setFocusRequest] = useState<{
    questionId: string;
    nonce: number;
  } | null>(null);
  /** "Start over" pressed once; the control has swapped to its confirm state. */
  const [startOverConfirming, setStartOverConfirming] = useState(false);

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
    const visibility = resolveVisibility(
      flatQuestions,
      (questionId) => selectedOptionId(answers, questionId),
      activeTabId,
    );
    return visibleScreensFor(definition.screens, visibility);
  }, [activeTabId, answers, definition.screens, flatQuestions]);

  const visibleQuestions = useMemo(
    () => flattenScreens(visibleScreens),
    [visibleScreens],
  );

  const steps = useMemo(
    () =>
      buildSteps(
        { showReviewStep: definition.showReviewStep, tabs: definition.tabs },
        visibleScreens,
      ),
    [definition.showReviewStep, definition.tabs, visibleScreens],
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
      tabId: activeTabId,
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

    // The tabs step is a forced fork: nothing past it can be evaluated for
    // visibility until one is picked (`resolveVisibility` treats "no active
    // tab" as ruling out every restricted question, never as a wildcard), so
    // an empty choice is refused right here rather than let the visitor
    // advance into a step list that has not settled yet.
    if (currentStep.kind === "tabs") {
      if (activeTabId === null) {
        setTabsError(CHOOSE_TAB_NOTE);
        return;
      }
      setTabsError(null);
    }

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

    if (returnToSend) {
      const incomplete = firstIncompleteStepIndex(
        steps,
        answers,
        contact,
        definition.requirePhone,
        activeTabId,
      );
      if (incomplete !== -1 && incomplete !== currentIndex) {
        // The edit revealed something new. Route there, say why, and KEEP the
        // flag so the next Next tries to get back to send again. The
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
        setReviewNote(
          reviewStepIndex === -1
            ? INCOMPLETE_BEFORE_SEND_NOTE
            : RETURN_TO_REVIEW_NOTE,
        );
        return;
      }
      // With a review step, "send" means landing back on review. Without one,
      // the contact step IS the step that holds the submit button, so that is
      // where "send" lands instead.
      const sendTarget =
        reviewStepIndex !== -1 ? reviewStepIndex : contactStepIndex;
      if (sendTarget !== -1) {
        setStepIndex(sendTarget);
        setReturnToSend(false);
        setReviewNote(null);
        setFocusRequest(null);
        return;
      }
    }

    setFocusRequest(null);
    setStepIndex(currentIndex + 1);
  }, [
    activeTabId,
    answers,
    clearAdvance,
    contact,
    contactStepIndex,
    currentIndex,
    currentStep,
    definition.requirePhone,
    requestFocus,
    returnToSend,
    reviewStepIndex,
    steps,
    validateScreen,
  ]);

  const goBack = useCallback(() => {
    clearAdvance();
    setStepErrors({});
    setSubmitError(null);
    setFocusRequest(null);
    // Back ABANDONS the detour. Whether the visitor got here by editing one
    // answer from review, or by being routed to a question the server refused,
    // stepping backwards means they are walking the flow again — leaving a
    // "Return to review"/"Return to send" button and a note about it on
    // screen would promise a jump the next Next is no longer going to make.
    setReturnToSend(false);
    setReviewNote(null);
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
      setReturnToSend(true);
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
    setReturnToSend(true);
    setFocusRequest(null);
    setStepIndex(contactStepIndex);
  }, [clearAdvance, contactStepIndex]);

  /** Review-step "Edit" on the chosen tab — always step 0, the tabs step. */
  const jumpToTab = useCallback(() => {
    clearAdvance();
    setStepErrors({});
    setSubmitError(null);
    setReviewNote(null);
    setReturnToSend(true);
    setFocusRequest(null);
    setStepIndex(0);
  }, [clearAdvance]);

  /**
   * The compact tab bar on a screen step — switching mid-flow, as opposed to
   * the forced first choice `QuoteTabsStep` renders. Never blocks: the
   * visitor is already past the fork, so changing their mind must not throw
   * away what they answered on a screen the two tabs share.
   *
   * The landing step for the NEW tab is derived right here rather than left
   * to react to `activeTabId` in an effect: the decision — "does the screen
   * I'm looking at still exist?" — has to be made from the exact answers the
   * visitor had a moment ago, using the SAME shared visibility/step-building
   * calls the render path uses, so the two can never draw different
   * conclusions about what the new step list even is.
   */
  const switchTab = useCallback(
    (nextTabId: string) => {
      if (nextTabId === activeTabId) return;
      clearAdvance();
      setActiveTabId(nextTabId);

      const nextVisibility = resolveVisibility(
        flatQuestions,
        (questionId) => selectedOptionId(answers, questionId),
        nextTabId,
      );
      const nextSteps = buildSteps(
        { showReviewStep: definition.showReviewStep, tabs: definition.tabs },
        visibleScreensFor(definition.screens, nextVisibility),
      );

      const currentScreenId =
        currentStep.kind === "screen" ? currentStep.screen.id : null;
      const matchIndex =
        currentScreenId === null
          ? -1
          : nextSteps.findIndex(
              (step) =>
                step.kind === "screen" && step.screen.id === currentScreenId,
            );

      // The screen the visitor was looking at survives the switch (it is
      // shared by both tabs) → stay on it. Otherwise it was tab-only and just
      // vanished, so land on the first step past the tabs step rather than
      // guess which of the new tab's screens is meant to replace it.
      setStepIndex(matchIndex !== -1 ? matchIndex : 1);
      setReturnToSend(false);
      setReviewNote(null);
      setStepErrors({});
      setFocusRequest(null);
    },
    [
      activeTabId,
      answers,
      clearAdvance,
      currentStep,
      definition.screens,
      definition.showReviewStep,
      definition.tabs,
      flatQuestions,
    ],
  );

  // Held in a ref so the auto-advance timeout runs the LATEST `goNext` — the
  // one that has already seen the selection that triggered it, and therefore
  // the recomputed visible-screen list.
  const goNextRef = useRef(goNext);
  // Same trick for the guard below: by the time the timeout fires, a same-screen
  // show-if reveal may have turned this one-question screen into a two-question
  // screen. Auto-advancing then would carry the visitor straight past a
  // required question they never saw, into an error on the way back. The tabs
  // step is eligible unconditionally — picking a tab can never reveal a
  // SECOND thing to pick on the same step, unlike a screen's show-if.
  const autoAdvanceEligibleRef = useRef(false);
  useEffect(() => {
    goNextRef.current = goNext;
    autoAdvanceEligibleRef.current =
      currentStep.kind === "tabs" ||
      (currentStep.kind === "screen" &&
        currentStep.screen.questions.length === 1);
  });

  const scheduleAdvance = useCallback(() => {
    clearAdvance();
    advanceTimer.current = setTimeout(() => {
      advanceTimer.current = null;
      if (!autoAdvanceEligibleRef.current) return;
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
  const stepKey = stepKeyOf(currentStep);
  const isFirstRender = useRef(true);
  /**
   * The one step key whose arrival must NOT take focus — set by the restore
   * effect below. A restored draft changes the step index during mount, which
   * is a step transition as far as the effect below is concerned, and focusing
   * the heading for it would scroll the page to the widget on load: the exact
   * thing the `isFirstRender` guard exists to prevent, arriving one render
   * later where that guard cannot see it.
   */
  const skipFocusForStepKey = useRef<string | null>(null);

  useEffect(() => {
    // Skip the initial mount: focusing on first paint would yank the page down
    // to a widget the visitor has not scrolled to yet.
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    // Consumed on the first run after mount whether or not it matches, so a
    // restore that lands on the step already showing (and therefore never
    // re-runs this effect) cannot leave the flag armed to swallow a later,
    // genuine transition.
    const skipKey = skipFocusForStepKey.current;
    skipFocusForStepKey.current = null;
    if (skipKey === stepKey) return;
    // A pending focus request names a specific control on the incoming screen
    // and `QuoteScreen` focuses it; child effects run first, so stealing focus
    // back to the heading here would undo it every time. Every transition that
    // does NOT target a question clears the request, so this cannot get stuck.
    if (focusRequest) return;
    headingRef.current?.focus();
  }, [focusRequest, stepKey]);

  // ── Draft persistence ─────────────────────────────────────────────────────
  // A quote flow can be fourteen steps long, and a visitor who backgrounds the
  // tab to look something up must not come back to an empty form. See
  // `quote-session.ts` for why this is sessionStorage and not localStorage.
  /** False until the restore effect has run — see the persist effect below. */
  const hydratedRef = useRef(false);

  // DECLARED BEFORE THE RESTORE EFFECT, and that ordering is load-bearing.
  // Effects run in declaration order, so on the mount pass this one runs first
  // and bails on `hydratedRef`; the restore effect then sets state, and this
  // runs again on the next render with the RESTORED values. Declared the other
  // way round, the mount pass would write the empty initial state over the very
  // draft the restore is about to read back.
  useEffect(() => {
    if (!hydratedRef.current) return;
    // Nothing to keep once the lead is in: the thank-you screen is terminal,
    // and a draft left behind would repopulate the form on the next visit.
    if (result !== null) return;
    if (hasQuoteSessionContent(answers, contact, activeTabId)) {
      saveQuoteSession(calculator.id, answers, contact, activeTabId);
    } else {
      // Emptied back out (Start over, or a lone contact field cleared). The
      // stored draft mirrors state exactly, so "nothing to keep" means no key
      // rather than an empty one.
      clearQuoteSession(calculator.id);
    }
  }, [activeTabId, answers, calculator.id, contact, result]);

  useEffect(() => {
    // Guarded on the same ref the persist effect reads, which makes this
    // effect run AT MOST ONCE for the lifetime of the component instance.
    // React StrictMode invokes mount effects twice in development, and by the
    // second invocation the persist effect above has already run with
    // `hydratedRef` true and the restored state not yet rendered — so it has
    // cleared the key. Re-reading it then would find nothing and quietly
    // "restore" an empty form in dev only.
    if (hydratedRef.current) return;

    const restored = loadQuoteSession(calculator.id, definition);
    if (restored) {
      setAnswers(restored.answers);
      setContact(restored.contact);
      setActiveTabId(restored.tabId);

      // The landing step is DERIVED here, never stored. A saved index would be
      // meaningless the moment the owner adds or reorders a screen, and would
      // survive as a pointer into a flow that no longer exists. Recomputed from
      // the restored answers with the same shared helpers the render path uses,
      // so the two can never disagree about which step comes first.
      const restoredVisibility = resolveVisibility(
        flatQuestions,
        (questionId) => selectedOptionId(restored.answers, questionId),
        restored.tabId,
      );
      const restoredSteps = buildSteps(
        { showReviewStep: definition.showReviewStep, tabs: definition.tabs },
        visibleScreensFor(definition.screens, restoredVisibility),
      );
      const incomplete = firstIncompleteStepIndex(
        restoredSteps,
        restored.answers,
        restored.contact,
        definition.requirePhone,
        restored.tabId,
      );
      // `-1` means the whole flow is answerable as it stands, so land on the
      // last step — the one holding the submit button.
      const landingIndex =
        incomplete === -1 ? restoredSteps.length - 1 : incomplete;
      const landingStep = restoredSteps[landingIndex];
      if (landingStep) skipFocusForStepKey.current = stepKeyOf(landingStep);
      setStepIndex(landingIndex);
    }
    // Set whether or not anything was restored: from here on, state changes are
    // the visitor's and are worth persisting.
    hydratedRef.current = true;
    // Mount only. Re-running on a definition change would drag a visitor
    // mid-flow back to a derived step; a definition edit lands on a fresh page
    // load anyway.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Submit ────────────────────────────────────────────────────────────────

  /**
   * A submission the server refused over ONE answer it can name.
   *
   * The four codes that arrive here (`missing-required`, `unknown-option`,
   * `bad-answer`, `unknown-zip`) are all recoverable by the visitor, and all
   * carry a message written for them — but only if they can find the field.
   * Dropping them into the generic banner is what a thrown BAD_REQUEST used to
   * do, and it stranded people: "We don't recognize the ZIP code 99999." at the
   * end of a fourteen-step form, with nothing to click.
   *
   * So the answer is walked back to instead. The banner is cleared, the message
   * is re-hung under the question that owns it, and the primary button becomes
   * "Return to review" (or, with no review step, "Return to send"), so fixing
   * it is one click back to sending rather than a second walk through the flow.
   *
   * A fifth code, `unknown-tab`, is handled first and separately: it is not
   * about any one question — the fork happens before the first one exists —
   * so there is no `questionId` to route by. It always means the same thing
   * (the tab the visitor thought they had picked did not reach the server, or
   * named one the owner has since removed), so it always routes to step 0.
   */
  const handleSubmitIssue = useCallback(
    (error: QuoteSubmitFailure) => {
      if (error.code === "unknown-tab") {
        setSubmitError(null);
        setTabsError(null);
        setStepIndex(0);
        setReviewNote(FIX_ANSWER_NOTE);
        setReturnToSend(true);
        setFocusRequest(null);
        return;
      }

      const index =
        error.questionId === undefined
          ? -1
          : findScreenStepIndex(steps, error.questionId);

      // No question named, or it is not on any step the visitor can currently
      // reach (a branch changed under them, or the owner deleted it between
      // the last render and the submit). Nothing to route to — say it plainly
      // where they are.
      if (error.questionId === undefined || index === -1) {
        setSubmitError(error.message);
        return;
      }

      setSubmitError(null);
      setStepErrors({ [error.questionId]: error.message });
      setStepIndex(index);
      setReviewNote(FIX_ANSWER_NOTE);
      setReturnToSend(true);
      requestFocus(error.questionId);
    },
    [requestFocus, steps],
  );

  /**
   * Guards `handleSubmit` against re-entry from a second click or Enter press
   * while a recaptcha token mint (up to ~15s) or the mutation itself is still
   * in flight. `isPending` alone is not enough: it only flips true once
   * `mutate()` is actually called, leaving the whole `await executeRecaptcha`
   * window unguarded — this ref closes that window. A ref rather than state
   * because it must be readable synchronously at the top of `handleSubmit`,
   * before any `await`, with no risk of reading a stale render's value.
   */
  const submitLock = useRef(false);
  /** True only for the recaptcha-mint window — see `submitLock` above. */
  const [minting, setMinting] = useState(false);

  const submitMutation = api.quoteSubmission.submit.useMutation({
    onSuccess: (data) => {
      // `success: false` is NOT an error here — it is the server saying the
      // visitor can fix this themselves. See `handleSubmitIssue`.
      if (!data.success) {
        handleSubmitIssue(data.error);
        return;
      }
      setSubmitError(null);
      // The lead is captured; the draft has done its job and must not survive
      // to repopulate the form on the next visit.
      clearQuoteSession(calculator.id);
      setResult(data);
    },
    onError: (error) => {
      // Only THROWN failures land here now: a 429, a captcha rejection, an
      // unpublished calculator, `formula-failed`. None of them names a question
      // the visitor could go back and fix — there is nowhere to route them to,
      // so the banner is the whole response.
      //
      // Answers and contact details are deliberately left intact so a retry is
      // one click, not a refill. The token is NOT reused — `handleSubmit`
      // mints a fresh one on every attempt (v3 tokens are single-use and the
      // server burns them at /siteverify even on an unrelated rejection).
      setSubmitError(
        error.data?.code === "TOO_MANY_REQUESTS"
          ? "Too many requests — please wait a moment and try again."
          : error.data?.zodError
            ? "Something about your answers couldn't be read. Please check them and try again."
            : error.message,
      );
    },
    // Releases the lock on EVERY outcome — success, the visitor-fixable
    // `success: false` branch (still a settled mutation), and a thrown error
    // alike. The `executeRecaptcha` failure path below releases it separately,
    // since that window closes before `mutate()` — and therefore `onSettled` —
    // ever runs.
    onSettled: () => {
      submitLock.current = false;
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
      setReturnToSend(true);
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
        setReturnToSend(true);
        setFocusRequest(null);
      }
      return;
    }

    setReviewNote(null);

    // Closes the window a second click/Enter could re-enter: `isPending` alone
    // does not cover the time this `await` spends minting a token (up to
    // ~15s), so a synchronous ref check has to gate it instead of state, which
    // would not be readable in time by a second call landing before this
    // component re-renders.
    if (submitLock.current || submitMutation.isPending) return;
    submitLock.current = true;
    setMinting(true);
    let token: string | null;
    try {
      token = await executeRecaptcha(RECAPTCHA_ACTION);
    } catch (error) {
      // The mutation never gets called, so `onSettled` never runs to release
      // the lock — this is the only path that has to do it itself.
      submitLock.current = false;
      throw error;
    } finally {
      setMinting(false);
    }
    const phone = contact.phone.trim();

    submitMutation.mutate({
      calculatorId: calculator.id,
      // `undefined` for a tabs-less calculator (never `null`) — the schema
      // types this as an optional string, same reason as the preview query.
      tabId: activeTabId ?? undefined,
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
    activeTabId,
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

  // ── Start over ────────────────────────────────────────────────────────────
  // Drafts now survive a reload, which means a visitor can arrive at a form
  // half-filled by their earlier self — or by whoever used the tab before them.
  // Without an escape hatch the only way out is clearing site data.
  const startOverButtonRef = useRef<HTMLButtonElement>(null);
  const confirmStartOverRef = useRef<HTMLButtonElement>(null);
  const wasConfirmingStartOver = useRef(false);

  // Focus has to be MOVED by hand here: the control the visitor just activated
  // is replaced by the confirm pair (and, on confirm, disappears entirely), so
  // without this the browser drops focus onto the body mid-flow.
  useEffect(() => {
    if (startOverConfirming) {
      confirmStartOverRef.current?.focus();
    } else if (wasConfirmingStartOver.current) {
      // Cancel → back to the button they pressed. Confirm → that button is
      // gone (there is nothing left to discard), so the reset step heading is
      // the right landing place.
      (startOverButtonRef.current ?? headingRef.current)?.focus();
    }
    wasConfirmingStartOver.current = startOverConfirming;
  }, [startOverConfirming]);

  const canStartOver =
    result === null && hasQuoteSessionContent(answers, contact, activeTabId);

  const handleStartOver = useCallback(() => {
    clearAdvance();
    setAnswers({});
    setActiveTabId(null);
    setTabsError(null);
    setContact({ name: "", email: "", phone: "" });
    setStepErrors({});
    setContactErrors({});
    setSubmitError(null);
    setReturnToSend(false);
    setReviewNote(null);
    setFocusRequest(null);
    setStartOverConfirming(false);
    // Cleared here as well as by the persist effect: the effect will reach the
    // same conclusion a render later, but a visitor pressing this button is
    // asking for their details to be gone NOW.
    clearQuoteSession(calculator.id);
    setStepIndex(0);
  }, [calculator.id, clearAdvance]);

  // ── Enter to advance ──────────────────────────────────────────────────────
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" || event.shiftKey) return;
    const target = event.target as HTMLElement | null;
    const tag = target?.tagName;
    // Textareas keep Enter for newlines; buttons and links already activate on
    // Enter themselves; a native select CONFIRMS an option on Enter without
    // moving focus off itself — all three must not also advance the step.
    if (
      tag === "TEXTAREA" ||
      tag === "BUTTON" ||
      tag === "A" ||
      tag === "SELECT"
    ) {
      return;
    }
    event.preventDefault();
    if (isSubmitStep) {
      // Mirrors the button's own `disabled`: a second Enter while the token is
      // minting or the mutation is in flight must not re-enter `handleSubmit`.
      // `handleSubmit`'s own `submitLock` check makes this belt-and-suspenders,
      // but failing fast here also skips the (harmless) re-validation pass.
      if (minting || submitMutation.isPending) return;
      void handleSubmit();
    } else {
      goNext();
    }
  };

  // ── Derived ids / labels ──────────────────────────────────────────────────
  const headingId = `${uid}-heading`;
  const startOverPromptId = `${uid}-start-over-prompt`;
  const totalSteps = steps.length;

  // The `currentStep.kind === "screen"` guard means this is structurally
  // "Next" for the tabs step too — a fork the visitor must resolve is never
  // presented as skippable.
  const nextLabel = returnToSend
    ? reviewStepIndex !== -1
      ? "Return to review"
      : "Return to send"
    : currentStep.kind === "screen" &&
        currentStep.screen.questions.every(
          (question) =>
            !question.required && !isAnswered(question, answers[question.id]),
        )
      ? "Skip"
      : "Next";

  /** The tab object behind `activeTabId`, for the review step's Type row. */
  const activeTab =
    definition.tabs.find((tab) => tab.id === activeTabId) ?? null;

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
          estimateByEmail={definition.estimateByEmail}
          contactEmail={contact.email.trim()}
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
            aria-label="Quote form progress"
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
          {currentStep.kind === "tabs" && (
            <QuoteTabsStep
              prompt={definition.tabsPrompt}
              tabs={definition.tabs}
              value={activeTabId}
              onChange={(id) => {
                setTabsError(null);
                setActiveTabId(id);
                // Same auto-advance the single-question screens get — see
                // `autoAdvanceEligibleRef`.
                scheduleAdvance();
              }}
              error={tabsError}
              headingId={headingId}
              headingRef={headingRef}
            />
          )}

          {currentStep.kind === "screen" && (
            <>
              {/* Only once a tab is active: on a tabs-less calculator
                  `definition.tabs` is empty, and mid-flow a screen step is
                  never reached before the forced first choice anyway. */}
              {definition.tabs.length > 0 && (
                <QuoteTabBar
                  prompt={definition.tabsPrompt}
                  tabs={definition.tabs}
                  value={activeTabId}
                  onChange={switchTab}
                />
              )}
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
            </>
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
              tab={
                activeTab
                  ? { prompt: definition.tabsPrompt, label: activeTab.label }
                  : null
              }
              onEditTab={jumpToTab}
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

        {/* Navigation. The left cluster is always rendered, even when empty:
            it is what holds the primary button against the right edge on step
            one, and it keeps Back and Start over on one baseline. */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {currentIndex > 0 && (
              <Button
                type="button"
                variant="ghost"
                onClick={goBack}
                disabled={submitMutation.isPending}
              >
                <ArrowLeft aria-hidden="true" />
                Back
              </Button>
            )}

            {/* Deliberately quiet, and deliberately two-step: this throws away
                everything the visitor has typed, so it must be reachable
                without being clickable by accident. The confirm swaps in place
                rather than opening a dialog — a modal over a form embedded in
                someone's storefront page is far more disruptive than the thing
                it is guarding. */}
            {canStartOver &&
              (startOverConfirming ? (
                <span className="flex flex-wrap items-center gap-2 text-xs">
                  <span
                    id={startOverPromptId}
                    className="text-muted-foreground"
                  >
                    Clear all answers?
                  </span>
                  <button
                    ref={confirmStartOverRef}
                    type="button"
                    onClick={handleStartOver}
                    // Focus lands here the moment the pair appears, so the
                    // prompt is what a screen reader hears alongside the bare
                    // word "Confirm".
                    aria-describedby={startOverPromptId}
                    className="text-destructive focus-visible:ring-ring rounded-sm font-medium underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                  >
                    Confirm
                  </button>
                  <button
                    type="button"
                    onClick={() => setStartOverConfirming(false)}
                    className="text-muted-foreground hover:text-foreground focus-visible:ring-ring rounded-sm underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                  >
                    Cancel
                  </button>
                </span>
              ) : (
                <button
                  ref={startOverButtonRef}
                  type="button"
                  onClick={() => setStartOverConfirming(true)}
                  disabled={submitMutation.isPending}
                  className="text-muted-foreground hover:text-foreground focus-visible:ring-ring rounded-sm text-xs underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-50"
                >
                  Start over
                </button>
              ))}
          </div>

          {isSubmitStep ? (
            <Button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={minting || submitMutation.isPending}
            >
              {(minting || submitMutation.isPending) && (
                <LoaderCircle className="animate-spin" aria-hidden="true" />
              )}
              {minting || submitMutation.isPending
                ? "Sending…"
                : "Get my quote"}
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
            "text-foreground focus-visible:ring-ring rounded-sm font-semibold focus-visible:ring-2 focus-visible:outline-none",
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
