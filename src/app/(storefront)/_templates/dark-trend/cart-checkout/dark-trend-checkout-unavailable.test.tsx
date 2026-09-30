import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { darkTrendSections } from "../sections";
import { DarkTrendCheckoutUnavailable } from "./dark-trend-checkout-unavailable";
import {
  darkTrendCheckoutUnavailableData,
  darkTrendCheckoutUnavailableFieldGroups,
} from "./unavailable-fields";

const simplifiedGet = vi.fn<() => Promise<unknown>>();
vi.mock("~/trpc/server", () => ({
  api: { business: { simplifiedGet: () => simplifiedGet() } },
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    className,
  }: {
    children: React.ReactNode;
    href: string;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

const DEFAULT_HEADING = "Checkout Unavailable";
const DEFAULT_BODY =
  "This store hasn't set up payment processing yet. Please contact the store owner.";

describe("dark-trend checkout-unavailable fields", () => {
  it("sit on the checkout page and the section title matches the group", () => {
    for (const field of darkTrendCheckoutUnavailableData) {
      expect(field.page).toBe("checkout");
      expect(field.group).toBe("checkout.unavailable");
    }
    const section = darkTrendSections["dark-trend"]?.find(
      (s) => s.id === "checkout.unavailable",
    );
    expect(section?.groupIds).toEqual(["checkout.unavailable"]);
    expect(section?.title).toBe(
      darkTrendCheckoutUnavailableFieldGroups[0]?.title,
    );
  });
});

describe("DarkTrendCheckoutUnavailable", () => {
  it("renders the default heading, message and button when customFields are passed", async () => {
    const { container } = render(
      await DarkTrendCheckoutUnavailable({ customFields: {} }),
    );
    expect(
      screen.getByRole("heading", { level: 1, name: DEFAULT_HEADING }),
    ).toBeInTheDocument();
    expect(screen.getByText(DEFAULT_BODY)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to shop" })).toHaveAttribute(
      "href",
      "/shop",
    );
    expect(
      container.querySelector('[data-sp-group="checkout.unavailable"]'),
    ).not.toBeNull();
    // customFields was given, so no self-fetch.
    expect(simplifiedGet).not.toHaveBeenCalled();
  });

  it("hides the button when the button text is saved blank", async () => {
    render(
      await DarkTrendCheckoutUnavailable({
        customFields: { "dark-trend.checkout.unavailable-cta": "" },
      }),
    );
    expect(screen.queryByRole("link")).toBeNull();
    expect(
      screen.getByRole("heading", { level: 1, name: DEFAULT_HEADING }),
    ).toBeInTheDocument();
  });

  it("self-fetches the business when rendered with no props", async () => {
    simplifiedGet.mockResolvedValueOnce({
      siteContent: {
        customFields: {
          "dark-trend.checkout.unavailable-heading": "Closed for now",
        },
      },
    });
    render(await DarkTrendCheckoutUnavailable());
    expect(
      screen.getByRole("heading", { level: 1, name: "Closed for now" }),
    ).toBeInTheDocument();
  });

  it("still renders defaults when the self-fetch fails", async () => {
    simplifiedGet.mockRejectedValueOnce(new Error("boom"));
    render(await DarkTrendCheckoutUnavailable());
    expect(
      screen.getByRole("heading", { level: 1, name: DEFAULT_HEADING }),
    ).toBeInTheDocument();
  });
});
