import type { ComponentProps } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BAMBOO_TOP_MARKER } from "../shared/bamboo-emblem-clearance";
import { BambooEventPage } from "./bamboo-event-page";
import { BambooEventsPage } from "./bamboo-events-page";

type IndexProps = ComponentProps<typeof BambooEventsPage>;
type DetailProps = ComponentProps<typeof BambooEventPage>;

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

describe("BambooEventsPage", () => {
  it("renders the Default copy in the marked page-hero band", () => {
    const { container } = render(
      <BambooEventsPage
        business={makeBusiness()}
        events={[] as IndexProps["events"]}
        timeZone="America/Detroit"
      />,
    );
    const h1s = screen.getAllByRole("heading", { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent("Events");
    expect(screen.getByText("What's on")).toBeInTheDocument();
    expect(container.querySelectorAll(`.${BAMBOO_TOP_MARKER}`)).toHaveLength(1);
    expect(container.querySelector("section")).toHaveClass(BAMBOO_TOP_MARKER);
    // Designed empty state + the closing band.
    expect(
      screen.getByRole("heading", { level: 2, name: "No upcoming events" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Get in touch/ })).toHaveAttribute(
      "href",
      "/contact",
    );
  });

  it("renders an event card with the fallback link label as a forest pill", () => {
    render(
      <BambooEventsPage
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
    expect(external).toHaveClass("rounded-full", "bg-[var(--bam-forest)]");
    expect(screen.getByText("Free")).toBeInTheDocument();
  });

  it("hides the closing band when events.cta is hidden", () => {
    render(
      <BambooEventsPage
        business={makeBusiness({
          _sp: { sections: { "events.cta": { hidden: true } } },
        })}
        events={[] as IndexProps["events"]}
        timeZone="America/Detroit"
      />,
    );
    expect(screen.queryByText("Want us at your event?")).toBeNull();
  });
});

describe("BambooEventPage", () => {
  it("puts the event name in the marked band with a back link and meta", () => {
    const { container } = render(
      <BambooEventPage
        business={makeBusiness() as unknown as DetailProps["business"]}
        event={EVENT as unknown as DetailProps["event"]}
        timeZone="America/Detroit"
        isPast
      />,
    );
    const h1s = screen.getAllByRole("heading", { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent("Spring Fair");
    expect(container.querySelectorAll(`.${BAMBOO_TOP_MARKER}`)).toHaveLength(1);
    const band = container.querySelector("section");
    expect(band).toHaveClass(BAMBOO_TOP_MARKER);
    expect(band).toContainElement(
      screen.getByRole("link", { name: "All events" }),
    );
    expect(band).toHaveTextContent("Eastern Market, Detroit");
    expect(band).toHaveTextContent("This event has passed");
    expect(screen.getByText("Come say hi.")).toBeInTheDocument();
  });

  it("skips the body when the event has nothing beyond date + location", () => {
    const { container } = render(
      <BambooEventPage
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
