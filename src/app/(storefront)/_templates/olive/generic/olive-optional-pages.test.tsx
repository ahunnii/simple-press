import type { ComponentProps } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { OliveDonatePage } from "../donate/olive-donate-page";
import { oliveEventsData } from "../events";
import { OliveEventPage } from "../events/olive-event-page";
import { OliveEventsPage } from "../events/olive-events-page";
import { OliveFaqPage } from "../faq/olive-faq-page";
import { oliveServicesData, oliveServicesSections } from "../services";
import { OliveServicesIndexPage } from "../services/olive-services-index-page";
import { OliveServicePage } from "../services/service-pages/olive-service-page";
import { oliveVideosData } from "../videos";
import { OliveVideosPage } from "../videos/olive-videos-page";
import { OliveGenericPage } from "./olive-generic-page";
import { OLIVE_PAGE_EDGE_MAX } from "./olive-page-section";

// TiptapRenderer's module graph reaches the Prisma client (encryption keys
// are unavailable under happy-dom); the pages only need it to render.
vi.mock("~/components/tiptap-renderer", () => ({
  TiptapRenderer: () => null,
}));

/**
 * Smoke + contract tests for the pages on olive's generic base (parity
 * TP5: PF10, PF11, PF12). Each page: one h1 in the olive title band,
 * Josefin type classes (`olive-h1`), content on the shared page edge, the
 * designed empty state, and the editor hotspots it declares.
 */

type EventsProps = ComponentProps<typeof OliveEventsPage>;
type EventProps = ComponentProps<typeof OliveEventPage>;
type VideosProps = ComponentProps<typeof OliveVideosPage>;
type DonateProps = ComponentProps<typeof OliveDonatePage>;
type FaqProps = ComponentProps<typeof OliveFaqPage>;
type ServicesProps = ComponentProps<typeof OliveServicesIndexPage>;
type ServiceProps = ComponentProps<typeof OliveServicePage>;
type GenericProps = ComponentProps<typeof OliveGenericPage>;

function makeBusiness<T>(customFields: Record<string, unknown> = {}): T {
  return {
    name: "Test Store",
    donationLabel: null,
    isStripeConnected: false,
    stripeChargesEnabled: false,
    donationPresetAmounts: null,
    siteContent: { customFields, logoUrl: null },
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

/** The inner container of an `OlivePageSection` sits on the page edge. */
function expectOnPageEdge(section: Element | null) {
  expect(section).not.toBeNull();
  const inner = section!.firstElementChild as HTMLElement;
  expect(inner.style.maxWidth).toBe(OLIVE_PAGE_EDGE_MAX);
}

function expectOneOliveH1(text: string) {
  const h1s = screen.getAllByRole("heading", { level: 1 });
  expect(h1s).toHaveLength(1);
  expect(h1s[0]).toHaveTextContent(text);
  expect(h1s[0]).toHaveClass("olive-h1");
}

describe("olive optional pages — registry", () => {
  it("omits the eyebrow keys olive never renders", () => {
    const keys = [...oliveEventsData, ...oliveVideosData].map((f) => f.key);
    expect(keys).not.toContain("default.events.hero-eyebrow");
    expect(keys).not.toContain("default.videos.hero-eyebrow");
    expect(keys).toContain("default.events.hero-heading");
  });

  it("services groups triple-match their sections", () => {
    const groups = new Set(oliveServicesData.map((f) => f.group));
    for (const section of oliveServicesSections) {
      expect(groups.has(section.id)).toBe(true);
    }
  });
});

describe("OliveEventsPage", () => {
  it("renders the band, the designed empty state and the closing band", () => {
    const { container } = render(
      <OliveEventsPage
        business={makeBusiness<EventsProps["business"]>()}
        events={[] as EventsProps["events"]}
        timeZone="America/Detroit"
      />,
    );
    expectOneOliveH1("Events");
    expect(screen.queryByText("What's on")).toBeNull();
    expectOnPageEdge(container.querySelector('[data-sp-group="events.hero"]'));
    expectOnPageEdge(container.querySelector('[data-sp-group="events.list"]'));
    expect(
      screen.getByRole("heading", { level: 2, name: "No upcoming events" }),
    ).toBeInTheDocument();
    expect(container.querySelector(".olive-ghost-card")).not.toBeNull();
    const cta = screen.getByRole("link", { name: /Get in touch/ });
    expect(cta).toHaveAttribute("href", "/contact");
    expect(cta).toHaveClass("olive-btn-primary");
    expect(container.innerHTML).not.toContain("#0a0a0a");
  });

  it("renders an event card with the date tile and fallback link label", () => {
    const { container } = render(
      <OliveEventsPage
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
    // No media → the paper date tile (Apr 12 in Detroit).
    expect(container.textContent).toContain("Apr");
    expect(container.textContent).toContain("12");
  });

  it("hides the closing band when events.cta is hidden", () => {
    render(
      <OliveEventsPage
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
      <OliveEventsPage
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

describe("OliveEventPage", () => {
  it("puts the event in the band with a breadcrumb and meta", () => {
    const { container } = render(
      <OliveEventPage
        business={makeBusiness<EventProps["business"]>()}
        event={EVENT as unknown as EventProps["event"]}
        timeZone="America/Detroit"
        isPast
      />,
    );
    expectOneOliveH1("Spring Fair");
    const band = container.querySelector('[data-sp-group="events.hero"]');
    expect(band).toContainElement(screen.getByRole("link", { name: "Events" }));
    expect(band).toHaveTextContent("This event has passed");
    expect(band).toHaveTextContent("Eastern Market");
    expect(screen.getByText("Come say hi.")).toBeInTheDocument();
  });
});

describe("OliveVideosPage", () => {
  it("renders the band and the empty state", () => {
    const { container } = render(
      <OliveVideosPage
        business={makeBusiness<VideosProps["business"]>()}
        videos={[] as VideosProps["videos"]}
      />,
    );
    expectOneOliveH1("Videos");
    expectOnPageEdge(container.querySelector('[data-sp-group="videos.list"]'));
    expect(
      screen.getByRole("heading", { level: 2, name: "No videos yet" }),
    ).toBeInTheDocument();
  });
});

describe("OliveDonatePage", () => {
  it("falls back to the donation label and the not-set-up state", () => {
    render(
      <OliveDonatePage business={makeBusiness<DonateProps["business"]>()} />,
    );
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(
      screen.getByRole("heading", { level: 2, name: /aren't set up yet/ }),
    ).toBeInTheDocument();
  });

  it("renders the form (never inside a reveal) when Stripe can charge", () => {
    const { container } = render(
      <OliveDonatePage
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
    expect(form!.closest(".olive-reveal")).toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Thank you for your support!",
    );
  });
});

describe("OliveFaqPage", () => {
  it("wraps band + accordion in the faq.page group", () => {
    const { container } = render(
      <OliveFaqPage
        business={makeBusiness<FaqProps["business"]>()}
        items={
          [
            { id: "q1", question: "Do you do alterations?", answer: "Yes." },
          ] as unknown as FaqProps["items"]
        }
      />,
    );
    expectOneOliveH1("Frequently Asked Questions");
    const group = container.querySelector('[data-sp-group="faq.page"]');
    expect(group).toContainElement(
      screen.getByRole("button", { name: "Do you do alterations?" }),
    );
    expect(
      screen.getByRole("heading", { level: 2, name: "Do you do alterations?" }),
    ).toBeInTheDocument();
  });
});

describe("OliveServicesIndexPage", () => {
  it("renders the band, cards and the closing band", () => {
    const { container } = render(
      <OliveServicesIndexPage
        business={makeBusiness<ServicesProps["business"]>()}
        services={
          [
            {
              id: "s1",
              slug: "fitting",
              name: "Fitting",
              description: "One hour in the fitting room.",
              image: null,
            },
          ] as unknown as ServicesProps["services"]
        }
      />,
    );
    expectOneOliveH1("Services");
    expectOnPageEdge(
      container.querySelector('[data-sp-group="services.list"]'),
    );
    expect(screen.getByRole("link", { name: "Fitting" })).toHaveAttribute(
      "href",
      "/services/fitting",
    );
  });
});

describe("OliveServicePage", () => {
  it("puts the service in the band with a breadcrumb", () => {
    render(
      <OliveServicePage
        business={makeBusiness<ServiceProps["business"]>()}
        service={
          {
            id: "s1",
            slug: "fitting",
            name: "Fitting",
            description: "One hour in the fitting room.",
            image: null,
            customFields: {},
          } as unknown as ServiceProps["service"]
        }
        items={[] as ServiceProps["items"]}
        embedsEnabled={false}
      />,
    );
    expectOneOliveH1("Fitting");
    expect(screen.getByRole("link", { name: "Services" })).toHaveAttribute(
      "href",
      "/services",
    );
  });
});

describe("OliveGenericPage (PF12)", () => {
  it("puts the cover title card on the page edge, not in the photo corner", () => {
    const { container } = render(
      <OliveGenericPage
        page={
          {
            title: "Our story",
            excerpt: "How we started.",
            image: "/uploads/cover.jpg",
            content: { type: "doc", content: [] },
            type: "page",
            slug: "our-story",
            updatedAt: new Date("2030-01-01"),
          } as unknown as GenericProps["page"]
        }
      />,
    );
    expectOneOliveH1("Our story");
    const card = container.querySelector(".olive-card");
    const edge = card!.parentElement!;
    expect(edge.style.maxWidth).toBe(OLIVE_PAGE_EDGE_MAX);
    expect(edge.className).toContain("mx-auto");
  });
});
