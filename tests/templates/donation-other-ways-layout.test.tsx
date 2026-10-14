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

// `single` centers a lone card; `pair` lays two cards side by side. Wealth's
// wrapping flex row only needs a centering modifier for the single case.
const COMPONENTS = [
  {
    name: "DefaultDonateOtherWays",
    Component: DefaultDonateOtherWays,
    single: "mx-auto",
    pair: "sm:grid-cols-2",
  },
  {
    name: "PinkDonateOtherWays",
    Component: PinkDonateOtherWays,
    single: "mx-auto",
    pair: "sm:grid-cols-2",
  },
  {
    name: "WealthDonateOtherWays",
    Component: WealthDonateOtherWays,
    single: "wealth-donate-ways--single",
    pair: null,
  },
];

describe.each(COMPONENTS)(
  "$name layout behavior",
  ({ Component, single, pair }) => {
    it("with a single handle, renders the centered single layout", () => {
      const { container } = render(<Component handles={[VENMO]} />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).not.toBeNull();
      expect(wrapper.className).toContain(single);
      if (pair) expect(wrapper.className).not.toContain(pair);
    });

    it("with two handles, renders the side-by-side layout", () => {
      const { container } = render(<Component handles={[VENMO, CASHAPP]} />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).not.toBeNull();
      if (pair) expect(wrapper.className).toContain(pair);
      expect(wrapper.className).not.toContain(single);
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
  },
);
