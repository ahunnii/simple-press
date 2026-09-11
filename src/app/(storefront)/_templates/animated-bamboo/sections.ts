import type { TemplateSection } from "~/lib/template-sections";
import { SECTION_LINKS } from "~/lib/section-links";

export const animatedBambooSections: Record<string, TemplateSection[]> = {
  "animated-bamboo": [
    // Homepage
    {
      id: "homepage.hero",
      page: "homepage",
      title: "Hero",
      description:
        "The living still-life scene at the top of the homepage — headline, lede, and CTA pair.",
      groupIds: ["homepage.hero"],
      order: 0,
    },
    {
      id: "homepage.featured",
      page: "homepage",
      title: "Featured Products",
      groupIds: ["homepage.featured"],
      order: 1,
      links: [SECTION_LINKS.products],
    },
    {
      id: "homepage.sustainability",
      page: "homepage",
      title: "Why Bamboo Timeline",
      description:
        "The self-drawing why-bamboo timeline below the featured products — heading, intro, and up to four illustrated stations.",
      groupIds: ["homepage.sustainability"],
      order: 2,
      hideable: true,
    },
    {
      id: "homepage.aboutTeaser",
      page: "homepage",
      title: "About Teaser",
      description:
        "Short business introduction block on the homepage, its promises list, and the Detroit vignette.",
      groupIds: ["homepage.aboutTeaser"],
      order: 3,
    },
    {
      id: "homepage.testimonials",
      page: "homepage",
      title: "Testimonials",
      description:
        "Three customer testimonials with a link to the testimonials page.",
      groupIds: ["homepage.testimonials"],
      order: 4,
      hideable: true,
      links: [SECTION_LINKS.testimonials],
    },
    {
      id: "homepage.location",
      page: "homepage",
      title: "Location",
      description:
        "Location heading, fact list, and the illustrated Detroit map with a photo card.",
      groupIds: ["homepage.location"],
      order: 5,
      hideable: true,
    },

    // About
    {
      id: "about.hero",
      page: "about",
      title: "Hero",
      description:
        "Heading, intro, and Detroit skyline illustration at the top of the about page.",
      groupIds: ["about.hero"],
      order: 0,
    },
    {
      id: "about.mission",
      page: "about",
      title: "Why We Started",
      groupIds: ["about.mission"],
      order: 1,
    },
    {
      id: "about.detroit",
      page: "about",
      title: "Rooted in Detroit",
      groupIds: ["about.detroit"],
      order: 2,
    },
    {
      id: "about.values",
      page: "about",
      title: "What We Stand For",
      description: "Leaf-bulleted values list beside the illustrated vignette.",
      groupIds: ["about.values"],
      order: 3,
    },
    {
      id: "about.whyBamboo",
      page: "about",
      title: "Why Bamboo",
      description: "Bamboo benefit facts cards.",
      groupIds: ["about.whyBamboo"],
      order: 4,
      hideable: true,
    },
    {
      id: "about.supplier",
      page: "about",
      title: "Supplier",
      description: "More Than a Supplier prose band.",
      groupIds: ["about.supplier"],
      order: 5,
      hideable: true,
    },
    {
      id: "about.label",
      page: "about",
      title: "Our Label",
      description:
        "The printed label — photo and factual description of the wreath mark and verse.",
      groupIds: ["about.label"],
      order: 6,
      hideable: true,
    },
    {
      id: "about.nationwide",
      page: "about",
      title: "Nationwide Distribution",
      description:
        "From Detroit to Your Door reach band with three illustrated stations.",
      groupIds: ["about.nationwide"],
      order: 7,
      hideable: true,
    },
    {
      id: "about.cta",
      page: "about",
      title: "CTA Banner",
      description: "Bottom call-to-action on the about page.",
      groupIds: ["about.cta"],
      order: 8,
      hideable: true,
    },

    // Contact
    {
      id: "contact.info",
      page: "contact",
      title: "Contact Info",
      description: "Header, subheader, and business hours on the contact page.",
      groupIds: ["contact.info"],
      order: 0,
    },
    {
      id: "contact.map",
      page: "contact",
      title: "Location Map",
      description:
        "Interactive map with directions, shown below the contact form.",
      groupIds: ["contact.map"],
      order: 1,
      hideable: true,
    },

    // Collections
    {
      id: "collections.listing",
      page: "collections",
      title: "Collections Listing",
      groupIds: ["collections.listing"],
      order: 0,
      links: [SECTION_LINKS.collections],
    },

    // Products (shop)
    {
      id: "products.listing",
      page: "products",
      title: "Shop Listing",
      groupIds: ["products.listing"],
      order: 0,
      links: [SECTION_LINKS.products],
    },
    {
      id: "products.whyStrip",
      page: "products",
      title: "Why Bamboo Strip",
      description:
        "Compact benefits strip near the bottom of the shop page, reused as the trust row on every product page.",
      groupIds: ["products.whyStrip"],
      order: 1,
      hideable: true,
    },
    {
      id: "products.detail",
      page: "products",
      title: "Product Reassurance Band",
      description:
        "Sage shipping/reassurance band near the bottom of every product page. Previewed on the shop page in the editor — product pages have no editor preview, so this section's hotspot won't highlight in the live preview; editing the fields still works and shows on the real product page.",
      groupIds: ["products.detail"],
      order: 2,
    },

    // Blog
    {
      id: "blog.listing",
      page: "blog",
      title: "Blog Listing",
      description:
        "Sage hero band on the blog index — title, intro, optional photo card.",
      groupIds: ["blog.listing"],
      order: 0,
      links: [SECTION_LINKS.blog],
    },
    {
      id: "blog.post",
      page: "blog",
      renderContext: "blog-post",
      title: "Blog Post CTA",
      description: "Sage call-to-action band at the end of every blog article.",
      groupIds: ["blog.post"],
      order: 1,
      hideable: true,
    },

    // Testimonials
    {
      id: "testimonials.page",
      page: "testimonials",
      title: "Testimonials Page",
      description: "Heading and subheading on the testimonials page.",
      groupIds: ["testimonials.page"],
      order: 0,
      links: [SECTION_LINKS.testimonials],
    },

    // Global
    {
      id: "global.location",
      page: "global",
      title: "Map Location",
      description:
        "Coordinates for the map pin used by the homepage and contact page maps.",
      groupIds: ["global.location"],
      order: 0,
    },
    {
      id: "global.footer",
      page: "global",
      title: "Footer",
      description:
        "The mission line under the wreath brand mark in the footer, shown on every page.",
      groupIds: ["global.footer"],
      order: 1,
      links: [
        { label: "Navigation", href: "/admin/content/navigation" },
        { label: "Business info", href: "/admin/settings/general" },
      ],
    },
  ],
};
