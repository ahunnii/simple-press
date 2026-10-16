import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { PublicFormDefinition } from "~/lib/validators/form";
import { makeEmptyFormScreening } from "~/lib/validators/form";

vi.mock("~/trpc/react", () => ({
  api: {
    formSubmission: {
      submit: {
        useMutation: () => ({ mutate: vi.fn(), isPending: false }),
      },
    },
  },
}));
vi.mock("~/server/better-auth/client", () => ({
  authClient: { useSession: () => ({ data: null }) },
}));
vi.mock("~/lib/captcha/use-recaptcha-v3", () => ({
  useRecaptchaV3: () => ({ execute: vi.fn(() => Promise.resolve(null)) }),
}));

import { FormRenderer } from "./form-renderer";

function makeDefinition(
  screening: PublicFormDefinition["settings"]["screening"],
): PublicFormDefinition {
  return {
    fields: [{ type: "text", id: "name", label: "Your name", required: false }],
    settings: {
      submitLabel: "Send",
      successMessage: "Thanks",
      screening,
    },
  } as unknown as PublicFormDefinition;
}

describe("FormRenderer screening", () => {
  afterEach(() => window.sessionStorage.clear());

  it("renders the form directly when screening is null", () => {
    const { container } = render(
      <FormRenderer formId="f1" definition={makeDefinition(null)} />,
    );
    expect(screen.getByLabelText("Your name")).toBeVisible();
    expect(container.querySelector(".sp-form-screening")).toBeNull();
    expect(container.firstElementChild?.tagName).toBe("FORM");
  });

  it("holds the form behind the screening until it is passed", async () => {
    const user = userEvent.setup();
    render(
      <FormRenderer
        formId="f1"
        definition={makeDefinition({
          ...makeEmptyFormScreening(),
          enabled: true,
          questions: [
            {
              id: "q1",
              prompt: "Are you a resident?",
              passAnswer: "yes",
              failMessage: "Residents only.",
              failLinks: [],
            },
          ],
        })}
      />,
    );
    expect(screen.queryByLabelText("Your name")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Yes" }));
    expect(screen.getByLabelText("Your name")).toBeVisible();
    expect(screen.getByRole("button", { name: "Send" })).toBeVisible();
  });
});
