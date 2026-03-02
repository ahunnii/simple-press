import type { Metadata } from "next";
import { Droplets, Heart, Leaf, Sprout, TreePine, Users } from "lucide-react";

import type { DefaultAboutPageTemplateProps } from "../types";
import { Card, CardContent } from "~/components/ui/card";

import {
  FadeIn,
  PageTransition,
  StaggerContainer,
  StaggerItem,
} from "./bamboo-animations";

export const metadata: Metadata = {
  title: "About",
  description:
    "Learn about Finally Results LLC -- our mission, sustainability efforts, and Detroit roots. Premium bamboo paper products crafted with purpose.",
};

const values = [
  {
    icon: Leaf,
    title: "Sustainability First",
    description:
      "Every decision we make starts with the planet. From sourcing to packaging, we choose the path that leaves the smallest footprint.",
  },
  {
    icon: Heart,
    title: "Premium Quality",
    description:
      "We refuse to compromise. Our bamboo products match or exceed the softness and strength of traditional premium brands.",
  },
  {
    icon: Users,
    title: "Community Driven",
    description:
      "Rooted in Detroit, we believe in building something that serves our community and sets an example for responsible business.",
  },
];

const bambooFacts = [
  {
    icon: Sprout,
    title: "Rapid Growth",
    description:
      "Bamboo grows up to 35 inches per day and reaches maturity in 3-5 years, compared to 20-50 years for hardwood trees.",
  },
  {
    icon: TreePine,
    title: "No Replanting Needed",
    description:
      "Bamboo regenerates from its own root system after harvest, which means the soil stays intact and carbon continues to be sequestered.",
  },
  {
    icon: Droplets,
    title: "Water Efficient",
    description:
      "Bamboo requires significantly less water than traditional tree farming and thrives without pesticides or fertilizers.",
  },
];

export function BambooAboutPage({ business }: DefaultAboutPageTemplateProps) {
  return (
    <PageTransition>
      {/* Hero */}
      <section className="bg-secondary">
        <FadeIn
          direction="up"
          className="mx-auto max-w-7xl px-4 py-20 text-center lg:px-8"
        >
          <h1 className="text-foreground font-serif text-4xl font-bold tracking-tight md:text-5xl">
            <span className="text-balance">Our Story</span>
          </h1>
          <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-lg leading-relaxed">
            Finally Results LLC was born from a simple belief: the everyday
            products in your home should be better -- better for your family,
            and better for the planet.
          </p>
        </FadeIn>
      </section>

      {/* Mission */}
      <section className="mx-auto max-w-7xl px-4 py-20 lg:px-8">
        <FadeIn direction="up" className="mx-auto max-w-3xl">
          <h2 className="text-foreground font-serif text-3xl font-bold tracking-tight">
            Our Mission
          </h2>
          <div className="text-muted-foreground mt-6 flex flex-col gap-4 leading-relaxed">
            <p>
              Welcome to Finally Results LLC, your trusted supplier of retail
              household paper products nationwide. We take pride in offering
              top-quality items that enhance your everyday life, such as toilet
              paper. Our commitment to excellence is evident in the careful
              selection of materials, ensuring that our bathroom toilet tissue
              is made of 100% recycled virgin pulp, delivering septic-safe
              properties and superior absorbency.
            </p>
            <p>
              At Finally Results LLC, we believe in providing not only quality
              products but also competitive prices to make essential household
              items accessible to everyone. Located in the heart of Detroit,
              Michigan, we extend our warmest greetings to you, valuing each
              customer as a member of our extended family and business partners.
              Our dedicated team is here to serve you, ensuring that your
              experience with Finally Results LLC is marked by reliability,
              affordability, and the satisfaction of finally achieving the
              results you seek in household paper products.
            </p>
          </div>
        </FadeIn>
      </section>

      {/* Values */}
      <section className="bg-secondary/50 py-20">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <FadeIn direction="up">
            <h2 className="text-foreground text-center font-serif text-3xl font-bold tracking-tight">
              <span className="text-balance">What We Stand For</span>
            </h2>
          </FadeIn>
          <StaggerContainer
            className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3"
            staggerDelay={0.12}
          >
            {values.map((value) => (
              <StaggerItem key={value.title}>
                <Card className="border-border/60 bg-card h-full">
                  <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
                    <div className="bg-primary/10 flex size-14 items-center justify-center rounded-full">
                      <value.icon className="text-primary size-7" />
                    </div>
                    <h3 className="text-card-foreground font-serif text-lg font-semibold">
                      {value.title}
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {value.description}
                    </p>
                  </CardContent>
                </Card>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Why Bamboo */}
      <section className="mx-auto max-w-7xl px-4 py-20 lg:px-8">
        <FadeIn direction="up">
          <h2 className="text-foreground text-center font-serif text-3xl font-bold tracking-tight">
            <span className="text-balance">Why Bamboo?</span>
          </h2>
          <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-center">
            Bamboo is nature&apos;s most remarkable renewable resource. Here is
            why we chose it as the foundation for everything we make.
          </p>
        </FadeIn>
        <StaggerContainer
          className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3"
          staggerDelay={0.15}
        >
          {bambooFacts.map((fact) => (
            <StaggerItem
              key={fact.title}
              className="flex flex-col items-center gap-3 text-center"
            >
              <div className="bg-primary/10 flex size-12 items-center justify-center rounded-full">
                <fact.icon className="text-primary size-6" />
              </div>
              <h3 className="text-foreground font-serif text-lg font-semibold">
                {fact.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {fact.description}
              </p>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </section>

      {/* Detroit Roots */}
      <section className="bg-primary">
        <FadeIn
          direction="up"
          className="mx-auto max-w-7xl px-4 py-20 text-center lg:px-8"
        >
          <h2 className="text-primary-foreground font-serif text-3xl font-bold tracking-tight">
            <span className="text-balance">Rooted in Detroit</span>
          </h2>
          <p className="text-primary-foreground/80 mx-auto mt-4 max-w-2xl leading-relaxed">
            Detroit is a city that understands transformation. From the
            automotive revolution to its current renaissance in art, technology,
            and small business, this city teaches you that great things are
            built through perseverance and purpose. We chose to build Finally
            Results here because Detroit embodies everything our brand stands
            for: quality craftsmanship, community, and the belief that you can
            always do better.
          </p>
        </FadeIn>
      </section>
    </PageTransition>
  );
}
