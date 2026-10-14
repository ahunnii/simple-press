import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ProductForm } from "./product-form";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

// tRPC react client: inert hook results. The new-product form fires no
// option queries (the Options tab needs a saved product).
vi.mock("~/trpc/react", () => {
  const hookResult = {
    data: undefined,
    isLoading: false,
    isPending: false,
    isError: false,
    error: null,
    mutate: () => undefined,
  };
  const proxy: unknown = new Proxy(() => undefined, {
    get: (_t, prop) =>
      prop === "useQuery" || prop === "useMutation" ? () => hookResult : proxy,
    apply: () => proxy,
  });
  return { api: proxy };
});

vi.mock("@better-upload/client", () => ({
  useUploadFile: () => ({ upload: vi.fn(), isPending: false }),
  useUploadFiles: () => ({ upload: vi.fn(), isPending: false }),
}));

describe("ProductForm Options tab", () => {
  it("is hidden when product options are off", () => {
    render(<ProductForm productOptionsEnabled={false} />);

    expect(screen.getByRole("tab", { name: "Basics" })).toBeInTheDocument();
    expect(
      screen.queryByRole("tab", { name: "Options" }),
    ).not.toBeInTheDocument();
  });

  it("shows when product options are on, with the save-first state for a new product", async () => {
    render(<ProductForm productOptionsEnabled />);

    const tabs = screen.getAllByRole("tab").map((tab) => tab.textContent);
    expect(tabs.indexOf("Options")).toBeGreaterThan(tabs.indexOf("Basics"));
    expect(tabs.indexOf("Options")).toBeLessThan(tabs.indexOf("SEO"));

    await userEvent.click(screen.getByRole("tab", { name: "Options" }));

    expect(screen.getByText(/Save this product first/i)).toBeInTheDocument();
    expect(screen.getByText(/a glove and a hat/i)).toBeInTheDocument();
  });
});
