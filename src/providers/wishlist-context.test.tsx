import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useWishlist, WishlistProvider } from "./wishlist-context";

const { success } = vi.hoisted(() => ({
  success: vi.fn<(message: string) => void>(),
}));
vi.mock("sonner", () => ({ toast: { success } }));

const SAMPLE = {
  productId: "p1",
  name: "Widget",
  slug: "widget",
  price: 1500,
  imageUrl: null,
};

function Harness() {
  const wishlist = useWishlist();
  return (
    <div>
      <span data-testid="count">{wishlist.count}</span>
      <button onClick={() => wishlist.toggle(SAMPLE)}>toggle</button>
      <button onClick={() => wishlist.remove("p1")}>remove</button>
      <button
        onClick={() => {
          wishlist.toggle(SAMPLE);
          wishlist.toggle(SAMPLE);
          wishlist.toggle(SAMPLE);
        }}
      >
        triple
      </button>
    </div>
  );
}

function renderWishlist() {
  return render(
    <WishlistProvider>
      <Harness />
    </WishlistProvider>,
  );
}

describe("WishlistProvider toasts", () => {
  beforeEach(() => {
    localStorage.clear();
    success.mockClear();
  });

  it("toasts saved / removed / saved across add -> remove -> add", async () => {
    const user = userEvent.setup();
    renderWishlist();

    await user.click(screen.getByText("toggle"));
    await user.click(screen.getByText("toggle"));
    await user.click(screen.getByText("toggle"));

    expect(success.mock.calls.map((c) => c[0])).toEqual([
      "Widget saved to wishlist",
      "Removed from wishlist",
      "Widget saved to wishlist",
    ]);
    expect(screen.getByTestId("count").textContent).toBe("1");
  });

  it("stacks rapid toggles in one event on the newest list", async () => {
    const user = userEvent.setup();
    renderWishlist();

    await user.click(screen.getByText("triple"));

    expect(success.mock.calls.map((c) => c[0])).toEqual([
      "Widget saved to wishlist",
      "Removed from wishlist",
      "Widget saved to wishlist",
    ]);
    expect(screen.getByTestId("count").textContent).toBe("1");
  });

  it("remove toasts only when the item was present", async () => {
    const user = userEvent.setup();
    renderWishlist();

    await user.click(screen.getByText("remove"));
    expect(success).not.toHaveBeenCalled();

    await user.click(screen.getByText("toggle"));
    await user.click(screen.getByText("remove"));
    expect(success).toHaveBeenLastCalledWith("Removed from wishlist");
    expect(screen.getByTestId("count").textContent).toBe("0");
  });
});
