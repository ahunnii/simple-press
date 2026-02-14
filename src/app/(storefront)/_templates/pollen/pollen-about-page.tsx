import Image from "next/image";
import Link from "next/link";

import type { RouterOutputs } from "~/trpc/react";
import { buttonVariants } from "~/components/ui/button";

const teamMembers = [
  {
    name: "Zenaida Flores",
    role: "Owner",
    image:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop&crop=face",
  },
  {
    name: "Tharmond Ligon Jr.",
    role: "Owner",
    image:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face",
  },
  {
    name: "Brodrick Wilks",
    role: "Administrator",
    image:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face",
  },
];

type Props = {
  business: NonNullable<RouterOutputs["business"]["get"]>;
};

export function PollenAboutPage({ business }: Props) {
  return (
    <div className="bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-24 md:py-32">
        <Image
          src="https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=1920&h=600&fit=crop"
          alt=""
          fill
          className="object-cover blur-sm brightness-75"
          sizes="100vw"
          priority
        />
        <div className="absolute inset-0 bg-[#2a351f]/90" />
        <div className="relative z-10 mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <p className="mb-4 text-sm font-medium tracking-wider text-[#A8D081] uppercase">
            Our Story
          </p>
          <h1 className="text-5xl font-bold text-white md:text-6xl lg:text-7xl">
            About Us
          </h1>
        </div>
      </section>

      {/* Introduction Section - Heya! */}
      <section className="py-20 md:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <h2 className="mb-6 text-4xl font-bold text-[#374151] md:text-5xl">
                Heya!
              </h2>
              <div className="space-y-6 leading-relaxed text-[#4b5563]">
                <p>
                  Detroit Pollinator Company (DPC) is a minority-owned business
                  specializing in land design consultation services to enhance
                  urban and rural communities. We transform gardens into
                  pollinator habitats and create sustainable green spaces for
                  homeowners, community organizations, and municipalities.
                </p>
                <p>
                  We understand the unique challenges and opportunities of land
                  design in Detroit. Our team of experienced professionals is
                  dedicated to crafting customized service plans that beautify
                  spaces while supporting local ecosystems and biodiversity.
                </p>
                <p>
                  Our goal is to empower individuals and organizations to create
                  environments that foster pollination, enhance landscape
                  aesthetics, and contribute positively to our neighborhoods. We
                  believe in cultivating thriving spaces for pollinators—and for
                  people.
                </p>
                <p>
                  Let&apos;s work together to make Detroit—and beyond—a greener,
                  more sustainable place for all!
                </p>
              </div>
            </div>
            <div className="relative aspect-3/4 overflow-hidden rounded-2xl">
              <Image
                src="https://images.unsplash.com/photo-1598902108854-10e335adac99?w=800&h=1000&fit=crop"
                alt="Lush green plants in a greenhouse or conservatory"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="bg-white py-20 md:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <p className="mb-4 text-sm font-semibold tracking-wider text-[#5e8b4a] uppercase">
              The Faces of DPC
            </p>
            <h2 className="text-3xl font-bold text-[#374151] md:text-4xl">
              Meet Our Team
            </h2>
          </div>

          <div className="flex flex-col items-center justify-center gap-12 sm:flex-row sm:gap-16">
            {teamMembers.map((member) => (
              <div key={member.name} className="flex flex-col items-center">
                <div className="relative mb-4 h-48 w-48 overflow-hidden rounded-full">
                  <Image
                    src={member.image}
                    alt={member.name}
                    fill
                    className="object-cover"
                    sizes="192px"
                  />
                </div>
                <h3 className="text-lg font-semibold text-[#374151]">
                  {member.name}
                </h3>
                <p className="text-sm font-medium tracking-wider text-[#5e8b4a] uppercase">
                  {member.role}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative overflow-hidden py-24 md:py-32">
        <Image
          src="/dpc-call-to-action.webp"
          alt=""
          fill
          className="object-cover blur-sm brightness-75"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-black/30" />
        <div className="relative z-10 flex min-h-[50vh] items-center justify-center px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="mb-6 text-sm font-medium tracking-wider text-[#A8D081] uppercase">
              No Obligation - Usually Respond Within 24 Hours
            </p>
            <h2 className="mb-6 text-4xl leading-tight font-bold text-white md:text-5xl lg:text-6xl">
              Ready to Transform Your Space?
            </h2>
            <p className="mx-auto mb-10 max-w-xl leading-relaxed text-white md:text-lg">
              Whether you&apos;re dreaming of a pollinator-friendly garden or
              planning a community green space, we&apos;re here to bring your
              vision to life. Get your free consultation today and join us in
              making Detroit greener, one project at a time.
            </p>
            <Link
              href="/contact"
              className={buttonVariants({
                size: "lg",
                className:
                  "rounded-full bg-[#5e8b4a] px-8 py-6 text-base font-medium text-white shadow-lg hover:bg-[#4d7a3d]",
              })}
            >
              Request a Quote Today
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
