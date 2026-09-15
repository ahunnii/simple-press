import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EventLinkQr } from "~/app/(storefront)/_components/events/event-link-qr";

const EXTERNAL_URL = "https://example.com/event";
const LOGO_URL = "https://cdn.example.com/logo.png";

describe("EventLinkQr", () => {
  it("renders nothing when linkQrEnabled is false, even with a URL", () => {
    const { container } = render(
      <EventLinkQr
        event={{ externalUrl: EXTERNAL_URL, linkQrEnabled: false }}
        size="sm"
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when externalUrl is null, even with the flag on", () => {
    const { container } = render(
      <EventLinkQr
        event={{ externalUrl: null, linkQrEnabled: true }}
        size="sm"
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it("renders a figure with an SVG and default caption when both linkQrEnabled and externalUrl are set", () => {
    const { container } = render(
      <EventLinkQr
        event={{ externalUrl: EXTERNAL_URL, linkQrEnabled: true }}
        size="sm"
      />,
    );

    const figure = container.querySelector("figure");
    expect(figure).not.toBeNull();

    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();

    const figcaption = container.querySelector("figcaption");
    expect(figcaption).not.toBeNull();
    expect(figcaption?.textContent).toBe("Scan with your phone");
  });

  it("renders size-28 class on the SVG when size is sm", () => {
    const { container } = render(
      <EventLinkQr
        event={{ externalUrl: EXTERNAL_URL, linkQrEnabled: true }}
        size="sm"
      />,
    );

    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("class")).toContain("size-28");
  });

  it("renders size-40 class on the SVG when size is lg", () => {
    const { container } = render(
      <EventLinkQr
        event={{ externalUrl: EXTERNAL_URL, linkQrEnabled: true }}
        size="lg"
      />,
    );

    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("class")).toContain("size-40");
  });

  it("renders a custom caption when provided", () => {
    const { container } = render(
      <EventLinkQr
        event={{ externalUrl: EXTERNAL_URL, linkQrEnabled: true }}
        size="sm"
        caption={<span>Scan to open</span>}
      />,
    );

    const figcaption = container.querySelector("figcaption");
    expect(figcaption?.textContent).toBe("Scan to open");
    expect(figcaption?.textContent).not.toBe("Scan with your phone");
  });
});
