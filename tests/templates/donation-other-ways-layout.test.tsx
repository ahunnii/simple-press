import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { ResolvedDonationHandle } from "~/lib/donation-handles";
import { DefaultDonateOtherWays } from "~/app/(storefront)/_templates/default/donate/default-donate-other-ways";
import { PinkDonateOtherWays } from "~/app/(storefront)/_templates/pink/donate/pink-donate-other-ways";
import { WealthDonateOtherWays } from "~/app/(storefront)/_templates/wealth/donate/wealth-donate-other-ways";

const VENMO: ResolvedDonationHandle = {
  key: "venmo",
  label: "Venmo",
  displayHandle: "@teststore",
  url: "https://venmo.com/teststore",
};

const CASHAPP: ResolvedDonationHandle = {
  key: "cashapp",
  label: "Cash App",
  displayHandle: "$teststore",
  url: "https://cash.app/$teststore",
};

const COMPONENTS = [
  { name: "DefaultDonateOtherWays", Component: DefaultDonateOtherWays },
  { name: "PinkDonateOtherWays", Component: PinkDonateOtherWays },
  { name: "WealthDonateOtherWays", Component: WealthDonateOtherWays },
];

describe.each(COMPONENTS)("$name layout behavior", ({ Component }) => {
  it("with a single handle, renders mx-auto and does not render sm:grid-cols-2", () => {
    const { container } = render(<Component handles={[VENMO]} />);

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).not.toBeNull();
    expect(wrapper.className).toContain("mx-auto");
    expect(wrapper.className).not.toContain("sm:grid-cols-2");
  });

  it("with two handles, renders sm:grid-cols-2 and does not render mx-auto", () => {
    const { container } = render(<Component handles={[VENMO, CASHAPP]} />);

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).not.toBeNull();
    expect(wrapper.className).toContain("sm:grid-cols-2");
    expect(wrapper.className).not.toContain("mx-auto");
  });

  it("with a single handle, renders exactly two SVGs (icon + QR code)", () => {
    const { container } = render(<Component handles={[VENMO]} />);

    const svgs = container.querySelectorAll("svg");
    expect(svgs.length).toBe(2);
  });

  it("with two handles, renders exactly four SVGs (icon + QR code per handle)", () => {
    const { container } = render(<Component handles={[VENMO, CASHAPP]} />);

    const svgs = container.querySelectorAll("svg");
    expect(svgs.length).toBe(4);
  });
});
