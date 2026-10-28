import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ViiH1 } from "./vii-h1";

describe("ViiH1", () => {
  it("renders the visible heading with no sr-only fallback", () => {
    render(<ViiH1 fallback="About">Meet us</ViiH1>);
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1).toHaveTextContent("Meet us");
    expect(h1.querySelector(".sr-only")).toBeNull();
  });

  it("adds the sr-only fallback when the heading is blank", () => {
    render(<ViiH1 fallback="About">{"  "}</ViiH1>);
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1).toHaveTextContent("About");
    expect(h1.querySelector(".sr-only")).toHaveTextContent("About");
  });

  it("treats blank fragments of parts as blank", () => {
    render(<ViiH1 fallback="SkinBarVII">{["", false, " "]}</ViiH1>);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "SkinBarVII",
    );
  });

  it("does not use the fallback when an element child is present", () => {
    render(
      <ViiH1 fallback="Shop">
        <em>Skincare</em>
      </ViiH1>,
    );
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1).toHaveTextContent("Skincare");
    expect(h1.querySelector(".sr-only")).toBeNull();
  });

  it("keeps passed-through props on the h1", () => {
    render(
      <ViiH1 id="vii-shop-heading" className="x" fallback="Shop">
        {""}
      </ViiH1>,
    );
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1).toHaveAttribute("id", "vii-shop-heading");
    expect(h1).toHaveClass("x");
  });

  it("stays empty when blank and no fallback is given", () => {
    render(<ViiH1>{""}</ViiH1>);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("");
  });
});
