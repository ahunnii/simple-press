import {
  BarChart3,
  CreditCard,
  Palette,
  Shield,
  Store,
  Zap,
} from "lucide-react";

import { Card, CardContent } from "~/components/ui/card";

const features = [
  {
    icon: Store,
    title: "Easy Setup",
    description:
      "Get your store online in minutes. No technical knowledge required.",
  },
  {
    icon: Palette,
    title: "Beautiful Templates",
    description:
      "Choose from professionally designed templates that match your brand.",
  },
  {
    icon: CreditCard,
    title: "Secure Payments",
    description:
      "Accept payments with Stripe. Your customers' data is always secure.",
  },
  {
    icon: BarChart3,
    title: "Built-in Analytics",
    description:
      "Track your sales, visitors, and performance with integrated analytics.",
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description:
      "Your store loads instantly. Happy customers, better conversions.",
  },
  {
    icon: Shield,
    title: "Your Domain",
    description:
      "Use your own domain name. We'll handle all the technical setup.",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="bg-gray-50 py-24">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold md:text-4xl">
            Everything you need to sell online
          </h2>
          <p className="text-lg text-gray-600">
            We&apos;ve built all the tools you need to run a successful online
            store
          </p>
        </div>

        {/* Features Grid */}
        <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title} className="border-none shadow-sm">
              <CardContent className="pt-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                  <feature.icon className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
                <p className="text-sm text-gray-600">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
