import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ComponentProps } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { umscBlogData, umscBlogFieldGroups, umscBlogSections } from "../blog";
import { UmscBlogPage } from "../blog/umsc-blog-page";
import { UmscBlogPostPage } from "../blog/umsc-blog-post-page";
import {
  umscDonateData,
  umscDonateFieldGroups,
  umscDonateSections,
} from "../donate";
import { UmscDonatePage } from "../donate/umsc-donate-page";
import {
  umscEventsData,
  umscEventsFieldGroups,
  umscEventsSections,
} from "../events";
import { UmscEventPage } from "../events/umsc-event-page";
import { UmscEventsPage } from "../events/umsc-events-page";
import {
  umscServicesData,
  umscServicesFieldGroups,
  umscServicesSections,
} from "../services";
import { UMSC_SERVICE_COMPONENTS } from "../services/service-pages/components";
import { umscServiceTemplateDefs } from "../services/service-pages/fields";
import { UmscServicePage } from "../services/service-pages/umsc-service-page";
import { UmscServicesIndexPage } from "../services/umsc-services-index-page";
import { UmscPageHero } from "../shared/umsc-page-hero";
import {
  umscVideosData,
  umscVideosFieldGroups,
  umscVideosSections,
} from "../videos";
import { UmscVideosPage } from "../videos/umsc-videos-page";
import { UmscGenericPage } from "./umsc-generic-page";

// TiptapRenderer's module graph reaches the Prisma client (encryption keys
// are unavailable under happy-dom); the pages only need it to render.
vi.mock("~/components/tiptap-renderer", () => ({
  TiptapRenderer: () => null,
}));

/**
 * Smoke + contract tests for the umsc pages built on the generic base
 * (parity TP7: PF22 blog, PF23 events/videos/donate, PF24 services, PF25 the
 * hero edge). Each page: exactly one h1 inside the black `UmscPageHero`, the
 * designed empty state, the editor hotspots it declares, flag-gated closing
 * buttons — and every field key a page reads is declared in umsc's registry
 * fragments (the pollen round-2 trap).
 */

type BlogProps = ComponentProps<typeof UmscBlogPage>;
type PostProps = ComponentProps<typeof UmscBlogPostPage>;
type EventsProps = ComponentProps<typeof UmscEventsPage>;
type EventProps = ComponentProps<typeof UmscEventPage>;
type VideosProps = ComponentProps<typeof UmscVideosPage>;
type DonateProps = ComponentProps<typeof UmscDonatePage>;
type ServicesProps = ComponentProps<typeof UmscServicesIndexPage>;
type ServiceProps = ComponentProps<typeof UmscServicePage>;
type GenericProps = ComponentProps<typeof UmscGenericPage>;

function makeBusiness<T>(customFields: Record<string, unknown> = {}): T {
  return {
    id: "b1",
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
  slug: "spring-market",
  name: "Spring Market",
  startAt: new Date("2030-04-12T15:00:00Z"),
  endAt: null,
  allDay: false,
  location: "Eastern Market",
  blurb: "Come smell the new batch.",
  priceLabel: "Free",
  externalUrl: "https://example.com/tickets",
  externalUrlLabel: "",
  coverImage: null,
  coverVideo: null,
  linkQrEnabled: false,
};

const POSTS = [
  {
    id: "p1",
    slug: "new-fall-scents",
    title: "New fall scents",
    excerpt: "Three new jars for the cold months.",
    image: null,
    createdAt: new Date("2030-10-01T12:00:00Z"),
  },
  {
    id: "p2",
    slug: "caring-for-your-candle",
    title: "Caring for your candle",
    excerpt: "Trim the wick.",
    image: null,
    createdAt: new Date("2030-09-01T12:00:00Z"),
  },
];

/** One h1, inside the black page band, in the Marcellus display class. */
function expectOneBandH1(container: HTMLElement, text: string) {
  const h1s = screen.getAllByRole("heading", { level: 1 });
  expect(h1s).toHaveLength(1);
  expect(h1s[0]).toHaveTextContent(text);
  expect(h1s[0]).toHaveClass("umsc-serif");
  const band = container.querySelector("section.umsc-page-hero");
  expect(band).not.toBeNull();
  expect(band).toContainElement(h1s[0]!);
}

/** No Default hex literals leaked into the render. */
function expectNoDefaultColours(container: HTMLElement) {
  expect(container.innerHTML).not.toContain("#0a0a0a");
  expect(container.innerHTML).not.toContain("#e8e8e8");
  expect(container.innerHTML).not.toContain("#6b6b6b");
}

// ─── Registry contract ─────────────────────────────────────────────────────

const REGISTRY = [
  {
    name: "blog",
    data: umscBlogData,
    groups: umscBlogFieldGroups,
    sections: umscBlogSections,
  },
  {
    name: "events",
    data: umscEventsData,
    groups: umscEventsFieldGroups,
    sections: umscEventsSections,
  },
  {
    name: "videos",
    data: umscVideosData,
    groups: umscVideosFieldGroups,
    sections: umscVideosSections,
  },
  {
    name: "donate",
    data: umscDonateData,
    groups: umscDonateFieldGroups,
    sections: umscDonateSections,
  },
  {
    name: "services",
    data: umscServicesData,
    groups: umscServicesFieldGroups,
    sections: umscServicesSections,
  },
];

const PAGE_FILES = [
  "blog/umsc-blog-page.tsx",
  "blog/umsc-blog-post-page.tsx",
  "blog/umsc-blog-list.tsx",
  "events/umsc-events-page.tsx",
  "events/umsc-event-page.tsx",
  "videos/umsc-videos-page.tsx",
  "donate/umsc-donate-page.tsx",
  "services/umsc-services-index-page.tsx",
];

describe("umsc optional pages — registry", () => {
  it.each(REGISTRY)(
    "$name: every section triple-matches a field group with fields",
    ({ data, groups, sections }) => {
      const fieldGroups = new Set(data.map((f) => f.group));
      const groupIds = new Set(groups.map((g) => g.id));
      for (const section of sections) {
        expect(groupIds.has(section.id), section.id).toBe(true);
        expect(fieldGroups.has(section.id), section.id).toBe(true);
        expect(section.groupIds).toEqual([section.id]);
        const group = groups.find((g) => g.id === section.id)!;
        expect(group.title).toBe(section.title);
      }
      for (const field of data) {
        expect(groupIds.has(field.group!), field.key).toBe(true);
      }
    },
  );

  it("every field key a page reads is declared in umsc's fragments", () => {
    const declared = new Set(REGISTRY.flatMap((r) => r.data.map((f) => f.key)));
    const dir = join(__dirname, "..");
    for (const file of PAGE_FILES) {
      const src = readFileSync(join(dir, file), "utf8");
      const keys =
        src.match(
          /"(?:default|umsc)\.(?:blog|events|videos|donate|services)\.[a-z0-9-]+"/g,
        ) ?? [];
      expect(keys.length, file).toBeGreaterThan(0);
      for (const quoted of keys) {
        const key = quoted.slice(1, -1);
        expect(declared.has(key), `${file} reads undeclared ${key}`).toBe(true);
      }
    }
  });

  it("omits the eyebrow keys umsc never renders", () => {
    const keys = REGISTRY.flatMap((r) => r.data.map((f) => f.key));
    for (const omitted of [
      "default.blog.listing-eyebrow",
      "default.blog.post-eyebrow",
      "default.events.hero-eyebrow",
      "default.videos.hero-eyebrow",
      "default.services.hero-eyebrow",
      "default.services.cta-eyebrow",
    ]) {
      expect(keys).not.toContain(omitted);
    }
    expect(keys).toContain("default.events.hero-heading");
    expect(keys).toContain("default.donate.hero-heading");
  });

  it("declares one umsc service variant with namespaced keys", () => {
    expect(umscServiceTemplateDefs.map((d) => d.id)).toEqual(["umsc-service"]);
    expect(Object.keys(UMSC_SERVICE_COMPONENTS)).toEqual(["umsc-service"]);
    for (const field of umscServiceTemplateDefs[0]!.fields) {
      expect(field.key.startsWith("umsc-service.")).toBe(true);
    }
  });
});

// ─── PF25 — the hero edge ──────────────────────────────────────────────────

describe("UmscPageHero (PF25)", () => {
  it("pads the band with the section token and adds no inner inset", () => {
    const { container } = render(<UmscPageHero heading="About" lede="Hi." />);
    const band = container.querySelector<HTMLElement>(
      "section.umsc-page-hero",
    )!;
    expect(band.style.paddingInline).toBe("var(--umsc-section-pad-x)");
    const inner = band.firstElementChild as HTMLElement;
    expect(inner.className).not.toMatch(/\bpx-|\bsm:px-/);
    expect(inner.style.maxWidth).toBe("var(--umsc-container)");
  });

  it("renders the optional leading and trailing slots", () => {
    render(
      <UmscPageHero heading="Post" leading={<span>Back</span>}>
        <p>Meta line</p>
      </UmscPageHero>,
    );
    expect(screen.getByText("Back")).toBeInTheDocument();
    expect(screen.getByText("Meta line")).toBeInTheDocument();
  });
});

// ─── Blog ──────────────────────────────────────────────────────────────────

describe("UmscBlogPage", () => {
  it("renders the band and the designed empty state with a shop link", () => {
    const { container } = render(
      <UmscBlogPage
        pages={[] as BlogProps["pages"]}
        customFields={{}}
        business={makeBusiness<BlogProps["business"]>()}
      />,
    );
    expectOneBandH1(container, "Blog");
    expect(
      container.querySelector('[data-sp-group="blog.header"]'),
    ).toHaveTextContent("News, tips, and updates");
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Stories are on their way.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Browse the shop/ }),
    ).toHaveAttribute("href", "/shop");
    expectNoDefaultColours(container);
  });

  it("renders the lead story, the grid heading and search", () => {
    const { container } = render(
      <UmscBlogPage
        pages={POSTS as unknown as BlogProps["pages"]}
        customFields={{}}
      />,
    );
    expect(
      container.querySelector('[data-sp-group="blog.list"]'),
    ).not.toBeNull();
    expect(
      screen.getByRole("heading", { level: 2, name: "New fall scents" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "More posts" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 3, name: "Caring for your candle" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Search blog posts")).toBeInTheDocument();
  });
});

describe("UmscBlogPostPage", () => {
  const post = {
    ...POSTS[0],
    content: { type: "doc", content: [] },
  } as unknown as PostProps["page"];

  it("puts the post in the band with a back link, related posts and the closing band", () => {
    const { container } = render(
      <UmscBlogPostPage
        page={post}
        relatedPosts={POSTS as unknown as PostProps["relatedPosts"]}
        customFields={{}}
      />,
    );
    expectOneBandH1(container, "New fall scents");
    const band = container.querySelector("section.umsc-page-hero");
    const allPosts = screen.getAllByRole("link", { name: /All posts/ });
    expect(allPosts).toHaveLength(2);
    expect(band).toContainElement(allPosts[0]!);
    const related = container.querySelector('[data-sp-group="blog.post"]');
    expect(related).toHaveTextContent("More articles");
    expect(related).toHaveTextContent("Caring for your candle");
    expect(related).not.toHaveTextContent("New fall scents");
    const cta = container.querySelector('[data-sp-group="blog.cta"]');
    expect(cta).toHaveTextContent("Find a scent for your room.");
    expect(screen.getByRole("link", { name: /Shop products/ })).toHaveAttribute(
      "href",
      "/shop",
    );
  });

  it("hides the closing band when blog.cta is hidden", () => {
    const { container } = render(
      <UmscBlogPostPage
        page={post}
        relatedPosts={[] as unknown as PostProps["relatedPosts"]}
        customFields={
          {
            _sp: { sections: { "blog.cta": { hidden: true } } },
          } as unknown as Record<string, string>
        }
      />,
    );
    expect(container.querySelector('[data-sp-group="blog.cta"]')).toBeNull();
    expect(container.querySelector('[data-sp-group="blog.post"]')).toBeNull();
  });
});

// ─── Events ────────────────────────────────────────────────────────────────

describe("UmscEventsPage", () => {
  it("renders the band, the designed empty state and the closing band", () => {
    const { container } = render(
      <UmscEventsPage
        business={makeBusiness<EventsProps["business"]>()}
        events={[] as EventsProps["events"]}
        timeZone="America/Detroit"
      />,
    );
    expectOneBandH1(container, "Events");
    expect(container.textContent).not.toContain("What's on");
    expect(
      screen.getByRole("heading", { level: 2, name: "No upcoming events" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Get in touch/ })).toHaveAttribute(
      "href",
      "/contact",
    );
    expectNoDefaultColours(container);
  });

  it("renders an event row with the date tile and fallback link label", () => {
    const { container } = render(
      <UmscEventsPage
        business={makeBusiness<EventsProps["business"]>()}
        events={[EVENT] as unknown as EventsProps["events"]}
        timeZone="America/Detroit"
      />,
    );
    expect(screen.getByRole("link", { name: "Spring Market" })).toHaveAttribute(
      "href",
      "/events/spring-market",
    );
    expect(screen.getByRole("link", { name: /More details/ })).toHaveAttribute(
      "target",
      "_blank",
    );
    expect(container.textContent).toContain("Apr");
  });

  it("hides the closing button when it points at a disabled feature", () => {
    render(
      <UmscEventsPage
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

  it("hides the closing band when events.cta is hidden", () => {
    render(
      <UmscEventsPage
        business={makeBusiness<EventsProps["business"]>({
          _sp: { sections: { "events.cta": { hidden: true } } },
        })}
        events={[] as EventsProps["events"]}
        timeZone="America/Detroit"
      />,
    );
    expect(screen.queryByText("Want us at your event?")).toBeNull();
  });
});

describe("UmscEventPage", () => {
  it("puts the event in the band with a back link and meta", () => {
    const { container } = render(
      <UmscEventPage
        business={makeBusiness<EventProps["business"]>()}
        event={EVENT as unknown as EventProps["event"]}
        timeZone="America/Detroit"
        isPast
      />,
    );
    expectOneBandH1(container, "Spring Market");
    const band = container.querySelector('[data-sp-group="events.hero"]');
    expect(band).toContainElement(
      screen.getByRole("link", { name: /All events/ }),
    );
    expect(band).toHaveTextContent("This event has passed");
    expect(band).toHaveTextContent("Eastern Market");
    expect(
      container.querySelector('[data-sp-group="events.list"]'),
    ).toHaveTextContent("Come smell the new batch.");
  });
});

// ─── Videos ────────────────────────────────────────────────────────────────

describe("UmscVideosPage", () => {
  it("renders the band and the empty state", () => {
    const { container } = render(
      <UmscVideosPage
        business={makeBusiness<VideosProps["business"]>()}
        videos={[] as VideosProps["videos"]}
      />,
    );
    expectOneBandH1(container, "Videos");
    expect(
      screen.getByRole("heading", { level: 2, name: "No videos yet" }),
    ).toBeInTheDocument();
  });
});

// ─── Donate ────────────────────────────────────────────────────────────────

describe("UmscDonatePage", () => {
  it("falls back to the donation label and the not-set-up state", () => {
    const { container } = render(
      <UmscDonatePage business={makeBusiness<DonateProps["business"]>()} />,
    );
    expectOneBandH1(container, "Donate");
    expect(
      screen.getByRole("heading", { level: 2, name: /aren't set up yet/ }),
    ).toBeInTheDocument();
  });

  it("renders the umsc form and the thank-you notice when Stripe can charge", () => {
    const { container } = render(
      <UmscDonatePage
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
    expect(form).toHaveClass("umsc-donate-form");
    expect(screen.getByRole("status")).toHaveTextContent(
      "Thank you for your support!",
    );
    expect(screen.getByRole("button", { name: /Donate/ })).toHaveAttribute(
      "type",
      "submit",
    );
    // Preset amounts are aria-pressed pills; the first is selected.
    const pressed = container.querySelectorAll('[aria-pressed="true"]');
    expect(pressed).toHaveLength(1);
    expectNoDefaultColours(container);
  });
});

// ─── Services ──────────────────────────────────────────────────────────────

describe("UmscServicesIndexPage", () => {
  it("renders the band, cards and the closing band", () => {
    const { container } = render(
      <UmscServicesIndexPage
        business={makeBusiness<ServicesProps["business"]>()}
        services={
          [
            {
              id: "s1",
              slug: "custom-batch",
              name: "Custom batch",
              description: "Your scent, your label, your count.",
              image: null,
            },
          ] as unknown as ServicesProps["services"]
        }
      />,
    );
    expectOneBandH1(container, "Services");
    expect(container.textContent).not.toContain("What we offer");
    expect(screen.getByRole("link", { name: /Custom batch/ })).toHaveAttribute(
      "href",
      "/services/custom-batch",
    );
    expect(
      container.querySelector('[data-sp-group="services.list"]'),
    ).toHaveTextContent("Explore");
    // Intro fields default blank → the intro band is skipped.
    expect(
      container.querySelector('[data-sp-group="services.intro"]'),
    ).toBeNull();
    expect(
      container.querySelector('[data-sp-group="services.cta"]'),
    ).toHaveTextContent("Tell us what you need.");
    expect(screen.getByRole("link", { name: /Get in touch/ })).toHaveAttribute(
      "href",
      "/contact",
    );
    expectNoDefaultColours(container);
  });

  it("shows the designed empty state", () => {
    render(
      <UmscServicesIndexPage
        business={makeBusiness<ServicesProps["business"]>()}
        services={[] as unknown as ServicesProps["services"]}
      />,
    );
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Services are on their way.",
      }),
    ).toBeInTheDocument();
  });
});

describe("UmscServicePage", () => {
  it("puts the service in the band with a back link and a closing band", () => {
    const { container } = render(
      <UmscServicePage
        business={makeBusiness<ServiceProps["business"]>()}
        service={
          {
            id: "s1",
            slug: "custom-batch",
            name: "Custom batch",
            description: "Your scent, your label, your count.",
            image: null,
            customFields: {},
          } as unknown as ServiceProps["service"]
        }
        items={[] as ServiceProps["items"]}
        embedsEnabled={false}
      />,
    );
    expectOneBandH1(container, "Custom batch");
    expect(screen.getByRole("link", { name: /All services/ })).toHaveAttribute(
      "href",
      "/services",
    );
    expect(screen.getByText("Questions before you book?")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Contact us/ })).toHaveAttribute(
      "href",
      "/contact",
    );
  });
});

// ─── Generic ───────────────────────────────────────────────────────────────

describe("UmscGenericPage (PF25)", () => {
  it("uses the black band for text-only pages and the section container for the body", () => {
    const { container } = render(
      <UmscGenericPage
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
    expectOneBandH1(container, "Privacy policy");
    const body = container.querySelector<HTMLElement>(
      'section[aria-label="Privacy policy"]',
    )!;
    expect(body).not.toBeNull();
    expect(body.style.padding).toContain("var(--umsc-section-pad-x)");
    expect(container.textContent).toContain("Last updated");
  });
});
