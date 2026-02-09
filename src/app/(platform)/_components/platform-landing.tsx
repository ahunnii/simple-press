import { CTASection } from "./cta-section";
import { FeaturesSection } from "./features-section";
import { HeroSection } from "./hero-section";
import { PlatformHeader } from "./platform-header";
import { TemplatesShowcase } from "./templates-showcase";

export function PlatformLandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <PlatformHeader />
      <main>
        <HeroSection />
        <FeaturesSection />
        <TemplatesShowcase />
        <CTASection />
      </main>
      <footer className="border-t">
        <div className="container mx-auto px-4 py-8">
          <p className="text-center text-sm text-gray-600">
            © {new Date().getFullYear()} Shop Platform. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
