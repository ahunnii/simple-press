import { Check } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

const templates = [
  {
    id: "modern",
    name: "Modern",
    description:
      "Clean and contemporary design perfect for fashion, tech, or lifestyle brands",
    features: [
      "Large hero images",
      "Grid product layout",
      "Minimal navigation",
      "Bold typography",
    ],
    color: "from-blue-500 to-purple-500",
    popular: true,
  },
  {
    id: "vintage",
    name: "Vintage",
    description:
      "Classic design ideal for artisan goods, antiques, or heritage brands",
    features: [
      "Serif fonts",
      "Warm color palette",
      "Decorative elements",
      "Story-focused layout",
    ],
    color: "from-amber-500 to-orange-500",
    popular: false,
  },
  {
    id: "minimal",
    name: "Minimal",
    description:
      "Ultra-clean design for luxury brands or professional services",
    features: [
      "Lots of whitespace",
      "Focus on products",
      "Simple navigation",
      "Elegant typography",
    ],
    color: "from-gray-700 to-gray-900",
    popular: false,
  },
];

export function TemplatesShowcase() {
  return (
    <section id="templates" className="py-24">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold md:text-4xl">
            Choose your perfect template
          </h2>
          <p className="text-lg text-gray-600">
            All templates are fully responsive and optimized for conversions
          </p>
        </div>

        {/* Templates Grid */}
        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.id} className="relative overflow-hidden">
              {template.popular && (
                <Badge className="absolute top-4 right-4 z-10">Popular</Badge>
              )}

              <CardHeader>
                {/* Template Preview */}
                <div
                  className={`aspect-video rounded-lg bg-gradient-to-br ${template.color} mb-4`}
                >
                  <div className="flex h-full items-center justify-center">
                    <p className="font-semibold text-white">
                      {template.name} Preview
                    </p>
                  </div>
                </div>

                <CardTitle>{template.name}</CardTitle>
                <CardDescription>{template.description}</CardDescription>
              </CardHeader>

              <CardContent>
                <ul className="space-y-2">
                  {template.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2 text-sm"
                    >
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                      <span className="text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Note */}
        <p className="mt-8 text-center text-sm text-gray-500">
          Don&apos;t worry - you can switch templates anytime
        </p>
      </div>
    </section>
  );
}
