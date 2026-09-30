import type { ComponentProps } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { VII_BAND_PADDING_TOP } from "../shared/vii-page-edge";
import { ViiEventPage } from "./vii-event-page";
import { ViiEventsPage } from "./vii-events-page";

type IndexProps = ComponentProps<typeof ViiEventsPage>;
type DetailProps = ComponentProps<typeof ViiEventPage>;

function makeBusiness(customFields: Record<string, unknown> = {}) {
  return {
    name: "Test Store",
    siteContent: { customFields, logoUrl: null },
  } as unknown as IndexProps["business"];
}

const EVENT = {
  id: "e1",
  slug: "spring-fair",
  name: "Spring Fair",
  startAt: new Date("2030-04-12T15:00:00Z"),
  endAt: null,
  allDay: false,
  location: "Eastern Market, Detroit",
  blurb: "Come say hi.",
  priceLabel: "Free",
  externalUrl: "https://example.com/tickets",
  externalUrlLabel: "",
  coverImage: null,
  coverVideo: null,
  linkQrEnabled: false,
};

describe("ViiEventsPage", () => {
  it("puts Default's copy in the generic band, clear of the fixed header", () => {
    const { container } = render(
      <ViiEventsPage
        business={makeBusiness()}
        events={[] as IndexProps["events"]}
        timeZone="America/Detroit"
      />,
    );
    const h1s = screen.getAllByRole("heading", { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent("Events");

    const band = container.querySelector('[data-sp-group="events.hero"]');
    expect(band).not.toBeNull();
    expect(band).toContainElement(screen.getByText("What's on"));
    // On the page gutter (the hero's left edge). The top padding
    // (`VII_BAND_PADDING_TOP`, header offset + air) is a calc() jsdom's
    // CSSOM drops, so it's asserted on the constant instead.
    expect((band as HTMLElement).style.paddingLeft).toBe(
      "var(--vii-section-pad-x)",
    );
    expect(VII_BAND_PADDING_TOP).toContain("var(--vii-header-offset)");

    // Designed empty state + the closing band with vii's button.
    expect(
      screen.getByRole("heading", { level: 2, name: "No upcoming events" }),
    ).toBeInTheDocument();
    const cta = screen.getByRole("link", { name: /Get in touch/ });
    expect(cta).toHaveAttribute("href", "/contact");
    expect(cta).toHaveClass("vii-cta-btn");
    expect(container.innerHTML).not.toContain("#0a0a0a");
  });

  it("renders an event row with the fallback link label", () => {
    render(
      <ViiEventsPage
        business={makeBusiness()}
        events={[EVENT] as unknown as IndexProps["events"]}
        timeZone="America/Detroit"
      />,
    );
    expect(screen.getByRole("link", { name: "Spring Fair" })).toHaveAttribute(
      "href",
      "/events/spring-fair",
    );
    const external = screen.getByRole("link", { name: /More details/ });
    expect(external).toHaveAttribute("target", "_blank");
    expect(screen.getByText("Free")).toBeInTheDocument();
  });

  it("hides the closing band when events.cta is hidden", () => {
    render(
      <ViiEventsPage
        business={makeBusiness({
          _sp: { sections: { "events.cta": { hidden: true } } },
        })}
        events={[] as IndexProps["events"]}
        timeZone="America/Detroit"
      />,
    );
    expect(screen.queryByText("Want us at your event?")).toBeNull();
  });

  it("hides the closing button when its link points at a disabled feature", () => {
    // `donations` is off by default, so an owner-set /donate link is gated
    // (B2.5); the band itself stays.
    render(
      <ViiEventsPage
        business={makeBusiness({
          "default.events.cta-button-link": "/donate",
        })}
        events={[] as IndexProps["events"]}
        timeZone="America/Detroit"
      />,
    );
    expect(screen.getByText("Want us at your event?")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Get in touch/ })).toBeNull();
  });
});

describe("ViiEventPage", () => {
  it("puts the event name in the band with a back link and meta", () => {
    const { container } = render(
      <ViiEventPage
        business={makeBusiness() as unknown as DetailProps["business"]}
        event={EVENT as unknown as DetailProps["event"]}
        timeZone="America/Detroit"
        isPast
      />,
    );
    const h1s = screen.getAllByRole("heading", { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent("Spring Fair");
    const band = container.querySelector('[data-sp-group="events.hero"]');
    expect(band).toContainElement(
      screen.getByRole("link", { name: "All events" }),
    );
    expect(band).toHaveTextContent("Eastern Market, Detroit");
    expect(band).toHaveTextContent("This event has passed");
    expect(screen.getByText("Come say hi.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /More details/ })).toHaveClass(
      "vii-cta-btn",
    );
  });

  it("skips the body when the event has nothing beyond date + location", () => {
    const { container } = render(
      <ViiEventPage
        business={makeBusiness() as unknown as DetailProps["business"]}
        event={
          {
            ...EVENT,
            blurb: null,
            priceLabel: null,
            externalUrl: null,
          } as unknown as DetailProps["event"]
        }
        timeZone="America/Detroit"
        isPast={false}
      />,
    );
    expect(container.querySelectorAll("section")).toHaveLength(1);
  });
});
