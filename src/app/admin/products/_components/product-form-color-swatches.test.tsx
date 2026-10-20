import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ProductForm } from "./product-form";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

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

const PRODUCT = {
  id: "p1",
  name: "Glove",
  slug: "glove",
  description: "",
  price: 1000,
  published: true,
  images: [],
  collectionProducts: [],
  additionalFields: { colorSwatches: { Black: "#000001", Gone: "#123456" } },
  variants: [
    {
      id: "v1",
      name: "Black",
      options: { Color: "Black" },
      inventoryQty: 0,
      price: null,
      compareAtPrice: null,
    },
    {
      id: "v2",
      name: "Hunter Green",
      options: { Color: "Hunter Green" },
      inventoryQty: 0,
      price: null,
      compareAtPrice: null,
    },
  ],
} as unknown as Parameters<typeof ProductForm>[0]["product"];

const toolbarIsDirty = () =>
  document.querySelector(".admin-form-toolbar")?.classList.contains("dirty");

async function settle() {
  // The form re-baselines on the next animation frame after mount.
  await act(() => new Promise((resolve) => setTimeout(resolve, 50)));
}

describe("ProductForm color swatches", () => {
  it("loads the stored map without marking the form dirty, and edits dirty it", async () => {
    render(<ProductForm product={PRODUCT} />);
    await settle();

    expect(
      screen.getByRole("heading", { name: "Color swatches" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: "Color for Black (hex)" }),
    ).toHaveValue("#000001");
    expect(toolbarIsDirty()).toBe(false);

    await userEvent.click(
      screen.getByRole("button", { name: /Use auto Color for Black/ }),
    );
    expect(
      screen.getByRole("textbox", { name: "Color for Black (hex)" }),
    ).toHaveValue("");
    expect(toolbarIsDirty()).toBe(true);
  });

  it("hides the section for a new product with no variants", async () => {
    render(<ProductForm />);
    await settle();
    expect(
      screen.queryByRole("heading", { name: "Color swatches" }),
    ).not.toBeInTheDocument();
    expect(toolbarIsDirty()).toBe(false);
  });
});
