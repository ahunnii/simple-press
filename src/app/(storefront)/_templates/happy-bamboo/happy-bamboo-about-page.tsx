import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Droplets,
  ExternalLink,
  ExternalLinkIcon,
  Heart,
  Leaf,
  Recycle,
  Shield,
  ShieldCheck,
  Sparkles,
  Sprout,
  Star,
  TreeDeciduous,
  TreePine,
  Truck,
  Users,
} from "lucide-react";

import type { DefaultAboutPageTemplateProps } from "../types";
import { getListFieldValue } from "~/lib/template-fields";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";

import {
  FadeIn,
  PageTransition,
  ScaleIn,
  StaggerContainer,
  StaggerItem,
} from "./happy-bamboo-animations";
import { parseHappyBambooBambooList } from "./happy-bamboo-bamboo-data";
import { parseHappyBambooServicesList } from "./happy-bamboo-services-data";

const VALUES_ICONS = [Leaf, Heart, Users] as const;
const BAMBOO_FACTS_ICONS = [Sprout, TreePine, Droplets] as const;
const SERVICE_HIGHLIGHTS_ICONS = [Truck, Building2, ShieldCheck] as const;

export function HappyBambooAboutPage({
  business,
}: DefaultAboutPageTemplateProps) {
  const themeSpecificFields = business?.siteContent?.customFields as
    | Record<string, string>
    | undefined;

  const aboutHeroImage =
    themeSpecificFields?.["happy-bamboo.about-hero-image"]?.trim();
  const missionStatement =
    themeSpecificFields?.["happy-bamboo.about-hero-mission"]?.trim();
  const visionStatement =
    themeSpecificFields?.["happy-bamboo.about-hero-vision"]?.trim();
  const bambooDescription =
    themeSpecificFields?.["happy-bamboo.about-hero-bamboo"]?.trim();

  //////

  const servicesHeading =
    themeSpecificFields?.["happy-bamboo.about-services-heading"]?.trim();
  const servicesBanner =
    themeSpecificFields?.["happy-bamboo.about-services-banner"]?.trim();

  const servicesListRaw = getListFieldValue(
    themeSpecificFields as unknown,
    "happy-bamboo.about-services-list",
  );

  const servicesItems = parseHappyBambooServicesList(servicesListRaw);

  //////

  const bambooHeading =
    themeSpecificFields?.["happy-bamboo.about-bamboo-heading"]?.trim();
  const bambooIntro =
    themeSpecificFields?.["happy-bamboo.about-bamboo-description"]?.trim();
  const benefitsListRaw = getListFieldValue(
    themeSpecificFields as unknown,
    "happy-bamboo.about-bamboo-list",
  );
  const benefitsItems = parseHappyBambooBambooList(benefitsListRaw);
  const bambooImage1 =
    themeSpecificFields?.["happy-bamboo.about-bamboo-image-1"]?.trim();
  const bambooImage2 =
    themeSpecificFields?.["happy-bamboo.about-bamboo-image-2"]?.trim();
  const bambooImage3 =
    themeSpecificFields?.["happy-bamboo.about-bamboo-image-3"]?.trim();

  //////

  const ctaImage =
    themeSpecificFields?.["happy-bamboo.about-cta-image"]?.trim();

  const socialLinks = business?.siteContent?.socialLinks as
    | {
        instagram?: string;
        facebook?: string;
        twitter?: string;
        tiktok?: string;
      }
    | undefined;
  return (
    <PageTransition>
      {/* Hero Section — Mission & Vision */}
      <section className="bg-muted/50 relative overflow-hidden py-16 md:py-28">
        <div className="container mx-auto px-4">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <FadeIn direction="left">
              <Badge className="mb-4">
                <Leaf className="mr-1 h-3 w-3" />
                About Us
              </Badge>
              <h1 className="mb-6 text-4xl leading-tight font-bold md:text-5xl lg:text-6xl">
                Zaires Visions
              </h1>

              <div className="mb-8 space-y-4">
                <div>
                  <h2 className="text-foreground mb-2 text-xl font-semibold">
                    Our Mission
                  </h2>
                  <p className="text-muted-foreground leading-relaxed">
                    {missionStatement ?? "Mission statement goes here"}
                  </p>
                </div>
                <div>
                  <h2 className="text-foreground mb-2 text-xl font-semibold">
                    Our Vision
                  </h2>
                  <p className="text-muted-foreground leading-relaxed">
                    {visionStatement ?? "Vision statement goes here"}
                  </p>
                </div>
              </div>

              <p className="text-muted-foreground text-sm leading-relaxed">
                {bambooDescription ?? "Bamboo description goes here"}
              </p>
            </FadeIn>

            <FadeIn direction="right" delay={0.2} className="relative">
              <div className="relative aspect-video overflow-hidden rounded-2xl shadow-2xl">
                <Image
                  src={aboutHeroImage ?? "/placeholder.svg"}
                  alt="Bamboo products in modern bathroom"
                  fill
                  className="object-cover"
                  priority
                />
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Mission Banner */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <FadeIn>
            <div className="bg-primary relative overflow-hidden rounded-2xl px-8 py-10 md:px-12 md:py-14">
              {/* Subtle decorative leaf shape */}
              <div className="pointer-events-none absolute -top-10 -right-10 h-48 w-48 rounded-full bg-white/10" />
              <div className="pointer-events-none absolute -bottom-6 -left-6 h-32 w-32 rounded-full bg-white/10" />

              <div className="relative flex flex-col items-center gap-6 text-center md:flex-row md:text-left">
                <div className="shrink-0 rounded-full bg-white/20 p-4">
                  <Leaf className="h-8 w-8 text-white" />
                </div>
                <p className="text-lg leading-relaxed font-medium text-white md:text-xl">
                  Join us in our mission to make everyday moments healthier,
                  cleaner and a lot more sustainable. Experience the softness
                  and durability of our Happy Bamboo toilet tissue, because{" "}
                  <span className="font-bold italic">
                    you deserve the best!
                  </span>
                </p>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Our Services Section */}
      <section className="bg-muted/50 py-20 md:py-32">
        <div className="container mx-auto px-4">
          <FadeIn className="mb-16 text-center">
            <Badge className="mb-4">
              <Heart className="mr-1 h-3 w-3" />
              What We Offer
            </Badge>
            <h2 className="text-3xl font-bold md:text-4xl">
              {servicesHeading ?? "Our Services"}
            </h2>
            <p className="text-muted-foreground mx-auto mt-4 max-w-2xl">
              {servicesBanner ??
                "We provide premium bamboo personal care products designed for comfort, sustainability, and your well-being."}
            </p>
          </FadeIn>

          <StaggerContainer className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {servicesItems?.map((service) => (
              <StaggerItem key={service.title}>
                <Card className="h-full text-center transition-shadow hover:shadow-lg">
                  <CardContent className="pt-6">
                    <div className="bg-primary/10 mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full">
                      <service.icon className="text-primary h-7 w-7" />
                    </div>
                    <h3 className="mb-2 text-lg font-semibold">
                      {service.title}
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      {service.description}
                    </p>
                  </CardContent>
                </Card>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Why Bamboo Is Better Section */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="grid items-start gap-12 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <FadeIn className="mb-6">
                <Badge className="mb-4">
                  <Leaf className="mr-1 h-3 w-3" />
                  The Smart Choice
                </Badge>
                <h2 className="text-3xl font-bold md:text-4xl">
                  {bambooHeading ?? "Why Bamboo Is Better"}
                </h2>
                <p className="text-muted-foreground mt-4 text-lg">
                  {bambooIntro ?? "A Smarter Choice for You and the Planet"}
                </p>
              </FadeIn>

              <FadeIn direction="left" className="mb-6 space-y-4">
                <p className="text-muted-foreground leading-relaxed">
                  Traditional toilet paper relies on hardwood trees that take
                  decades to mature and require heavy chemical processing and
                  high water usage. This contributes to deforestation,
                  environmental strain, and potential skin irritation.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  Happy Bamboo Toilet Tissue is made from rapidly renewable
                  bamboo, which regenerates in just 3 to5 years without
                  replanting. It is biodegradable, chemical-free, gentle on
                  sensitive skin, and produced with sustainability in mind.
                </p>
              </FadeIn>
              <StaggerContainer
                staggerDelay={0.1}
                className="grid gap-6 sm:grid-cols-1"
              >
                {benefitsItems?.map((reason) => (
                  <StaggerItem key={reason.title} className="flex gap-4">
                    <div className="shrink-0">
                      <div className="bg-primary/10 flex h-12 w-12 items-center justify-center rounded-full">
                        <reason.icon className="text-primary h-6 w-6" />
                      </div>
                    </div>
                    <div>
                      <h3 className="mb-2 font-semibold">{reason.title}</h3>
                      <p className="text-muted-foreground text-sm leading-relaxed">
                        {reason.description}
                      </p>
                    </div>
                  </StaggerItem>
                ))}
              </StaggerContainer>
            </div>

            <FadeIn
              direction="right"
              delay={0.3}
              className="hidden lg:col-span-2 lg:block"
            >
              <div className="sticky top-24 space-y-4">
                <div className="relative aspect-video overflow-hidden rounded-2xl">
                  <Image
                    src={bambooImage1 ?? "/placeholder.svg"}
                    alt="Premium bamboo toilet paper"
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative aspect-square overflow-hidden rounded-xl">
                    <Image
                      src={bambooImage2 ?? "/placeholder.svg"}
                      alt="Mega rolls bamboo toilet paper"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="relative aspect-square overflow-hidden rounded-xl">
                    <Image
                      src={bambooImage3 ?? "/placeholder.svg"}
                      alt="Trial pack bamboo toilet paper"
                      fill
                      className="object-cover"
                    />
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* CTA Section with Image */}
      <section className="relative mx-auto max-w-6xl overflow-hidden">
        <FadeIn
          direction="up"
          className="relative aspect-16/7 w-full overflow-hidden rounded-xl"
        >
          <Image
            src={ctaImage ?? "/placeholder.svg"}
            alt="Bamboo forest"
            fill
            className="object-cover object-bottom"
          />
        </FadeIn>
      </section>
      {/* Connect With Us Section */}

      <section className="bg-muted/50 py-20 md:py-24">
        <div className="container mx-auto px-4">
          <FadeIn className="mb-12 text-center">
            <Badge className="mb-2">
              <Heart className="mr-1 h-3 w-3" />
              Stay Connected
            </Badge>
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">
              Join the Happy Bamboo Community
            </h2>
            <p className="text-muted-foreground mx-auto max-w-2xl leading-relaxed">
              Share your experience, leave us a review, and follow us on social
              media for tips, updates, and inspiration.
            </p>
          </FadeIn>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Review Prompt */}
            <FadeIn delay={0.1}>
              <Card className="h-full">
                <CardContent className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:p-8">
                  <div className="flex flex-col gap-4 sm:flex-1">
                    <div className="bg-primary/10 flex h-14 w-14 items-center justify-center rounded-full">
                      <Star className="text-primary h-7 w-7" />
                    </div>
                    <div>
                      <h3 className="mb-2 text-xl font-semibold">
                        Share Your Feedback
                      </h3>
                      <p className="text-muted-foreground text-sm leading-relaxed">
                        Your reviews help others discover the comfort and
                        sustainability of Happy Bamboo. Share your experience on
                        Google.
                      </p>
                    </div>
                    <Button asChild className="group w-fit">
                      <a
                        href="https://search.google.com/local/writereview?placeid=ChIJ008r2PrRJIgRaaMPENARjUc"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Write a Review
                        <ExternalLink className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </a>
                    </Button>
                  </div>

                  <div className="flex flex-col items-center gap-2 sm:shrink-0">
                    <div className="rounded-lg bg-white p-3 shadow-sm">
                      <Image
                        src="https://storage.artisanalfutures.org/business-sites/cmngzygd600002g41j3kcs7j6/QR-Code-Reviews-1.png"
                        alt="QR Code to leave a Google review"
                        width={140}
                        height={140}
                        className="rounded-lg"
                      />
                    </div>
                    <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                      Scan to review
                    </p>
                  </div>
                </CardContent>
              </Card>
            </FadeIn>

            {/* Social Follow */}
            <FadeIn delay={0.2}>
              <Card className="h-full">
                <CardContent className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:p-8">
                  <div className="flex flex-col gap-4 sm:flex-1">
                    <div className="bg-primary/10 flex h-14 w-14 items-center justify-center rounded-full">
                      <Heart className="text-primary h-7 w-7" />
                    </div>
                    <div>
                      <h3 className="mb-2 text-xl font-semibold">
                        Follow Our Journey
                      </h3>
                      <p className="text-muted-foreground max-w-sm text-sm leading-relaxed">
                        Stay connected for exclusive updates, eco-tips,
                        behind-the-scenes content, and special offers.
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 gap-3 sm:self-center">
                    {socialLinks?.facebook && (
                      <a
                        href={socialLinks.facebook}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground flex h-14 w-14 items-center justify-center rounded-full transition-all hover:scale-110"
                        aria-label="Follow us on Facebook"
                      >
                        <FacebookIcon className="h-6 w-6" />
                      </a>
                    )}
                    {socialLinks?.instagram && (
                      <a
                        href={socialLinks.instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground flex h-14 w-14 items-center justify-center rounded-full transition-all hover:scale-110"
                        aria-label="Follow us on Instagram"
                      >
                        <InstagramIcon className="h-6 w-6" />
                      </a>
                    )}
                    {socialLinks?.tiktok && (
                      <a
                        href={socialLinks.tiktok}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground flex h-14 w-14 items-center justify-center rounded-full transition-all hover:scale-110"
                        aria-label="Follow us on TikTok"
                      >
                        <TikTokIcon className="h-6 w-6" />
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            </FadeIn>
          </div>
        </div>
      </section>
    </PageTransition>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    </svg>
  );
}
