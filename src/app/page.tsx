import { CTASection } from "./(platform)/_components/cta-section";
import { FeaturesSection } from "./(platform)/_components/features-section";
import { HeroSection } from "./(platform)/_components/hero-section";
import { PlatformHeader } from "./(platform)/_components/platform-header";
import { TemplatesShowcase } from "./(platform)/_components/templates-showcase";

export default function PlatformLandingPage() {
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
