import { BookOpen, Flower2, HandHelping, MapIcon } from "lucide-react";

import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

export const pollenServicesFieldGroups: TemplateFieldGroup[] = [
  {
    id: "products.main",
    title: "Services Main",
    description: "Page hero and main section for the services page",
    icon: "🎯",
    columns: 2,
  },
  {
    id: "products.faq",
    title: "Frequently Asked Questions",
    description: "FAQs section for the services page",
    icon: "💬",
    columns: 2,
  },
  {
    id: "products.resources",
    title: "Helpful Resources",
    description:
      "Up to 5 free resources (name + link) for clients. Leave name and link blank to hide a slot.",
    icon: "🔗",
    columns: 2,
  },
];

const servicesPageData: TemplateField[] = [
  {
    key: "pollen.services.page-title",
    label: "Page Title",
    description: "Main heading shown in the services page hero",
    type: "text",
    page: "services",
    group: "products.main",
    gridColumn: "col-span-1",
    defaultValue: "Services",
    placeholder: "Services",
  },
  {
    key: "pollen.services.page-subtitle",
    label: "Page Subtitle",
    description: "Small label shown above the page title",
    type: "text",
    page: "services",
    group: "products.main",
    gridColumn: "col-span-1",
    defaultValue: "What We Do",
    placeholder: "What We Do",
  },
  {
    key: "pollen.services.title",
    label: "Services Section Heading",
    description: "Heading for the services overview section",
    type: "text",
    page: "services",
    group: "products.main",
    gridColumn: "col-span-1",
    defaultValue: "About Our Services",
    placeholder: "Our Services",
  },
  {
    key: "pollen.services.subtitle",
    label: "Services Section Label",
    description: "Small label above the services heading",
    type: "text",
    page: "services",
    group: "products.main",
    gridColumn: "col-span-1",
    defaultValue: "What We Do",
    placeholder: "What We Do",
  },
  {
    key: "pollen.services.text",
    label: "Services Text",
    description: "Paragraph below the services section heading",
    type: "textarea",
    page: "services",
    group: "products.main",
    gridColumn: "col-span-full",
    defaultValue:
      "Whatever you need, we're here to help — from first consultation to final delivery. Reach out and let's talk through the details.",
    placeholder:
      "Whatever you need, we're here to help — from first consultation to final delivery.",
  },
  {
    key: "pollen.services.contact-button-text",
    label: "Contact Button Text",
    description: "Text for the contact button in the services overview",
    type: "text",
    page: "services",
    group: "products.main",
    gridColumn: "col-span-1",
    defaultValue: "Get in Touch",
    placeholder: "Get in Touch",
  },
  {
    key: "pollen.services.contact-button-link",
    label: "Contact Button Link",
    description: "Link for the contact button in the services overview",
    type: "url",
    page: "services",
    group: "products.main",
    gridColumn: "col-span-1",
    defaultValue: "/contact",
    placeholder: "/contact",
  },
  {
    key: "pollen.services.services-list",
    label: "Service Cards",
    description:
      "Cards shown in the services section (icon, title, and description per item). Add up to 8.",
    type: "list",
    page: "services",
    group: "products.main",
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

const servicesQuestionsData: TemplateField[] = [
  {
    key: "pollen.services.faq-label",
    label: "FAQ Section Label",
    description: "Small label shown above the FAQ heading",
    type: "text",
    page: "services",
    group: "products.faq",
    gridColumn: "col-span-1",
    defaultValue: "You Have Questions?",
    placeholder: "You Have Questions?",
  },
  {
    key: "pollen.services.faq-heading",
    label: "FAQ Section Heading",
    description: "Main heading for the FAQ section",
    type: "text",
    page: "services",
    group: "products.faq",
    gridColumn: "col-span-1",
    defaultValue: "Frequently Asked Questions",
    placeholder: "Frequently Asked Questions",
  },
  {
    key: "pollen.services.faq-description",
    label: "FAQ Section Description",
    description: "Quick little blurb explaining the importance of the FAQs",
    type: "textarea",
    page: "services",
    group: "products.faq",
    gridColumn: "col-span-full",
    defaultValue:
      "Have questions? We have answers. Browse our most frequently asked questions below.",
    placeholder:
      "Have questions? We have answers. Browse our most frequently asked questions below.",
  },
  {
    key: "pollen.services.faq-image",
    label: "FAQ Section Image",
    description: "Image for the FAQ section",
    type: "image",
    page: "services",
    group: "products.faq",
    gridColumn: "col-span-full",
    defaultValue: "/placeholder.svg",
    placeholder: "/placeholder.svg",
  },
  {
    key: "pollen.services.faq-contact-button-text",
    label: "FAQ Contact Button Text",
    description: "Text for the contact button below the FAQs",
    type: "text",
    page: "services",
    group: "products.faq",
    gridColumn: "col-span-1",
    defaultValue: "Contact Us",
    placeholder: "Contact Us",
  },
  {
    key: "pollen.services.faq-contact-button-link",
    label: "FAQ Contact Button Link",
    description: "Link for the contact button below the FAQs",
    type: "url",
    page: "services",
    group: "products.faq",
    gridColumn: "col-span-1",
    defaultValue: "/contact",
    placeholder: "/contact",
  },
  {
    key: "pollen.services.faq-list",
    label: "Frequently Asked Questions",
    description:
      "Questions and answers shown in the FAQ accordion. Add up to 10.",
    type: "list",
    page: "services",
    group: "products.faq",
    gridColumn: "col-span-full",
    itemSchema: [
      {
        key: "question",
        label: "Question",
        type: "text",
        description: "The question",
        placeholder: "e.g. How do I get started?",
      },
      {
        key: "answer",
        label: "Answer",
        type: "textarea",
        description: "The answer",
        placeholder: "e.g. Simply reach out through our contact form...",
      },
    ],
    minItems: 0,
    maxItems: 10,
  },
];

const servicesResourcesData: TemplateField[] = [
  {
    key: "pollen.services.resources-label",
    label: "Resources Section Label",
    description: "Small label shown above the resources heading",
    type: "text",
    page: "services",
    group: "products.resources",
    gridColumn: "col-span-full",
    defaultValue: "Free for you",
    placeholder: "Free for you",
  },
  {
    key: "pollen.services.resources-title",
    label: "Section Heading",
    description:
      "Heading for the helpful resources section (e.g. Helpful Resources)",
    type: "text",
    page: "services",
    group: "products.resources",
    gridColumn: "col-span-full",
    defaultValue: "Helpful Resources",
    placeholder: "Helpful Resources",
  },
  {
    key: "pollen.services.resources-list",
    label: "Resources List",
    description: "Resources shown in the resources section. Add up to 10.",
    type: "list",
    page: "services",
    group: "products.resources",
    gridColumn: "col-span-full",
    itemSchema: [
      {
        key: "name",
        label: "Name",
        type: "text",
        description: "The name",
        placeholder: "e.g. Resource Name",
      },
      {
        key: "url",
        label: "URL",
        type: "textarea",
        description: "The URL",
        placeholder: "e.g. https://...",
      },
    ],
    minItems: 0,
    maxItems: 12,
  },
];

export const pollenServicesData = [
  ...servicesPageData,
  ...servicesQuestionsData,
  ...servicesResourcesData,
];

export const DEFAULT_POLLEN_SERVICES = [
  {
    icon: Flower2,
    title: "Service One",
    description:
      "We offer a wide range of services to meet your needs. Contact us to learn more.",
  },
  {
    icon: HandHelping,
    title: "Service Two",
    description:
      "We offer a wide range of services to meet your needs. Contact us to learn more.",
  },
  {
    icon: MapIcon,
    title: "Service Three",
    description:
      "We offer a wide range of services to meet your needs. Contact us to learn more.",
  },
  {
    icon: BookOpen,
    title: "Service Four",
    description:
      "We offer a wide range of services to meet your needs. Contact us to learn more.",
  },
];

export const DEFAULT_POLLEN_FAQS = [
  {
    question: "How do I get started?",
    answer:
      "Simply reach out through our contact form and we'll get back to you within one business day.",
  },
  {
    question: "What areas do you serve?",
    answer:
      "We serve clients locally and remotely. Contact us to confirm availability in your area.",
  },
  {
    question: "Do you offer free consultations?",
    answer:
      "Yes! We offer a free 30-minute consultation to discuss your needs and how we can help.",
  },
];
