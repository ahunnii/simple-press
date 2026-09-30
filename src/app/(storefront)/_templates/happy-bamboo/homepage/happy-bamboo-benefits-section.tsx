"use client";

import { fieldAttr, listItemAttr } from "~/lib/preview/section-attrs";
import { getListFieldValue } from "~/lib/template-fields";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  FadeIn,
  StaggerContainer,
  StaggerItem,
} from "~/components/page-animations";

import { parseHappyBambooBenefitsList } from "./happy-bamboo-benefits-data";

type Props = {
  themeSpecificFieldsRaw: unknown;
  smallLabel?: string;
  heading: string;
  intro?: string;
  closing?: string;
  /** Spread on root <section> for preview overlay hotspot. */
  sectionAttrs?: Record<string, string>;
};

export function HappyBambooBenefitsSection({
  themeSpecificFieldsRaw,
  smallLabel,
  heading,
  intro,
  closing,
  sectionAttrs,
}: Props) {
  const benefitsListRaw = getListFieldValue(
    themeSpecificFieldsRaw,
    "happy-bamboo.homepage-benefits-list",
  );
  const items = parseHappyBambooBenefitsList(benefitsListRaw);

  return (
    <section className="bg-muted/50 py-20 md:py-32" {...sectionAttrs}>
      <div className="container mx-auto px-4">
        <FadeIn className="mb-16 text-center">
          {!!smallLabel && (
            <span
              className="text-primary text-sm font-semibold tracking-wider uppercase"
              {...fieldAttr("happy-bamboo.homepage-benefits-small-label")}
            >
              {smallLabel}
            </span>
          )}
          <h2
            className="mt-2 font-serif text-4xl font-bold md:text-5xl"
            {...fieldAttr("happy-bamboo.homepage-benefits-heading")}
          >
            {heading}
          </h2>
          {intro && (
            <p
              className="text-muted-foreground mx-auto mt-4 max-w-2xl"
              {...fieldAttr("happy-bamboo.homepage-benefits-intro")}
            >
              {intro}
            </p>
          )}
        </FadeIn>

        <StaggerContainer className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {items.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <StaggerItem
                key={`${benefit.title}-${index}`}
                {...listItemAttr("happy-bamboo.homepage-benefits-list", index)}
              >
                <Card className="h-full transition-shadow hover:shadow-lg">
                  <CardHeader>
                    <div className="bg-primary/10 mb-2 inline-flex h-12 w-12 items-center justify-center rounded-lg">
                      <Icon className="text-primary h-6 w-6" />
                    </div>
                    <CardTitle className="text-lg">{benefit.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {benefit.description}
                    </p>
                  </CardContent>
                </Card>
              </StaggerItem>
            );
          })}
        </StaggerContainer>

        {closing && (
          <FadeIn
            delay={0.5}
            className="text-muted-foreground mt-12 text-center"
            {...fieldAttr("happy-bamboo.homepage-benefits-closing")}
          >
            {closing}
          </FadeIn>
        )}
      </div>
    </section>
  );
}
