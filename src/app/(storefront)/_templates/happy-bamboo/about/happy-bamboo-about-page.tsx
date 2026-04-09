import Image from "next/image";
import { ExternalLink, Heart, Leaf, Star } from "lucide-react";

import type { DefaultAboutPageTemplateProps } from "../../types";
import type { TiptapJSON } from "~/components/tiptap-renderer";
import {
  getListFieldValue,
  isContentEmpty,
  parseTemplateIconListRows,
} from "~/lib/template-fields";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { FacebookIcon } from "~/components/icons/facebook-icon";
import { InstagramIcon } from "~/components/icons/instagram-icon";
import { TikTokIcon } from "~/components/icons/tiktok-icon";
import {
  FadeIn,
  PageTransition,
  StaggerContainer,
  StaggerItem,
} from "~/components/page-animations";
import { TiptapRenderer } from "~/components/tiptap-renderer";

import {
  DEFAULT_HAPPY_BAMBOO_BAMBOO_LIST,
  DEFAULT_HAPPY_BAMBOO_SERVICES_LIST,
  resolveFields,
} from "..";

export function HappyBambooAboutPage({
  business,
}: DefaultAboutPageTemplateProps) {
  const themeSpecificFields = business?.siteContent?.customFields as
    | Record<string, string>
    | undefined;

  const f = resolveFields(themeSpecificFields, [
    "happy-bamboo.about-hero-heading",
    "happy-bamboo.about-hero-image",
    "happy-bamboo.about-hero-mission",
    "happy-bamboo.about-hero-vision",
    "happy-bamboo.about-hero-bamboo",

    "happy-bamboo.about-services-heading",
    "happy-bamboo.about-services-banner",

    "happy-bamboo.about-bamboo-heading",
    "happy-bamboo.about-bamboo-tagline",
    "happy-bamboo.about-bamboo-description",
    "happy-bamboo.about-bamboo-image-1",
    "happy-bamboo.about-bamboo-image-2",
    "happy-bamboo.about-bamboo-image-3",

    "happy-bamboo.about-cta-image",

    "happy-bamboo.about-connect-with-us-heading",
    "happy-bamboo.about-connect-with-us-text",
    "happy-bamboo.about-connect-with-us-qr-code",
    "happy-bamboo.about-connect-with-us-google-review-header",
    "happy-bamboo.about-connect-with-us-google-review-link",
    "happy-bamboo.about-connect-with-us-google-review-text",
    "happy-bamboo.about-connect-with-us-social-follow-header",
    "happy-bamboo.about-connect-with-us-social-follow-text",
  ]);

  const aboutMissionBanner = themeSpecificFields?.[
    "happy-bamboo.about-mission-banner"
  ] as unknown as TiptapJSON;

  const aboutMissionCheck = isContentEmpty(aboutMissionBanner);

  //////

  const servicesItems = parseTemplateIconListRows(
    getListFieldValue(
      themeSpecificFields as unknown,
      "happy-bamboo.about-services-list",
    ),
    DEFAULT_HAPPY_BAMBOO_SERVICES_LIST,
  );

  //////

  const benefitsItems = parseTemplateIconListRows(
    getListFieldValue(
      themeSpecificFields as unknown,
      "happy-bamboo.about-bamboo-list",
    ),
    DEFAULT_HAPPY_BAMBOO_BAMBOO_LIST,
  );
  //////

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
              <h1 className="mb-6 font-serif text-4xl leading-tight font-bold md:text-5xl">
                {f["happy-bamboo.about-hero-heading"]}
              </h1>

              <div className="mb-8 space-y-4">
                <div>
                  <h2 className="text-foreground mb-2 text-xl font-semibold">
                    Our Mission
                  </h2>
                  <p className="text-muted-foreground leading-relaxed">
                    {f["happy-bamboo.about-hero-mission"]}
                  </p>
                </div>
                <div>
                  <h2 className="text-foreground mb-2 text-xl font-semibold">
                    Our Vision
                  </h2>
                  <p className="text-muted-foreground leading-relaxed">
                    {f["happy-bamboo.about-hero-vision"]}
                  </p>
                </div>
              </div>

              <p className="text-muted-foreground text-sm leading-relaxed">
                {f["happy-bamboo.about-hero-bamboo"]}
              </p>
            </FadeIn>

            <FadeIn direction="right" delay={0.2} className="relative">
              <div className="relative aspect-12/9 overflow-hidden rounded-2xl shadow-2xl">
                <Image
                  src={f["happy-bamboo.about-hero-image"]!}
                  alt="About page hero"
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

                {!aboutMissionCheck ? (
                  <TiptapRenderer
                    content={aboutMissionBanner}
                    className="text-lg leading-relaxed font-medium text-white md:text-xl"
                  />
                ) : (
                  <p className="text-lg leading-relaxed font-medium text-white md:text-xl">
                    Join us in our mission to make everyday moments healthier,
                    cleaner and a lot more sustainable. Experience the softness
                    and durability of our Happy Bamboo toilet tissue, because{" "}
                    <span className="font-bold italic">
                      you deserve the best!
                    </span>
                  </p>
                )}
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
            <h2 className="font-serif text-3xl font-bold md:text-4xl">
              {f["happy-bamboo.about-services-heading"]}
            </h2>
            <p className="text-muted-foreground mx-auto mt-4 max-w-2xl">
              {f["happy-bamboo.about-services-banner"]}
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
                <h2 className="font-serif text-3xl font-bold md:text-4xl">
                  {f["happy-bamboo.about-bamboo-heading"]}
                </h2>
                <p className="text-muted-foreground mt-4 text-lg">
                  {f["happy-bamboo.about-bamboo-tagline"]}
                </p>
              </FadeIn>

              <FadeIn direction="left" className="mb-6 space-y-4">
                <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                  {f["happy-bamboo.about-bamboo-description"]}
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
                    src={f["happy-bamboo.about-bamboo-image-1"]!}
                    alt="Premium bamboo toilet paper"
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative aspect-square overflow-hidden rounded-xl">
                    <Image
                      src={f["happy-bamboo.about-bamboo-image-2"]!}
                      alt="Mega rolls bamboo toilet paper"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="relative aspect-square overflow-hidden rounded-xl">
                    <Image
                      src={f["happy-bamboo.about-bamboo-image-3"]!}
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
            src={f["happy-bamboo.about-cta-image"]!}
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
            <h2 className="mb-4 font-serif text-3xl font-bold md:text-4xl">
              {f["happy-bamboo.about-connect-with-us-heading"]}
            </h2>
            <p className="text-muted-foreground mx-auto max-w-2xl leading-relaxed">
              {f["happy-bamboo.about-connect-with-us-text"]}
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
                        {
                          f[
                            "happy-bamboo.about-connect-with-us-google-review-header"
                          ]
                        }
                      </h3>
                      <p className="text-muted-foreground text-sm leading-relaxed">
                        {
                          f[
                            "happy-bamboo.about-connect-with-us-google-review-text"
                          ]
                        }
                      </p>
                    </div>
                    <Button asChild className="group w-fit">
                      <a
                        href={
                          f[
                            "happy-bamboo.about-connect-with-us-google-review-link"
                          ]
                        }
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
                        src={f["happy-bamboo.about-connect-with-us-qr-code"]!}
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
                        {
                          f[
                            "happy-bamboo.about-connect-with-us-social-follow-header"
                          ]
                        }
                      </h3>
                      <p className="text-muted-foreground max-w-sm text-sm leading-relaxed">
                        {
                          f[
                            "happy-bamboo.about-connect-with-us-social-follow-text"
                          ]
                        }
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
