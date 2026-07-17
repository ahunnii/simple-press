import { BookOpen, Flower2, HandHelping, MapIcon } from "lucide-react";

import type {
  GenericImageRow,
  TemplateField,
  TemplateFieldGroup,
} from "~/lib/template-fields";

const homepageData: TemplateField[] = [
  {
    key: "pollen.homepage.hero-image",
    label: "Hero Image",
    description: "Image for the hero section",
    type: "image",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
    defaultValue: "/placeholder.svg",
  },
  {
    key: "pollen.homepage.hero-title",
    label: "Hero Title",
    description: "Title for the hero section",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "Welcome to Our Store",
    placeholder: "Welcome to Our Store",
  },
  {
    key: "pollen.homepage.hero-subtitle",
    label: "Hero Subtitle",
    description: "Subtitle for the hero section",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "Discover our amazing products",
    placeholder: "Discover our amazing products...",
  },
  {
    key: "pollen.homepage.hero-description-text",
    label: "Hero Description Text",
    description: "Description text for the hero section",
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
    label: "Hero Button Text",
    description: "Button text for the hero section",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "Get in Touch",
    placeholder: "Call to Action",
  },
  {
    key: "pollen.homepage.hero-button-link",
    label: "Hero Button Link",
    description: "Button link for the hero section",
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
    label: "Service Section Heading",
    description: "Heading for the service section",
    type: "text",
    page: "homepage",
    group: "homepage.services",
    gridColumn: "col-span-1",
    defaultValue: "About Our Services",
    placeholder: "About Our Services",
  },
  {
    key: "pollen.homepage.about-service-description",
    label: "Service Section Description",
    description: "Description for the service section",
    type: "textarea",
    page: "homepage",
    group: "homepage.services",
    gridColumn: "col-span-1",
    defaultValue: "We offer a range of services tailored to your needs.",
    placeholder: "Our services are ...",
  },
  {
    key: "pollen.homepage.services-list",
    label: "Service Cards",
    description:
      "Cards shown in the services section (icon, title, and description per item). Add up to 8.",
    type: "list",
    page: "homepage",
    group: "homepage.services",
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
        description: "Service name",
      },
      {
        key: "description",
        label: "Description",
        type: "textarea",
        description: "Brief description of the service",
      },
    ],
    minItems: 0,
    maxItems: 8,
  },
];

const homepageGalleryData: TemplateField[] = [
  {
    key: "pollen.homepage.gallery-label",
    label: "Gallery Label",
    description: "Label for the gallery section",
    type: "text",
    page: "homepage",
    group: "homepage.gallery",
    gridColumn: "col-span-1",
    defaultValue: "Gallery",
    placeholder: "Gallery Label",
  },
  {
    key: "pollen.homepage.gallery-heading",
    label: "Gallery Heading",
    description: "Heading for the gallery section",
    type: "textarea",
    page: "homepage",
    group: "homepage.gallery",
    gridColumn: "col-span-1",
    defaultValue: "Gallery Heading",
    placeholder: "Gallery Heading",
  },
  {
    key: "pollen.homepage.gallery-items",
    label: "Gallery Items",
    description:
      "Items shown in the gallery section (image, title, and description per item). Add up to 8.",
    type: "list",
    page: "homepage",
    group: "homepage.gallery",
    gridColumn: "col-span-full",
    itemSchema: [
      {
        key: "image",
        label: "Image",
        type: "image",
        description: "Image shown in the gallery",
      },
      {
        key: "label",
        label: "Label",
        type: "text",
        description: "Label of the gallery item",
      },
    ],
    minItems: 0,
    maxItems: 6,
  },
  {
    key: "pollen.homepage.gallery-button-text",
    label: "Gallery Button Text",
    description: "Button text for the gallery section",
    type: "text",
    page: "homepage",
    group: "homepage.gallery",
    gridColumn: "col-span-1",
    defaultValue: "View Gallery",
    placeholder: "View Gallery",
  },
  {
    key: "pollen.homepage.gallery-button-link",
    label: "Gallery Button Link",
    description: "Button link for the gallery section",
    type: "url",
    page: "homepage",
    group: "homepage.gallery",
    gridColumn: "col-span-1",
    defaultValue: "/gallery",
    placeholder: "/gallery",
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
    title: "Hero Section",
    description: "Main banner area at the top of homepage",
    icon: "🎯",
    columns: 2,
  },
  {
    id: "homepage.services",
    title: "Services Section",
    description: "Section heading and service cards on the homepage",
    icon: "🌿",
    columns: 1,
  },
  {
    id: "homepage.gallery",
    title: "Portfolio Gallery",
    description: "Section headings, button, and gallery image items",
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
