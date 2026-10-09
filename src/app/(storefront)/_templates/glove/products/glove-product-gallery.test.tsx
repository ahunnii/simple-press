import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { GloveProductGallery } from "./glove-product-gallery";

vi.mock(
  "~/app/(storefront)/_components/product-page/variant-image-context",
  () => ({ useVariantImage: () => ({ variantImageUrl: null }) }),
);
vi.mock("next/image", () => ({
  default: ({
    fill: _fill,
    priority: _priority,
    ...props
  }: Record<string, unknown>) => (
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    <img {...(props as Record<string, string>)} />
  ),
}));

const images = [{ url: "/a.png" }, { url: "/b.png" }];

function openLightbox() {
  render(
    <div className="glove">
      <GloveProductGallery images={images} productName="LuvGluv" />
    </div>,
  );
  fireEvent.click(screen.getByRole("button", { name: /enlarge photo/i }));
  return screen.getByRole("dialog");
}

describe("GloveProductGallery - lightbox backdrop", () => {
  it("closes when the backdrop (the Content element itself) is clicked", () => {
    const dialog = openLightbox();
    fireEvent.click(dialog);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("stays open when the photo or arrow controls are clicked", () => {
    const dialog = openLightbox();
    const photo = dialog.querySelector("img");
    expect(photo).not.toBeNull();
    fireEvent.click(photo!);
    fireEvent.click(screen.getByRole("button", { name: "Next photo" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("closes on Escape", () => {
    openLightbox();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
