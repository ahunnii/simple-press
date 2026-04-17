import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  ExternalLink,
  Flower2,
  HandHelping,
  MapIcon,
} from "lucide-react";

import type { RouterOutputs } from "~/trpc/react";
import { api } from "~/trpc/server";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { buttonVariants } from "~/components/ui/button";
import {
  FadeIn,
  StaggerContainer,
  StaggerItem,
} from "~/components/page-animations";
import {
  getListFieldValue,
  parseTemplateIconListRows,
  parseTemplateListRows,
} from "~/lib/template-fields";

import { resolveFields } from ".";
import { PollenGeneralLayout } from "./layout/pollen-general-layout";
import { PollenTestimonialsSection } from "./testimonials/pollen-testimonials-section";

type Props = {
  business: NonNullable<RouterOutputs["business"]["simplifiedGet"]>;
};

const DEFAULT_SERVICES = [
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

const DEFAULT_FAQS = [
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

export async function PollenServicesPage({ business }: Props) {
  const customFields = business?.siteContent?.customFields;

  const f = resolveFields(customFields, [
    "pollen.services.page-title",
    "pollen.services.page-subtitle",
    "pollen.services.title",
    "pollen.services.subtitle",
    "pollen.services.text",
    "pollen.services.contact-button-text",
    "pollen.services.faq-label",
    "pollen.services.faq-heading",
    "pollen.services.faq-description",
    "pollen.services.faq-image",
    "pollen.services.faq-contact-button-text",
    "pollen.services.resources-label",
    "pollen.services.resources-title",
    "pollen.testimonials.section-label",
    "pollen.testimonials.section-heading",
    "pollen.testimonials.view-all-text",
  ]);

  const testimonials = (await api.testimonial.listRandom({ limit: 3 })) ?? [];

  const services =
    parseTemplateIconListRows(
      getListFieldValue(customFields, "pollen.services.services-list"),
      DEFAULT_SERVICES,
    ) ?? DEFAULT_SERVICES;

  const rawFaqRows = parseTemplateListRows(
    getListFieldValue(customFields, "pollen.services.faq-list"),
  );
  const faqs =
    rawFaqRows.length > 0
      ? rawFaqRows
          .filter(
            (row): row is { question: string; answer: string } =>
              typeof row.question === "string" && !!row.question,
          )
          .map((row) => ({
            question: row.question,
            answer: typeof row.answer === "string" ? row.answer : "",
          }))
      : DEFAULT_FAQS;

  // Resource links are user-supplied URLs — read raw to preserve URLs as-is
  const rawFields =
    (customFields as Record<string, string> | null) ?? {};
  const resources: { name: string; url: string }[] = [];
  for (let i = 1; i <= 5; i++) {
    const name = rawFields[`pollen.services.resource-name-${i}`]?.trim() ?? "";
    const url = rawFields[`pollen.services.resource-link-${i}`]?.trim() ?? "";
    if (name && url) resources.push({ name, url });
  }

  return (
    <PollenGeneralLayout
      business={business}
      title={f["pollen.services.page-title"] ?? "Services"}
      subtitle={f["pollen.services.page-subtitle"] ?? "What We Do"}
    >
      {/* Services Overview */}
      <section className="bg-[#d4e8d4] py-20 md:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-16">
            <FadeIn direction="up">
              <div className="lg:max-w-lg">
                <p className="mb-4 text-sm font-semibold tracking-wider text-[#2a351f] uppercase">
                  {f["pollen.services.subtitle"]}
                </p>
                <h2 className="mb-6 text-3xl leading-tight font-bold text-balance text-[#374151] md:text-4xl">
                  {f["pollen.services.title"]}
                </h2>
                <p className="mb-8 leading-relaxed whitespace-pre-line text-[#4b5563]">
                  {f["pollen.services.text"]}
                </p>
                <Link
                  href={"/contact"}
                  className={buttonVariants({
                    size: "lg",
                    className:
                      "gap-2 bg-[#2a351f]! text-white hover:bg-[#3d4d2f]!",
                  })}
                >
                  {f["pollen.services.contact-button-text"] ?? "Get in Touch"}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </FadeIn>

            <StaggerContainer className="grid gap-6 sm:grid-cols-2">
              {services.map((service) => (
                <StaggerItem key={service.title}>
                  <div className="flex h-full flex-col rounded-2xl bg-white p-6 shadow-sm">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center">
                      <service.icon className="h-6 w-6 text-[#5e8b4a]" />
                    </div>
                    <h3 className="mb-3 font-bold text-[#374151]">
                      {service.title}
                    </h3>
                    <p className="min-h-0 flex-1 text-sm leading-relaxed text-[#6b7280]">
                      {service.description}
                    </p>
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="bg-white py-20 md:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <FadeIn
              direction="right"
              className="relative aspect-square overflow-hidden rounded-2xl"
            >
              <Image
                src={f["pollen.services.faq-image"] ?? "/placeholder.svg"}
                alt="Potted plant with green leaves"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </FadeIn>

            <FadeIn direction="left" delay={0.1}>
              <div>
                <p className="mb-4 text-sm font-semibold tracking-wider text-[#2a351f] uppercase">
                  {f["pollen.services.faq-label"]}
                </p>
                <h2 className="mb-4 text-3xl font-bold text-[#374151] md:text-4xl">
                  {f["pollen.services.faq-heading"]}
                </h2>
                <p className="mb-8 leading-relaxed text-[#6b7280]">
                  {f["pollen.services.faq-description"]}
                </p>

                <Accordion type="single" collapsible className="mb-8">
                  {faqs.map((faq, index) => (
                    <AccordionItem key={index} value={`faq-${index}`}>
                      <AccordionTrigger className="text-left text-[#374151]">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-[#6b7280]">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>

                <Link
                  href={"/contact"}
                  className={buttonVariants({
                    size: "lg",
                    variant: "outline",
                    className:
                      "border-[#374151] text-[#374151] hover:bg-[#374151]",
                  })}
                >
                  {f["pollen.services.faq-contact-button-text"] ?? "Contact Us"}
                </Link>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Helpful Resources Section */}
      {resources.length > 0 && (
        <section className="bg-[#E5E8E0] py-20 md:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <FadeIn direction="up">
              <p className="mb-4 text-sm font-semibold tracking-wider text-[#2a351f] uppercase">
                {f["pollen.services.resources-label"]}
              </p>
              <h2 className="mb-12 text-3xl font-bold text-[#374151] md:text-4xl">
                {f["pollen.services.resources-title"]}
              </h2>
            </FadeIn>
            <StaggerContainer
              className={`grid gap-6 ${
                resources.length === 1
                  ? "mx-auto max-w-md grid-cols-1"
                  : resources.length === 2
                    ? "mx-auto max-w-3xl sm:grid-cols-2"
                    : "sm:grid-cols-2 lg:grid-cols-3"
              }`}
            >
              {resources.map((resource) => (
                <StaggerItem key={resource.url} className="h-full">
                  <Link
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-full items-center gap-3 rounded-2xl bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
                  >
                    <ExternalLink className="h-5 w-5 shrink-0 text-[#5e8b4a]" />
                    <span className="font-medium text-[#374151]">
                      {resource.name}
                    </span>
                  </Link>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </section>
      )}

      {/* Testimonials Section */}
      <PollenTestimonialsSection
        testimonials={testimonials}
        sectionLabel={f["pollen.testimonials.section-label"]}
        sectionHeading={f["pollen.testimonials.section-heading"]}
        viewAllText={f["pollen.testimonials.view-all-text"]}
      />
    </PollenGeneralLayout>
  );
}
