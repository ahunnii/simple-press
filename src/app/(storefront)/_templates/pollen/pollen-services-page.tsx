import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Flower2,
  HandHelping,
  MapIcon,
  Users,
} from "lucide-react";

import type { RouterOutputs } from "~/trpc/react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { buttonVariants } from "~/components/ui/button";

import { PollenGeneralLayout } from "./pollen-general-layout";

type Props = {
  business: NonNullable<RouterOutputs["business"]["get"]>;
};
export function PollenServicesPage({ business }: Props) {
  const themeSpecificFields = business?.siteContent?.customFields as Record<
    string,
    string
  >;

  const services = [
    {
      icon: Flower2,
      title:
        themeSpecificFields["pollen.global.about-service-title-1"] ??
        "Service 1",
      description:
        themeSpecificFields["pollen.global.about-service-description-1"] ??
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    },
    {
      icon: HandHelping,
      title:
        themeSpecificFields["pollen.global.about-service-title-2"] ??
        "Service 2",
      description:
        themeSpecificFields["pollen.global.about-service-description-2"] ??
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    },
    {
      icon: MapIcon,
      title:
        themeSpecificFields["pollen.global.about-service-title-3"] ??
        "Service 3",
      description:
        themeSpecificFields["pollen.global.about-service-description-3"] ??
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    },
    {
      icon: BookOpen,
      title:
        themeSpecificFields["pollen.global.about-service-title-4"] ??
        "Service 4",
      description:
        themeSpecificFields["pollen.global.about-service-description-4"] ??
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    },
  ];

  const faqs = [
    {
      question:
        themeSpecificFields["pollen.services.faq-question-1"] ??
        "FAQ Question 1",
      answer:
        themeSpecificFields["pollen.services.faq-answer-1"] ?? "FAQ Answer 1",
    },
    {
      question:
        themeSpecificFields["pollen.services.faq-question-2"] ??
        "FAQ Question 2",
      answer:
        themeSpecificFields["pollen.services.faq-answer-2"] ?? "FAQ Answer 2",
    },
    {
      question:
        themeSpecificFields["pollen.services.faq-question-3"] ??
        "FAQ Question 3",
      answer:
        themeSpecificFields["pollen.services.faq-answer-3"] ?? "FAQ Answer 3",
    },
  ];

  const testimonials = [
    {
      quote:
        themeSpecificFields["pollen.services.testimonial-quote-1"] ??
        "Testimonial Quote 1",
      author:
        themeSpecificFields["pollen.services.testimonial-author-1"] ??
        "Testimonial Author 1",
    },
    {
      quote:
        themeSpecificFields["pollen.services.testimonial-quote-2"] ??
        "Testimonial Quote 2",
      author:
        themeSpecificFields["pollen.services.testimonial-author-2"] ??
        "Testimonial Author 2",
    },
    {
      quote:
        themeSpecificFields["pollen.services.testimonial-quote-3"] ??
        "Testimonial Quote 3",
      author:
        themeSpecificFields["pollen.services.testimonial-author-3"] ??
        "Testimonial Author 3",
    },
  ];

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
            <div>
              <p className="mb-4 text-sm font-semibold tracking-wider text-[#2a351f] uppercase">
                {themeSpecificFields["pollen.services.subtitle"] ??
                  "About Our Services"}
              </p>
              <h2 className="mb-6 text-3xl leading-tight font-bold text-balance text-[#374151] md:text-4xl">
                {themeSpecificFields["pollen.services.title"] ??
                  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua."}
              </h2>
              <p className="mb-8 leading-relaxed text-[#4b5563]">
                {themeSpecificFields["pollen.services.text"] ??
                  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua."}
              </p>
              <Link
                href={
                  themeSpecificFields["pollen.services.cta-button-link"] ?? "#!"
                }
                className={buttonVariants({
                  size: "lg",
                  className: "gap-2 bg-[#2a351f] text-white hover:bg-[#3d4d2f]",
                })}
              >
                {themeSpecificFields["pollen.services.cta-button-text"] ??
                  "Request a Quote"}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              {services.map((service) => (
                <div
                  key={service.title}
                  className="rounded-2xl bg-white p-6 shadow-sm"
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center">
                    <service.icon className="h-6 w-6 text-[#5e8b4a]" />
                  </div>
                  <h3 className="mb-3 font-bold text-[#374151]">
                    {service.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-[#6b7280]">
                    {service.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="bg-white py-20 md:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div className="relative aspect-square overflow-hidden rounded-2xl">
              <Image
                src="https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800&h=800&fit=crop"
                alt="Potted plant with green leaves"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>

            <div>
              <p className="mb-4 text-sm font-semibold tracking-wider text-[#2a351f] uppercase">
                {themeSpecificFields["pollen.services.faq-subtitle"] ??
                  "You Have Questions?"}
              </p>
              <h2 className="mb-4 text-3xl font-bold text-[#374151] md:text-4xl">
                {themeSpecificFields["pollen.services.faq-title"] ??
                  "Frequently Asked Questions"}
              </h2>
              <p className="mb-8 leading-relaxed text-[#6b7280]">
                {themeSpecificFields["pollen.services.faq-description"] ??
                  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua."}
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
                href={
                  themeSpecificFields["pollen.services.faq-button-link"] ?? "#!"
                }
                className={buttonVariants({
                  size: "lg",
                  variant: "outline",
                  className:
                    "border-[#374151] text-[#374151] hover:bg-[#374151] hover:text-white",
                })}
              >
                {themeSpecificFields["pollen.services.faq-button-text"] ??
                  "Contact Us"}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="relative overflow-hidden bg-[#2a351f] py-20 md:py-32">
        <div
          className="absolute inset-0 bg-[url('/flowers-pattern-1-white.svg')] bg-repeat opacity-[0.08]"
          aria-hidden
        />
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="mb-4 text-center text-sm font-medium tracking-wider text-[#A8D081] uppercase">
            {themeSpecificFields["pollen.services.testimonial-subtitle"] ??
              "Testimonials"}
          </p>
          <h2 className="mb-12 text-center text-3xl font-bold text-white md:text-4xl">
            {themeSpecificFields["pollen.services.testimonial-title"] ??
              "Hear From Our Clients"}
          </h2>

          <div className="grid gap-8 md:grid-cols-3">
            {testimonials.map((testimonial) => (
              <div
                key={testimonial.author}
                className="rounded-2xl bg-[#3d4d2f]/80 p-8 backdrop-blur-sm"
              >
                <p className="font-serif text-4xl text-white/30">&ldquo;</p>
                <p className="mt-2 mb-6 leading-relaxed text-white">
                  {testimonial.quote}
                </p>
                <p className="font-semibold text-white">{testimonial.author}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PollenGeneralLayout>
  );
}
