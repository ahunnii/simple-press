import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DreamH1 } from "./dream-h1";

describe("DreamH1", () => {
  it("renders the visible heading with no sr-only fallback", () => {
    render(
      <DreamH1 accent="Selest" fallback="Dream Your Theme">
        Hello
      </DreamH1>,
    );
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1).toHaveTextContent("Hello Selest");
    expect(h1.querySelector(".sr-only")).toBeNull();
  });

  it("adds the sr-only fallback when every visible part is blank", () => {
    render(
      <DreamH1 accent="  " after="" fallback="Dream Your Theme">
        {""}
      </DreamH1>,
    );
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1).toHaveClass("dream-h1");
    expect(h1).toHaveTextContent("Dream Your Theme");
    expect(h1.querySelector(".sr-only")).toHaveTextContent("Dream Your Theme");
  });

  it("does not use the fallback when only the accent is set", () => {
    render(
      <DreamH1 accent="Selest" fallback="Dream Your Theme">
        {""}
      </DreamH1>,
    );
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1).toHaveTextContent("Selest");
    expect(h1.querySelector(".sr-only")).toBeNull();
  });

  it("stays empty when blank and no fallback is given", () => {
    render(<DreamH1>{""}</DreamH1>);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("");
  });
});
