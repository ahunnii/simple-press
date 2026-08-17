import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PublicQuoteCalculatorDefinition } from "~/lib/validators/quote-calculator";

/**
 * End-to-end walk of the storefront runner against a mocked tRPC client.
 *
 * Exercises the v2 step model as a visitor would drive it: a single-question
 * screen (auto-advance), a grouped screen with a same-screen show-if reveal,
 * an address question, the contact step, the review step with per-question
 * Edit → "Return to review" routing (including the "an edit revealed a new
 * required question" detour), the live-estimate panel, and submit.
 *
 * The tRPC hooks are replaced with controllable fakes; the component under
 * test is the REAL runner tree (`QuoteCalculatorRunner` + screen / review /
 * address / live-estimate pieces).
 */

type PreviewInput = { calculatorId: string; answers: { questionId: string }[] };

const submitCalls: unknown[] = [];
const previewInputs: PreviewInput[] = [];

vi.mock("~/trpc/react", () => {
  const api = {
    quoteSubmission: {
      submit: {
        useMutation: (opts: {
          onSuccess?: (data: unknown) => void;
          onError?: (error: unknown) => void;
        }) => ({
          isPending: false,
          mutate: (input: unknown) => {
            submitCalls.push(input);
            opts.onSuccess?.({
              success: true,
              estimate: { exactCents: 200_000 },
            });
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

vi.mock("~/lib/captcha/use-recaptcha-v3", () => ({
  useRecaptchaV3: () => ({ execute: async () => "test-token" }),
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
  liveEstimateDisclaimer: "Guidance only — final quote confirmed later.",
  requirePhone: false,
  responseDays: 2,
  thankYouMessage: "Thanks! We received your request.",
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

describe("QuoteCalculatorRunner (v2 step model)", () => {
  beforeEach(() => {
    submitCalls.length = 0;
    previewInputs.length = 0;
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
});
