import type { ComponentProps } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  FAQ_PAGE_EMPTY_DEFAULT,
  FAQ_PAGE_HEADING_DEFAULT,
} from "../../default/faq";
import { BambooGenericPage } from "../bamboo-generic-page";
import { BAMBOO_TOP_MARKER } from "../shared/bamboo-emblem-clearance";
import { BambooFaqPage } from "./bamboo-faq-page";

// The Tiptap renderer pulls in tRPC/db-backed blocks (forms, quotes); a
// stand-in that keeps the className is enough to check the body column.
vi.mock("~/components/tiptap-renderer", () => ({
  TiptapRenderer: ({ className }: { className?: string }) => (
    <div className={className} data-testid="tiptap" />
  ),
}));

type FaqProps = ComponentProps<typeof BambooFaqPage>;
type GenericProps = ComponentProps<typeof BambooGenericPage>;

function makeBusiness(customFields: Record<string, unknown> = {}) {
  return {
    name: "Test Store",
    siteContent: { customFields },
  } as unknown as FaqProps["business"];
}

const ITEMS = [
  { id: "q1", question: "Do you ship?", answer: "Yes, everywhere." },
  { id: "q2", question: "Can I return?", answer: "Within 30 days." },
] as unknown as FaqProps["items"];

describe("BambooFaqPage", () => {
  it("renders the heading in the page-hero band, which carries the emblem marker", () => {
    const { container } = render(
      <BambooFaqPage business={makeBusiness()} items={ITEMS} />,
    );
    const headings = screen.getAllByRole("heading", { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent(FAQ_PAGE_HEADING_DEFAULT);
    // Exactly one marker, on the first section — no double top padding.
    expect(container.querySelectorAll(`.${BAMBOO_TOP_MARKER}`)).toHaveLength(1);
    expect(container.querySelector("section")).toHaveClass(BAMBOO_TOP_MARKER);
    expect(
      screen.getByText("Answers to common questions about Test Store."),
    ).toBeInTheDocument();
    // No nested <main> — bamboo's layout already provides it.
    expect(container.querySelector("main")).toBeNull();
  });

  it("renders bamboo's accordion (h3 buttons), each item toggling independently", () => {
    render(<BambooFaqPage business={makeBusiness()} items={ITEMS} />);
    const first = screen.getByRole("button", { name: "Do you ship?" });
    const second = screen.getByRole("button", { name: "Can I return?" });
    expect(first.closest("h3")).not.toBeNull();
    expect(first).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(first);
    fireEvent.click(second);
    expect(first).toHaveAttribute("aria-expanded", "true");
    expect(second).toHaveAttribute("aria-expanded", "true");
    // (FadeIn's initial opacity makes toBeVisible unreliable here, so check
    // the panel's own `hidden` attribute instead.)
    expect(
      screen.getByText("Yes, everywhere.").closest('[role="region"]'),
    ).not.toHaveAttribute("hidden");
  });

  it("keeps the faq.page group around both the heading and the body", () => {
    const { container } = render(
      <BambooFaqPage business={makeBusiness()} items={[]} />,
    );
    const group = container.querySelector('[data-sp-group="faq.page"]');
    expect(group?.querySelector("h1")).not.toBeNull();
    expect(group).toHaveTextContent(FAQ_PAGE_EMPTY_DEFAULT);
    expect(
      screen.queryByText(/Answers to common questions/),
    ).not.toBeInTheDocument();
  });

  it("falls back to the default heading when the field is cleared", () => {
    render(
      <BambooFaqPage
        business={makeBusiness({ "default.faq.page-heading": "  " })}
        items={ITEMS}
      />,
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      FAQ_PAGE_HEADING_DEFAULT,
    );
  });
});

describe("BambooGenericPage body column (B1.7)", () => {
  function renderGeneric(slug: string) {
    return render(
      <BambooGenericPage
        business={makeBusiness() as unknown as GenericProps["business"]}
        page={
          {
            title: "Our Story",
            excerpt: "How it started.",
            slug,
            content: { type: "doc", content: [] },
          } as unknown as GenericProps["page"]
        }
      />,
    );
  }

  it("sits in a left-aligned max-w-3xl column on the hero's container edge", () => {
    const { container } = renderGeneric("our-story");
    const body = screen.getByTestId("tiptap");
    const column = body.parentElement!;
    expect(column).toHaveClass("max-w-3xl");
    expect(column).not.toHaveClass("mx-auto");
    expect(body).toHaveClass("max-w-none");
    expect(body).not.toHaveClass("mx-auto");
    // Same container as the band: max-w-7xl px-4 lg:px-8.
    expect(column.closest(".max-w-7xl")).toHaveClass("px-4", "lg:px-8");
    expect(container.querySelectorAll(`.${BAMBOO_TOP_MARKER}`)).toHaveLength(1);
  });

  it("keeps the platform notice inside the same column on policy pages", () => {
    renderGeneric("privacy-policy");
    const notice = screen.getByText("Powered by SimplePress");
    expect(notice.closest(".max-w-3xl")).toBe(
      screen.getByTestId("tiptap").parentElement,
    );
  });
});
