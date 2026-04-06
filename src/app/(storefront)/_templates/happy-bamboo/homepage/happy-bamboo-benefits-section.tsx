"use client";

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
  heading?: string;
  intro?: string;
  closing?: string;
};

export function HappyBambooBenefitsSection({
  themeSpecificFieldsRaw,
  heading = "Why Choose Bamboo Products?",
  intro = "Bamboo products come with a variety of benefits, making them an appealing option for many consumers.",
  closing = "Overall, choosing bamboo products can be a responsible and eco-conscious decision that benefits both consumers and the environment.",
}: Props) {
  const benefitsListRaw = getListFieldValue(
    themeSpecificFieldsRaw,
    "happy-bamboo.homepage-benefits-list",
  );
  const items = parseHappyBambooBenefitsList(benefitsListRaw);

  return (
    <section className="bg-muted/50 py-20 md:py-32">
      <div className="container mx-auto px-4">
        <FadeIn className="mb-16 text-center">
          <span className="text-primary text-sm font-semibold tracking-wider uppercase">
            Happy Bamboo
          </span>
          <h2 className="mt-2 font-serif text-4xl font-bold md:text-5xl">
            {heading}
          </h2>
          {intro && (
            <p className="text-muted-foreground mx-auto mt-4 max-w-2xl">
              {intro}
            </p>
          )}
        </FadeIn>

        <StaggerContainer className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {items.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <StaggerItem key={`${benefit.title}-${index}`}>
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
          >
            {closing}
          </FadeIn>
        )}
      </div>
    </section>
  );
}
