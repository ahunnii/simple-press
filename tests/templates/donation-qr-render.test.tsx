import { render } from "@testing-library/react";
import { encode } from "uqr";
import { describe, expect, it } from "vitest";

import { BrandedQrCode } from "~/components/shared/branded-qr-code";

const VALUE = "https://venmo.com/u/test-store";
const LOGO_URL = "https://cdn.example.com/logo.png";

describe("BrandedQrCode", () => {
  it("renders a plain QR code with no logo overlay when logoUrl is absent", () => {
    const { container } = render(<BrandedQrCode value={VALUE} />);

    expect(container.querySelector("image")).toBeNull();
    // The knockout is the only rect the component draws; the QR modules
    // themselves are paths.
    expect(container.querySelector("rect")).toBeNull();
  });

  it("renders the logo over a white knockout when logoUrl is provided", () => {
    const { container } = render(
      <BrandedQrCode value={VALUE} logoUrl={LOGO_URL} />,
    );

    const image = container.querySelector("image");
    expect(image).not.toBeNull();
    expect(image?.getAttribute("href")).toBe(LOGO_URL);

    const rect = container.querySelector("rect");
    expect(rect).not.toBeNull();
    expect(rect?.getAttribute("fill")).toBe("white");
  });

  it.each([
    ["without a logo", undefined, "M" as const],
    ["with a logo", LOGO_URL, "H" as const],
  ])(
    "sizes the view box to the encoded matrix %s",
    (_name, logoUrl, expectedEcc) => {
      // Derived from uqr rather than hard-coded so the assertion survives a
      // shift in version selection. `border: 4`/`ecc` must match the component.
      const { size } = encode(VALUE, { ecc: expectedEcc, border: 4 });

      const { container } = render(
        <BrandedQrCode value={VALUE} logoUrl={logoUrl} />,
      );

      const svg = container.querySelector("svg");
      expect(svg?.getAttribute("viewBox")).toBe(`0 0 ${size} ${size}`);
    },
  );
});
