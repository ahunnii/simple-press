import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { friendlyErrorMessage, ShippingSettings } from "./shipping-settings";

const mocks = vi.hoisted(() => ({
  updateMutate: vi.fn(),
  zoneMutate: vi.fn(),
  deliveryMutate: vi.fn(),
  // Options passed to each useMutation, so tests can fire onSettled.
  options: {} as Record<string, { onSettled?: () => void } | undefined>,
  toast: Object.assign(vi.fn(), {
    error: vi.fn(),
    success: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  }),
}));

vi.mock("sonner", () => ({ toast: mocks.toast }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));
vi.mock("~/trpc/react", () => {
  const mutation = (name: string, mutate: () => void) => ({
    useMutation: (options?: { onSettled?: () => void }) => {
      mocks.options[name] = options;
      return { mutate, isPending: false };
    },
  });
  return {
    api: {
      useUtils: () => ({ business: { invalidate: vi.fn() } }),
      business: {
        updateShipping: mutation("update", mocks.updateMutate),
        saveZoneWeightShipping: mutation("zone", mocks.zoneMutate),
        updateDeliveryAndReturns: mutation("delivery", mocks.deliveryMutate),
      },
    },
  };
});

type Props = Parameters<typeof ShippingSettings>[0];

function makeBusiness(
  overrides: Record<string, unknown> = {},
): Props["business"] {
  return {
    shippingType: "flat_rate",
    shippingFlatRate: null,
    freeShippingThreshold: null,
    offersInStorePickup: false,
    salesCountries: [],
    pickupLocation: null,
    pickupInstructions: null,
    originState: "MI",
    shippingWeightTiers: [{ label: "0-1 lb", minLb: 0, maxLb: null }],
    zones: [
      {
        name: "Local",
        states: ["MI"],
        sortOrder: 0,
        rates: [{ tierIndex: 0, priceCents: 500 }],
      },
    ],
    shippingFallbackRate: 1500,
    shippingDefaultItemWeightLb: 0,
    ...overrides,
  } as unknown as Props["business"];
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ShippingSettings validation feedback", () => {
  it("shows an inline error and sends nothing when the flat rate is empty", async () => {
    const user = userEvent.setup();
    render(<ShippingSettings business={makeBusiness()} />);

    await user.click(screen.getByRole("button", { name: /save/i }));

    expect(
      await screen.findByText("Enter a valid flat rate amount"),
    ).toBeInTheDocument();
    expect(mocks.toast.error).toHaveBeenCalledWith(
      "Fix the highlighted shipping fields",
    );
    expect(mocks.updateMutate).not.toHaveBeenCalled();
  });

  it("shows the threshold error in flat_rate_with_threshold mode", async () => {
    const user = userEvent.setup();
    render(
      <ShippingSettings
        business={makeBusiness({
          shippingType: "flat_rate_with_threshold",
          shippingFlatRate: 599,
        })}
      />,
    );

    await user.click(screen.getByRole("button", { name: /save/i }));

    expect(
      await screen.findByText("Enter a valid free shipping threshold"),
    ).toBeInTheDocument();
    expect(mocks.updateMutate).not.toHaveBeenCalled();
  });

  it("blocks a zone + weight save when pickup is on with no instructions", async () => {
    const user = userEvent.setup();
    render(
      <ShippingSettings
        business={makeBusiness({
          shippingType: "zone_weight",
          offersInStorePickup: true,
        })}
      />,
    );

    await user.click(screen.getByRole("button", { name: /save/i }));

    expect(
      await screen.findByText(
        "Add pickup hours/instructions so customers know when to collect their order",
      ),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByLabelText(/Pickup hours/)).toHaveFocus(),
    );
    expect(mocks.zoneMutate).not.toHaveBeenCalled();
  });

  it("blocks a zone + weight save after pickup is switched on in the page", async () => {
    const user = userEvent.setup();
    render(
      <ShippingSettings
        business={makeBusiness({ shippingType: "zone_weight" })}
      />,
    );

    await user.click(screen.getByRole("switch", { name: /In-store pickup/ }));
    await user.click(screen.getByRole("button", { name: /save/i }));

    expect(
      await screen.findByText(
        "Add pickup hours/instructions so customers know when to collect their order",
      ),
    ).toBeInTheDocument();
    expect(mocks.zoneMutate).not.toHaveBeenCalled();
  });

  it("sends a zone + weight save when pickup instructions are filled in", async () => {
    const user = userEvent.setup();
    render(
      <ShippingSettings
        business={makeBusiness({
          shippingType: "zone_weight",
          offersInStorePickup: true,
          pickupInstructions: "Mon-Fri 10-6",
        })}
      />,
    );

    await user.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => expect(mocks.zoneMutate).toHaveBeenCalledTimes(1));
  });
});

describe("ShippingSettings save re-entrancy guard", () => {
  const flatBusiness = () =>
    makeBusiness({ shippingType: "flat_rate", shippingFlatRate: 599 });
  const zoneBusiness = () => makeBusiness({ shippingType: "zone_weight" });

  it("ignores a second synchronous toolbar Save in flat mode", async () => {
    const user = userEvent.setup();
    render(<ShippingSettings business={flatBusiness()} />);
    const save = screen.getByRole("button", { name: /save/i });

    await Promise.all([user.click(save), user.click(save)]);

    await waitFor(() => expect(mocks.updateMutate).toHaveBeenCalledTimes(1));
    expect(mocks.updateMutate).toHaveBeenCalledTimes(1);
  });

  it("ignores a second synchronous toolbar Save in zone mode", async () => {
    const user = userEvent.setup();
    render(<ShippingSettings business={zoneBusiness()} />);
    const save = screen.getByRole("button", { name: /save/i });

    await Promise.all([user.click(save), user.click(save)]);

    await waitFor(() => expect(mocks.zoneMutate).toHaveBeenCalledTimes(1));
    expect(mocks.zoneMutate).toHaveBeenCalledTimes(1);
  });

  it("allows another save once the flat mutation settles", async () => {
    const user = userEvent.setup();
    render(<ShippingSettings business={flatBusiness()} />);
    const save = screen.getByRole("button", { name: /save/i });

    await user.click(save);
    await waitFor(() => expect(mocks.updateMutate).toHaveBeenCalledTimes(1));
    await user.click(save);
    expect(mocks.updateMutate).toHaveBeenCalledTimes(1);

    mocks.options.update?.onSettled?.();
    await user.click(save);
    await waitFor(() => expect(mocks.updateMutate).toHaveBeenCalledTimes(2));
  });

  it("allows another save once the zone mutation settles", async () => {
    const user = userEvent.setup();
    render(<ShippingSettings business={zoneBusiness()} />);
    const save = screen.getByRole("button", { name: /save/i });

    await user.click(save);
    await waitFor(() => expect(mocks.zoneMutate).toHaveBeenCalledTimes(1));
    await user.click(save);
    expect(mocks.zoneMutate).toHaveBeenCalledTimes(1);

    mocks.options.zone?.onSettled?.();
    await user.click(save);
    await waitFor(() => expect(mocks.zoneMutate).toHaveBeenCalledTimes(2));
  });

  it("does not leave the guard stuck after a failed pickup validation", async () => {
    const user = userEvent.setup();
    render(
      <ShippingSettings
        business={makeBusiness({
          shippingType: "zone_weight",
          offersInStorePickup: true,
        })}
      />,
    );
    const save = screen.getByRole("button", { name: /save/i });

    await user.click(save);
    await screen.findByText(/Add pickup hours\/instructions/);
    expect(mocks.zoneMutate).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText(/Pickup hours/), "Mon-Fri 10-6");
    await user.click(save);
    await waitFor(() => expect(mocks.zoneMutate).toHaveBeenCalledTimes(1));
  });
});

describe("friendlyErrorMessage", () => {
  it("prefers the first zod field message over the raw JSON message", () => {
    const message = friendlyErrorMessage(
      {
        message: '[ { "code": "custom" } ]',
        data: {
          zodError: {
            formErrors: [],
            fieldErrors: { pickupInstructions: ["Add pickup hours"] },
          },
        },
      },
      "fallback",
    );
    expect(message).toBe("Add pickup hours");
  });

  it("falls back to form errors, then the generic fallback, for zod errors", () => {
    expect(
      friendlyErrorMessage(
        {
          message: "[]",
          data: { zodError: { formErrors: ["Bad input"], fieldErrors: {} } },
        },
        "fallback",
      ),
    ).toBe("Bad input");
    expect(
      friendlyErrorMessage(
        {
          message: "[]",
          data: { zodError: { formErrors: [], fieldErrors: {} } },
        },
        "fallback",
      ),
    ).toBe("fallback");
  });

  it("uses the server message for non-zod errors", () => {
    expect(
      friendlyErrorMessage({ message: "Not allowed", data: null }, "fallback"),
    ).toBe("Not allowed");
  });
});
