import type Stripe from "stripe";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { listAllSessionLineItems } from "./list-session-line-items";

const stripeMocks = vi.hoisted(() => ({ listLineItems: vi.fn() }));
vi.mock("~/lib/stripe/client", () => ({
  stripeClient: {
    checkout: {
      sessions: {
        listLineItems: (...args: unknown[]): unknown =>
          stripeMocks.listLineItems(...args),
      },
    },
  },
}));

const lines = (from: number, count: number) =>
  Array.from({ length: count }, (_, i) => ({
    id: `li_${from + i}`,
  })) as Stripe.LineItem[];

describe("listAllSessionLineItems", () => {
  beforeEach(() => {
    stripeMocks.listLineItems.mockReset();
  });

  it("lists one page on the connected account with products expanded", async () => {
    stripeMocks.listLineItems.mockResolvedValue({
      data: lines(0, 3),
      has_more: false,
    });

    const items = await listAllSessionLineItems({
      sessionId: "cs_1",
      stripeAccount: "acct_1",
    });

    expect(items.map((i) => i.id)).toEqual(["li_0", "li_1", "li_2"]);
    expect(stripeMocks.listLineItems).toHaveBeenCalledTimes(1);
    expect(stripeMocks.listLineItems).toHaveBeenCalledWith(
      "cs_1",
      { limit: 100, expand: ["data.price.product"] },
      { stripeAccount: "acct_1" },
    );
  });

  it("follows has_more with starting_after until the list is complete", async () => {
    stripeMocks.listLineItems
      .mockResolvedValueOnce({ data: lines(0, 100), has_more: true })
      .mockResolvedValueOnce({ data: lines(100, 100), has_more: true })
      .mockResolvedValueOnce({ data: lines(200, 5), has_more: false });

    const items = await listAllSessionLineItems({
      sessionId: "cs_big",
      stripeAccount: "acct_1",
    });

    expect(items).toHaveLength(205);
    expect(items[204]!.id).toBe("li_204");
    expect(stripeMocks.listLineItems).toHaveBeenCalledTimes(3);
    expect(stripeMocks.listLineItems.mock.calls[1]![1]).toEqual({
      limit: 100,
      expand: ["data.price.product"],
      starting_after: "li_99",
    });
    expect(stripeMocks.listLineItems.mock.calls[2]![1]).toMatchObject({
      starting_after: "li_199",
    });
    expect(stripeMocks.listLineItems.mock.calls[2]![2]).toEqual({
      stripeAccount: "acct_1",
    });
  });

  it("propagates a Stripe failure on a later page instead of returning a partial list", async () => {
    stripeMocks.listLineItems
      .mockResolvedValueOnce({ data: lines(0, 100), has_more: true })
      .mockRejectedValueOnce(new Error("stripe down"));

    await expect(
      listAllSessionLineItems({ sessionId: "cs_1", stripeAccount: "acct_1" }),
    ).rejects.toThrow("stripe down");
  });

  it("throws rather than looping forever when has_more never clears", async () => {
    stripeMocks.listLineItems.mockImplementation((_id, params) =>
      Promise.resolve({
        data: lines(
          Number(
            (params as { starting_after?: string }).starting_after?.slice(3) ??
              -1,
          ) + 1,
          100,
        ),
        has_more: true,
      }),
    );

    await expect(
      listAllSessionLineItems({ sessionId: "cs_1", stripeAccount: "acct_1" }),
    ).rejects.toThrow(/more than 1000 line items/);
    expect(stripeMocks.listLineItems).toHaveBeenCalledTimes(10);
  });

  it("throws on an empty page that still claims has_more", async () => {
    stripeMocks.listLineItems.mockResolvedValue({ data: [], has_more: true });

    await expect(
      listAllSessionLineItems({ sessionId: "cs_1", stripeAccount: "acct_1" }),
    ).rejects.toThrow(/line items/);
  });
});
