import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

import { Button } from "~/components/ui/button";

export function HeroSection() {
  return (
    <section className="container mx-auto px-4 py-24 md:py-32">
      <div className="mx-auto max-w-4xl text-center">
        {/* Badge */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700">
          <Sparkles className="h-4 w-4" />
          <span>Built for small businesses</span>
        </div>

        {/* Heading */}
        <h1 className="mb-6 text-5xl font-bold tracking-tight md:text-6xl lg:text-7xl">
          Your Online Store,
          <br />
          <span className="text-blue-600">Up in Minutes</span>
        </h1>

        {/* Subheading */}
        <p className="mx-auto mb-10 max-w-2xl text-xl text-gray-600 md:text-2xl">
          No coding required. Choose a template, add your products, and start
          selling. It&apos;s that simple.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button size="lg" asChild className="w-full sm:w-auto">
            <Link href="/platform/signup" className="gap-2">
              Get Started Free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            size="lg"
            variant="outline"
            asChild
            className="w-full sm:w-auto"
          >
            <Link href="#templates">View Templates</Link>
          </Button>
        </div>

        {/* Social Proof */}
        <p className="mt-8 text-sm text-gray-500">
          Join 200+ small businesses already selling online
        </p>

        {/* Hero Image / Screenshot */}
        <div className="mt-16 rounded-lg border bg-gray-50 p-4 shadow-2xl">
          <div className="flex aspect-video items-center justify-center rounded bg-gradient-to-br from-blue-100 to-purple-100">
            <p className="font-medium text-gray-500">Store Preview</p>
          </div>
        </div>
      </div>
    </section>
  );
}
