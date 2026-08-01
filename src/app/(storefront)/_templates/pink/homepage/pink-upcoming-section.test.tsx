import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { PinkEvent } from "../events/pink-event-card";

import { PinkUpcomingSection } from "./pink-upcoming-section";

// `next/link` and `next/image` are mocked the same way
// `tests/templates/checkout-render.test.tsx` mocks them for every template
// checkout form — plain DOM stand-ins so the component tree mounts without a
// Next.js runtime.
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    const { src, alt } = props as { src?: string; alt?: string };
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={typeof src === "string" ? src : ""} alt={alt ?? ""} />;
  },
}));

const TIME_ZONE = "America/Detroit";

let idCounter = 0;

function makeEvent(overrides: Partial<PinkEvent> = {}): PinkEvent {
  idCounter += 1;
  return {
    id: `event-${idCounter}`,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    name: `Test Event ${idCounter}`,
    blurb: "Come say hi.",
    coverImage: null,
    startAt: new Date("2026-08-15T23:00:00.000Z"),
    endAt: null,
    allDay: false,
    location: "The Studio",
    externalUrl: null,
    externalUrlLabel: null,
    priceLabel: null,
    published: true,
    sortOrder: 0,
    isArchived: false,
    businessId: "biz_1",
    ...overrides,
  } as PinkEvent;
}

const baseProps = {
  eyebrow: "Where to find us",
  heading: "Upcoming",
  note: "Tap a flier for the full-size version.",
  ctaLabel: "See all events",
  ctaLink: "/events",
  emptyHeading: "",
  emptyBody: "",
  timeZone: TIME_ZONE,
};

describe("PinkUpcomingSection", () => {
  it("renders null when there are no events and no empty-state copy", () => {
    const { container } = render(
      <PinkUpcomingSection
        {...baseProps}
        emptyHeading=""
        emptyBody=""
        events={[]}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("renders the empty state when there are no events but empty-state copy is configured", () => {
    render(
      <PinkUpcomingSection
        {...baseProps}
        emptyHeading="Nothing on the calendar yet"
        emptyBody="Check back soon for our next market."
        events={[]}
      />,
    );

    expect(screen.getByText("Nothing on the calendar yet")).toBeInTheDocument();
    expect(
      screen.getByText("Check back soon for our next market."),
    ).toBeInTheDocument();
  });

  it("renders one card per event, matching the (already-limited) events array it's given", () => {
    // `PinkUpcomingSection` does not own the 1–6 clamp itself — per its own
    // prop doc, `events` arrives "already limited and ordered by
    // events.getUpcomingPublic" (clamping happens in pink-homepage.tsx, which
    // calls `getUpcomingPublic({ limit: upcomingLimit })`). What this
    // component owns is faithfully rendering exactly one card per item it's
    // handed — so that's what's under test here: a "valid value" limit is
    // exercised as a 3-event array, and the "garbage falls back to the
    // default" clamp behavior lives upstream in pink-homepage.tsx (an async
    // server component that also calls tRPC/getBusinessFlags/resolvePopup),
    // which is out of scope for this file.
    const events = [makeEvent(), makeEvent(), makeEvent()];
    render(<PinkUpcomingSection {...baseProps} events={events} />);

    for (const event of events) {
      expect(screen.getByText(event.name)).toBeInTheDocument();
    }
    expect(screen.getAllByRole("article")).toHaveLength(3);
  });

  it("renders exactly one card for a single-event array (no extra/missing cards)", () => {
    const events = [makeEvent({ name: "Solo Market" })];
    render(<PinkUpcomingSection {...baseProps} events={events} />);

    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(screen.getByText("Solo Market")).toBeInTheDocument();
  });

  it("renders six cards for a full six-event array (the upper clamp bound)", () => {
    const events = Array.from({ length: 6 }, (_, i) =>
      makeEvent({ name: `Market ${i + 1}` }),
    );
    render(<PinkUpcomingSection {...baseProps} events={events} />);

    expect(screen.getAllByRole("article")).toHaveLength(6);
  });

  it('carries data-sp-group="homepage.upcoming", not "homepage.events"', () => {
    const { container } = render(
      <PinkUpcomingSection
        {...baseProps}
        emptyHeading="Nothing yet"
        events={[]}
      />,
    );

    const section = container.querySelector("section");
    expect(section).not.toBeNull();
    expect(section).toHaveAttribute("data-sp-group", "homepage.upcoming");
    expect(section?.getAttribute("data-sp-group")).not.toBe("homepage.events");
  });

  it("renders no lightbox trigger for an event without a coverImage", () => {
    const events = [makeEvent({ name: "No Flier Market", coverImage: null })];
    render(<PinkUpcomingSection {...baseProps} events={events} />);

    expect(screen.getByText("No Flier Market")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders a lightbox trigger for an event with a coverImage", () => {
    const events = [
      makeEvent({
        name: "Flier Market",
        coverImage: "https://storage.example.com/fliers/flier-market.png",
      }),
    ];
    render(<PinkUpcomingSection {...baseProps} events={events} />);

    expect(
      screen.getByRole("button", { name: "View flier for Flier Market" }),
    ).toBeInTheDocument();
  });

  it("renders the event's date as a <time> element with a dateTime attribute", () => {
    const events = [
      makeEvent({
        name: "Dated Market",
        startAt: new Date("2026-08-15T23:00:00.000Z"),
        allDay: false,
      }),
    ];
    const { container } = render(
      <PinkUpcomingSection {...baseProps} events={events} />,
    );

    const time = container.querySelector("time");
    expect(time).not.toBeNull();
    expect(time?.getAttribute("dateTime")).toBeTruthy();
    // Not asserting the exact formatted string — covered exhaustively in
    // src/lib/events/format.test.ts. Just confirm something date-ish is
    // actually rendered as visible text inside the <time> element.
    expect(time?.textContent?.trim().length).toBeGreaterThan(0);
  });
});
