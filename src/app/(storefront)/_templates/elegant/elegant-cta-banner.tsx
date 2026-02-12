"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Flower2, Globe, Leaf } from "lucide-react";

import type { RouterOutputs } from "~/trpc/react";
import { getThemeFields } from "~/lib/template-fields";

export function ElegantCTABanner({
  homepage,
}: {
  homepage: RouterOutputs["business"]["getHomepage"];
}) {
  const [isVisible, setIsVisible] = useState(false);
  const bannerRef = useRef<HTMLDivElement>(null);
  const customFields = homepage?.siteContent?.customFields;
  /* eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call -- getThemeFields accepts unknown (Prisma JsonValue) */
  const themeSpecificFields: Record<string, string> = getThemeFields(
    "elegant",
    customFields as unknown,
  );

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 },
    );

    if (bannerRef.current) {
      observer.observe(bannerRef.current);
    }

    return () => {
      if (bannerRef.current) {
        observer.unobserve(bannerRef.current);
      }
    };
  }, []);

  return (
    <section className="bg-background py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div
          ref={bannerRef}
          className={`bg-accent relative flex min-h-[400px] flex-col justify-center overflow-hidden rounded-3xl p-12 transition-all duration-700 ease-out md:p-16 ${
            isVisible ? "scale-100 opacity-100" : "scale-95 opacity-0"
          }`}
        >
          {/* Background Image */}
          <Image
            src="/images/bf965cf4-e728-4e72-ab1b-16b1cd8f1822.png"
            alt="Natural ingredients"
            fill
            className="object-cover"
          />

          <div className="relative z-10 max-w-2xl text-left">
            <h3 className="mb-4 text-4xl text-white md:text-5xl lg:text-5xl">
              100% Natural
            </h3>
            <h3 className="mb-8 text-3xl text-white/70 md:text-4xl lg:text-5xl">
              100% You
            </h3>

            <div className="flex flex-col items-start gap-4">
              <div className="flex items-center gap-3 text-white/90">
                <Leaf className="h-5 w-5 flex-shrink-0" strokeWidth={1} />
                <span className="text-base">No Harsh Chemicals</span>
              </div>
              <div className="flex items-center gap-3 text-white/90">
                <Flower2 className="h-5 w-5 flex-shrink-0" strokeWidth={1} />
                <span className="text-base">Plant-Based Goodness</span>
              </div>
              <div className="flex items-center gap-3 text-white/90">
                <Globe className="h-5 w-5 flex-shrink-0" strokeWidth={1} />
                <span className="text-base">Ethically Sourced</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
