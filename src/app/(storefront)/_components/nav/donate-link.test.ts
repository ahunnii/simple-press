import { describe, expect, it } from "vitest";

import type { NavItem } from "./resolve-nav";

import { donateLinkOptions, withDonateLink } from "./donate-link";

const OPTS = { show: true, label: "Donate" };

describe("withDonateLink", () => {
  it("appends /donate as the last top-level item when missing", () => {
    const items: NavItem[] = [
      { href: "/shop", label: "Shop" },
      { href: "/contact", label: "Contact" },
    ];
    expect(withDonateLink(items, OPTS)).toEqual([
      ...items,
      { href: "/donate", label: "Donate" },
    ]);
  });

  it("uses the supplied label", () => {
    expect(withDonateLink([], { show: true, label: "Give" })).toEqual([
      { href: "/donate", label: "Give" },
    ]);
  });

  it("is a no-op when the switch is off (never removes or adds)", () => {
    const items: NavItem[] = [{ href: "/donate", label: "Support us" }];
    expect(withDonateLink(items, { ...OPTS, show: false })).toBe(items);
    expect(withDonateLink([], { ...OPTS, show: false })).toEqual([]);
  });

  it("does not duplicate a top-level /donate", () => {
    const items: NavItem[] = [
      { href: "/donate", label: "Donate" },
      { href: "/contact", label: "Contact" },
    ];
    expect(withDonateLink(items, OPTS)).toBe(items);
  });

  it("does not duplicate a /donate nested in a dropdown", () => {
    const items: NavItem[] = [
      {
        href: "",
        label: "Community",
        children: [{ href: "/donate", label: "Give" }],
      },
    ];
    expect(withDonateLink(items, OPTS)).toBe(items);
  });

  it("leaves the starter menu order alone when Donate is already present", () => {
    const items: NavItem[] = [
      { href: "/shop", label: "Shop" },
      { href: "/donate", label: "Donate" },
      { href: "/contact", label: "Contact" },
    ];
    expect(withDonateLink(items, OPTS).map((i) => i.href)).toEqual([
      "/shop",
      "/donate",
      "/contact",
    ]);
  });

  it("does not mutate the input", () => {
    const items: NavItem[] = [{ href: "/shop", label: "Shop" }];
    withDonateLink(items, OPTS);
    expect(items).toHaveLength(1);
  });
});

describe("donateLinkOptions", () => {
  const on = () => true;
  const off = () => false;
  const business = {
    donationShowInHeader: true,
    donationShowInFooter: false,
    donationLabel: null,
  };

  it("reads the header switch for the header placement", () => {
    expect(donateLinkOptions(business, on, "header")).toEqual({
      show: true,
      label: "Donate",
    });
  });

  it("reads the footer switch for the footer placement", () => {
    expect(donateLinkOptions(business, on, "footer").show).toBe(false);
    expect(
      donateLinkOptions(
        { ...business, donationShowInFooter: true },
        on,
        "footer",
      ).show,
    ).toBe(true);
  });

  it("is hidden when the donations flag is off", () => {
    expect(donateLinkOptions(business, off, "header").show).toBe(false);
  });

  it("is hidden for a null/undefined business, with the default label", () => {
    expect(donateLinkOptions(null, on, "header")).toEqual({
      show: false,
      label: "Donate",
    });
    expect(donateLinkOptions(undefined, on, "footer").show).toBe(false);
  });

  it("uses the owner's chosen wording", () => {
    expect(
      donateLinkOptions({ ...business, donationLabel: "tip" }, on, "header")
        .label,
    ).toBe("Tip");
  });
});
