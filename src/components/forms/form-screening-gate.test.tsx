import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { FormScreening } from "~/lib/validators/form";
import { screeningStorageKey } from "~/lib/forms/screening";
import {
  FORM_DEFAULT_SCREENING_FAIL_MESSAGE,
  makeEmptyFormScreening,
} from "~/lib/validators/form";

import { FormScreeningGate } from "./form-screening-gate";

// The real TiptapRenderer is used so the note's marks (button links) are
// exercised end to end. These are only its embedded-block renderers, which
// pull in server-only code (DB client, auth) that can't load in jsdom and
// never render in an unlock note.
vi.mock("~/components/forms/form-block", () => ({ FormBlock: () => null }));
vi.mock("~/components/quote/quote-calculator-block", () => ({
  QuoteCalculatorBlock: () => null,
}));
vi.mock("~/components/gallery-renderer", () => ({
  GalleryRenderer: () => null,
}));
vi.mock("~/trpc/react", () => ({ api: {} }));

function doc(text: string) {
  return {
    type: "doc" as const,
    content: [{ type: "paragraph", content: [{ type: "text", text }] }],
  };
}

function link(text: string, href: string) {
  return {
    type: "text",
    text,
    marks: [{ type: "link", attrs: { href, variant: "outline" } }],
  };
}

function makeScreening(overrides: Partial<FormScreening> = {}): FormScreening {
  return {
    ...makeEmptyFormScreening(),
    enabled: true,
    intro: "Quick check before you apply.",
    questions: [
      {
        id: "q1",
        prompt: "Are you over 18?",
        passAnswer: "yes",
        failContent: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "You must be 18 or older." }],
            },
            {
              type: "paragraph",
              content: [
                link("Youth programs", "/youth"),
                { type: "text", text: " " },
                link("Partner site", "https://example.org/help"),
              ],
            },
          ],
        },
      },
      {
        id: "q2",
        prompt: "Do you have an active case?",
        passAnswer: "no",
        failContent: null,
      },
    ],
    unlockContent: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Thanks. Have your ID ready." }],
        },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "What to bring",
              marks: [
                {
                  type: "link",
                  attrs: { href: "/bring", variant: "solid" },
                },
              ],
            },
          ],
        },
      ],
    },
    ...overrides,
  };
}

function renderGate(
  props: Partial<React.ComponentProps<typeof FormScreeningGate>> = {},
) {
  return render(
    <FormScreeningGate
      formId="form-1"
      screening={makeScreening()}
      mode="live"
      {...props}
    >
      <div data-testid="the-form">The form</div>
    </FormScreeningGate>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  // The shared DOM setup only clears localStorage.
  window.sessionStorage.clear();
});

describe("FormScreeningGate", () => {
  it("asks one question at a time with progress and hides the form", () => {
    renderGate();
    expect(screen.getByText("Quick check before you apply.")).toBeVisible();
    expect(screen.getByText("Question 1 of 2")).toBeVisible();
    expect(
      screen.getByRole("group", { name: "Are you over 18?" }),
    ).toBeVisible();
    expect(screen.queryByText("Do you have an active case?")).toBeNull();
    expect(screen.queryByTestId("the-form")).toBeNull();
    expect(screen.queryByRole("button", { name: "Back" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Skip to form" })).toBeNull();
  });

  it("shows the unlock note, links and the form after every pass", async () => {
    const user = userEvent.setup();
    renderGate();
    await user.click(screen.getByRole("button", { name: "Yes" }));
    expect(screen.getByText("Question 2 of 2")).toBeVisible();
    // q2 passes on "no".
    await user.click(screen.getByRole("button", { name: "No" }));
    expect(screen.getByText("Thanks. Have your ID ready.")).toBeVisible();
    const bring = screen.getByRole("link", { name: "What to bring" });
    expect(bring).toHaveAttribute("href", "/bring");
    expect(bring).toHaveClass("sp-button", "sp-button--solid");
    expect(screen.getByTestId("the-form")).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Restart screening" }),
    ).toBeNull();
  });

  it("renders no unlock panel text when there is no unlock content", async () => {
    const user = userEvent.setup();
    renderGate({
      screening: makeScreening({ unlockContent: null }),
    });
    await user.click(screen.getByRole("button", { name: "Yes" }));
    await user.click(screen.getByRole("button", { name: "No" }));
    expect(screen.getByTestId("the-form")).toBeVisible();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("shows the fail message and links, then Change my answer returns to the question", async () => {
    const user = userEvent.setup();
    renderGate();
    await user.click(screen.getByRole("button", { name: "No" }));
    expect(screen.getByText("You must be 18 or older.")).toBeVisible();
    expect(screen.queryByTestId("the-form")).toBeNull();

    const internal = screen.getByRole("link", { name: "Youth programs" });
    expect(internal).toHaveAttribute("href", "/youth");
    expect(internal).not.toHaveAttribute("target");
    const external = screen.getByRole("link", { name: "Partner site" });
    expect(external).toHaveAttribute("target", "_blank");
    expect(external.getAttribute("rel")).toContain("noopener");

    await user.click(screen.getByRole("button", { name: "Change my answer" }));
    expect(screen.getByText("Question 1 of 2")).toBeVisible();
    expect(screen.queryByText("You must be 18 or older.")).toBeNull();
  });

  it("falls back to the default fail message and honors passAnswer no", async () => {
    const user = userEvent.setup();
    renderGate({
      screening: makeScreening({
        defaultFailContent: doc("Not a fit right now."),
      }),
    });
    await user.click(screen.getByRole("button", { name: "Yes" }));
    // q2 passAnswer is "no", so "Yes" fails it and uses the default message.
    await user.click(screen.getByRole("button", { name: "Yes" }));
    expect(screen.getByText("Not a fit right now.")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Change my answer" }));
    expect(screen.getByText("Question 2 of 2")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "No" }));
    expect(screen.getByTestId("the-form")).toBeVisible();
  });

  it("falls back to the built-in message when no fail message is set anywhere", async () => {
    const user = userEvent.setup();
    renderGate({ screening: makeScreening({ defaultFailContent: null }) });
    await user.click(screen.getByRole("button", { name: "Yes" }));
    await user.click(screen.getByRole("button", { name: "Yes" }));
    expect(screen.getByText(FORM_DEFAULT_SCREENING_FAIL_MESSAGE)).toBeVisible();
    expect(screen.queryByTestId("the-form")).toBeNull();
  });

  it("Back returns to the previous question", async () => {
    const user = userEvent.setup();
    renderGate();
    await user.click(screen.getByRole("button", { name: "Yes" }));
    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByText("Question 1 of 2")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Back" })).toBeNull();
  });

  it("moves focus to the new question after an answer, but not on mount", async () => {
    const user = userEvent.setup();
    renderGate();
    expect(document.body).toHaveFocus();
    await user.click(screen.getByRole("button", { name: "Yes" }));
    expect(screen.getByText("Do you have an active case?")).toHaveFocus();
  });

  it("wraps the changing step in a polite live region", () => {
    const { container } = renderGate();
    expect(container.querySelector('[aria-live="polite"]')).not.toBeNull();
    expect(container.querySelector(".sp-form-screening")).not.toBeNull();
    expect(
      container.querySelector(".sp-form-screening__question"),
    ).not.toBeNull();
  });

  describe("preview mode", () => {
    it("Skip to form jumps to the form; Restart screening starts over; nothing is stored", async () => {
      const user = userEvent.setup();
      renderGate({ mode: "preview" });
      await user.click(screen.getByRole("button", { name: "Skip to form" }));
      expect(screen.getByTestId("the-form")).toBeVisible();
      expect(
        window.sessionStorage.getItem(screeningStorageKey("form-1")),
      ).toBeNull();

      await user.click(
        screen.getByRole("button", { name: "Restart screening" }),
      );
      expect(screen.queryByTestId("the-form")).toBeNull();
      expect(screen.getByText("Question 1 of 2")).toBeVisible();
    });

    it("ignores a stored pass", () => {
      window.sessionStorage.setItem(screeningStorageKey("form-1"), "1");
      renderGate({ mode: "preview" });
      expect(screen.queryByTestId("the-form")).toBeNull();
    });
  });

  describe("live mode storage", () => {
    it("remembers a pass for the session", async () => {
      const user = userEvent.setup();
      const first = renderGate();
      await user.click(screen.getByRole("button", { name: "Yes" }));
      await user.click(screen.getByRole("button", { name: "No" }));
      expect(window.sessionStorage.getItem(screeningStorageKey("form-1"))).toBe(
        "1",
      );
      first.unmount();

      renderGate();
      expect(await screen.findByTestId("the-form")).toBeVisible();
    });

    it("does not remember a pass for a different form", () => {
      window.sessionStorage.setItem(screeningStorageKey("other"), "1");
      renderGate();
      expect(screen.queryByTestId("the-form")).toBeNull();
    });

    it("survives storage that throws", async () => {
      const user = userEvent.setup();
      vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
        throw new Error("blocked");
      });
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new Error("blocked");
      });
      renderGate();
      expect(screen.getByText("Question 1 of 2")).toBeVisible();
      await user.click(screen.getByRole("button", { name: "Yes" }));
      await user.click(screen.getByRole("button", { name: "No" }));
      expect(screen.getByTestId("the-form")).toBeVisible();
    });
  });
});
