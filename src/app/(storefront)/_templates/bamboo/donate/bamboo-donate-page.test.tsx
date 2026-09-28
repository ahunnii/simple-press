import type { ComponentProps } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BAMBOO_TOP_MARKER } from "../shared/bamboo-emblem-clearance";
import { BambooDonatePage } from "./bamboo-donate-page";

type Business = ComponentProps<typeof BambooDonatePage>["business"];

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

describe("BambooDonatePage", () => {
  it("renders one h1 from the donation label in the marked page-hero band", () => {
    const { container } = render(
      <BambooDonatePage business={makeBusiness()} />,
    );
    const headings = screen.getAllByRole("heading", { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent("Donate");
    expect(container.querySelectorAll(`.${BAMBOO_TOP_MARKER}`)).toHaveLength(1);
    expect(container.querySelector("section")).toHaveClass(BAMBOO_TOP_MARKER);
  });

  it("uses bamboo's forest pill + chips, never Default's black buttons", () => {
    const { container } = render(
      <BambooDonatePage business={makeBusiness()} />,
    );
    const submit = screen.getByRole("button", { name: "Donate" });
    expect(submit).toHaveClass("rounded-full", "bg-[var(--bam-forest)]");
    expect(container.innerHTML).not.toContain("#0a0a0a");
    const chips = screen.getAllByRole("button", { pressed: true });
    expect(chips).toHaveLength(1);
    expect(chips[0]).toHaveClass("bg-[var(--bam-forest)]");
  });

  it("shows the card form only when Stripe is connected and charges are enabled", () => {
    const { unmount } = render(<BambooDonatePage business={makeBusiness()} />);
    expect(screen.getByRole("button", { name: "Donate" })).toBeInTheDocument();
    unmount();

    render(
      <BambooDonatePage
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

  it("puts other ways in a side rail beside the card form", () => {
    const { container } = render(
      <BambooDonatePage
        business={makeBusiness({ venmoHandle: "teststore" })}
      />,
    );
    const rail = container.querySelector('[data-sp-group="donate.other-ways"]');
    expect(rail?.parentElement).toHaveClass("lg:col-span-5");
    expect(screen.getByRole("button", { name: "Donate" })).toBeInTheDocument();
  });

  it("shows the thank-you banner on ?status=success", () => {
    render(<BambooDonatePage business={makeBusiness()} status="success" />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Thank you for your support!",
    );
  });

  it("keeps the nothing-configured state when no lane is set up", () => {
    render(
      <BambooDonatePage
        business={makeBusiness({ isStripeConnected: false })}
      />,
    );
    expect(
      screen.getByText("Donations aren't set up yet."),
    ).toBeInTheDocument();
  });

  it("hides other ways when the donate.other-ways section is hidden", () => {
    render(
      <BambooDonatePage
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
