import type { ComponentProps } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ViiDonatePage } from "./vii-donate-page";

type Business = ComponentProps<typeof ViiDonatePage>["business"];

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

describe("ViiDonatePage", () => {
  it("renders one h1 from the donation label in the generic band", () => {
    const { container } = render(<ViiDonatePage business={makeBusiness()} />);
    const headings = screen.getAllByRole("heading", { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent("Donate");
    const band = container.querySelector('[data-sp-group="donate.hero"]');
    expect(band).toContainElement(headings[0]!);
    expect((band as HTMLElement).style.paddingLeft).toBe(
      "var(--vii-section-pad-x)",
    );
  });

  it("uses vii's copper button and navy chips, never Default's black buttons", () => {
    const { container } = render(<ViiDonatePage business={makeBusiness()} />);
    const submit = screen.getByRole("button", { name: "Donate" });
    expect(submit).toHaveClass("vii-cta-btn");
    expect(submit.getAttribute("style")).toContain("--vii-copper-deep");
    expect(container.innerHTML).not.toContain("#0a0a0a");
    const chips = screen.getAllByRole("button", { pressed: true });
    expect(chips).toHaveLength(1);
    expect(chips[0]!.getAttribute("style")).toContain("--vii-navy");
    // vii's underline inputs.
    expect(container.querySelector("form")).toHaveClass("vii-contact-form");
  });

  it("shows the card form only when Stripe is connected and charges are enabled", () => {
    const { unmount } = render(<ViiDonatePage business={makeBusiness()} />);
    expect(screen.getByRole("button", { name: "Donate" })).toBeInTheDocument();
    unmount();

    render(
      <ViiDonatePage
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
    expect(screen.getByRole("link", { name: /Open Venmo/ })).toHaveClass(
      "vii-cta-btn",
    );
  });

  it("shows the thank-you status on ?status=success", () => {
    render(<ViiDonatePage business={makeBusiness()} status="success" />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Thank you for your support!",
    );
  });

  it("falls back to the empty state when nothing is configured", () => {
    render(
      <ViiDonatePage
        business={makeBusiness({
          isStripeConnected: false,
          stripeChargesEnabled: false,
        })}
      />,
    );
    expect(
      screen.getByRole("heading", { level: 2, name: /set up yet/ }),
    ).toBeInTheDocument();
  });
});
