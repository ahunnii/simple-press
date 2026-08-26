import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SubscriptionLookupForm } from "./subscription-lookup-form";

const requestManageLinksMutate = vi.fn();
let onSuccess: (() => void) | undefined;
let onError: ((err: { message: string }) => void) | undefined;

vi.mock("~/trpc/react", () => ({
  api: {
    subscription: {
      requestManageLinks: {
        useMutation: (opts: {
          onSuccess?: () => void;
          onError?: (err: { message: string }) => void;
        }) => {
          onSuccess = opts.onSuccess;
          onError = opts.onError;
          return {
            mutate: requestManageLinksMutate,
            isPending: false,
          };
        },
      },
    },
  },
}));

beforeEach(() => {
  requestManageLinksMutate.mockClear();
  onSuccess = undefined;
  onError = undefined;
});

describe("SubscriptionLookupForm", () => {
  it("submits the email and shows the opaque confirmation on success", async () => {
    const user = userEvent.setup();
    render(<SubscriptionLookupForm />);

    await user.type(
      screen.getByLabelText(/email address/i),
      "shopper@example.com",
    );
    await user.click(
      screen.getByRole("button", { name: /email me my subscription links/i }),
    );

    expect(requestManageLinksMutate).toHaveBeenCalledWith({
      email: "shopper@example.com",
    });

    // Simulate the mutation resolving successfully.
    onSuccess?.();

    expect(
      await screen.findByText(
        /if we found subscriptions for that email, we've sent the links/i,
      ),
    ).toBeInTheDocument();
  });

  it("shows the error message when the mutation fails (e.g. rate limited)", async () => {
    const user = userEvent.setup();
    render(<SubscriptionLookupForm />);

    await user.type(
      screen.getByLabelText(/email address/i),
      "shopper@example.com",
    );
    await user.click(
      screen.getByRole("button", { name: /email me my subscription links/i }),
    );

    onError?.({ message: "Too many requests. Please try again later." });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /too many requests/i,
    );
  });
});
