import type { ComponentProps } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { NoiseDonatePage } from "../donate/noise-donate-page";
import { noiseEventsData } from "../events";
import { NoiseEventPage } from "../events/noise-event-page";
import { NoiseEventsPage } from "../events/noise-events-page";
import { NoiseFaqPage } from "../faq/noise-faq-page";
import { NoiseGenericPage as NoiseGenericPageReexport } from "../noise-generic-page";
import {
  noiseServicesData,
  noiseServicesFieldGroups,
  noiseServicesSections,
} from "../services";
import { NoiseServicesIndexPage } from "../services/noise-services-index-page";
import { noiseServiceTemplateDefs } from "../services/service-pages/fields";
import { NoiseServicePage } from "../services/service-pages/noise-service-page";
import { noiseVideosData } from "../videos";
import { NoiseVideosPage } from "../videos/noise-videos-page";
import { NoiseGenericPage } from "./noise-generic-page";
import { NOISE_BODY_WIDTH } from "./noise-page-shell";

// TiptapRenderer's module graph reaches the Prisma client (encryption keys
// are unavailable under happy-dom); the pages only need it to render.
vi.mock("~/components/tiptap-renderer", () => ({
  TiptapRenderer: () => null,
}));

/**
 * Smoke + contract tests for the pages on noise's generic base (parity TP5:
 * PF12, PF13, PF14). Each page: one italic-serif h1 in the centred title
 * band, content in the shared body container, the designed empty state, the
 * editor hotspots it declares, and flag-gated closing buttons.
 */

type EventsProps = ComponentProps<typeof NoiseEventsPage>;
type EventProps = ComponentProps<typeof NoiseEventPage>;
type VideosProps = ComponentProps<typeof NoiseVideosPage>;
type DonateProps = ComponentProps<typeof NoiseDonatePage>;
type FaqProps = ComponentProps<typeof NoiseFaqPage>;
type ServicesProps = ComponentProps<typeof NoiseServicesIndexPage>;
type ServiceProps = ComponentProps<typeof NoiseServicePage>;
type GenericProps = ComponentProps<typeof NoiseGenericPage>;

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

/** The body section's inner container carries one of the shell widths. */
function expectBodyWidth(
  section: Element | null,
  width: keyof typeof NOISE_BODY_WIDTH,
) {
  expect(section).not.toBeNull();
  const inner = section!.firstElementChild as HTMLElement;
  expect(inner.className).toBe(NOISE_BODY_WIDTH[width]);
}

/** One h1, in noise's italic Cormorant display face. */
function expectOneNoiseH1(text: string) {
  const h1s = screen.getAllByRole("heading", { level: 1 });
  expect(h1s).toHaveLength(1);
  expect(h1s[0]).toHaveTextContent(text);
  expect(h1s[0]).toHaveClass("font-serif", "italic");
}

describe("noise optional pages — registry", () => {
  it("keeps the eyebrow keys (they render as the band's mono overline)", () => {
    const keys = [...noiseEventsData, ...noiseVideosData].map((f) => f.key);
    expect(keys).toContain("default.events.hero-eyebrow");
    expect(keys).toContain("default.videos.hero-eyebrow");
    expect(keys).toContain("default.events.hero-heading");
  });

  it("services groups triple-match their sections", () => {
    const fieldGroups = new Set(noiseServicesData.map((f) => f.group));
    const groupIds = new Set(noiseServicesFieldGroups.map((g) => g.id));
    for (const section of noiseServicesSections) {
      expect(fieldGroups.has(section.id)).toBe(true);
      expect(groupIds.has(section.id)).toBe(true);
    }
    for (const field of noiseServicesData) {
      expect(field.key.startsWith("noise.services.")).toBe(true);
    }
  });

  it("declares one noise service variant", () => {
    expect(noiseServiceTemplateDefs.map((d) => d.id)).toEqual([
      "noise-service",
    ]);
  });
});

describe("NoiseEventsPage", () => {
  it("renders the band, the designed empty state and the closing band", () => {
    const { container } = render(
      <NoiseEventsPage
        business={makeBusiness<EventsProps["business"]>()}
        events={[] as EventsProps["events"]}
        timeZone="America/Detroit"
      />,
    );
    expectOneNoiseH1("Events");
    const band = container.querySelector('[data-sp-group="events.hero"]');
    expect(band).toHaveTextContent("What's on");
    expectBodyWidth(
      container.querySelector('[data-sp-group="events.list"]'),
      "wide",
    );
    expect(
      screen.getByRole("heading", { level: 2, name: "No upcoming events" }),
    ).toBeInTheDocument();
    const cta = screen.getByRole("link", { name: /Get in touch/ });
    expect(cta).toHaveAttribute("href", "/contact");
    expect(container.innerHTML).not.toContain("#0a0a0a");
    expect(container.innerHTML).not.toContain("#e8e8e8");
  });

  it("renders an event row with the date tile and fallback link label", () => {
    const { container } = render(
      <NoiseEventsPage
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
    // No media → the hatched date tile (Apr 12 in Detroit).
    expect(container.textContent).toContain("Apr");
    expect(container.textContent).toContain("12");
  });

  it("hides the closing band when events.cta is hidden", () => {
    render(
      <NoiseEventsPage
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
      <NoiseEventsPage
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

describe("NoiseEventPage", () => {
  it("puts the event in the band with a back link and meta", () => {
    const { container } = render(
      <NoiseEventPage
        business={makeBusiness<EventProps["business"]>()}
        event={EVENT as unknown as EventProps["event"]}
        timeZone="America/Detroit"
        isPast
      />,
    );
    expectOneNoiseH1("Spring Fair");
    const band = container.querySelector('[data-sp-group="events.hero"]');
    expect(band).toContainElement(
      screen.getByRole("link", { name: /All events/ }),
    );
    expect(band).toHaveTextContent("This event has passed");
    expect(band).toHaveTextContent("Eastern Market");
    expect(screen.getByText("Come say hi.")).toBeInTheDocument();
    expectBodyWidth(
      container.querySelector('[data-sp-group="events.list"]'),
      "measure",
    );
  });
});

describe("NoiseVideosPage", () => {
  it("renders the band and the empty state", () => {
    const { container } = render(
      <NoiseVideosPage
        business={makeBusiness<VideosProps["business"]>()}
        videos={[] as VideosProps["videos"]}
      />,
    );
    expectOneNoiseH1("Videos");
    expectBodyWidth(
      container.querySelector('[data-sp-group="videos.list"]'),
      "wide",
    );
    expect(
      screen.getByRole("heading", { level: 2, name: "No videos yet" }),
    ).toBeInTheDocument();
  });
});

describe("NoiseDonatePage", () => {
  it("falls back to the donation label and the not-set-up state", () => {
    render(
      <NoiseDonatePage business={makeBusiness<DonateProps["business"]>()} />,
    );
    expectOneNoiseH1("Donate");
    expect(
      screen.getByRole("heading", { level: 2, name: /aren't set up yet/ }),
    ).toBeInTheDocument();
  });

  it("renders the noise form and the thank-you notice when Stripe can charge", () => {
    const { container } = render(
      <NoiseDonatePage
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
    expect(form).toHaveClass("vn-contact-form");
    expect(screen.getByRole("status")).toHaveTextContent(
      "Thank you for your support!",
    );
    expect(screen.getByRole("button", { name: /Donate/ })).toHaveAttribute(
      "type",
      "submit",
    );
  });
});

describe("NoiseFaqPage", () => {
  it("wraps band + accordion in the faq.page group", () => {
    const { container } = render(
      <NoiseFaqPage
        business={makeBusiness<FaqProps["business"]>()}
        items={
          [
            { id: "q1", question: "Do you do alterations?", answer: "Yes." },
          ] as unknown as FaqProps["items"]
        }
      />,
    );
    expectOneNoiseH1("Frequently Asked Questions");
    const group = container.querySelector('[data-sp-group="faq.page"]');
    expect(group).toContainElement(
      screen.getByRole("button", { name: "Do you do alterations?" }),
    );
    expect(
      screen.getByRole("heading", { level: 2, name: "Do you do alterations?" }),
    ).toBeInTheDocument();
  });

  it("shows the designed empty state with no questions", () => {
    render(
      <NoiseFaqPage
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

describe("NoiseServicesIndexPage", () => {
  it("renders the band, cards and the closing band", () => {
    const { container } = render(
      <NoiseServicesIndexPage
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
    expectOneNoiseH1("Services");
    expect(
      container.querySelector('[data-sp-group="services.hero"]'),
    ).toHaveTextContent("By appointment");
    expectBodyWidth(
      container.querySelector('[data-sp-group="services.list"]'),
      "wide",
    );
    expect(screen.getByRole("link", { name: "Fitting" })).toHaveAttribute(
      "href",
      "/services/fitting",
    );
    expect(screen.getByRole("link", { name: /Get in touch/ })).toHaveAttribute(
      "href",
      "/contact",
    );
  });

  it("shows the designed empty state and hides a blanked intro", () => {
    render(
      <NoiseServicesIndexPage
        business={makeBusiness<ServicesProps["business"]>({
          "noise.services.hero-intro": "",
        })}
        services={[] as unknown as ServicesProps["services"]}
      />,
    );
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Nothing on the books yet.",
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Time with us, one on one/)).toBeNull();
  });
});

describe("NoiseServicePage", () => {
  it("puts the service in the band with a back link", () => {
    render(
      <NoiseServicePage
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
    expectOneNoiseH1("Fitting");
    expect(screen.getByRole("link", { name: /All services/ })).toHaveAttribute(
      "href",
      "/services",
    );
    expect(
      screen.getByText("One hour in the fitting room."),
    ).toBeInTheDocument();
  });
});

describe("NoiseGenericPage (PF14)", () => {
  it("is re-exported from the registry path", () => {
    expect(NoiseGenericPageReexport).toBe(NoiseGenericPage);
  });

  it("puts the body in the centred 3xl measure under the title band", () => {
    const { container } = render(
      <NoiseGenericPage
        page={
          {
            title: "Privacy policy",
            excerpt: "How we handle your data.",
            image: null,
            content: { type: "doc", content: [] },
            type: "policy",
            slug: "privacy-policy",
            updatedAt: new Date("2030-01-01T12:00:00Z"),
          } as unknown as GenericProps["page"]
        }
      />,
    );
    expectOneNoiseH1("Privacy policy");
    expect(screen.getByText("Legal")).toBeInTheDocument();
    // No band "Last updated" line — the standard policy bodies carry their own.
    expect(container.textContent).not.toContain("Last updated");
    const body = container.querySelector(
      'section[aria-label="Privacy policy"]',
    );
    expectBodyWidth(body, "measure");
    expect(NOISE_BODY_WIDTH.measure).toContain("max-w-3xl");
    expect(NOISE_BODY_WIDTH.measure).toContain("mx-auto");
  });
});
