import { Check } from "lucide-react";

import { Badge } from "~/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { TEMPLATES } from "~/lib/constants";
import { getFreeTemplateIds } from "~/lib/template-ownership";

const SHOWCASE_META: Record<
  string,
  { features: string[]; color: string; popular?: boolean }
> = {
  default: {
    features: [
      "Works for any kind of shop",
      "Clean, flexible layout",
      "Full storefront",
      "Easy to customize",
    ],
    color: "from-slate-500 to-slate-300",
  },
  modern: {
    features: [
      "Large hero images",
      "Grid product layout",
      "Minimal navigation",
      "Bold typography",
    ],
    color: "from-slate-600 to-sky-400",
    popular: true,
  },
  bamboo: {
    features: [
      "Nature-inspired palette",
      "Hero background image",
      "Featured products section",
      "Trust-badge strip",
    ],
    color: "from-green-600 to-emerald-400",
  },
  "happy-bamboo": {
    features: [
      "Coming-soon product badges",
      "Botanical imagery",
      "Per-product feature highlights",
      "Full blog and account pages",
    ],
    color: "from-lime-500 to-green-600",
  },
  "dark-trend": {
    features: [
      "Dark moody palette",
      "High-contrast product cards",
      "Bold section typography",
      "Full storefront",
    ],
    color: "from-gray-900 to-zinc-700",
  },
  elegant: {
    features: [
      "Botanical certification badges",
      "Soft organic styling",
      "Beauty / wellness focus",
      "Full storefront",
    ],
    color: "from-rose-300 to-emerald-300",
  },
  pollen: {
    features: [
      "Bright colorful palette",
      "Environmental / cause focus",
      "Shop supported",
      "Community-oriented layout",
    ],
    color: "from-yellow-400 to-orange-400",
  },
  noise: {
    features: [
      "Editorial luxury fashion",
      "Cormorant Garamond serif",
      "Steel blue–champagne palette",
      "Split-hero layout",
    ],
    color: "from-slate-700 to-amber-200",
  },
  sledge: {
    features: [
      "Mosaic photo hero",
      "Cream and green palette",
      "Wave section dividers",
      "Testimonials carousel",
    ],
    color: "from-green-800 to-amber-100",
  },
  vii: {
    features: [
      "Announcement bar",
      "Services section",
      "Rich branding fields",
      "Luxury / creative studio feel",
    ],
    color: "from-zinc-900 to-amber-400",
    popular: true,
  },
  builders: {
    features: [
      "Trades and construction focus",
      "Services and portfolio pages",
      "About and contact sections",
      "No shop / checkout",
    ],
    color: "from-stone-700 to-orange-400",
  },
};

export function TemplatesShowcase() {
  // Only advertise free/generic templates publicly — commercial templates
  // belong to specific client brands and are not offered to everyone.
  const freeTemplateIds = getFreeTemplateIds();
  const showcaseTemplates = TEMPLATES.filter((t) =>
    freeTemplateIds.includes(t.id),
  );

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
          {showcaseTemplates.map((template) => {
            const meta = SHOWCASE_META[template.id];
            const color = meta?.color ?? "from-gray-400 to-gray-600";
            const features = meta?.features ?? [];
            const popular = meta?.popular ?? false;

            return (
              <Card key={template.id} className="relative overflow-hidden">
                {popular && (
                  <Badge className="absolute top-4 right-4 z-10">Popular</Badge>
                )}

                <CardHeader>
                  {/* Template Preview */}
                  <div
                    className={`aspect-video rounded-lg bg-gradient-to-br ${color} mb-4`}
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
                    {features.map((feature) => (
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
            );
          })}
        </div>

        {/* Note */}
        <p className="mt-8 text-center text-sm text-gray-500">
          Don&apos;t worry - you can switch templates anytime from your admin
          dashboard
        </p>
      </div>
    </section>
  );
}
