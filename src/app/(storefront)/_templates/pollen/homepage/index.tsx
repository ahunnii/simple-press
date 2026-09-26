import { BookOpen, Flower2, HandHelping, MapIcon } from "lucide-react";

import type {
  GenericImageRow,
  TemplateField,
  TemplateFieldGroup,
} from "~/lib/template-fields";

const homepageData: TemplateField[] = [
  {
    key: "pollen.homepage.hero-image",
    label: "Background image",
    description: "Full-screen background image behind the hero heading.",
    type: "image",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
    defaultValue: "/placeholder.svg",
  },
  {
    key: "pollen.homepage.hero-title",
    label: "Small label",
    description: "Short line above the main heading in the hero.",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "Welcome to Our Store",
    placeholder: "Welcome to Our Store",
  },
  {
    key: "pollen.homepage.hero-subtitle",
    label: "Heading",
    description:
      "Main heading in the hero. If left blank, the small label above is shown instead.",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "Discover our amazing products",
    placeholder: "Discover our amazing products...",
  },
  {
    key: "pollen.homepage.hero-description-text",
    label: "Body text",
    description: "Paragraph below the heading in the hero.",
    type: "textarea",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
    defaultValue:
      "Handcrafted goods made with care, sourced from people and places we trust. Take a look around and see what catches your eye.",
    placeholder:
      "Handcrafted goods made with care, sourced from people and places we trust.",
  },
  {
    key: "pollen.homepage.hero-button-text",
    label: "Button text",
    description: "Label on the hero's button.",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "Get in Touch",
    placeholder: "Get in Touch",
  },
  {
    key: "pollen.homepage.hero-button-link",
    label: "Button link",
    description: "Where the hero's button goes.",
    type: "url",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "/contact",
    placeholder: "/contact",
  },
];

const homepageServicesData: TemplateField[] = [
  {
    key: "pollen.homepage.about-service-title",
    label: "Small label",
    description:
      "Short line above the heading in the services section on the homepage.",
    type: "text",
    page: "homepage",
    group: "homepage.services",
    gridColumn: "col-span-1",
    defaultValue: "About Our Services",
    placeholder: "About Our Services",
  },
  {
    key: "pollen.homepage.about-service-description",
    label: "Heading",
    description: "Heading for the services section on the homepage.",
    type: "textarea",
    page: "homepage",
    group: "homepage.services",
    gridColumn: "col-span-1",
    defaultValue: "We offer a range of services tailored to your needs.",
    placeholder: "Our services are ...",
  },
  {
    key: "pollen.homepage.services-list",
    label: "Service cards",
    description:
      "Cards shown below the heading (icon, name, and description per card). Falls back to ready-made examples until you add your own. Add up to 8.",
    type: "list",
    page: "homepage",
    group: "homepage.services",
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
        label: "Name",
        type: "text",
        description: "Service name.",
      },
      {
        key: "description",
        label: "Description",
        type: "textarea",
        description: "One or two sentences about the service.",
      },
    ],
    minItems: 0,
    maxItems: 8,
  },
];

const homepageGalleryData: TemplateField[] = [
  {
    key: "pollen.homepage.gallery-label",
    label: "Small label",
    description: "Short line above the heading in the gallery section.",
    type: "text",
    page: "homepage",
    group: "homepage.gallery",
    gridColumn: "col-span-1",
    defaultValue: "Gallery",
    placeholder: "Gallery",
  },
  {
    key: "pollen.homepage.gallery-heading",
    label: "Heading",
    description: "Heading for the gallery section.",
    type: "textarea",
    page: "homepage",
    group: "homepage.gallery",
    gridColumn: "col-span-1",
    defaultValue: "Gallery Heading",
    placeholder: "e.g. Our Work",
  },
  {
    key: "pollen.homepage.gallery-items",
    label: "Photos",
    description:
      "Photos shown in the gallery grid (image and caption per photo). Falls back to ready-made examples until you add your own. Add up to 6.",
    type: "list",
    page: "homepage",
    group: "homepage.gallery",
    gridColumn: "col-span-full",
    itemLabel: "photo",
    summaryKey: "label",
    defaultsWhenEmpty: true,
    itemSchema: [
      {
        key: "image",
        label: "Image",
        type: "image",
        description: "Photo shown in the gallery.",
      },
      {
        key: "label",
        label: "Caption",
        type: "text",
        description: "Short caption shown over the photo.",
      },
    ],
    minItems: 0,
    maxItems: 6,
  },
  {
    key: "pollen.homepage.gallery-button-text",
    label: "Button text",
    description: "Label on the gallery section's button.",
    type: "text",
    page: "homepage",
    group: "homepage.gallery",
    gridColumn: "col-span-1",
    defaultValue: "View Gallery",
    placeholder: "View Gallery",
  },
  {
    key: "pollen.homepage.gallery-button-link",
    label: "Button link",
    description: "Where the gallery section's button goes.",
    type: "url",
    page: "homepage",
    group: "homepage.gallery",
    gridColumn: "col-span-1",
    defaultValue: "/contact",
    placeholder: "/contact",
  },
];

export const pollenHomepageData = [
  ...homepageData,
  ...homepageServicesData,
  ...homepageGalleryData,
];

export const pollenHomepageFieldGroups: TemplateFieldGroup[] = [
  {
    id: "homepage.hero",
    title: "Hero",
    description: "Full-screen banner at the top of the homepage.",
    icon: "🎯",
    columns: 2,
  },
  {
    id: "homepage.services",
    title: "Services",
    description: "Heading and service cards on the homepage.",
    icon: "🌿",
    columns: 1,
  },
  {
    id: "homepage.gallery",
    title: "Gallery",
    description: "Heading, photos, and button for the gallery grid.",
    icon: "🖼️",
    columns: 2,
  },
];

export const DEFAULT_POLLEN_HOMEPAGE_SERVICES = [
  {
    icon: Flower2,
    title: "Custom Orders",
    description: "One-of-a-kind pieces made to your specifications.",
  },
  {
    icon: HandHelping,
    title: "Personal Consultations",
    description: "One-on-one guidance to help you find the right fit.",
  },
  {
    icon: MapIcon,
    title: "Local Delivery",
    description: "Fast, friendly delivery right to your door.",
  },
  {
    icon: BookOpen,
    title: "Workshops & Classes",
    description: "Hands-on sessions to learn the craft yourself.",
  },
];

export const DEFAULT_POLLEN_GALLERY_ITEMS: GenericImageRow[] = [
  {
    label: "Location One",
    image:
      "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600&h=450&fit=crop",
  },
  {
    label: "Location Two",
    image:
      "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=600&h=450&fit=crop",
  },
  {
    label: "Location Three",
    image:
      "https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?w=600&h=450&fit=crop",
  },
  {
    label: "Location Four",
    image:
      "https://images.unsplash.com/photo-1558904541-efa843a96f01?w=600&h=450&fit=crop",
  },
  {
    label: "Location Five",
    image:
      "https://images.unsplash.com/photo-1598902108854-10e335adac99?w=600&h=450&fit=crop",
  },
  {
    label: "Location Six",
    image:
      "https://images.unsplash.com/photo-1592150621744-aca64f48394a?w=600&h=450&fit=crop",
  },
];
