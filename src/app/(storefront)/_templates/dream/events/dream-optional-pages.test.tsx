import type { ComponentProps, ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { dreamEventsData, dreamEventsSections } from ".";
import { dreamDonateData, dreamDonateSections } from "../donate";
import { DreamDonatePage } from "../donate/dream-donate-page";
import { dreamFaqData, dreamFaqSections } from "../faq";
import { DreamFaqPage } from "../faq/dream-faq-page";
import { dreamVideosData, dreamVideosSections } from "../videos";
import { DreamVideosPage } from "../videos/dream-videos-page";
import { DreamEventPage } from "./dream-event-page";
import { DreamEventsPage } from "./dream-events-page";

// The reveal wrappers need IntersectionObserver; these tests only assert
// structure, so render them as plain divs that keep their class names.
vi.mock("../shared/dream-reveal", () => ({
  DreamReveal: ({
    children,
    className,
  }: {
    children?: ReactNode;
    className?: string;
  }) => <div className={["dream-reveal", className].join(" ")}>{children}</div>,
  DreamRevealGroup: ({
    children,
    className,
  }: {
    children?: ReactNode;
    className?: string;
  }) => (
    <div className={["dream-reveal-group", className].join(" ")}>
      {children}
    </div>
  ),
}));

/**
 * Smoke + contract tests for dream's optional pages on the generic page base
 * (parity PF20, package TP7). Each page: one h1 in the `DreamPageHero` sky
 * band (`dream-h1`), body on the `--dream-container` edge, the designed
 * empty state, and the editor hotspots it declares.
 */

type EventsProps = ComponentProps<typeof DreamEventsPage>;
type EventProps = ComponentProps<typeof DreamEventPage>;
type VideosProps = ComponentProps<typeof DreamVideosPage>;
type DonateProps = ComponentProps<typeof DreamDonatePage>;
type FaqProps = ComponentProps<typeof DreamFaqPage>;

function makeBusiness<T>(customFields: Record<string, unknown> = {}): T {
  return {
    name: "Dream Your Theme",
    donationLabel: null,
    isStripeConnected: false,
    stripeChargesEnabled: false,
    donationPresetAmounts: null,
    siteContent: { customFields, logoUrl: null, logoAltText: null },
  } as unknown as T;
}

const EVENT = {
  id: "e1",
  slug: "spring-fair",
  name: "Spring Fair",
  startAt: new Date("2030-04-12T15:00:00Z"),
  endAt: null,
  allDay: false,
  location: "Eastern Market",
  blurb: "Come say hi.",
  priceLabel: "Free",
  externalUrl: "https://example.com/tickets",
  externalUrlLabel: "",
  coverImage: null,
  coverVideo: null,
  linkQrEnabled: false,
};

function expectOneDreamH1(text: string) {
  const h1s = screen.getAllByRole("heading", { level: 1 });
  expect(h1s).toHaveLength(1);
  expect(h1s[0]).toHaveTextContent(text);
  expect(h1s[0]).toHaveClass("dream-h1");
  expect(h1s[0]!.closest(".dream-page-hero")).not.toBeNull();
}

/** A `DreamSection` root whose first child is the shared container. */
function expectOnContainer(section: Element | null) {
  expect(section).not.toBeNull();
  expect(section).toHaveClass("dream-section");
  const inner = section!.querySelector(":scope > div");
  expect(inner?.className).toContain("[max-width:var(--dream-container)]");
}

describe("dream optional pages — registry", () => {
  it("omits the eyebrow keys dream never renders", () => {
    const keys = [...dreamEventsData, ...dreamVideosData].map((f) => f.key);
    expect(keys).not.toContain("default.events.hero-eyebrow");
    expect(keys).not.toContain("default.videos.hero-eyebrow");
    expect(keys).toContain("default.events.hero-heading");
  });

  it("every field group has a matching section (triple-match)", () => {
    const pairs = [
      [dreamEventsData, dreamEventsSections],
      [dreamVideosData, dreamVideosSections],
      [dreamDonateData, dreamDonateSections],
      [dreamFaqData, dreamFaqSections],
    ] as const;
    for (const [data, sections] of pairs) {
      const sectionIds = new Set(sections.map((s) => s.id));
      for (const field of data) {
        expect(sectionIds.has(field.group ?? "")).toBe(true);
      }
      for (const section of sections) {
        expect(section.groupIds).toEqual([section.id]);
      }
    }
  });
});

describe("DreamEventsPage", () => {
  it("renders the sky band, the designed empty state and the closing band", () => {
    const { container } = render(
      <DreamEventsPage
        business={makeBusiness<EventsProps["business"]>()}
        events={[] as EventsProps["events"]}
        timeZone="America/Detroit"
      />,
    );
    expectOneDreamH1("Events");
    expect(screen.queryByText("What's on")).toBeNull();
    expect(
      container.querySelector('[data-sp-group="events.hero"]'),
    ).toHaveClass("dream-page-hero");
    expectOnContainer(container.querySelector('[data-sp-group="events.list"]'));
    expect(
      screen.getByRole("heading", { level: 2, name: "No upcoming events" }),
    ).toBeInTheDocument();
    const band = container.querySelector('[data-sp-group="events.cta"]');
    expect(band).toHaveClass("dream-quote-band");
    const cta = screen.getByRole("link", { name: /Get in touch/ });
    expect(cta).toHaveAttribute("href", "/contact");
    expect(cta).toHaveClass("dream-btn");
    expect(container.innerHTML).not.toMatch(/#[0-9a-f]{6}\b/i);
  });

  it("renders an event row with the date tile and fallback link label", () => {
    const { container } = render(
      <DreamEventsPage
        business={makeBusiness<EventsProps["business"]>()}
        events={[EVENT] as unknown as EventsProps["events"]}
        timeZone="America/Detroit"
      />,
    );
    expect(screen.getByRole("link", { name: "Spring Fair" })).toHaveAttribute(
      "href",
      "/events/spring-fair",
    );
    expect(screen.getByRole("link", { name: /More details/ })).toHaveAttribute(
      "target",
      "_blank",
    );
    // No media → the sky date tile (Apr 12 in Detroit).
    expect(container.textContent).toContain("Apr");
    expect(container.textContent).toContain("12");
    expect(screen.getByText("Free")).toBeInTheDocument();
  });

  it("hides the closing band when events.cta is hidden", () => {
    render(
      <DreamEventsPage
        business={makeBusiness<EventsProps["business"]>({
          _sp: { sections: { "events.cta": { hidden: true } } },
        })}
        events={[] as EventsProps["events"]}
        timeZone="America/Detroit"
      />,
    );
    expect(screen.queryByText("Want us at your event?")).toBeNull();
  });

  it("hides the closing button when it points at a disabled feature", () => {
    render(
      <DreamEventsPage
        business={makeBusiness<EventsProps["business"]>({
          "default.events.cta-button-link": "/donate",
        })}
        events={[] as EventsProps["events"]}
        timeZone="America/Detroit"
      />,
    );
    expect(screen.getByText("Want us at your event?")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Get in touch/ })).toBeNull();
  });
});

describe("DreamEventPage", () => {
  it("puts the event, its meta and a back link in the band", () => {
    const { container } = render(
      <DreamEventPage
        business={makeBusiness<EventProps["business"]>()}
        event={EVENT as unknown as EventProps["event"]}
        timeZone="America/Detroit"
        isPast
      />,
    );
    expectOneDreamH1("Spring Fair");
    const band = container.querySelector('[data-sp-group="events.hero"]');
    expect(band).toHaveTextContent("This event has passed");
    expect(band).toHaveTextContent("Eastern Market");
    expect(band).toContainElement(screen.getByRole("link", { name: "Events" }));
    expectOnContainer(container.querySelector('[data-sp-group="events.list"]'));
    expect(screen.getByText("Come say hi.")).toBeInTheDocument();
  });

  it("skips the body for a date-only event", () => {
    const { container } = render(
      <DreamEventPage
        business={makeBusiness<EventProps["business"]>()}
        event={
          {
            ...EVENT,
            blurb: null,
            priceLabel: null,
            externalUrl: null,
          } as unknown as EventProps["event"]
        }
        timeZone="America/Detroit"
        isPast={false}
      />,
    );
    expect(container.querySelector('[data-sp-group="events.list"]')).toBeNull();
  });
});

describe("DreamVideosPage", () => {
  it("renders the band and the empty state", () => {
    const { container } = render(
      <DreamVideosPage
        business={makeBusiness<VideosProps["business"]>()}
        videos={[] as VideosProps["videos"]}
      />,
    );
    expectOneDreamH1("Videos");
    expect(screen.queryByText("Watch")).toBeNull();
    expectOnContainer(container.querySelector('[data-sp-group="videos.list"]'));
    expect(
      screen.getByRole("heading", { level: 2, name: "No videos yet" }),
    ).toBeInTheDocument();
  });
});

describe("DreamDonatePage", () => {
  it("falls back to the donation label and the not-set-up state", () => {
    render(
      <DreamDonatePage business={makeBusiness<DonateProps["business"]>()} />,
    );
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(
      screen.getByRole("heading", { level: 2, name: /aren't set up yet/ }),
    ).toBeInTheDocument();
  });

  it("renders the dream form (never inside a reveal) when Stripe can charge", () => {
    const { container } = render(
      <DreamDonatePage
        business={
          {
            ...makeBusiness<object>(),
            isStripeConnected: true,
            stripeChargesEnabled: true,
          } as unknown as DonateProps["business"]
        }
        status="success"
      />,
    );
    const form = container.querySelector("form");
    expect(form).not.toBeNull();
    expect(form!.closest(".dream-reveal")).toBeNull();
    expect(form).toHaveClass("dream-card");
    expect(form!.querySelectorAll("input.dream-input").length).toBeGreaterThan(
      0,
    );
    expect(form!.querySelector("button[type=submit]")).toHaveClass("dream-btn");
    expect(screen.getAllByRole("radio").length).toBeGreaterThan(0);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Thank you for your support!",
    );
  });
});

describe("DreamFaqPage", () => {
  it("wraps band + questions in the faq.page group", () => {
    const { container } = render(
      <DreamFaqPage
        business={makeBusiness<FaqProps["business"]>()}
        items={
          [
            { id: "q1", question: "Do you deliver?", answer: "Yes." },
          ] as unknown as FaqProps["items"]
        }
      />,
    );
    expectOneDreamH1("Frequently Asked Questions");
    const group = container.querySelector('[data-sp-group="faq.page"]');
    expect(group).toContainElement(screen.getByText("Do you deliver?"));
    expect(container.querySelector("details summary")).toHaveTextContent(
      "Do you deliver?",
    );
  });

  it("shows the designed empty state with no items", () => {
    render(
      <DreamFaqPage
        business={makeBusiness<FaqProps["business"]>()}
        items={[] as unknown as FaqProps["items"]}
      />,
    );
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "No FAQ items available yet. Check back soon.",
      }),
    ).toBeInTheDocument();
  });
});
