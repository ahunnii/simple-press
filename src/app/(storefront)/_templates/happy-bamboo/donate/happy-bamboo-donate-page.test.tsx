import type { ComponentProps } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { HappyBambooDonatePage } from "./happy-bamboo-donate-page";

type Business = ComponentProps<typeof HappyBambooDonatePage>["business"];

function makeBusiness(overrides: Record<string, unknown> = {}): Business {
  return {
    name: "Test Store",
    donationLabel: "donate",
    donationPresetAmounts: null,
    isStripeConnected: true,
    stripeChargesEnabled: true,
    venmoHandle: null,
    cashAppHandle: null,
    siteContent: { customFields: {}, logoUrl: null },
    ...overrides,
  } as unknown as Business;
}

describe("HappyBambooDonatePage", () => {
  it("renders one h1 from the donation label when the heading field is unset", () => {
    render(<HappyBambooDonatePage business={makeBusiness()} />);
    const headings = screen.getAllByRole("heading", { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent("Donate");
  });

  it("shows the card form only when Stripe is connected and charges are enabled", () => {
    const { unmount } = render(
      <HappyBambooDonatePage business={makeBusiness()} />,
    );
    expect(screen.getByRole("button", { name: "Donate" })).toBeInTheDocument();
    unmount();

    render(
      <HappyBambooDonatePage
        business={makeBusiness({
          stripeChargesEnabled: false,
          venmoHandle: "teststore",
        })}
      />,
    );
    expect(screen.queryByRole("button", { name: "Donate" })).toBeNull();
    expect(
      screen.getByRole("heading", { level: 2, name: "Other ways to give" }),
    ).toBeInTheDocument();
  });

  it("shows the thank-you banner on ?status=success", () => {
    render(
      <HappyBambooDonatePage business={makeBusiness()} status="success" />,
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Thank you for your support!",
    );
  });

  it("keeps the nothing-configured state when no lane is set up", () => {
    render(
      <HappyBambooDonatePage
        business={makeBusiness({ isStripeConnected: false })}
      />,
    );
    expect(
      screen.getByText("Donations aren't set up yet."),
    ).toBeInTheDocument();
  });

  it("hides other ways when the donate.other-ways section is hidden", () => {
    render(
      <HappyBambooDonatePage
        business={makeBusiness({
          venmoHandle: "teststore",
          siteContent: {
            logoUrl: null,
            customFields: {
              _sp: { sections: { "donate.other-ways": { hidden: true } } },
            },
          },
        })}
      />,
    );
    expect(screen.queryByText("Other ways to give")).toBeNull();
  });
});
