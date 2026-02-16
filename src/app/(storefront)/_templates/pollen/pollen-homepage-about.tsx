import type { LucideIcon } from "lucide-react";
import { BookOpen, Flower2, HandHelping, Map } from "lucide-react";

export function PollenHomepageAbout({
  services,
}: {
  services: {
    icon: LucideIcon;
    title: string;
    description: string;
  }[];
}) {
  return (
    <section
      id="services"
      className="relative overflow-hidden bg-[#2a351f] py-20 md:py-32"
    >
      {/* Repeating flower pattern overlay */}
      <div
        className="absolute inset-0 bg-[url('/flowers-pattern-1-white.svg')] bg-repeat opacity-[0.15]"
        aria-hidden
      />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <p className="mb-4 text-sm font-medium tracking-wider text-white/70 uppercase">
            About Our Services
          </p>
          <h2 className="text-3xl leading-tight font-bold text-balance text-white md:text-4xl">
            We&apos;re passionate about creating pollinator-friendly spaces that
            bring your vision to life
          </h2>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {services.map((service) => (
            <div
              key={service.title}
              className="rounded-2xl bg-[#3d4d2f] p-6 text-left transition-all duration-300 hover:bg-[#455734]"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center">
                <service.icon className="h-6 w-6 text-white" />
              </div>
              <h3 className="mb-3 font-semibold text-white">{service.title}</h3>
              <p className="text-sm leading-relaxed text-white/90">
                {service.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
