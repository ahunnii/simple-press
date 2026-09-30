import type { ComponentProps } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  FAQ_PAGE_EMPTY_DEFAULT,
  FAQ_PAGE_HEADING_DEFAULT,
} from "../../default/faq";
import { HappyBambooGenericPage } from "../happy-bamboo-generic-page";
import { HappyBambooFaqPage } from "./happy-bamboo-faq-page";

// The Tiptap renderer pulls in tRPC/db-backed blocks (forms, quotes); a
// stand-in that keeps the className is enough to check the body column.
vi.mock("~/components/tiptap-renderer", () => ({
  TiptapRenderer: ({ className }: { className?: string }) => (
    <div className={className} data-testid="tiptap" />
  ),
}));

type FaqProps = ComponentProps<typeof HappyBambooFaqPage>;
type GenericProps = ComponentProps<typeof HappyBambooGenericPage>;

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

describe("HappyBambooFaqPage", () => {
  it("renders one h1 with the default heading and a native accordion", () => {
    const { container } = render(
      <HappyBambooFaqPage business={makeBusiness()} items={ITEMS} />,
    );
    const headings = screen.getAllByRole("heading", { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent(FAQ_PAGE_HEADING_DEFAULT);
    expect(container.querySelectorAll("details")).toHaveLength(2);
    expect(container.querySelectorAll("details > summary")).toHaveLength(2);
    expect(
      container.querySelector('[data-sp-group="faq.page"] details'),
    ).not.toBeNull();
  });

  it("falls back to the default heading when the field is cleared", () => {
    render(
      <HappyBambooFaqPage
        business={makeBusiness({ "default.faq.page-heading": "  " })}
        items={ITEMS}
      />,
    );
    expect(
      screen.getByRole("heading", { level: 1, name: FAQ_PAGE_HEADING_DEFAULT }),
    ).toBeInTheDocument();
  });

  it("shows the empty copy when there are no questions", () => {
    render(
      <HappyBambooFaqPage
        business={makeBusiness()}
        items={[] as unknown as FaqProps["items"]}
      />,
    );
    expect(screen.getByText(FAQ_PAGE_EMPTY_DEFAULT)).toBeInTheDocument();
  });
});

describe("HappyBambooGenericPage", () => {
  it("puts the title in the shelf h1 and the body in a max-w-3xl column", () => {
    const page = {
      title: "Privacy Policy",
      excerpt: "How we handle your data.",
      slug: "privacy-policy",
      type: "policy",
      updatedAt: new Date("2026-09-01"),
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "We collect very little." }],
          },
        ],
      },
    } as unknown as GenericProps["page"];

    const { container } = render(<HappyBambooGenericPage page={page} />);
    const headings = screen.getAllByRole("heading", { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent("Privacy Policy");
    expect(screen.getByText("How we handle your data.")).toBeInTheDocument();
    expect(container.innerHTML).not.toContain("max-w-none");
    expect(container.querySelector(".prose.max-w-3xl")).not.toBeNull();
  });
});
