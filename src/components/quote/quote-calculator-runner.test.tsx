import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { QuoteAnswerMap, QuoteContact } from "./quote-answers";
import type { PublicQuoteCalculatorDefinition } from "~/lib/validators/quote-calculator";

/**
 * End-to-end walk of the storefront runner against a mocked tRPC client.
 *
 * Exercises the v2 step model as a visitor would drive it: a single-question
 * screen (auto-advance), a grouped screen with a same-screen show-if reveal,
 * an address question, the contact step, the review step with per-question
 * Edit → "Return to review" routing (including the "an edit revealed a new
 * required question" detour), the live-estimate panel, submit, the
 * sessionStorage draft (restore / clear / "Start over"), and the routing of a
 * server-rejected answer back to the question that owns it.
 *
 * The tRPC hooks are replaced with controllable fakes; the component under
 * test is the REAL runner tree (`QuoteCalculatorRunner` + screen / review /
 * address / live-estimate pieces).
 */

type PreviewInput = { calculatorId: string; answers: { questionId: string }[] };

/** What the fake `submit` hands back — the real mutation's own union. */
type SubmitResponse =
  | { success: true; estimate?: { exactCents: number } }
  | {
      success: false;
      error: { code: string; message: string; questionId?: string };
    };

const SUBMIT_SUCCESS: SubmitResponse = {
  success: true,
  estimate: { exactCents: 200_000 },
};

const submitCalls: unknown[] = [];
/**
 * Responses for the next N submits, in order; a test that queues nothing gets
 * `SUBMIT_SUCCESS`. Queued rather than swapped wholesale so a test can assert
 * that a REJECTED submission is followed by a successful one.
 */
const submitQueue: SubmitResponse[] = [];
/**
 * THROWN failures for the next N submits — the `onError` half of the real
 * mutation, distinct from `submitQueue`'s visitor-fixable `success: false`.
 * Checked first on each `mutate()`, same ordering promise as `submitQueue`.
 */
const submitErrorQueue: { message: string; data?: Record<string, unknown> }[] =
  [];
const previewInputs: PreviewInput[] = [];

vi.mock("~/trpc/react", () => {
  const api = {
    quoteSubmission: {
      submit: {
        useMutation: (opts: {
          onSuccess?: (data: unknown) => void;
          onError?: (error: unknown) => void;
          onSettled?: () => void;
        }) => ({
          isPending: false,
          mutate: (input: unknown) => {
            submitCalls.push(input);
            const thrown = submitErrorQueue.shift();
            if (thrown) {
              opts.onError?.(thrown);
            } else {
              opts.onSuccess?.(submitQueue.shift() ?? SUBMIT_SUCCESS);
            }
            // Mirrors real react-query: fires after EITHER outcome above, and
            // is what the runner's double-submit guard relies on to release
            // its lock for the next attempt.
            opts.onSettled?.();
          },
        }),
      },
    },
    quoteCalculator: {
      previewEstimate: {
        useQuery: (input: PreviewInput, opts?: { enabled?: boolean }) => {
          if (!opts?.enabled) {
            return { data: undefined, isFetching: false, isError: false };
          }
          previewInputs.push(input);
          return {
            data: { estimate: { exactCents: 123_400 } },
            isFetching: false,
            isError: false,
          };
        },
      },
      lookupZip: {
        useQuery: () => ({
          data: undefined,
          isFetching: false,
          isError: false,
        }),
      },
    },
  };
  return { api };
});

/**
 * Swappable per-test, so the double-submit test can hold this UNRESOLVED to
 * simulate the ~15s minting window a real reCAPTCHA v3 call can take, then
 * resolve it on cue. Reset to the default in `beforeEach` so one test's stall
 * cannot leak into the next.
 */
let recaptchaExecute: (action: string) => Promise<string | null> = () =>
  Promise.resolve("test-token");

vi.mock("~/lib/captcha/use-recaptcha-v3", () => ({
  useRecaptchaV3: () => ({
    execute: (action: string) => recaptchaExecute(action),
  }),
  useRecaptchaAutoRefresh: () => undefined,
}));

const definition: PublicQuoteCalculatorDefinition = {
  screens: [
    {
      id: "s-move",
      title: null,
      description: null,
      questions: [
        {
          id: "q-move",
          type: "choice",
          title: "What kind of move?",
          description: null,
          required: true,
          showIf: null,
          options: [
            { id: "o-local", label: "Local", icon: null },
            { id: "o-long", label: "Long distance", icon: null },
          ],
        },
      ],
    },
    {
      id: "s-home",
      title: "Home details",
      description: "Tell us about the place.",
      questions: [
        {
          id: "q-bedrooms",
          type: "number",
          title: "Bedrooms",
          description: null,
          required: true,
          showIf: null,
          min: 0,
          max: 20,
          unitLabel: null,
        },
        {
          id: "q-packing",
          type: "choice",
          title: "Need packing?",
          description: null,
          required: true,
          showIf: { questionId: "q-move", optionId: "o-long" },
          options: [
            { id: "o-pack-yes", label: "Yes", icon: null },
            { id: "o-pack-no", label: "No", icon: null },
          ],
        },
      ],
    },
    {
      id: "s-from",
      title: "Where are you moving from?",
      description: null,
      questions: [
        {
          id: "q-from",
          type: "address",
          title: "Pickup address",
          description: null,
          required: true,
          showIf: null,
        },
      ],
    },
  ],
  showEstimateToCustomer: true,
  showReviewStep: true,
  showLiveEstimate: true,
  estimateByEmail: false,
  liveEstimateDisclaimer: "Guidance only — final quote confirmed later.",
  requirePhone: false,
  responseDays: 2,
  thankYouMessage: "Thanks! We received your request.",
};

/**
 * No review step: `q-move` alone holds the flow, contact holds the submit
 * button. Used by the "Return to send" (rather than "Return to review")
 * routing test, where the whole point is that there is no review step to
 * return to.
 */
const NO_REVIEW_DEFINITION: PublicQuoteCalculatorDefinition = {
  ...definition,
  screens: [definition.screens[0]!],
  showReviewStep: false,
  showLiveEstimate: false,
};

/** Same shape, but the owner chose "email only" for the estimate. */
const EMAIL_ONLY_DEFINITION: PublicQuoteCalculatorDefinition = {
  ...NO_REVIEW_DEFINITION,
  estimateByEmail: true,
};

/** A single `dropdown` question — the Enter-inside-a-select test. */
const DROPDOWN_DEFINITION: PublicQuoteCalculatorDefinition = {
  ...definition,
  screens: [
    {
      id: "s-dropdown",
      title: null,
      description: null,
      questions: [
        {
          id: "q-dropdown",
          type: "dropdown",
          title: "Pick one",
          description: null,
          required: true,
          showIf: null,
          options: [
            { id: "o-a", label: "Option A", icon: null },
            { id: "o-b", label: "Option B", icon: null },
          ],
        },
      ],
    },
  ],
  showReviewStep: false,
  showLiveEstimate: false,
};

/** The step counter renders twice (visible + sr-only live region); assert via the progressbar. */
function expectStep(current: number, total: number) {
  expect(screen.getByRole("progressbar")).toHaveAttribute(
    "aria-valuetext",
    `Step ${current} of ${total}`,
  );
}

async function renderRunner() {
  const { QuoteCalculatorRunner } = await import("./quote-calculator-runner");
  return render(
    <QuoteCalculatorRunner
      calculator={{ id: "calc-1", name: "Moving quote", definition }}
    />,
  );
}

// ── Draft helpers ───────────────────────────────────────────────────────────
// Written straight to storage rather than through `saveQuoteSession`, so these
// tests describe what a returning visitor's TAB actually holds and stay honest
// if the writer changes.

const SESSION_KEY = "sp-quote-session:calc-1";

const draftAddress: QuoteAnswerMap = {
  "q-from": {
    kind: "address",
    line1: "123 Main St",
    line2: "",
    city: "Saginaw",
    state: "MI",
    zip: "48601",
  },
};

const draftContact: QuoteContact = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  phone: "",
};

const blankContact: QuoteContact = { name: "", email: "", phone: "" };

function seedSession(answers: QuoteAnswerMap, contact: QuoteContact) {
  window.sessionStorage.setItem(
    SESSION_KEY,
    JSON.stringify({ v: 1, answers, contact }),
  );
}

/** Everything answered — the runner should land on the last step. */
function seedCompleteSession() {
  seedSession(
    {
      "q-move": { kind: "single", optionId: "o-local" },
      "q-bedrooms": { kind: "value", raw: "3" },
      ...draftAddress,
    },
    draftContact,
  );
}

describe("QuoteCalculatorRunner (v2 step model)", () => {
  beforeEach(() => {
    submitCalls.length = 0;
    submitQueue.length = 0;
    submitErrorQueue.length = 0;
    previewInputs.length = 0;
    recaptchaExecute = () => Promise.resolve("test-token");
    // MANDATORY: every test here shares calculator id "calc-1", and the runner
    // now writes a draft on every answer change. Without this, one test's
    // answers restore themselves into the next one's first render.
    window.sessionStorage.clear();
  });

  it("walks screens → contact → review, supports edit/return routing, and submits", async () => {
    const user = userEvent.setup();
    await renderRunner();

    // ── Step 1: single-question screen renders today's layout ───────────────
    expectStep(1, 5);
    expect(
      screen.getByRole("heading", { name: /What kind of move\?/ }),
    ).toBeInTheDocument();
    // No live estimate before the first answer.
    expect(screen.queryByText("Running estimate")).not.toBeInTheDocument();
    // Nothing to discard yet, so no escape hatch is offered.
    expect(
      screen.queryByRole("button", { name: "Start over" }),
    ).not.toBeInTheDocument();

    // Picking a choice auto-advances (single-question screen).
    await user.click(screen.getByRole("radio", { name: "Local" }));
    await waitFor(() => expectStep(2, 5));

    // Live estimate appears once a priced answer exists, with the disclaimer.
    await waitFor(() =>
      expect(screen.getByText("Running estimate")).toBeInTheDocument(),
    );
    expect(screen.getByText("$1,234.00")).toBeInTheDocument();
    expect(
      screen.getByText("Guidance only — final quote confirmed later."),
    ).toBeInTheDocument();
    // Only priced answer types ride the preview call.
    expect(previewInputs.at(-1)?.answers.map((a) => a.questionId)).toEqual([
      "q-move",
    ]);

    // ── Step 2: grouped screen — heading is the screen title, questions are
    // labelled fields; the show-if question is hidden for "Local".
    expect(
      screen.getByRole("heading", { name: "Home details" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Tell us about the place.")).toBeInTheDocument();
    expect(screen.getByLabelText(/Bedrooms/)).toBeInTheDocument();
    expect(screen.queryByText("Need packing?")).not.toBeInTheDocument();

    // Next without an answer → per-question error, stays on the step.
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("This answer is required.")).toBeInTheDocument();
    expectStep(2, 5);

    await user.type(screen.getByLabelText(/Bedrooms/), "3");
    await user.click(screen.getByRole("button", { name: "Next" }));

    // ── Step 3: address screen ─────────────────────────────────────────────
    expectStep(3, 5);
    expect(
      screen.getByRole("heading", { name: "Where are you moving from?" }),
    ).toBeInTheDocument();
    const group = screen.getByRole("group", { name: /Pickup address/ });
    await user.type(
      within(group).getByLabelText(/Street address/),
      "123 Main St",
    );
    await user.type(within(group).getByLabelText(/^City/), "Saginaw");
    await user.selectOptions(within(group).getByLabelText(/^State/), "MI");
    await user.type(within(group).getByLabelText(/ZIP code/), "48601");
    await user.click(screen.getByRole("button", { name: "Next" }));

    // ── Step 4: contact — with a review step it has Next, not submit ─────────
    expectStep(4, 5);
    expect(
      screen.getByRole("heading", { name: "Where should we send it?" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Get my quote" }),
    ).not.toBeInTheDocument();
    await user.type(screen.getByLabelText(/^Name/), "Ada Lovelace");
    await user.type(screen.getByLabelText(/^Email/), "ada@example.com");
    await user.click(screen.getByRole("button", { name: "Next" }));

    // ── Step 5: review lists answers + contact with Edit links ───────────────
    expectStep(5, 5);
    expect(
      screen.getByRole("heading", { name: /Review & send/ }),
    ).toBeInTheDocument();
    expect(screen.getByText("Local")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(
      screen.getByText("123 Main St, Saginaw, MI 48601"),
    ).toBeInTheDocument();
    expect(screen.getByText("ada@example.com")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Get my quote" }),
    ).toBeInTheDocument();

    // ── Edit → the edit reveals a NEW required question → detour ────────────
    await user.click(
      screen.getByRole("button", { name: "Edit What kind of move?" }),
    );
    expectStep(1, 5);
    expect(
      screen.getByRole("button", { name: "Return to review" }),
    ).toBeInTheDocument();

    // "Long distance" reveals "Need packing?" on screen 2. The single-question
    // screen auto-advances into goNext, which must route to screen 2 (not the
    // review step) and flag the missing answer inline.
    await user.click(screen.getByRole("radio", { name: "Long distance" }));
    await waitFor(() => expectStep(2, 5));
    expect(
      screen.getByText(
        "One more answer is needed before you can return to review.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Need packing?")).toBeInTheDocument();
    expect(
      screen.getByText("Please pick an option to continue."),
    ).toBeInTheDocument();
    // Still flagged as returning.
    expect(
      screen.getByRole("button", { name: "Return to review" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: "Yes" }));
    await user.click(screen.getByRole("button", { name: "Return to review" }));

    // Back on review with the new answer present.
    expectStep(5, 5);
    expect(screen.getByText("Long distance")).toBeInTheDocument();
    expect(screen.getByText("Yes")).toBeInTheDocument();

    // ── Submit ──────────────────────────────────────────────────────────────
    await user.click(screen.getByRole("button", { name: "Get my quote" }));
    await waitFor(() => expect(submitCalls).toHaveLength(1));

    const payload = submitCalls[0] as {
      calculatorId: string;
      answers: Record<string, unknown>[];
      contactName: string;
      contactEmail: string;
      captchaToken: string;
    };
    expect(payload.calculatorId).toBe("calc-1");
    expect(payload.contactName).toBe("Ada Lovelace");
    expect(payload.contactEmail).toBe("ada@example.com");
    expect(payload.captchaToken).toBe("test-token");
    expect(payload.answers).toEqual(
      expect.arrayContaining([
        { questionId: "q-move", optionId: "o-long" },
        { questionId: "q-bedrooms", number: 3 },
        { questionId: "q-packing", optionId: "o-pack-yes" },
        {
          questionId: "q-from",
          address: {
            line1: "123 Main St",
            city: "Saginaw",
            state: "MI",
            zip: "48601",
          },
        },
      ]),
    );
    expect(payload.answers).toHaveLength(4);

    // Result screen renders ONLY what the server returned.
    await waitFor(() =>
      expect(screen.getByText("$2,000.00")).toBeInTheDocument(),
    );
    expect(screen.queryByText("Running estimate")).not.toBeInTheDocument();
  });

  it("puts the submit button on the contact step when the review step is off", async () => {
    const user = userEvent.setup();
    const { QuoteCalculatorRunner } = await import("./quote-calculator-runner");
    render(
      <QuoteCalculatorRunner
        calculator={{
          id: "calc-2",
          name: "Simple",
          definition: {
            ...definition,
            screens: [definition.screens[0]!],
            showReviewStep: false,
            showLiveEstimate: false,
          },
        }}
      />,
    );

    expectStep(1, 2);
    await user.click(screen.getByRole("radio", { name: "Local" }));
    await waitFor(() => expectStep(2, 2));
    expect(
      screen.getByRole("button", { name: "Get my quote" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Running estimate")).not.toBeInTheDocument();
  });

  it("restores a saved draft, lands on the first unanswered step, and drops the draft once the lead is in", async () => {
    const user = userEvent.setup();
    // Two screens answered, the address never reached.
    seedSession(
      {
        "q-move": { kind: "single", optionId: "o-local" },
        "q-bedrooms": { kind: "value", raw: "3" },
      },
      blankContact,
    );
    await renderRunner();

    // Landed on the address screen — the earliest thing still owed, derived
    // from the restored answers rather than read back off a stored index.
    await waitFor(() => expectStep(3, 5));
    expect(
      screen.getByRole("heading", { name: "Where are you moving from?" }),
    ).toBeInTheDocument();

    const group = screen.getByRole("group", { name: /Pickup address/ });
    await user.type(
      within(group).getByLabelText(/Street address/),
      "123 Main St",
    );
    await user.type(within(group).getByLabelText(/^City/), "Saginaw");
    await user.selectOptions(within(group).getByLabelText(/^State/), "MI");
    await user.type(within(group).getByLabelText(/ZIP code/), "48601");
    await user.click(screen.getByRole("button", { name: "Next" }));

    await user.type(screen.getByLabelText(/^Name/), "Ada Lovelace");
    await user.type(screen.getByLabelText(/^Email/), "ada@example.com");
    await user.click(screen.getByRole("button", { name: "Next" }));

    // The restored answers rode the submission, so they really were state and
    // not just rendered text.
    await user.click(screen.getByRole("button", { name: "Get my quote" }));
    await waitFor(() => expect(submitCalls).toHaveLength(1));
    const payload = submitCalls[0] as { answers: { questionId: string }[] };
    expect(payload.answers.map((answer) => answer.questionId).sort()).toEqual([
      "q-bedrooms",
      "q-from",
      "q-move",
    ]);

    // A captured lead ends the draft's life: reopening the page must not
    // repopulate someone else's name and address.
    await waitFor(() =>
      expect(window.sessionStorage.getItem(SESSION_KEY)).toBeNull(),
    );
  });

  it("routes a server-rejected answer back to its own question, then submits", async () => {
    const user = userEvent.setup();
    seedCompleteSession();
    submitQueue.push({
      success: false,
      error: {
        code: "unknown-zip",
        questionId: "q-from",
        message: "We don't recognize the ZIP code 99999.",
      },
    });
    await renderRunner();

    // Everything answered → straight to the last step.
    await waitFor(() => expectStep(5, 5));
    await user.click(screen.getByRole("button", { name: "Get my quote" }));

    // Walked back to the address screen with the server's own wording under
    // the field, not stranded on a banner at the finish line.
    await waitFor(() => expectStep(3, 5));
    expect(
      screen.getByText("We don't recognize the ZIP code 99999."),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "One answer needs your attention before we can price this.",
      ),
    ).toBeInTheDocument();
    // One click back to sending, rather than a second walk through the flow.
    expect(
      screen.getByRole("button", { name: "Return to review" }),
    ).toBeInTheDocument();

    const group = screen.getByRole("group", { name: /Pickup address/ });
    await user.clear(within(group).getByLabelText(/ZIP code/));
    await user.type(within(group).getByLabelText(/ZIP code/), "48601");
    await user.click(screen.getByRole("button", { name: "Return to review" }));
    await waitFor(() => expectStep(5, 5));

    await user.click(screen.getByRole("button", { name: "Get my quote" }));
    await waitFor(() => expect(submitCalls).toHaveLength(2));
    await waitFor(() =>
      expect(screen.getByText("$2,000.00")).toBeInTheDocument(),
    );
  });

  it("shows the owner's thank-you message alongside the estimate", async () => {
    const user = userEvent.setup();
    seedCompleteSession();
    await renderRunner();

    await waitFor(() => expectStep(5, 5));
    await user.click(screen.getByRole("button", { name: "Get my quote" }));

    await waitFor(() =>
      expect(screen.getByText("$2,000.00")).toBeInTheDocument(),
    );
    expect(
      screen.getByText("Thanks! We received your request."),
    ).toBeInTheDocument();
  });

  it("clears everything on Start over, behind an inline confirm", async () => {
    const user = userEvent.setup();
    await renderRunner();

    await user.click(screen.getByRole("radio", { name: "Local" }));
    await waitFor(() => expectStep(2, 5));
    await user.type(screen.getByLabelText(/Bedrooms/), "3");
    await waitFor(() =>
      expect(window.sessionStorage.getItem(SESSION_KEY)).not.toBeNull(),
    );

    // One click arms it, it does not fire.
    await user.click(screen.getByRole("button", { name: "Start over" }));
    expect(screen.getByText("Clear all answers?")).toBeInTheDocument();
    expectStep(2, 5);

    // Cancel puts it back without touching anything.
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByText("Clear all answers?")).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Bedrooms/)).toHaveValue(3);

    await user.click(screen.getByRole("button", { name: "Start over" }));
    await user.click(screen.getByRole("button", { name: "Confirm" }));

    expectStep(1, 5);
    expect(
      screen.getByRole("radio", { name: "Local", checked: false }),
    ).toBeInTheDocument();
    expect(window.sessionStorage.getItem(SESSION_KEY)).toBeNull();
    // Nothing left to discard, so the control retires itself.
    expect(
      screen.queryByRole("button", { name: "Start over" }),
    ).not.toBeInTheDocument();
  });

  it("abandons the review detour when the visitor presses Back", async () => {
    const user = userEvent.setup();
    seedCompleteSession();
    await renderRunner();

    await waitFor(() => expectStep(5, 5));
    await user.click(
      screen.getByRole("button", { name: "Edit What kind of move?" }),
    );
    expectStep(1, 5);

    // Switching to "Long distance" reveals a new required question, so the
    // detour note and the "Return to review" promise both appear on screen 2.
    await user.click(screen.getByRole("radio", { name: "Long distance" }));
    await waitFor(() => expectStep(2, 5));
    expect(
      screen.getByRole("button", { name: "Return to review" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Back" }));

    // Back means "I'm walking the flow again": the promise and the note that
    // explained it both have to go, or the next Next lies about where it goes.
    expectStep(1, 5);
    expect(
      screen.queryByRole("button", { name: "Return to review" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(
        "One more answer is needed before you can return to review.",
      ),
    ).not.toBeInTheDocument();
  });

  it("guards against a second submit while the recaptcha token is still minting", async () => {
    let resolveRecaptcha: (token: string) => void = () => undefined;
    recaptchaExecute = () =>
      new Promise<string>((resolve) => {
        resolveRecaptcha = resolve;
      });

    const user = userEvent.setup();
    seedCompleteSession();
    await renderRunner();
    await waitFor(() => expectStep(5, 5));

    await user.click(screen.getByRole("button", { name: "Get my quote" }));

    // The token has not resolved yet — the button swaps to its pending state,
    // which is also the state that must survive a second, over-eager attempt.
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Sending…" })).toBeDisabled(),
    );

    // `fireEvent` bypasses the DOM's native disabled-click suppression that a
    // real second mouse click would run into — exercising exactly the race
    // `submitLock` exists for, the same way a fast double-click or a stray
    // Enter landing before the disabled re-render paints ever could. The Enter
    // press goes through the step heading, not the button, mirroring a
    // keyboard user whose focus never left the form.
    fireEvent.click(screen.getByRole("button", { name: "Sending…" }));
    fireEvent.keyDown(screen.getByRole("heading", { name: /Review & send/ }), {
      key: "Enter",
    });
    expect(submitCalls).toHaveLength(0);

    resolveRecaptcha("test-token");
    await waitFor(() => expect(submitCalls).toHaveLength(1));

    // Let any further microtasks run, then confirm the extra attempts were
    // swallowed rather than merely queued behind the first.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(submitCalls).toHaveLength(1);
  });

  it('routes a "bad-answer" rejection to "Return to send" and lands on the contact step, with no review step to return to', async () => {
    const user = userEvent.setup();
    submitQueue.push({
      success: false,
      error: {
        code: "unknown-option",
        questionId: "q-move",
        message: "That option is no longer available.",
      },
    });
    const { QuoteCalculatorRunner } = await import("./quote-calculator-runner");
    render(
      <QuoteCalculatorRunner
        calculator={{
          id: "calc-no-review",
          name: "No review",
          definition: NO_REVIEW_DEFINITION,
        }}
      />,
    );

    expectStep(1, 2);
    await user.click(screen.getByRole("radio", { name: "Local" }));
    await waitFor(() => expectStep(2, 2));
    await user.type(screen.getByLabelText(/^Name/), "Ada Lovelace");
    await user.type(screen.getByLabelText(/^Email/), "ada@example.com");
    await user.click(screen.getByRole("button", { name: "Get my quote" }));

    // Routed back to the offending question with "Return to send" — there is
    // no review step, so it must not say "Return to review".
    await waitFor(() => expectStep(1, 2));
    expect(
      screen.getByText("That option is no longer available."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Return to send" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Return to review" }),
    ).not.toBeInTheDocument();

    // Fix it (pick the other option) and let the single-question screen's
    // auto-advance carry it forward — the exact same `goNext` routing an
    // explicit "Return to send" click would run.
    await user.click(screen.getByRole("radio", { name: "Long distance" }));

    // Lands on the contact step — the step that holds the submit button when
    // there is no review step to hold it instead.
    await waitFor(() => expectStep(2, 2));
    expect(
      screen.getByRole("button", { name: "Get my quote" }),
    ).toBeInTheDocument();
  });

  it("shows a friendly message for a zod validation error instead of the raw payload", async () => {
    const user = userEvent.setup();
    seedCompleteSession();
    submitErrorQueue.push({
      message: '[{"code":"invalid_type","path":["contactEmail"]}]',
      data: { zodError: { fieldErrors: { contactEmail: ["Invalid email"] } } },
    });
    await renderRunner();

    await waitFor(() => expectStep(5, 5));
    await user.click(screen.getByRole("button", { name: "Get my quote" }));

    await waitFor(() =>
      expect(
        screen.getByText(
          "Something about your answers couldn't be read. Please check them and try again.",
        ),
      ).toBeInTheDocument(),
    );
    // The raw zod payload never reaches the visitor.
    expect(screen.queryByText(/invalid_type/)).not.toBeInTheDocument();
  });

  it('renders the "on its way" line, with no figure, when the owner chose email-only', async () => {
    const user = userEvent.setup();
    submitQueue.push({ success: true }); // no `estimate` — email-only
    const { QuoteCalculatorRunner } = await import("./quote-calculator-runner");
    render(
      <QuoteCalculatorRunner
        calculator={{
          id: "calc-email-only",
          name: "Email only",
          definition: EMAIL_ONLY_DEFINITION,
        }}
      />,
    );

    await user.click(screen.getByRole("radio", { name: "Local" }));
    await waitFor(() => expectStep(2, 2));
    await user.type(screen.getByLabelText(/^Name/), "Ada Lovelace");
    await user.type(screen.getByLabelText(/^Email/), "ada@example.com");
    await user.click(screen.getByRole("button", { name: "Get my quote" }));

    await waitFor(() =>
      expect(
        screen.getByText("Your estimate is on its way to ada@example.com."),
      ).toBeInTheDocument(),
    );
    // Never a number the server did not send.
    expect(screen.queryByText(/\$/)).not.toBeInTheDocument();
  });

  it("does not advance the step when Enter is pressed inside a native select", async () => {
    const user = userEvent.setup();
    const { QuoteCalculatorRunner } = await import("./quote-calculator-runner");
    render(
      <QuoteCalculatorRunner
        calculator={{
          id: "calc-select",
          name: "Select test",
          definition: DROPDOWN_DEFINITION,
        }}
      />,
    );

    expectStep(1, 2);
    const select = screen.getByLabelText("Pick one");
    await user.selectOptions(select, "o-a");
    // A native select CONFIRMS its value on Enter without moving focus off
    // itself; the wrapping form must not also read that as "advance".
    fireEvent.keyDown(select, { key: "Enter" });
    expectStep(1, 2);
  });
});
