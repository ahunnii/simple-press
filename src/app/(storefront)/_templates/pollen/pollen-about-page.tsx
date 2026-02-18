import Image from "next/image";

import type { DefaultAboutPageTemplateProps } from "../types";

import { PollenGeneralLayout } from "./pollen-general-layout";

export function PollenAboutPage({ business }: DefaultAboutPageTemplateProps) {
  const themeSpecificFields = business?.siteContent?.customFields as Record<
    string,
    string
  >;

  const teamMembers = [
    {
      name:
        themeSpecificFields?.["pollen.about.team-member-1-name"] ??
        "Team Member 1",
      role:
        themeSpecificFields?.["pollen.about.team-member-1-role"] ??
        "Team Member 1 Role",
      image:
        themeSpecificFields?.["pollen.about.team-member-1-image"] ??
        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop&crop=face",
    },
    {
      name:
        themeSpecificFields?.["pollen.about.team-member-2-name"] ??
        "Team Member 2",
      role:
        themeSpecificFields?.["pollen.about.team-member-2-role"] ??
        "Team Member 2 Role",
      image:
        themeSpecificFields?.["pollen.about.team-member-2-image"] ??
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face",
    },
    {
      name:
        themeSpecificFields?.["pollen.about.team-member-3-name"] ??
        "Team Member 3",
      role:
        themeSpecificFields?.["pollen.about.team-member-3-role"] ??
        "Team Member 3 Role",
      image:
        themeSpecificFields?.["pollen.about.team-member-3-image"] ??
        "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face",
    },
  ];

  return (
    <PollenGeneralLayout
      business={business}
      title="About Us"
      subtitle="Our Story"
    >
      <section className="pt-20 md:pt-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <h2 className="mb-6 text-4xl font-bold text-[#374151] md:text-5xl">
                {themeSpecificFields?.["pollen.about.header"] ?? "Heya!"}
              </h2>
              <div className="space-y-6 leading-relaxed text-[#4b5563]">
                <p>{themeSpecificFields?.["pollen.about.text"] ?? "Text"}</p>
              </div>
            </div>
            <div className="relative aspect-3/4 overflow-hidden rounded-2xl">
              <Image
                src={
                  themeSpecificFields?.["pollen.about.image"] ??
                  "https://images.unsplash.com/photo-1598902108854-10e335adac99?w=800&h=1000&fit=crop"
                }
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
      <section className="bg-white py-10 md:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <p className="mb-4 text-sm font-semibold tracking-wider text-[#5e8b4a] uppercase">
              {themeSpecificFields?.["pollen.about.staff-subheader"] ??
                "The Faces of Business"}
            </p>
            <h2 className="text-3xl font-bold text-[#374151] md:text-4xl">
              {themeSpecificFields?.["pollen.about.staff-header"] ??
                "Meet Our Team"}
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
    </PollenGeneralLayout>
  );
}
