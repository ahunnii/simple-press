import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DreamCheckoutUnavailable } from "./dream-checkout-unavailable";
import {
  dreamCheckoutUnavailableData,
  dreamCheckoutUnavailableFieldGroups,
  dreamCheckoutUnavailableSections,
} from "./unavailable-fields";

const simplifiedGet = vi.fn<() => Promise<unknown>>();
vi.mock("~/trpc/server", () => ({
  api: { business: { simplifiedGet: () => simplifiedGet() } },
}));

type Business = NonNullable<
  Parameters<typeof DreamCheckoutUnavailable>[0]
>["business"];

function business(customFields: Record<string, unknown>): Business {
  return {
    name: "Dream Your Theme",
    siteContent: { customFields, logoUrl: null, logoAltText: null },
  } as unknown as Business;
}

describe("dream checkout-unavailable fields", () => {
  it("sit on the checkout page and the section title matches the group", () => {
    for (const field of dreamCheckoutUnavailableData) {
      expect(field.page).toBe("checkout");
      expect(field.group).toBe("checkout.unavailable");
    }
    expect(dreamCheckoutUnavailableSections[0]?.title).toBe(
      dreamCheckoutUnavailableFieldGroups[0]?.title,
    );
    expect(dreamCheckoutUnavailableSections[0]?.groupIds).toEqual([
      "checkout.unavailable",
    ]);
  });
});

describe("DreamCheckoutUnavailable", () => {
  it("self-fetches the business when rendered with no props and shows defaults", async () => {
    simplifiedGet.mockResolvedValueOnce(business({}));
    render(await DreamCheckoutUnavailable());
    expect(
      screen.getByRole("heading", { level: 1, name: "Checkout unavailable" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Request an estimate" }),
    ).toHaveAttribute("href", "/contact");
  });

  it("still renders defaults when the self-fetch fails", async () => {
    simplifiedGet.mockRejectedValueOnce(new Error("boom"));
    render(await DreamCheckoutUnavailable());
    expect(
      screen.getByRole("heading", { level: 1, name: "Checkout unavailable" }),
    ).toBeInTheDocument();
  });

  it("hides the message and button when saved blank", async () => {
    const { container } = render(
      await DreamCheckoutUnavailable({
        business: business({
          "dream.checkout.unavailable-body": "",
          "dream.checkout.unavailable-cta": "",
        }),
      }),
    );
    expect(screen.queryByRole("link")).toBeNull();
    expect(
      container.querySelector(
        '[data-sp-field="dream.checkout.unavailable-body"]',
      ),
    ).toBeNull();
    expect(
      container.querySelector('[data-sp-group="checkout.unavailable"]'),
    ).not.toBeNull();
  });
});
