import type { ComponentProps } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ViiFaqPage } from "./vii-faq-page";

type Props = ComponentProps<typeof ViiFaqPage>;

function makeBusiness(customFields: Record<string, unknown> = {}) {
  return {
    name: "Test Store",
    siteContent: { customFields, logoUrl: null },
  } as unknown as Props["business"];
}

const ITEMS = [
  { id: "q1", question: "Do you take walk-ins?", answer: "Yes, most days." },
  { id: "q2", question: "Is parking free?", answer: "Street parking only." },
] as unknown as Props["items"];

describe("ViiFaqPage", () => {
  it("renders one h1 in the band, no <main>, and a native accordion", () => {
    const { container } = render(
      <ViiFaqPage business={makeBusiness()} items={ITEMS} />,
    );
    const h1s = screen.getAllByRole("heading", { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent("Frequently Asked Questions");
    expect(container.querySelector("main")).toBeNull();
    expect(container.querySelectorAll("details")).toHaveLength(2);
    expect(screen.getByText("Do you take walk-ins?")).toBeInTheDocument();
    expect(
      screen.getByText("Answers to common questions about Test Store."),
    ).toBeInTheDocument();
    // One group root wraps band + body.
    const group = container.querySelector('[data-sp-group="faq.page"]');
    expect(group).toContainElement(h1s[0]!);
    expect(group).toContainElement(container.querySelector("details"));
  });

  it("shows the empty message when there are no items", () => {
    render(
      <ViiFaqPage
        business={makeBusiness()}
        items={[] as unknown as Props["items"]}
      />,
    );
    expect(
      screen.getByText("No FAQ items available yet. Check back soon."),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/Answers to common questions/),
    ).not.toBeInTheDocument();
  });
});
