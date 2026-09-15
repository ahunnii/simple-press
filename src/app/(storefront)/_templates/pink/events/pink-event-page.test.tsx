import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { DefaultEventPageTemplateProps } from "../../types";

import { PinkEventPage } from "./pink-event-page";

// Same DOM stand-ins `pink-upcoming-section.test.tsx` uses so the tree mounts
// without a Next.js runtime.
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    const { src, alt } = props as { src?: string; alt?: string };
    return <img src={typeof src === "string" ? src : ""} alt={alt ?? ""} />;
  },
}));

const TIME_ZONE = "America/Detroit";

type PageEvent = DefaultEventPageTemplateProps["event"];
type PageBusiness = DefaultEventPageTemplateProps["business"];

function makeEvent(overrides: Partial<PageEvent> = {}): PageEvent {
  return {
    id: "event-1",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    businessId: "biz-1",
    name: "Detroit Night Market",
    slug: "detroit-night-market",
    blurb: "Come say hi.",
    coverImage: null,
    coverVideo: null,
    // 2026-08-15 19:00 EDT — a Saturday.
    startAt: new Date("2026-08-15T23:00:00.000Z"),
    endAt: new Date("2026-08-16T02:00:00.000Z"),
    allDay: false,
    location: "Eastern Market, Shed 5",
    externalUrl: "https://example.com/tickets",
    externalUrlLabel: "Get tickets",
    linkQrEnabled: false,
    priceLabel: "Free",
    published: true,
    sortOrder: 0,
    isArchived: false,
    ...overrides,
  };
}

// Only the fields the page reads. The template prop type is the full
// `simplifiedGet` shape, so the cast is deliberate.
const business = {
  name: "PinkArt",
  timeZone: TIME_ZONE,
  siteContent: { customFields: {}, logoUrl: null },
} as unknown as PageBusiness;

function renderPage(
  event: PageEvent = makeEvent(),
  { isPast = false }: { isPast?: boolean } = {},
) {
  return render(
    <PinkEventPage
      business={business}
      event={event}
      timeZone={TIME_ZONE}
      isPast={isPast}
    />,
  );
}

describe("PinkEventPage", () => {
  it("renders one h1 with the event name, after the breadcrumb", () => {
    renderPage();
    const headings = screen.getAllByRole("heading", { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent("Detroit Night Market");
    expect(screen.getByRole("navigation", { name: "Breadcrumb" })).toBeTruthy();
  });

  it("leads with the calendar leaf: weekday, month and day numeral in the business zone", () => {
    const { container } = renderPage();
    const time = container.querySelector("time");
    expect(time).not.toBeNull();
    expect(time).toHaveTextContent(/Saturday/);
    expect(time).toHaveTextContent(/August/);
    expect(time).toHaveTextContent(/15/);
    // The numeral is the leaf's display object.
    const numeral = Array.from(time!.querySelectorAll("span")).find(
      (span) => span.textContent === "15",
    );
    expect(numeral).toBeDefined();
  });

  it("puts Where / Cost in the fact rows and hides blank rows", () => {
    const { rerender } = renderPage();
    expect(screen.getByText("Where")).toBeTruthy();
    expect(screen.getByText("Eastern Market, Shed 5")).toBeTruthy();
    expect(screen.getByText("Cost")).toBeTruthy();
    expect(screen.getByText("Free")).toBeTruthy();

    rerender(
      <PinkEventPage
        business={business}
        event={makeEvent({ location: null, priceLabel: "" })}
        timeZone={TIME_ZONE}
        isPast={false}
      />,
    );
    expect(screen.queryByText("Where")).toBeNull();
    expect(screen.queryByText("Cost")).toBeNull();
  });

  it("adds a When row only when it says more than the leaf: a multi-day range", () => {
    const { rerender } = renderPage();
    // Single-day event: the leaf already carries the date.
    expect(screen.queryByText("When")).toBeNull();

    rerender(
      <PinkEventPage
        business={business}
        event={makeEvent({
          startAt: new Date("2026-08-15T04:00:00.000Z"),
          endAt: new Date("2026-08-17T03:59:59.999Z"),
          allDay: true,
        })}
        timeZone={TIME_ZONE}
        isPast={false}
      />,
    );
    expect(screen.getByText("When")).toBeTruthy();
    expect(screen.getByText(/Aug 15 – .*16/)).toBeTruthy();
  });

  it("steps the outbound link back to a ghost button once the event is over", () => {
    renderPage(makeEvent(), { isPast: true });
    const link = screen.getByRole("link", { name: /Get tickets/ });
    expect(link.className).toContain("pink-btn-ghost");
    expect(link.className).not.toContain("pink-btn-solid");
  });

  it("renders the outbound link as the primary action with the per-event label", () => {
    renderPage();
    const link = screen.getByRole("link", { name: /Get tickets/ });
    expect(link).toHaveAttribute("href", "https://example.com/tickets");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link.className).toContain("pink-btn-solid");
  });

  it("falls back to the template link label when the event's label is blank", () => {
    renderPage(makeEvent({ externalUrlLabel: "" }));
    expect(
      screen.getByRole("link", { name: /Details & tickets/ }),
    ).toBeTruthy();
  });

  it("renders no outbound link or QR when the event has no link", () => {
    const { container } = renderPage(
      makeEvent({ externalUrl: null, linkQrEnabled: true }),
    );
    expect(screen.queryByRole("link", { name: /Get tickets/ })).toBeNull();
    // The QR's module path is the only black-filled path on the page; the
    // flier fallback's placeholder SVG is stroke-only.
    expect(container.querySelector('path[fill="black"]')).toBeNull();
    expect(screen.queryByText("Scan to open")).toBeNull();
  });

  it("shows the QR stub only when the owner turned it on", () => {
    const { container, rerender } = renderPage();
    expect(screen.queryByText("Scan to open")).toBeNull();

    rerender(
      <PinkEventPage
        business={business}
        event={makeEvent({ linkQrEnabled: true })}
        timeZone={TIME_ZONE}
        isPast={false}
      />,
    );
    expect(screen.getByText("Scan to open")).toBeTruthy();
    expect(container.querySelector('path[fill="black"]')).not.toBeNull();
  });

  it("badges a past event", () => {
    renderPage(makeEvent(), { isPast: true });
    expect(screen.getByText("This one’s over")).toBeTruthy();
  });

  it("does not badge an upcoming event", () => {
    renderPage();
    expect(screen.queryByText("This one’s over")).toBeNull();
  });

  it("closes on the events CTA panel with its default copy and a back link", () => {
    renderPage();
    expect(
      screen.getByRole("heading", { level: 2, name: "Want one in your room?" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("link", { name: /Ask about hosting one/ }),
    ).toHaveAttribute("href", "/contact");
    expect(screen.getByRole("link", { name: /All events/ })).toHaveAttribute(
      "href",
      "/events",
    );
  });
});
