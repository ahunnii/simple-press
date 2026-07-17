import type { GenericIconRow } from "~/lib/template-fields";
import { fieldAttr } from "~/lib/preview/section-attrs";
import {
  FadeIn,
  StaggerContainer,
  StaggerItem,
} from "~/components/page-animations";

export function PollenHomepageAbout({
  services,
  sectionLabel,
  sectionHeading,
  sectionAttrs,
}: {
  services?: GenericIconRow[];
  sectionLabel: string;
  sectionHeading: string;
  /** Spread on root <section> for preview overlay hotspot. */
  sectionAttrs?: Record<string, string>;
}) {
  return (
    <section
      id="services"
      className="relative overflow-hidden bg-[#2a351f] py-20 md:py-32"
      {...sectionAttrs}
    >
      {/* Repeating flower pattern overlay */}
      <div
        className="absolute inset-0 bg-[url('/flowers-pattern-1-white.svg')] bg-repeat opacity-[0.15]"
        aria-hidden
      />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeIn direction="up">
          <div className="mx-auto mb-16 max-w-3xl text-center">
            <p
              className="mb-4 text-sm font-medium tracking-wider text-white/70 uppercase"
              {...fieldAttr("pollen.homepage.about-service-title")}
            >
              {sectionLabel}
            </p>
            <h2
              className="text-3xl leading-tight font-bold text-balance text-white md:text-4xl"
              {...fieldAttr("pollen.homepage.about-service-description")}
            >
              {sectionHeading}
            </h2>
          </div>
        </FadeIn>

        <StaggerContainer className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {services?.map((service) => (
            <StaggerItem key={service.title}>
              <div className="flex h-full flex-col rounded-2xl bg-[#3d4d2f] p-6 text-left transition-all duration-300 hover:bg-[#455734]">
                <div className="mb-4 flex h-12 w-12 items-center justify-center">
                  <service.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="mb-3 font-semibold text-white">
                  {service.title}
                </h3>
                <p className="min-h-0 flex-1 text-sm leading-relaxed text-white/90">
                  {service.description}
                </p>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
