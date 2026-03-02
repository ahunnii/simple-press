import {
  BanknoteArrowDown,
  CheckCircle,
  Droplets,
  Leaf,
  Recycle,
  Shield,
  Users,
} from "lucide-react";

import { StaggerContainer, StaggerItem } from "./bamboo-animations";

const features = [
  // {
  //   icon: Leaf,
  //   label: "100% Bamboo",
  //   description: "Tree-free and sustainably sourced",
  // },
  {
    icon: CheckCircle,
    label: "Premium Quality",
    description:
      "Experience top-quality household paper products, crafted for comfort and reliability.",
  },
  {
    icon: BanknoteArrowDown,
    label: "Competitive Prices",
    description: "Affordable prices without compromising quality.",
  },
  {
    icon: Users,
    label: "Customer-Centric Approach",
    description: "Your satisfaction comes first in everything we do.",
  },
];

export function BambooSustainabilityBanner() {
  return (
    <section className="bg-primary">
      <div className="mx-auto max-w-7xl px-4 py-14 lg:px-8">
        <StaggerContainer
          className="grid grid-cols-2 gap-8 lg:grid-cols-3"
          staggerDelay={0.1}
        >
          {features.map((feature) => (
            <StaggerItem
              key={feature.label}
              className="flex flex-col items-center gap-3 text-center"
            >
              <div className="bg-primary-foreground/10 flex size-12 items-center justify-center rounded-full">
                <feature.icon className="text-primary-foreground size-6" />
              </div>
              <h3 className="text-primary-foreground text-sm font-semibold">
                {feature.label}
              </h3>
              <p className="text-primary-foreground/70 text-xs">
                {feature.description}
              </p>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
