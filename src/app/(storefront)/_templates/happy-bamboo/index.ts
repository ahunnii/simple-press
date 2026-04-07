import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

const homepageHeroData: TemplateField[] = [
  {
    key: "happy-bamboo.homepage.hero-image",
    label: "Homepage Hero Image",
    description:
      "This image is used as the main focal point of the hero section.",
    type: "image",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
  },
  {
    key: "happy-bamboo.homepage.hero-welcome",
    label: "Homepage Hero Welcome",
    description: "Welcome text for the hero section",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "Welcome to",
  },
  {
    key: "happy-bamboo.homepage.hero-title",
    label: "Homepage Hero Title",
    description: "Title for the hero section",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "Elevate Your Everyday",
  },
  {
    key: "happy-bamboo.homepage.hero-tagline",
    label: "Homepage Hero Tagline",
    description: "Tagline for the hero section, above the title.",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
  },
  {
    key: "happy-bamboo.homepage.hero-description",
    label: "Homepage Hero Description",
    description: "Description for the hero section",
    type: "textarea",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
    defaultValue:
      "Luxuriously soft, tree-free happy-bamboo paper products crafted in Detroit. Because what you bring into your home should be as thoughtful as the life you build in it.",
  },
  {
    key: "happy-bamboo.homepage.hero-primary-button-text",
    label: "Hero Primary Button Text",
    description: "Primary CTA button text (e.g. Shop Now)",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "Shop Now",
  },
  {
    key: "happy-bamboo.homepage.hero-primary-button-link",
    label: "Hero Primary Button Link",
    description: "Primary CTA button URL",
    type: "url",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "/shop",
  },
];

const homepageAboutTeaserData: TemplateField[] = [
  {
    key: "happy-bamboo.homepage-about-heading",
    label: "About Section Heading",
    description: "Heading for the about block",
    type: "text",
    page: "homepage",
    group: "homepage.aboutTeaser",
    gridColumn: "col-span-full",
    defaultValue: "Our Vision for a Sustainable Future",
    placeholder: "Our Vision for a Sustainable Future",
  },
  {
    key: "happy-bamboo.homepage-about-body",
    label: "About Teaser Body",
    description: "Body text for the about teaser",
    type: "richtext",
    page: "homepage",
    gridColumn: "col-span-full",
    group: "homepage.aboutTeaser",
  },
  {
    key: "happy-bamboo.homepage-about-video",
    label: "About Section Video",
    description: "Video shown in the homepage about section",
    type: "video",
    page: "homepage",
    group: "homepage.aboutTeaser",
    defaultValue: "https://www.w3schools.com/html/mov_bbb.mp4",
  },
  {
    key: "happy-bamboo.homepage-about-video-poster",
    label: "About Section Video Poster",
    description: "Poster image for the about section video",
    type: "image",
    page: "homepage",
    group: "homepage.aboutTeaser",
    defaultValue: "/placeholder.svg",
  },
  {
    key: "happy-bamboo.homepage-about-image",
    label: "About Section Image",
    description: "Image for the about section, appears below the video",
    type: "image",
    page: "homepage",
    group: "homepage.aboutTeaser",
    defaultValue: "/placeholder.svg",
  },
  {
    key: "happy-bamboo.homepage-about-button-text",
    label: "About Button Text",
    description: "Learn More button text",
    type: "text",
    page: "homepage",
    group: "homepage.aboutTeaser",
    defaultValue: "Learn More",
    placeholder: "Learn More",
  },
  {
    key: "happy-bamboo.homepage-about-button-link",
    label: "About Button Link",
    description: "Link for the about button",
    type: "url",
    page: "homepage",
    group: "homepage.aboutTeaser",
    defaultValue: "/about",
    placeholder: "/about",
  },
];

const homepageFeaturedData: TemplateField[] = [
  {
    key: "happy-bamboo.homepage-featured-title",
    label: "Featured Section Title",
    description: "Title for the featured products section",
    type: "text",
    page: "homepage",
    group: "homepage.featured",
    defaultValue: "Our Curated Collection",
  },
  {
    key: "happy-bamboo.homepage-featured-description",
    label: "Featured Section Description",
    description: "Description below the featured section title",
    type: "textarea",
    page: "homepage",
    group: "homepage.featured",
    defaultValue:
      "Every product is 100% happy-bamboo, tree-free, and crafted to the highest standard. No compromises.",
  },
  {
    key: "happy-bamboo.homepage-featured-button-text",
    label: "View All Button Text",
    description: "Text for the View All Products button",
    type: "text",
    page: "homepage",
    group: "homepage.featured",
    defaultValue: "View All Products",
  },
  {
    key: "happy-bamboo.homepage-featured-button-link",
    label: "View All Button Link",
    description: "Link for the View All Products button",
    type: "url",
    page: "homepage",
    group: "homepage.featured",
    defaultValue: "/shop",
  },
];

const homepageBenefitsData: TemplateField[] = [
  {
    key: "happy-bamboo.homepage-benefits-heading",
    label: "Benefits Section Heading",
    description: "Main heading for the Why Choose Bamboo Products section",
    type: "text",
    page: "homepage",
    group: "homepage.benefits",
    gridColumn: "col-span-full",
    defaultValue: "Why Choose Bamboo Products?",
    placeholder: "Why Choose Bamboo Products?",
  },
  {
    key: "happy-bamboo.homepage-benefits-intro",
    label: "Benefits Section Intro",
    description: "Intro paragraph below the heading",
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
    label: "Benefits Section Closing",
    description: "Closing paragraph below the benefits cards",
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
    label: "Benefits Cards",
    description:
      "Cards for the Why Choose Bamboo Products section (icon, title, and description per item).",
    type: "list",
    page: "homepage",
    group: "homepage.benefits",
    gridColumn: "col-span-full",
    itemSchema: [
      {
        key: "icon",
        label: "Icon",
        type: "icon",
        description: "Icon shown on the card",
      },
      {
        key: "title",
        label: "Title",
        type: "text",
        description: "Card heading",
      },
      {
        key: "description",
        label: "Description",
        type: "textarea",
        description: "Supporting text",
      },
    ],
    minItems: 0,
    maxItems: 24,
  },
];

/// ABOUT PAGE
const aboutHeroData: TemplateField[] = [
  {
    key: "happy-bamboo.about-hero-heading",
    label: "About Hero Heading",
    description: "Main heading for the about page",
    type: "text",
    page: "about",
    group: "about.hero",
    defaultValue: "Zaires Visions",
    placeholder: "Zaires Visions",
    gridColumn: "col-span-full",
  },
  {
    key: "happy-bamboo.about-hero-mission",
    label: "About Hero Mission",
    description: "Mission statement for the about page",
    type: "textarea",
    page: "about",
    group: "about.hero",
    gridColumn: "col-span-full",
    placeholder: "To offer eco-friendly, chemical and hypoallergenic free...",
    defaultValue: "To offer eco-friendly, chemical and hypoallergenic free...",
  },
  {
    key: "happy-bamboo.about-hero-vision",
    label: "About Hero Vision",
    description: "Vision statement for the about page",
    type: "textarea",
    page: "about",
    group: "about.hero",
    gridColumn: "col-span-full",
    placeholder: "A world where everyday personal care choices protect...",
    defaultValue: "A world where everyday personal care choices protect...",
  },

  {
    key: "happy-bamboo.about-hero-bamboo",
    label: "About Hero Bamboo",
    description: "Bamboo statement for the about page",
    type: "textarea",
    page: "about",
    group: "about.hero",
    gridColumn: "col-span-full",
    placeholder: "By choosing Happy Bamboo...",
    defaultValue: "By choosing Happy Bamboo...",
  },
  {
    key: "happy-bamboo.about-hero-image",
    label: "About Hero Image",
    description: "Image for the about page",
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
    label: "Mission Banner",
    description: "Mission banner for the about page",
    type: "richtext",
    page: "about",
    group: "about.mission",
    gridColumn: "col-span-full",
    placeholder: "Join us in our mission to make everyday moments...",
  },
];

const aboutServicesData: TemplateField[] = [
  {
    key: "happy-bamboo.about-services-heading",
    label: "Services Heading",
    description: "Services heading for the about page",
    type: "text",
    page: "about",
    group: "about.services",
    defaultValue: "Our Services",
    placeholder: "Our Services",
    gridColumn: "col-span-full",
  },
  {
    key: "happy-bamboo.about-services-banner",
    label: "Services Banner",
    description: "Mission banner for the about page",
    type: "textarea",
    page: "about",
    group: "about.services",
    gridColumn: "col-span-full",
    placeholder: "Join us in our mission to make everyday moments...",
    defaultValue:
      "We provide premium bamboo personal care products designed for comfort, sustainability, and your well-being.",
  },
  {
    key: "happy-bamboo.about-services-list",
    label: "Services List",
    description: "Services list for the about page",
    type: "list",
    page: "about",
    group: "about.services",
    itemSchema: [
      {
        key: "icon",
        label: "Icon",
        type: "icon",
        description: "Icon shown on the card",
      },
      {
        key: "title",
        label: "Title",
        type: "text",
        description: "Card heading",
      },
      {
        key: "description",
        label: "Description",
        type: "textarea",
        description: "Supporting text",
      },
    ],
    minItems: 0,
    maxItems: 8,
  },
];

const aboutBambooData: TemplateField[] = [
  {
    key: "happy-bamboo.about-bamboo-heading",
    label: "Bamboo Heading",
    description: "Bamboo heading for the about page",
    type: "text",
    page: "about",
    group: "about.bamboo",
    defaultValue: "Why Bamboo Is Better",
    placeholder: "Why Bamboo Is Better",
    gridColumn: "col-span-full",
  },
  {
    key: "happy-bamboo.about-bamboo-tagline",
    label: "Bamboo Tagline",
    description: "Bamboo tagline for the about page",
    type: "text",
    page: "about",
    group: "about.bamboo",
    defaultValue: "A Smarter Choice for You and the Planet",
    placeholder: "A Smarter Choice for You and the Planet",
    gridColumn: "col-span-full",
  },
  {
    key: "happy-bamboo.about-bamboo-description",
    label: "Bamboo Description",
    description: "Description line for Bamboo section",
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
    label: "Bamboo Facts List",
    description: "Bamboo list for the about page",
    type: "list",
    page: "about",
    group: "about.bamboo",
    gridColumn: "col-span-full",
    itemSchema: [
      {
        key: "icon",
        label: "Icon",
        type: "icon",
        description: "Icon shown on the card",
      },
      {
        key: "title",
        label: "Title",
        type: "text",
        description: "Card heading",
      },
      {
        key: "description",
        label: "Description",
        type: "textarea",
        description: "Supporting text",
      },
    ],
    minItems: 0,
    maxItems: 24,
  },
  {
    key: "happy-bamboo.about-bamboo-image-1",
    label: "Bamboo Image 1",
    description: "Bamboo image 1 for the about page",
    type: "image",
    page: "about",
    group: "about.bamboo",
    gridColumn: "col-span-1",
    defaultValue: "/placeholder.svg",
  },
  {
    key: "happy-bamboo.about-bamboo-image-2",
    label: "Bamboo Image 2",
    description: "Bamboo image 2 for the about page",
    type: "image",
    page: "about",
    group: "about.bamboo",
    gridColumn: "col-span-1",
    defaultValue: "/placeholder.svg",
  },
  {
    key: "happy-bamboo.about-bamboo-image-3",
    label: "Bamboo Image 3",
    description: "Bamboo image 3 for the about page",
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
    label: "CTA Image",
    description: "CTA image for the about page",
    type: "image",
    page: "about",
    group: "about.cta",
    gridColumn: "col-span-full",
  },
];

const aboutConnectWithUsData: TemplateField[] = [
  {
    key: "happy-bamboo.about-connect-with-us-heading",
    label: "Connect With Us Heading",
    description: "Connect with us heading for the about page",
    type: "text",
    page: "about",
    group: "about.connect-with-us",
    gridColumn: "col-span-full",
    defaultValue: "Join the Happy Bamboo Community",
    placeholder: "Share Your Feedback",
  },
  {
    key: "happy-bamboo.about-connect-with-us-text",
    label: "Connect With Us Text",
    description: "Connect with us text for the about page",
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
    label: "Connect With Us QR Code",
    description: "Connect with us QR code for the about page",
    type: "image",
    page: "about",
    group: "about.connect-with-us",
    gridColumn: "col-span-1",
    defaultValue: "/placeholder.svg",
  },
  {
    key: "happy-bamboo.about-connect-with-us-google-review-link",
    label: "Connect With Us Google Review Link",
    description: "Connect with us Google review link for the about page",
    type: "url",
    page: "about",
    group: "about.connect-with-us",
    gridColumn: "col-span-1",
    defaultValue:
      "https://search.google.com/local/writereview?placeid=ChIJ008r2PrRJIgRaaMPENARjUc",
    placeholder: "https://search.google.com/local/writereview?placeid=",
  },
  {
    key: "happy-bamboo.about-connect-with-us-google-review-header",
    label: "Connect With Us Google Review Header",
    description: "Connect with us Google review text for the about page",
    type: "text",
    page: "about",
    group: "about.connect-with-us",
    gridColumn: "col-span-1",
    defaultValue: "Share Your Feedback",
    placeholder: "Share Your Feedback",
  },
  {
    key: "happy-bamboo.about-connect-with-us-google-review-text",
    label: "Connect With Us Google Review Text",
    description: "Connect with us Google review text for the about page",
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
    label: "Connect With Us Social Follow Header",
    description: "Connect with us Social follow header for the about page",
    type: "text",
    page: "about",
    group: "about.connect-with-us",
    gridColumn: "col-span-1",
    defaultValue: "Follow Our Journey",
    placeholder: "Follow Our Journey",
  },
  {
    key: "happy-bamboo.about-connect-with-us-social-follow-text",
    label: "Connect With Us Social Follow Text",
    description: "Connect with us Social follow text for the about page",
    type: "textarea",
    page: "about",
    group: "about.connect-with-us",
    gridColumn: "col-span-1",
    defaultValue:
      "Stay connected for exclusive updates, eco-tips, behind-the-scenes content, and special offers.",
    placeholder:
      "Stay connected for exclusive updates, eco-tips, behind-the-scenes content, and special offers.",
  },
];

/// CONTACT PAGE
const contactPageData: TemplateField[] = [
  {
    key: "happy-bamboo.contact.header",
    label: "Contact Page Header",
    description: "Main heading for the contact page",
    type: "text",
    page: "contact",
    group: "contact.info",
    gridColumn: "col-span-full",
    defaultValue: "Contact Us",
    placeholder: "Contact Us",
  },
  {
    key: "happy-bamboo.contact.subheader",
    label: "Contact Page Subheader",
    description: "Subheader or intro below the heading",
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
    label: "Contact Image",
    description: "Contact image for the contact page",
    type: "image",
    page: "contact",
    group: "contact.info",
    gridColumn: "col-span-full",
    defaultValue: "/placeholder.svg",
  },
];

const homepageTestimonialsData: TemplateField[] = [
  {
    key: "happy-bamboo.homepage-testimonials-heading",
    label: "Testimonials Section Heading",
    description: "Heading shown above the testimonials cards",
    type: "text",
    page: "homepage",
    group: "homepage.testimonials",
    gridColumn: "col-span-full",
    defaultValue: "What Consumers Say",
    placeholder: "What Consumers Say",
  },
];

const homepageCtaData: TemplateField[] = [
  {
    key: "happy-bamboo.homepage-cta-heading",
    label: "CTA Heading",
    description: "Main heading for the bottom call-to-action section",
    type: "text",
    page: "homepage",
    group: "homepage.cta",
    gridColumn: "col-span-full",
    defaultValue: "Ready to Make the Switch?",
    placeholder: "Ready to Make the Switch?",
  },
  {
    key: "happy-bamboo.homepage-cta-body",
    label: "CTA Body Text",
    description: "Paragraph below the CTA heading",
    type: "textarea",
    page: "homepage",
    group: "homepage.cta",
    gridColumn: "col-span-full",
    defaultValue:
      "Join thousands of eco-conscious households who have already made the switch to Happy Bamboo. Experience premium quality while making a positive impact on our planet.",
    placeholder: "Join thousands of eco-conscious households...",
  },
  {
    key: "happy-bamboo.homepage-cta-primary-button-text",
    label: "Primary Button Text",
    description: "Text for the primary CTA button",
    type: "text",
    page: "homepage",
    group: "homepage.cta",
    gridColumn: "col-span-1",
    defaultValue: "Shop Now",
    placeholder: "Shop Now",
  },
  {
    key: "happy-bamboo.homepage-cta-primary-button-link",
    label: "Primary Button Link",
    description: "URL for the primary CTA button",
    type: "url",
    page: "homepage",
    group: "homepage.cta",
    gridColumn: "col-span-1",
    defaultValue: "/shop",
    placeholder: "/shop",
  },
  {
    key: "happy-bamboo.homepage-cta-secondary-button-text",
    label: "Secondary Button Text",
    description: "Text for the secondary CTA button",
    type: "text",
    page: "homepage",
    group: "homepage.cta",
    gridColumn: "col-span-1",
    defaultValue: "Learn More",
    placeholder: "Learn More",
  },
  {
    key: "happy-bamboo.homepage-cta-secondary-button-link",
    label: "Secondary Button Link",
    description: "URL for the secondary CTA button",
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
    label: "Blog Page Title",
    description: "Main heading shown at the top of the blog listing page",
    type: "text",
    page: "blog",
    group: "blog.listing",
    gridColumn: "col-span-full",
    defaultValue: "The Happy Bamboo Blog",
    placeholder: "The Happy Bamboo Blog",
  },
  {
    key: "happy-bamboo.blog-listing-intro",
    label: "Blog Page Intro",
    description: "Introductory paragraph below the blog page title",
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
    label: "Blog Listing Image",
    description: "Image shown at the top of the blog listing page",
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
    label: "Collections Page Heading",
    description: "Main heading shown at the top of the collections page",
    type: "text",
    page: "collections",
    group: "collections.listing",
    gridColumn: "col-span-full",
    defaultValue: "Our Collections",
    placeholder: "Our Collections",
  },
  {
    key: "happy-bamboo.collections-listing-intro",
    label: "Collections Page Intro",
    description: "Intro paragraph below the collections page heading",
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
    label: "Collections CTA Heading",
    description:
      "Heading for the bottom call-to-action on the collections page",
    type: "text",
    page: "collections",
    group: "collections.cta",
    gridColumn: "col-span-full",
    defaultValue: "Can't Decide?",
    placeholder: "Can't Decide?",
  },
  {
    key: "happy-bamboo.collections-cta-body",
    label: "Collections CTA Body",
    description:
      "Paragraph for the bottom call-to-action on the collections page",
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
    label: "Collections CTA Button Text",
    description: "Text for the collections CTA button",
    type: "text",
    page: "collections",
    group: "collections.cta",
    gridColumn: "col-span-1",
    defaultValue: "View All Products",
    placeholder: "View All Products",
  },
  {
    key: "happy-bamboo.collections-cta-button-link",
    label: "Collections CTA Button Link",
    description: "URL for the collections CTA button",
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
    key: "happy-bamboo.shop-listing-heading",
    label: "Shop Page Heading",
    description: "Main heading shown at the top of the shop page",
    type: "text",
    page: "shop",
    group: "shop.listing",
    gridColumn: "col-span-full",
    defaultValue: "Shop Happy Bamboo",
    placeholder: "Shop Happy Bamboo",
  },
  {
    key: "happy-bamboo.shop-listing-intro",
    label: "Shop Page Intro",
    description: "Introductory paragraph below the shop page heading",
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
    label: "FAQ Section Title",
    description: "Heading shown above the frequently asked questions",
    type: "text",
    page: "contact",
    group: "contact.faq",
    gridColumn: "col-span-full",
    defaultValue: "Frequently Asked Questions",
    placeholder: "Frequently Asked Questions",
  },
  {
    key: "happy-bamboo.contact-faq-subtitle",
    label: "FAQ Section Subtitle",
    description: "Subtitle or intro line below the FAQ heading",
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
    label: "Frequently Asked Questions",
    description: "Frequently asked questions for the contact page",
    type: "list",
    page: "contact",
    group: "contact.faq",
    gridColumn: "col-span-full",
    itemSchema: [
      {
        key: "question",
        label: "Question",
        type: "text",
        description: "Question",
      },
      {
        key: "answer",
        label: "Answer",
        type: "textarea",
        description: "Answer",
      },
    ],
    minItems: 0,
    maxItems: 10,
  },
];

const globalAuthenticationData: TemplateField[] = [
  {
    key: "happy-bamboo.global.authentication-image",
    label: "Authentication Image",
    description: "Image shown in the authentication section",
    type: "image",
    page: "global",
    group: "global.authentication",
    gridColumn: "col-span-full",
    defaultValue: "/placeholder.svg",
  },

  {
    key: "happy-bamboo.global.logo-size-width",
    label: "Logo Size Width",
    description: "Size of the logo in the authentication section",
    type: "number",
    page: "global",
    group: "global.authentication",
    gridColumn: "col-span-1",
    defaultValue: "80",
    placeholder: "80",
  },
  {
    key: "happy-bamboo.global.logo-size-height",
    label: "Logo Size Height",
    description: "Size of the logo in the authentication section",
    type: "number",
    page: "global",
    group: "global.authentication",
    gridColumn: "col-span-1",
    defaultValue: "80",
    placeholder: "80",
  },

  {
    key: "happy-bamboo.global.image-overlay-color",
    label: "Image Overlay Color",
    description: "Color of the image overlay in the authentication section",
    type: "color",
    page: "global",
    group: "global.authentication",
    gridColumn: "col-span-1",
    defaultValue: "#000000",
    placeholder: "#000000",
  },
];

const fieldGroups: TemplateFieldGroup[] = [
  {
    id: "homepage.hero",
    title: "Hero Section",
    description: "Main banner area at the top of homepage",
    icon: "🎯",
    columns: 2,
  },
  {
    id: "homepage.featured",
    title: "Featured Products",
    description: "Featured products section title and description",
    icon: "📦",
    columns: 2,
  },
  {
    id: "homepage.benefits",
    title: "Benefits Section",
    description: "Section heading, intro text, closing text, and benefit cards",
    icon: "✨",
    columns: 2,
  },
  {
    id: "homepage.aboutTeaser",
    title: "About Teaser",
    description: "About teaser block on homepage",
    icon: "📄",
    columns: 2,
  },
  {
    id: "about.hero",
    title: "About Hero",
    description: "About page hero heading and intro",
    icon: "📖",
    columns: 2,
  },
  {
    id: "about.mission",
    title: "Our Mission",
    description: "Mission section heading and paragraphs",
    icon: "🎯",
    columns: 2,
  },

  {
    id: "about.bamboo",
    title: "Why Bamboo",
    description: "Bamboo section and bamboo facts",
    icon: "🎋",
    columns: 3,
  },
  {
    id: "about.services",
    title: "Services",
    description: "Services section heading and paragraphs",
    icon: "�",
    columns: 2,
  },
  {
    id: "about.cta",
    title: "About CTA",
    description: "About CTA section",
    icon: "💬",
    columns: 2,
  },
  {
    id: "about.connect-with-us",
    title: "Connect With Us",
    description: "Connect with us section on the about page",
    icon: "💬",
    columns: 2,
  },
  {
    id: "homepage.testimonials",
    title: "Testimonials",
    description:
      "Section heading for the testimonials block (content is pulled from your reviews)",
    icon: "⭐",
    columns: 1,
  },
  {
    id: "homepage.cta",
    title: "Call to Action",
    description: "Bottom call-to-action banner on the homepage",
    icon: "🚀",
    columns: 2,
  },
  {
    id: "blog.listing",
    title: "Blog Page",
    description: "Title and intro text for the blog listing page",
    icon: "✍️",
    columns: 1,
  },
  {
    id: "collections.listing",
    title: "Collections Page",
    description: "Heading and intro text for the collections listing page",
    icon: "🗂️",
    columns: 1,
  },
  {
    id: "collections.cta",
    title: "Collections Call to Action",
    description: "Bottom call-to-action block on the collections page",
    icon: "🛒",
    columns: 2,
  },
  {
    id: "shop.listing",
    title: "Shop Page",
    description: "Heading and intro text for the shop page",
    icon: "🏪",
    columns: 1,
  },
  {
    id: "contact.info",
    title: "Contact Info",
    description: "Contact page header, subheader, image, and contact details",
    icon: "📧",
    columns: 2,
  },
  {
    id: "contact.faq",
    title: "FAQ Section",
    description:
      "Heading and subtitle for the frequently asked questions section",
    icon: "❓",
    columns: 1,
  },
  {
    id: "global.authentication",
    title: "Authentication",
    description: "Authentication settings for your business",
    icon: "�",
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
    ...homepageCtaData,
    ...aboutHeroData,
    ...aboutMissionData,
    ...aboutServicesData,
    ...aboutBambooData,
    ...aboutCTAData,
    ...aboutConnectWithUsData,
    ...contactPageData,
    ...contactFaqData,
    ...blogListingData,
    ...collectionsListingData,
    ...collectionsCtaData,
    ...shopListingData,
    ...globalAuthenticationData,
  ],
};

export const happyBambooFieldGroups = {
  "happy-bamboo": fieldGroups,
};

const _bambooFieldMap = new Map(
  happyBambooData["happy-bamboo"].map((field) => [field.key, field]),
);

export function resolveFields(
  customFields: unknown,
  keys: string[],
): Record<string, string> {
  const raw =
    customFields != null &&
    typeof customFields === "object" &&
    !Array.isArray(customFields)
      ? (customFields as Record<string, string>)
      : {};
  const out: Record<string, string> = {};
  for (const key of keys) {
    const custom = raw[key]?.trim();
    out[key] = custom ?? _bambooFieldMap.get(key)?.defaultValue ?? "";
  }
  return out;
}
