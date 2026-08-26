import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SubscriptionManageClient } from "./subscription-manage-client";

vi.mock("sonner", () => ({
  toast: Object.assign(() => undefined, {
    success: () => undefined,
    error: () => undefined,
  }),
}));

const refresh = vi.fn();
let searchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: () => undefined,
    replace: () => undefined,
    refresh,
    prefetch: () => undefined,
    back: () => undefined,
  }),
  useSearchParams: () => searchParams,
}));

const skipMutate = vi.fn();
const pauseMutate = vi.fn();
const resumeMutate = vi.fn();
const cancelMutate = vi.fn();
const portalMutate = vi.fn();

vi.mock("~/trpc/react", () => ({
  api: {
    subscription: {
      skipNextByToken: {
        useMutation: () => ({ mutate: skipMutate, isPending: false }),
      },
      pauseByToken: {
        useMutation: () => ({ mutate: pauseMutate, isPending: false }),
      },
      resumeByToken: {
        useMutation: () => ({ mutate: resumeMutate, isPending: false }),
      },
      cancelByToken: {
        useMutation: () => ({ mutate: cancelMutate, isPending: false }),
      },
      createPortalSessionByToken: {
        useMutation: () => ({ mutate: portalMutate, isPending: false }),
      },
    },
  },
}));

type Props = Parameters<typeof SubscriptionManageClient>[0];
type SubscriptionData = Props["subscription"];

function makeSubscription(
  overrides: Partial<SubscriptionData> = {},
): SubscriptionData {
  return {
    id: "sub_1",
    status: "active",
    productName: "Toilet Paper 12-Pack",
    variantName: null,
    quantity: 2,
    intervalKey: "month:1",
    intervalLabel: "Every month",
    unitAmountCents: 1800,
    shippingCents: 500,
    deliveryMethod: "ship",
    perDeliveryCents: 4100,
    shippingAddress: {
      line1: "123 Main St",
      line2: null,
      city: "Detroit",
      state: "MI",
      postalCode: "48201",
      country: "US",
    },
    currentPeriodEnd: new Date("2026-09-25"),
    nextBillingAt: new Date("2026-09-25"),
    pauseResumesAt: null,
    cancelledAt: null,
    cancelReason: null,
    canUpdatePaymentMethod: true,
    productSlug: "toilet-paper-12-pack",
    recentOrders: [],
    ...overrides,
  } as unknown as SubscriptionData;
}

function renderClient(
  overrides: { subscription?: SubscriptionData; actionsEnabled?: boolean } = {},
) {
  return render(
    <SubscriptionManageClient
      token="tok_abc"
      subscription={overrides.subscription ?? makeSubscription()}
      actionsEnabled={overrides.actionsEnabled ?? true}
      businessName="Acme Goods"
    />,
  );
}

beforeEach(() => {
  searchParams = new URLSearchParams();
  skipMutate.mockClear();
  pauseMutate.mockClear();
  resumeMutate.mockClear();
  cancelMutate.mockClear();
  portalMutate.mockClear();
  refresh.mockClear();
});

describe("SubscriptionManageClient", () => {
  it("shows skip, pause, update payment method, and cancel for an active subscription", () => {
    renderClient();

    expect(
      screen.getByRole("button", { name: /skip next delivery/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^pause$/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /update payment method/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /cancel subscription/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^resume$/i }),
    ).not.toBeInTheDocument();
  });

  it("shows resume (not skip or pause) for a paused subscription", () => {
    renderClient({
      subscription: makeSubscription({
        status: "paused",
        pauseResumesAt: new Date("2026-10-01"),
      }),
    });

    expect(
      screen.getByRole("button", { name: /^resume$/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /skip next delivery/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^pause$/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /cancel subscription/i }),
    ).toBeInTheDocument();
  });

  it("shows no actions for a cancelled subscription", () => {
    renderClient({
      subscription: makeSubscription({
        status: "cancelled",
        cancelledAt: new Date("2026-08-01"),
        canUpdatePaymentMethod: false,
        nextBillingAt: null,
        currentPeriodEnd: null,
      }),
    });

    expect(
      screen.queryByRole("button", { name: /skip next delivery/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^pause$/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^resume$/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /update payment method/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /cancel subscription/i }),
    ).not.toBeInTheDocument();
  });

  it("hides skip/pause/update-payment when actions are disabled, but keeps cancel", () => {
    renderClient({ actionsEnabled: false });

    expect(
      screen.queryByRole("button", { name: /skip next delivery/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^pause$/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /update payment method/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /cancel subscription/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/some options are temporarily unavailable/i),
    ).toBeInTheDocument();
  });

  it("opens a confirm dialog and calls cancelByToken on confirm", async () => {
    const user = userEvent.setup();
    renderClient();

    await user.click(
      screen.getByRole("button", { name: /cancel subscription/i }),
    );

    expect(
      await screen.findByText(/you won't be charged again/i),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /yes, cancel/i }));

    expect(cancelMutate).toHaveBeenCalledWith({ token: "tok_abc" });
  });
  it("shows fulfillment progress for a live order and the order status for a refunded one", () => {
    renderClient({
      subscription: makeSubscription({
        recentOrders: [
          {
            id: "o1",
            orderNumber: 1001,
            createdAt: new Date("2026-09-01"),
            status: "open",
            fulfillmentStatus: "unfulfilled",
            total: 4100,
          },
          {
            id: "o2",
            orderNumber: 1000,
            createdAt: new Date("2026-08-01"),
            status: "refunded",
            fulfillmentStatus: "fulfilled",
            total: 4100,
          },
        ],
      }),
    });

    expect(screen.getByText(/not shipped yet/i)).toBeInTheDocument();
    // A refunded order must not advertise "Shipped" as its headline.
    expect(screen.getByText(/refunded/i)).toBeInTheDocument();
  });

  it("links 'Subscribe again' to the product when the slug is known", () => {
    renderClient({
      subscription: makeSubscription({
        status: "cancelled",
        cancelledAt: new Date("2026-08-01"),
        canUpdatePaymentMethod: false,
      }),
    });

    expect(
      screen.getByRole("link", { name: /subscribe again/i }),
    ).toHaveAttribute("href", "/shop/toilet-paper-12-pack");
  });

  it("falls back to the shop index when the product was deleted", () => {
    renderClient({
      subscription: makeSubscription({
        status: "cancelled",
        cancelledAt: new Date("2026-08-01"),
        canUpdatePaymentMethod: false,
        productSlug: null,
      }),
    });

    expect(
      screen.getByRole("link", { name: /subscribe again/i }),
    ).toHaveAttribute("href", "/shop");
  });
});
