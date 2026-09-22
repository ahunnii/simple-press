import { describe, expect, it } from "vitest";

import type { BusinessBriefData } from "./business-brief";

import { formatBusinessBrief } from "./business-brief";

const BASE: BusinessBriefData = {
  name: "Bloom Apothecary",
  url: "https://bloomapothecary.com",
  location: "1400 Woodward Ave, Detroit, MI 48226",
  phone: "+1 313 555 0100",
  email: "hello@bloomapothecary.com",
  hours: "Mon–Wed 9:00 AM – 5:00 PM; Sun Closed",
  metaTitle: "Small-batch botanical skincare",
  metaDescription: null,
  products: ["Signature Candle — Citrus", "Body Oil"],
  services: ["Massage"],
  collections: ["Summer"],
  pages: ["About", "Privacy Policy"],
  faqs: [
    {
      question: "Do you ship nationwide?",
      answer: "Yes, within 3–5 days.",
    },
  ],
};

describe("formatBusinessBrief", () => {
  it("renders a compact public brief", () => {
    expect(formatBusinessBrief(BASE)).toBe(`# Bloom Apothecary
URL: https://bloomapothecary.com
Location: 1400 Woodward Ave, Detroit, MI 48226
Phone: +1 313 555 0100
Email: hello@bloomapothecary.com
Hours: Mon–Wed 9:00 AM – 5:00 PM; Sun Closed

## Site SEO
Title: Small-batch botanical skincare
Description: (not set)

## Products
- Signature Candle — Citrus
- Body Oil

## Services
- Massage

## Collections
- Summer

## Pages
- About
- Privacy Policy

## FAQs
Q: Do you ship nationwide?
A: Yes, within 3–5 days.
`);
  });

  it("marks blank SEO fields as not set and omits empty catalog sections", () => {
    const markdown = formatBusinessBrief({
      ...BASE,
      location: null,
      phone: null,
      email: null,
      hours: null,
      metaTitle: null,
      metaDescription: null,
      products: [],
      services: [],
      collections: [],
      pages: [],
      faqs: [],
    });

    expect(markdown).toBe(`# Bloom Apothecary
URL: https://bloomapothecary.com

## Site SEO
Title: (not set)
Description: (not set)
`);
    expect(markdown).not.toContain("## Products");
    expect(markdown).not.toContain("## FAQs");
    expect(markdown).not.toContain("Location:");
    expect(markdown).not.toContain("Hours:");
  });

  it("does not emit an owner login email", () => {
    const markdown = formatBusinessBrief({
      ...BASE,
      email: "hello@bloomapothecary.com",
    });
    expect(markdown).toContain("Email: hello@bloomapothecary.com");
    expect(markdown).not.toContain("owner-login@secret.test");
  });
});
