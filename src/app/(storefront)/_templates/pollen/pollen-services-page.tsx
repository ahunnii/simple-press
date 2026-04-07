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

import { resolveFields } from ".";
import { PollenGeneralLayout } from "./pollen-general-layout";
import { PollenTestimonialsSection } from "./pollen-testimonials-section";

type Props = {
  business: NonNullable<RouterOutputs["business"]["simplifiedGet"]>;
};
export async function PollenServicesPage({ business }: Props) {
  const f = resolveFields(business?.siteContent?.customFields, [
    "pollen.services.title",
    "pollen.services.subtitle",
    "pollen.services.text",
    "pollen.services.service-1-name",
    "pollen.services.service-1-description",
    "pollen.services.service-2-name",
    "pollen.services.service-2-description",
    "pollen.services.service-3-name",
    "pollen.services.service-3-description",
    "pollen.services.service-4-name",
    "pollen.services.service-4-description",
    "pollen.services.faq-description",
    "pollen.services.faq-image",
    "pollen.services.faq-question-1",
    "pollen.services.faq-answer-1",
    "pollen.services.faq-question-2",
    "pollen.services.faq-answer-2",
    "pollen.services.faq-question-3",
    "pollen.services.faq-answer-3",
    "pollen.services.resources-title",
  ]);

  const testimonials = (await api.testimonial.listRandom({ limit: 3 })) ?? [];

  const services = [
    {
      icon: Flower2,
      title: f["pollen.services.service-1-name"],
      description: f["pollen.services.service-1-description"],
    },
    {
      icon: HandHelping,
      title: f["pollen.services.service-2-name"],
      description: f["pollen.services.service-2-description"],
    },
    {
      icon: MapIcon,
      title: f["pollen.services.service-3-name"],
      description: f["pollen.services.service-3-description"],
    },
    {
      icon: BookOpen,
      title: f["pollen.services.service-4-name"],
      description: f["pollen.services.service-4-description"],
    },
  ];

  const faqs = [
    {
      question: f["pollen.services.faq-question-1"],
      answer: f["pollen.services.faq-answer-1"],
    },
    {
      question: f["pollen.services.faq-question-2"],
      answer: f["pollen.services.faq-answer-2"],
    },
    {
      question: f["pollen.services.faq-question-3"],
      answer: f["pollen.services.faq-answer-3"],
    },
  ].filter((faq) => faq.question);

  // Resource links are user-supplied URLs so read raw fields directly
  const rawFields =
    (business?.siteContent?.customFields as Record<string, string> | null) ??
    {};
  const resources: { name: string; url: string }[] = [];
  for (let i = 1; i <= 5; i++) {
    const name = rawFields[`pollen.services.resource-name-${i}`]?.trim() ?? "";
    const url = rawFields[`pollen.services.resource-link-${i}`]?.trim() ?? "";
    if (name && url) resources.push({ name, url });
  }

  return (
    <PollenGeneralLayout
      business={business}
      title="Services"
      subtitle="What We Do"
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
                  {"Get in Touch"}
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
                  {"You Have Questions?"}
                </p>
                <h2 className="mb-4 text-3xl font-bold text-[#374151] md:text-4xl">
                  {"Frequently Asked Questions"}
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
                  Contact Us
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
                Free for you
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
      <PollenTestimonialsSection testimonials={testimonials} />
    </PollenGeneralLayout>
  );
}
