import {
  Droplets,
  Heart,
  Leaf,
  Recycle,
  Shield,
  TreeDeciduous,
} from "lucide-react";

import type {
  GenericIconRow,
  TemplateField,
  TemplateFieldGroup,
} from "~/lib/template-fields";
import { resolveTemplateFields } from "~/lib/resolve-template-fields";

import {
  happyBambooCheckoutUnavailableData,
  happyBambooCheckoutUnavailableFieldGroups,
} from "./cart-checkout/unavailable-fields";
import {
  happyBambooProductData,
  happyBambooProductFieldGroups,
} from "./products";

const homepageHeroData: TemplateField[] = [
  {
    key: "happy-bamboo.homepage.hero-image",
    label: "Background photo",
    description:
      "Full-width photo behind the hero text. Leave blank to use a plain brand background.",
    type: "image",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
  },
  {
    key: "happy-bamboo.homepage.hero-welcome",
    label: "Headline, first line",
    description: "First line of the two-line hero headline.",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "Welcome to",
  },
  {
    key: "happy-bamboo.homepage.hero-title",
    label: "Headline, second line",
    description:
      "Second line of the hero headline, shown in the accent colour.",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "Elevate Your Everyday",
  },
  {
    key: "happy-bamboo.homepage.hero-tagline",
    label: "Tagline",
    description: "Line with a leaf icon, shown below the headline.",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
  },
  {
    key: "happy-bamboo.homepage.hero-description",
    label: "Intro text",
    description: "Paragraph below the tagline, introducing your products.",
    type: "textarea",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
    defaultValue:
      "Luxuriously soft, tree-free happy-bamboo paper products crafted in Detroit. Because what you bring into your home should be as thoughtful as the life you build in it.",
    placeholder: "Luxuriously soft, tree-free paper products crafted...",
  },
  {
    key: "happy-bamboo.homepage.hero-primary-button-text",
    label: "Button text",
    description: "Label for the main hero button, e.g. Shop Now.",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "Shop Now",
    placeholder: "Shop Now",
  },
  {
    key: "happy-bamboo.homepage.hero-primary-button-link",
    label: "Button link",
    description: "Where the main hero button goes, e.g. /shop.",
    type: "url",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "/shop",
    placeholder: "/shop",
  },
];

const homepageAboutTeaserData: TemplateField[] = [
  {
    key: "happy-bamboo.homepage-about-small-label",
    label: "Small label",
    description: "Short text above the heading. Leave blank to hide.",
    type: "text",
    page: "homepage",
    group: "homepage.aboutTeaser",
    gridColumn: "col-span-1",
    defaultValue: "About Us",
    placeholder: "About Us",
  },
  {
    key: "happy-bamboo.homepage-about-heading",
    label: "Heading",
    description: "Heading for the story block on the homepage.",
    type: "text",
    page: "homepage",
    group: "homepage.aboutTeaser",
    gridColumn: "col-span-full",
    defaultValue: "Our Vision for a Sustainable Future",
    placeholder: "Our Vision for a Sustainable Future",
  },
  {
    key: "happy-bamboo.homepage-about-body",
    label: "Body text",
    description: "Paragraph telling your story, below the heading.",
    type: "richtext",
    page: "homepage",
    gridColumn: "col-span-full",
    group: "homepage.aboutTeaser",
  },
  {
    key: "happy-bamboo.homepage-about-video",
    label: "Video",
    description:
      "Optional video shown at the top of this block. Leave blank to show the poster image instead.",
    type: "video",
    page: "homepage",
    group: "homepage.aboutTeaser",
    defaultValue: "https://www.w3schools.com/html/mov_bbb.mp4",
  },
  {
    key: "happy-bamboo.homepage-about-video-poster",
    label: "Poster image",
    description:
      "Image shown before play, or in place of the video when none is set.",
    type: "image",
    page: "homepage",
    group: "homepage.aboutTeaser",
    defaultValue: "/placeholder.svg",
  },
  {
    key: "happy-bamboo.homepage-about-image",
    label: "Second image",
    description: "Second photo, shown below the video or poster image.",
    type: "image",
    page: "homepage",
    group: "homepage.aboutTeaser",
    defaultValue: "/placeholder.svg",
  },
  {
    key: "happy-bamboo.homepage-about-button-text",
    label: "Button text",
    description: "Label for the link to your full About page.",
    type: "text",
    page: "homepage",
    group: "homepage.aboutTeaser",
    defaultValue: "Learn More",
    placeholder: "Learn More",
  },
  {
    key: "happy-bamboo.homepage-about-button-link",
    label: "Button link",
    description: "Where the button goes, e.g. /about.",
    type: "url",
    page: "homepage",
    group: "homepage.aboutTeaser",
    defaultValue: "/about",
    placeholder: "/about",
  },
];

const homepageFeaturedData: TemplateField[] = [
  {
    key: "happy-bamboo.homepage-featured-small-label",
    label: "Small label",
    description: "Short text above the heading. Leave blank to hide.",
    type: "text",
    page: "homepage",
    group: "homepage.featured",
    defaultValue: "Happy Bamboo",
    placeholder: "Happy Bamboo",
  },
  {
    key: "happy-bamboo.homepage-featured-title",
    label: "Heading",
    description: "Heading above the featured products grid.",
    type: "text",
    page: "homepage",
    group: "homepage.featured",
    defaultValue: "Our Curated Collection",
    placeholder: "Our Curated Collection",
  },
  {
    key: "happy-bamboo.homepage-featured-description",
    label: "Intro text",
    description: "Short paragraph below the heading, above the product grid.",
    type: "textarea",
    page: "homepage",
    group: "homepage.featured",
    defaultValue:
      "Every product is 100% happy-bamboo, tree-free, and crafted to the highest standard. No compromises.",
    placeholder: "Every product is 100% bamboo, tree-free...",
  },
  {
    key: "happy-bamboo.homepage-featured-button-text",
    label: "Button text",
    description: "Label for the link to the full shop, below the product grid.",
    type: "text",
    page: "homepage",
    group: "homepage.featured",
    defaultValue: "View All Products",
  },
  {
    key: "happy-bamboo.homepage-featured-button-link",
    label: "Button link",
    description: "Where the button goes, e.g. /shop.",
    type: "url",
    page: "homepage",
    group: "homepage.featured",
    defaultValue: "/shop",
  },
];

const homepageBenefitsData: TemplateField[] = [
  {
    key: "happy-bamboo.homepage-benefits-small-label",
    label: "Small label",
    description: "Short text above the heading. Leave blank to hide.",
    type: "text",
    page: "homepage",
    group: "homepage.benefits",
    gridColumn: "col-span-full",
    defaultValue: "Happy Bamboo",
    placeholder: "Happy Bamboo",
  },
  {
    key: "happy-bamboo.homepage-benefits-heading",
    label: "Heading",
    description: "Heading above the benefit cards.",
    type: "text",
    page: "homepage",
    group: "homepage.benefits",
    gridColumn: "col-span-full",
    defaultValue: "Why Choose Bamboo Products?",
    placeholder: "Why Choose Bamboo Products?",
  },
  {
    key: "happy-bamboo.homepage-benefits-intro",
    label: "Intro text",
    description: "Paragraph below the heading. Leave blank to hide.",
    type: "textarea",
    page: "homepage",
    group: "homepage.benefits",
    gridColumn: "col-span-full",
    defaultValue:
      "Bamboo products come with a variety of benefits, making them an appealing option for many consumers.",
    placeholder: "Bamboo products come with a variety of benefits...",
  },
  {
    key: "happy-bamboo.homepage-benefits-closing",
    label: "Closing text",
    description: "Paragraph below the benefit cards. Leave blank to hide.",
    type: "textarea",
    page: "homepage",
    group: "homepage.benefits",
    gridColumn: "col-span-full",
    defaultValue:
      "Overall, choosing bamboo products can be a responsible and eco-conscious decision that benefits both consumers and the environment.",
    placeholder: "Overall, choosing bamboo products can be...",
  },
  {
    key: "happy-bamboo.homepage-benefits-list",
    label: "Benefit cards",
    description:
      "Cards shown below the intro text (icon, title, and description per card). Leave empty to show the default cards.",
    type: "list",
    page: "homepage",
    group: "homepage.benefits",
    gridColumn: "col-span-full",
    itemLabel: "benefit",
    summaryKey: "title",
    defaultsWhenEmpty: true,
    itemSchema: [
      {
        key: "icon",
        label: "Icon",
        type: "icon",
        description: "Icon shown on the card.",
      },
      {
        key: "title",
        label: "Title",
        type: "text",
        description: "Card heading.",
      },
      {
        key: "description",
        label: "Description",
        type: "textarea",
        description: "Supporting text.",
        optional: true,
      },
    ],
    minItems: 0,
    maxItems: 24,
  },
];

/// ABOUT PAGE
const aboutHeroData: TemplateField[] = [
  {
    key: "happy-bamboo.about-hero-small-label",
    label: "Small label",
    description: "Short text above the heading. Leave blank to hide.",
    type: "text",
    page: "about",
    group: "about.hero",
    gridColumn: "col-span-1",
    defaultValue: "About Us",
    placeholder: "About Us",
  },
  {
    key: "happy-bamboo.about-hero-heading",
    label: "Heading",
    description: "Main heading at the top of the about page.",
    type: "text",
    page: "about",
    group: "about.hero",
    defaultValue: "About Us",
    placeholder: "About Us",
    gridColumn: "col-span-full",
  },
  {
    key: "happy-bamboo.about-hero-mission-heading",
    label: "Mission heading",
    description: "Subheading above the mission statement.",
    type: "text",
    page: "about",
    group: "about.hero",
    gridColumn: "col-span-1",
    defaultValue: "Our Mission",
    placeholder: "Our Mission",
  },
  {
    key: "happy-bamboo.about-hero-mission",
    label: "Mission statement",
    description: "Paragraph under the \"Our Mission\" subheading.",
    type: "textarea",
    page: "about",
    group: "about.hero",
    gridColumn: "col-span-full",
    defaultValue: "To offer eco-friendly, chemical and hypoallergenic free...",
  },
  {
    key: "happy-bamboo.about-hero-vision-heading",
    label: "Vision heading",
    description: "Subheading above the vision statement.",
    type: "text",
    page: "about",
    group: "about.hero",
    gridColumn: "col-span-1",
    defaultValue: "Our Vision",
    placeholder: "Our Vision",
  },
  {
    key: "happy-bamboo.about-hero-vision",
    label: "Vision statement",
    description: "Paragraph under the \"Our Vision\" subheading.",
    type: "textarea",
    page: "about",
    group: "about.hero",
    gridColumn: "col-span-full",
    defaultValue: "A world where everyday personal care choices protect...",
  },

  {
    key: "happy-bamboo.about-hero-bamboo",
    label: "Closing statement",
    description:
      "Last paragraph in the hero text column, below the mission and vision statements.",
    type: "textarea",
    page: "about",
    group: "about.hero",
    gridColumn: "col-span-full",
    placeholder: "By choosing Happy Bamboo...",
    defaultValue: "By choosing Happy Bamboo...",
  },
  {
    key: "happy-bamboo.about-hero-image",
    label: "Photo",
    description: "Portrait photo shown beside the hero text.",
    type: "image",
    page: "about",
    group: "about.hero",
    gridColumn: "col-span-full",
    defaultValue: "/placeholder.svg",
  },
];

const aboutMissionData: TemplateField[] = [
  {
    key: "happy-bamboo.about-mission-banner",
    label: "Banner text",
    description:
      "Rich text shown in the highlighted banner below the hero. Leave blank to show default copy.",
    type: "richtext",
    page: "about",
    group: "about.mission",
    gridColumn: "col-span-full",
    placeholder: "Join us in our mission to make everyday moments...",
  },
];

const aboutServicesData: TemplateField[] = [
  {
    key: "happy-bamboo.about-services-small-label",
    label: "Small label",
    description: "Short text above the heading. Leave blank to hide.",
    type: "text",
    page: "about",
    group: "about.services",
    defaultValue: "What We Offer",
    placeholder: "What We Offer",
  },
  {
    key: "happy-bamboo.about-services-heading",
    label: "Heading",
    description: "Heading above the service cards.",
    type: "text",
    page: "about",
    group: "about.services",
    defaultValue: "Our Services",
    placeholder: "Our Services",
    gridColumn: "col-span-full",
  },
  {
    key: "happy-bamboo.about-services-banner",
    label: "Intro text",
    description: "Paragraph below the heading, above the service cards.",
    type: "textarea",
    page: "about",
    group: "about.services",
    gridColumn: "col-span-full",
    placeholder: "We provide premium bamboo personal care products...",
    defaultValue:
      "We provide premium bamboo personal care products designed for comfort, sustainability, and your well-being.",
  },
  {
    key: "happy-bamboo.about-services-list",
    label: "Service cards",
    description:
      "Cards below the intro text (icon, title, and description per card). Leave empty to show the default cards.",
    type: "list",
    page: "about",
    group: "about.services",
    gridColumn: "col-span-full",
    itemLabel: "service",
    summaryKey: "title",
    defaultsWhenEmpty: true,
    itemSchema: [
      {
        key: "icon",
        label: "Icon",
        type: "icon",
        description: "Icon shown on the card.",
      },
      {
        key: "title",
        label: "Title",
        type: "text",
        description: "Card heading.",
      },
      {
        key: "description",
        label: "Description",
        type: "textarea",
        description: "Supporting text.",
        optional: true,
      },
    ],
    minItems: 0,
    maxItems: 8,
  },
];

const aboutBambooData: TemplateField[] = [
  {
    key: "happy-bamboo.about-bamboo-small-label",
    label: "Small label",
    description: "Short text above the heading. Leave blank to hide.",
    type: "text",
    page: "about",
    group: "about.bamboo",
    defaultValue: "The Smart Choice",
    placeholder: "The Smart Choice",
  },
  {
    key: "happy-bamboo.about-bamboo-heading",
    label: "Heading",
    description: "Heading for the why-bamboo section.",
    type: "text",
    page: "about",
    group: "about.bamboo",
    defaultValue: "Why Bamboo Is Better",
    placeholder: "Why Bamboo Is Better",
    gridColumn: "col-span-full",
  },
  {
    key: "happy-bamboo.about-bamboo-tagline",
    label: "Subheading",
    description: "Line below the heading.",
    type: "text",
    page: "about",
    group: "about.bamboo",
    defaultValue: "A Smarter Choice for You and the Planet",
    placeholder: "A Smarter Choice for You and the Planet",
    gridColumn: "col-span-full",
  },
  {
    key: "happy-bamboo.about-bamboo-description",
    label: "Intro text",
    description: "Paragraph below the subheading, above the bamboo facts.",
    type: "textarea",
    page: "about",
    group: "about.bamboo",
    gridColumn: "col-span-full",
    placeholder: "Bamboo is nature's most remarkable...",
    defaultValue:
      "Bamboo is nature's most remarkable renewable resource. Here is why we chose it as the foundation for everything we make.",
  },
  {
    key: "happy-bamboo.about-bamboo-list",
    label: "Bamboo facts",
    description:
      "Fact cards below the intro text (icon, title, and description per card). Leave empty to show the default cards.",
    type: "list",
    page: "about",
    group: "about.bamboo",
    gridColumn: "col-span-full",
    itemLabel: "fact",
    summaryKey: "title",
    defaultsWhenEmpty: true,
    itemSchema: [
      {
        key: "icon",
        label: "Icon",
        type: "icon",
        description: "Icon shown on the card.",
      },
      {
        key: "title",
        label: "Title",
        type: "text",
        description: "Card heading.",
      },
      {
        key: "description",
        label: "Description",
        type: "textarea",
        description: "Supporting text.",
        optional: true,
      },
    ],
    minItems: 0,
    maxItems: 24,
  },
  {
    key: "happy-bamboo.about-bamboo-image-1",
    label: "Main photo",
    description: "Larger photo above the two smaller photos.",
    type: "image",
    page: "about",
    group: "about.bamboo",
    gridColumn: "col-span-1",
    defaultValue: "/placeholder.svg",
  },
  {
    key: "happy-bamboo.about-bamboo-image-2",
    label: "Second photo",
    description: "Smaller photo, top of the pair below the main photo.",
    type: "image",
    page: "about",
    group: "about.bamboo",
    gridColumn: "col-span-1",
    defaultValue: "/placeholder.svg",
  },
  {
    key: "happy-bamboo.about-bamboo-image-3",
    label: "Third photo",
    description: "Smaller photo, bottom of the pair below the main photo.",
    type: "image",
    page: "about",
    group: "about.bamboo",
    gridColumn: "col-span-1",
    defaultValue: "/placeholder.svg",
  },
];

const aboutCTAData: TemplateField[] = [
  {
    key: "happy-bamboo.about-cta-image",
    label: "Photo",
    description:
      "Full-width photo banner between the Why Bamboo and Connect With Us sections.",
    type: "image",
    page: "about",
    group: "about.cta",
    gridColumn: "col-span-full",
    defaultValue: "/placeholder.svg",
  },
];

const aboutConnectWithUsData: TemplateField[] = [
  {
    key: "happy-bamboo.about-connect-with-us-small-label",
    label: "Small label",
    description: "Short text above the heading. Leave blank to hide.",
    type: "text",
    page: "about",
    group: "about.connect-with-us",
    gridColumn: "col-span-full",
    defaultValue: "Stay Connected",
    placeholder: "Stay Connected",
  },
  {
    key: "happy-bamboo.about-connect-with-us-heading",
    label: "Heading",
    description: "Heading above the review and social-follow cards.",
    type: "text",
    page: "about",
    group: "about.connect-with-us",
    gridColumn: "col-span-full",
    defaultValue: "Join the Happy Bamboo Community",
    placeholder: "Join the Happy Bamboo Community",
  },
  {
    key: "happy-bamboo.about-connect-with-us-text",
    label: "Intro text",
    description: "Paragraph below the heading.",
    type: "textarea",
    page: "about",
    group: "about.connect-with-us",
    gridColumn: "col-span-full",
    placeholder: "Share your experience, leave us a review, and...",
    defaultValue:
      "Share your experience, leave us a review, and follow us on social media for tips, updates, and inspiration.",
  },
  {
    key: "happy-bamboo.about-connect-with-us-qr-code",
    label: "QR code image",
    description:
      "QR code shown beside the review button. Leave blank to hide it.",
    type: "image",
    page: "about",
    group: "about.connect-with-us",
    gridColumn: "col-span-1",
    defaultValue: "/placeholder.svg",
  },
  {
    key: "happy-bamboo.about-connect-with-us-google-review-link",
    label: "Google review link",
    description: "Link to your Google review page. Leave blank to hide the review button.",
    type: "url",
    page: "about",
    group: "about.connect-with-us",
    gridColumn: "col-span-1",
    defaultValue: "",
    placeholder: "https://g.page/r/.../review",
  },
  {
    key: "happy-bamboo.about-connect-with-us-review-button-text",
    label: "Review button text",
    description: "Label for the button that links to your Google review page.",
    type: "text",
    page: "about",
    group: "about.connect-with-us",
    gridColumn: "col-span-1",
    defaultValue: "Write a Review",
    placeholder: "Write a Review",
  },
  {
    key: "happy-bamboo.about-connect-with-us-google-review-header",
    label: "Review card heading",
    description: "Heading on the review card, above the Write a Review button.",
    type: "text",
    page: "about",
    group: "about.connect-with-us",
    gridColumn: "col-span-1",
    defaultValue: "Share Your Feedback",
    placeholder: "Share Your Feedback",
  },
  {
    key: "happy-bamboo.about-connect-with-us-google-review-text",
    label: "Review card text",
    description:
      "Supporting text on the review card, above the Write a Review button.",
    type: "textarea",
    page: "about",
    group: "about.connect-with-us",
    gridColumn: "col-span-1",
    defaultValue:
      "Your reviews help others discover the comfort and sustainability of Happy Bamboo. Share your experience on Google.",
    placeholder: "Your reviews help others discover the comfort...",
  },
  {
    key: "happy-bamboo.about-connect-with-us-social-follow-header",
    label: "Social card heading",
    description: "Heading on the social-follow card.",
    type: "text",
    page: "about",
    group: "about.connect-with-us",
    gridColumn: "col-span-1",
    defaultValue: "Follow Our Journey",
    placeholder: "Follow Our Journey",
  },
  {
    key: "happy-bamboo.about-connect-with-us-social-follow-text",
    label: "Social card text",
    description: "Supporting text on the social-follow card.",
    type: "textarea",
    page: "about",
    group: "about.connect-with-us",
    gridColumn: "col-span-1",
    defaultValue:
      "Stay connected for exclusive updates, eco-tips, behind-the-scenes content, and special offers.",
    placeholder: "Stay connected for exclusive updates, eco-tips...",
  },
];

/// CONTACT PAGE
const contactPageData: TemplateField[] = [
  {
    key: "happy-bamboo.contact.small-label",
    label: "Small label",
    description: "Short text above the heading. Leave blank to hide.",
    type: "text",
    page: "contact",
    group: "contact.info",
    gridColumn: "col-span-full",
    defaultValue: "Get in Touch",
    placeholder: "Get in Touch",
  },
  {
    key: "happy-bamboo.contact.header",
    label: "Heading",
    description: "Main heading at the top of the contact page.",
    type: "text",
    page: "contact",
    group: "contact.info",
    gridColumn: "col-span-full",
    defaultValue: "Contact Us",
    placeholder: "Contact Us",
  },
  {
    key: "happy-bamboo.contact.subheader",
    label: "Intro text",
    description: "Line below the heading.",
    type: "textarea",
    page: "contact",
    group: "contact.info",
    placeholder: "Have a question, want to partner with us...",
    gridColumn: "col-span-full",
    defaultValue:
      "Have a question, want to partner with us, or just want to say hello? We would love to hear from you.",
  },

  {
    key: "happy-bamboo.contact-image",
    label: "Photo",
    description: "Photo beside the heading and intro text.",
    type: "image",
    page: "contact",
    group: "contact.info",
    gridColumn: "col-span-full",
    defaultValue: "/placeholder.svg",
  },
];

const contactFormData: TemplateField[] = [
  {
    key: "happy-bamboo.contact.form-success-heading",
    label: "Success heading",
    description:
      "Heading shown after someone sends the contact form, in place of the form.",
    type: "text",
    page: "contact",
    group: "contact.form",
    defaultValue: "Message sent",
    placeholder: "Message sent",
  },
  {
    key: "happy-bamboo.contact.form-success-body",
    label: "Success message",
    description:
      "Line shown under the success heading after someone sends the contact form.",
    type: "textarea",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-full",
    defaultValue:
      "Thanks for reaching out. We'll get back to you soon.",
    placeholder: "Thanks for reaching out. We'll be in touch shortly.",
  },
  {
    key: "happy-bamboo.contact.form-success-again-label",
    label: "Success button text",
    description:
      "Label for the button that lets a customer send another message after their first one succeeds.",
    type: "text",
    page: "contact",
    group: "contact.form",
    defaultValue: "Send another message",
    placeholder: "Send another message",
  },
];

const homepageTestimonialsData: TemplateField[] = [
  {
    key: "happy-bamboo.homepage-testimonials-heading",
    label: "Heading",
    description:
      "Heading above the testimonial cards, pulled from your reviews.",
    type: "text",
    page: "homepage",
    group: "homepage.testimonials",
    gridColumn: "col-span-full",
    defaultValue: "What Consumers Say",
    placeholder: "What Consumers Say",
  },
];

const testimonialsPageData: TemplateField[] = [
  {
    key: "happy-bamboo.testimonials-page-small-label",
    label: "Small label",
    description: "Short text above the heading. Leave blank to hide.",
    type: "text",
    page: "testimonials",
    group: "testimonials.page",
    gridColumn: "col-span-1",
    defaultValue: "Testimonials",
    placeholder: "Testimonials",
  },
  {
    key: "happy-bamboo.testimonials-page-intro",
    label: "Intro text",
    description: "Line below the heading. Leave blank to hide.",
    type: "textarea",
    page: "testimonials",
    group: "testimonials.page",
    gridColumn: "col-span-full",
    defaultValue: "Kind words from people who shop with us",
    placeholder: "Kind words from people who shop with us",
  },
];

const homepageCtaData: TemplateField[] = [
  {
    key: "happy-bamboo.homepage-cta-heading",
    label: "Heading",
    description: "Heading for the closing banner at the bottom of the homepage.",
    type: "text",
    page: "homepage",
    group: "homepage.cta",
    gridColumn: "col-span-full",
    defaultValue: "Ready to Make the Switch?",
    placeholder: "Ready to Make the Switch?",
  },
  {
    key: "happy-bamboo.homepage-cta-body",
    label: "Body text",
    description: "Paragraph below the heading. Leave blank to hide.",
    type: "textarea",
    page: "homepage",
    group: "homepage.cta",
    gridColumn: "col-span-full",
    defaultValue:
      "Join a growing community of customers who love what we make. Experience premium quality while making a positive impact.",
    placeholder: "Join a growing community of customers...",
  },
  {
    key: "happy-bamboo.homepage-cta-primary-button-text",
    label: "Primary button text",
    description: "Label for the main button, e.g. Shop Now.",
    type: "text",
    page: "homepage",
    group: "homepage.cta",
    gridColumn: "col-span-1",
    defaultValue: "Shop Now",
    placeholder: "Shop Now",
  },
  {
    key: "happy-bamboo.homepage-cta-primary-button-link",
    label: "Primary button link",
    description: "Where the main button goes, e.g. /shop.",
    type: "url",
    page: "homepage",
    group: "homepage.cta",
    gridColumn: "col-span-1",
    defaultValue: "/shop",
    placeholder: "/shop",
  },
  {
    key: "happy-bamboo.homepage-cta-secondary-button-text",
    label: "Secondary button text",
    description: "Label for the second button. Leave blank to hide it.",
    type: "text",
    page: "homepage",
    group: "homepage.cta",
    gridColumn: "col-span-1",
    defaultValue: "Learn More",
    placeholder: "Learn More",
  },
  {
    key: "happy-bamboo.homepage-cta-secondary-button-link",
    label: "Secondary button link",
    description: "Where the second button goes, e.g. /about.",
    type: "url",
    page: "homepage",
    group: "homepage.cta",
    gridColumn: "col-span-1",
    defaultValue: "/about",
    placeholder: "/about",
  },
];

const blogListingData: TemplateField[] = [
  {
    key: "happy-bamboo.blog-listing-title",
    label: "Heading",
    description: "Heading at the top of the blog page.",
    type: "text",
    page: "blog",
    group: "blog.listing",
    gridColumn: "col-span-full",
    defaultValue: "The Happy Bamboo Blog",
    placeholder: "The Happy Bamboo Blog",
  },
  {
    key: "happy-bamboo.blog-listing-intro",
    label: "Intro text",
    description: "Paragraph below the heading. Leave blank to hide.",
    type: "textarea",
    page: "blog",
    group: "blog.listing",
    gridColumn: "col-span-full",
    defaultValue:
      "Tips, stories, and insights on sustainable living, bamboo benefits, and making greener everyday choices.",
    placeholder: "Tips, stories, and insights on sustainable living...",
  },
  {
    key: "happy-bamboo.blog-listing-image",
    label: "Photo",
    description: "Photo beside the heading and intro text.",
    type: "image",
    page: "blog",
    group: "blog.listing",
    gridColumn: "col-span-full",
    defaultValue: "/placeholder.svg",
  },
];

const collectionsListingData: TemplateField[] = [
  {
    key: "happy-bamboo.collections-listing-heading",
    label: "Heading",
    description: "Heading at the top of the collections page.",
    type: "text",
    page: "collections",
    group: "collections.listing",
    gridColumn: "col-span-full",
    defaultValue: "Our Collections",
    placeholder: "Our Collections",
  },
  {
    key: "happy-bamboo.collections-listing-intro",
    label: "Intro text",
    description: "Paragraph below the heading. Leave blank to hide.",
    type: "textarea",
    page: "collections",
    group: "collections.listing",
    gridColumn: "col-span-full",
    defaultValue:
      "Explore our curated collections of premium bamboo products. Find the perfect match for your sustainable lifestyle.",
    placeholder:
      "Explore our curated collections of premium bamboo products...",
  },
];

const collectionsCtaData: TemplateField[] = [
  {
    key: "happy-bamboo.collections-cta-heading",
    label: "Heading",
    description: "Heading for the closing banner on the collections page.",
    type: "text",
    page: "collections",
    group: "collections.cta",
    gridColumn: "col-span-full",
    defaultValue: "Can't Decide?",
    placeholder: "Can't Decide?",
  },
  {
    key: "happy-bamboo.collections-cta-body",
    label: "Body text",
    description: "Paragraph below the heading. Leave blank to hide.",
    type: "textarea",
    page: "collections",
    group: "collections.cta",
    gridColumn: "col-span-full",
    defaultValue:
      "Browse our full catalog to discover all of our premium bamboo products, or start with our bestselling trial pack.",
    placeholder:
      "Browse our full catalog to discover all of our premium bamboo products...",
  },
  {
    key: "happy-bamboo.collections-cta-button-text",
    label: "Button text",
    description: "Label for the button, e.g. View All Products.",
    type: "text",
    page: "collections",
    group: "collections.cta",
    gridColumn: "col-span-1",
    defaultValue: "View All Products",
    placeholder: "View All Products",
  },
  {
    key: "happy-bamboo.collections-cta-button-link",
    label: "Button link",
    description: "Where the button goes, e.g. /shop.",
    type: "url",
    page: "collections",
    group: "collections.cta",
    gridColumn: "col-span-1",
    defaultValue: "/shop",
    placeholder: "/shop",
  },
];

const shopListingData: TemplateField[] = [
  {
    key: "happy-bamboo.sale-badge-format",
    label: "Show savings as percentage",
    description:
      "When enabled, sale badges show the percentage saved (e.g. 'Save 20%'). When disabled, they show the dollar amount saved (e.g. 'Save $5.00').",
    type: "boolean",
    page: "shop",
    group: "shop.listing",
    gridColumn: "col-span-1",
    defaultValue: "true",
  },
  {
    key: "happy-bamboo.shop-listing-heading",
    label: "Heading",
    description: "Heading at the top of the shop page.",
    type: "text",
    page: "shop",
    group: "shop.listing",
    gridColumn: "col-span-full",
    defaultValue: "Shop Happy Bamboo",
    placeholder: "Shop Happy Bamboo",
  },
  {
    key: "happy-bamboo.shop-listing-intro",
    label: "Intro text",
    description: "Paragraph below the heading. Leave blank to hide.",
    type: "textarea",
    page: "shop",
    group: "shop.listing",
    gridColumn: "col-span-full",
    defaultValue:
      "Discover our range of premium bamboo toilet paper products. Soft on you, gentle on the planet.",
    placeholder:
      "Discover our range of premium bamboo toilet paper products...",
  },
];

const contactFaqData: TemplateField[] = [
  {
    key: "happy-bamboo.contact-faq-title",
    label: "Heading",
    description: "Heading above the frequently asked questions.",
    type: "text",
    page: "contact",
    group: "contact.faq",
    gridColumn: "col-span-full",
    defaultValue: "Frequently Asked Questions",
    placeholder: "Frequently Asked Questions",
  },
  {
    key: "happy-bamboo.contact-faq-subtitle",
    label: "Intro text",
    description: "Line below the heading. Leave blank to hide.",
    type: "textarea",
    page: "contact",
    group: "contact.faq",
    gridColumn: "col-span-full",
    defaultValue:
      "Find quick answers to the questions we hear most often. Still have questions? Use the form to reach us directly.",
    placeholder: "Find quick answers to the questions we hear most often...",
  },
  {
    key: "happy-bamboo.contact-frequently-asked-questions",
    label: "Questions",
    description:
      "Pick questions from Content → FAQ. Leave empty to show the first 10 published questions.",
    type: "faq",
    page: "contact",
    group: "contact.faq",
    gridColumn: "col-span-full",
    minItems: 0,
    maxItems: 10,
  },
];

const globalCartData: TemplateField[] = [
  {
    key: "happy-bamboo.global.cart-label",
    label: "Cart panel label",
    description:
      "Title at the top of the cart panel that slides out from the side.",
    type: "text",
    page: "global",
    group: "global.cart",
    defaultValue: "Your cart",
    placeholder: "Your cart",
  },
  {
    key: "happy-bamboo.global.cart-empty-text",
    label: "Empty cart message",
    description:
      "Line shown under \"Your cart is empty\" in the cart panel and on the full cart page. Leave blank to hide.",
    type: "text",
    page: "global",
    group: "global.cart",
    defaultValue: "Add something you love to get started.",
    placeholder: "Add something you love to get started.",
  },
];

const globalAuthenticationData: TemplateField[] = [
  {
    key: "happy-bamboo.global.authentication-image",
    label: "Background image",
    description: "Image shown on the sign-in and sign-up screens.",
    type: "image",
    page: "global",
    group: "global.authentication",
    gridColumn: "col-span-full",
    defaultValue: "/placeholder.svg",
  },

  {
    key: "happy-bamboo.global.logo-size-width",
    label: "Logo width (px)",
    description: "Width of the logo on the sign-in and sign-up screens.",
    type: "number",
    page: "global",
    group: "global.authentication",
    gridColumn: "col-span-1",
    defaultValue: "80",
    placeholder: "80",
    min: 24,
    max: 400,
    unit: "px",
  },
  {
    key: "happy-bamboo.global.logo-size-height",
    label: "Logo height (px)",
    description: "Height of the logo on the sign-in and sign-up screens.",
    type: "number",
    page: "global",
    group: "global.authentication",
    gridColumn: "col-span-1",
    defaultValue: "80",
    placeholder: "80",
    min: 24,
    max: 400,
    unit: "px",
  },
];

/// BLOG POST CTA
const blogPostCtaData: TemplateField[] = [
  {
    key: "happy-bamboo.blog.post-cta-heading",
    label: "Heading",
    description:
      "Heading in the closing banner at the end of every blog post. The banner is hidden when this and the body text are both blank.",
    type: "text",
    page: "blog",
    group: "blog.post",
    gridColumn: "col-span-full",
    defaultValue: "Bring Bamboo Home",
    placeholder: "Bring Bamboo Home",
  },
  {
    key: "happy-bamboo.blog.post-cta-body",
    label: "Body text",
    description:
      "Supporting text in the closing banner. The banner is hidden when this and the heading are both blank.",
    type: "textarea",
    page: "blog",
    group: "blog.post",
    gridColumn: "col-span-full",
    defaultValue:
      "Explore tree-free, thoughtfully made essentials — crafted for everyday comfort.",
    placeholder: "Explore tree-free, thoughtfully made essentials...",
  },
  {
    key: "happy-bamboo.blog.post-cta-button-text",
    label: "Button text",
    description:
      "Label for the banner's button. Leave this or the link blank to hide the button.",
    type: "text",
    page: "blog",
    group: "blog.post",
    gridColumn: "col-span-1",
    defaultValue: "Shop Now",
    placeholder: "Shop Now",
  },
  {
    key: "happy-bamboo.blog.post-cta-button-link",
    label: "Button link",
    description: "Where the button goes, e.g. /shop.",
    type: "url",
    page: "blog",
    group: "blog.post",
    gridColumn: "col-span-1",
    defaultValue: "/shop",
    placeholder: "/shop",
  },
];

const fieldGroups: TemplateFieldGroup[] = [
  {
    id: "homepage.hero",
    title: "Hero",
    description: "Photo, headline, and button in the main banner at the top of the homepage.",
    icon: "🎯",
    columns: 2,
  },
  {
    id: "homepage.featured",
    title: "Featured products",
    description: "Grid of products from your shop, with a heading and link below.",
    icon: "📦",
    columns: 2,
  },
  {
    id: "homepage.benefits",
    title: "Benefits",
    description: "Heading, intro text, closing text, and benefit cards.",
    icon: "✨",
    columns: 2,
  },
  {
    id: "homepage.aboutTeaser",
    title: "Our story",
    description:
      "Video or photo block introducing your business, with a link to the full About page.",
    icon: "📄",
    columns: 2,
  },
  {
    id: "about.hero",
    title: "Hero",
    description:
      "Heading, mission and vision statements, closing statement, and photo at the top of the about page.",
    icon: "📖",
    columns: 2,
  },
  {
    id: "about.mission",
    title: "Mission banner",
    description: "Highlighted banner with a short mission statement below the hero.",
    icon: "🎯",
    columns: 2,
  },

  {
    id: "about.bamboo",
    title: "Why bamboo",
    description: "Heading, fact cards, and photo grid explaining why you use bamboo.",
    icon: "🎋",
    columns: 3,
  },
  {
    id: "about.services",
    title: "Services",
    description: "Heading, intro text, and service cards below the mission banner.",
    icon: "🛠️",
    columns: 2,
  },
  {
    id: "about.cta",
    title: "Image banner",
    description:
      "Full-width photo banner between the Why Bamboo and Connect With Us sections.",
    icon: "🖼️",
    columns: 2,
  },
  {
    id: "about.connect-with-us",
    title: "Connect with us",
    description:
      "Review prompt and social-follow cards below the Why Bamboo section.",
    icon: "💬",
    columns: 2,
  },
  {
    id: "homepage.testimonials",
    title: "Testimonials",
    description:
      "Heading for the testimonials block. Testimonials themselves are managed under Admin → Testimonials.",
    icon: "⭐",
    columns: 1,
  },
  {
    id: "homepage.cta",
    title: "Closing banner",
    description: "Heading, text, and up to two buttons at the bottom of the homepage.",
    icon: "🚀",
    columns: 2,
  },
  {
    id: "blog.listing",
    title: "Blog page",
    description: "Heading, intro text, and photo at the top of the blog page.",
    icon: "✍️",
    columns: 1,
  },
  {
    id: "blog.post",
    title: "End of post",
    description: "Closing banner shown at the end of every blog post.",
    icon: "✨",
    columns: 2,
  },
  {
    id: "collections.listing",
    title: "Collections page",
    description: "Heading and intro text at the top of the collections page.",
    icon: "🗂️",
    columns: 1,
  },
  {
    id: "collections.cta",
    title: "Closing banner",
    description: "Bottom banner with a heading, text, and button on the collections page.",
    icon: "🛒",
    columns: 2,
  },
  {
    id: "shop.listing",
    title: "Shop page",
    description:
      "Sale-badge format, plus heading and intro text at the top of the shop page.",
    icon: "🏪",
    columns: 1,
  },
  {
    id: "contact.info",
    title: "Contact details",
    description:
      "Heading, intro text, and photo at the top of the contact page. Your email, phone, address, and hours come from Settings.",
    icon: "📧",
    columns: 2,
  },
  {
    id: "contact.form",
    title: "Contact form",
    description:
      "Message shown after someone sends the contact form. Your email address comes from Settings.",
    icon: "✉️",
    columns: 2,
  },
  {
    id: "contact.faq",
    title: "FAQ",
    description:
      "Heading, intro text, and picked questions at the bottom of the contact page.",
    icon: "❓",
    columns: 1,
  },
  {
    id: "testimonials.page",
    title: "Testimonials page",
    description: "Small label and intro text at the top of the testimonials page.",
    icon: "🗣️",
    columns: 2,
  },
  {
    id: "global.cart",
    title: "Cart",
    description:
      "Wording inside the cart panel that slides out from the side.",
    icon: "🛍️",
    columns: 2,
  },
  {
    id: "global.authentication",
    title: "Sign-in screens",
    description: "Background image and logo size on the sign-in and sign-up screens.",
    icon: "🔐",
    columns: 2,
  },
];

export const happyBambooData = {
  "happy-bamboo": [
    ...homepageHeroData,
    ...homepageFeaturedData,
    ...homepageBenefitsData,
    ...homepageAboutTeaserData,
    ...homepageTestimonialsData,
    ...testimonialsPageData,
    ...homepageCtaData,
    ...aboutHeroData,
    ...aboutMissionData,
    ...aboutServicesData,
    ...aboutBambooData,
    ...aboutCTAData,
    ...aboutConnectWithUsData,
    ...contactPageData,
    ...contactFormData,
    ...contactFaqData,
    ...blogListingData,
    ...blogPostCtaData,
    ...collectionsListingData,
    ...collectionsCtaData,
    ...shopListingData,
    ...happyBambooProductData,
    ...happyBambooCheckoutUnavailableData,
    ...globalCartData,
    ...globalAuthenticationData,
  ],
};

export const happyBambooFieldGroups = {
  "happy-bamboo": [
    ...fieldGroups,
    ...happyBambooProductFieldGroups,
    ...happyBambooCheckoutUnavailableFieldGroups,
  ],
};

///RESOLVERS

export const _bambooFieldMap = new Map(
  happyBambooData["happy-bamboo"].map((field) => [field.key, field]),
);

export function resolveFields(
  customFields: unknown,
  keys: string[],
): Record<string, string> {
  return resolveTemplateFields(customFields, keys, _bambooFieldMap);
}

/// DEFAULTS

export const DEFAULT_HAPPY_BAMBOO_BAMBOO_LIST: GenericIconRow[] = [
  {
    icon: TreeDeciduous,
    title: "Saves Trees & Wildlife",
    description:
      "Bamboo grows up to 3 feet per day and regenerates without replanting, protecting forests and wildlife habitats.",
  },
  {
    icon: Droplets,
    title: "Uses Less Water",
    description:
      "Bamboo requires significantly less water than traditional tree farming, conserving precious water resources.",
  },
  {
    icon: Recycle,
    title: "Naturally Renewable",
    description:
      "As one of the fastest-growing plants on Earth, bamboo is a truly sustainable and renewable resource.",
  },
  {
    icon: Shield,
    title: "Naturally Antibacterial",
    description:
      "Bamboo has natural antibacterial properties, making it hygienic and safe for personal care products.",
  },
  {
    icon: Leaf,
    title: "Carbon Absorption",
    description:
      "Bamboo absorbs more CO2 and releases more oxygen than equivalent stands of trees, fighting climate change.",
  },
  {
    icon: Heart,
    title: "Soft & Strong",
    description:
      "Bamboo fibers create a product that is both incredibly soft and durable, providing superior comfort.",
  },
];

export const DEFAULT_HAPPY_BAMBOO_SERVICES_LIST: GenericIconRow[] = [
  {
    icon: Heart,
    title: "Premium 3-Ply Toilet Tissue",
    description:
      "Crafted from the softest bamboo fibers. Each roll contains 300 sheets of luxurious softness, ensuring a gentle touch for you and your family.",
  },
  {
    icon: Recycle,
    title: "100% Biodegradable",
    description:
      "Our products are made from 100% biodegradable materials, helping to reduce waste and promote a greener future.",
  },
  {
    icon: Shield,
    title: "Chemical & Hypoallergenic Free",
    description:
      "Our products are free from harmful chemicals, making them safe for sensitive skin and better for your health.",
  },
  {
    icon: Leaf,
    title: "Eco-Friendly Packaging",
    description:
      "Sustainable packaging that minimizes environmental impact while keeping your products fresh and protected.",
  },
];
