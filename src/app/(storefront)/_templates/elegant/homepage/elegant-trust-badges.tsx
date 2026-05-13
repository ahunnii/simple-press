/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useRef, useState } from "react";

import type { GenericIconRow } from "~/lib/template-fields";
import type { RouterOutputs } from "~/trpc/react";
import {
  getListFieldValue,
  parseTemplateIconListRows,
} from "~/lib/template-fields";

import { DEFAULT_ELEGANT_TRUST_BADGES } from "..";

export function ElegantTrustBadges({
  homepage,
}: {
  homepage: RouterOutputs["business"]["getHomepage"];
}) {
  const trustBadges = parseTemplateIconListRows(
    getListFieldValue(
      homepage?.siteContent?.customFields,
      "elegant.homepage.trust-badges-list",
    ),
    DEFAULT_ELEGANT_TRUST_BADGES,
  );
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 },
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => {
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current);
      }
    };
  }, []);

  return (
    <section className="bg-background py-20">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div ref={sectionRef} className="grid grid-cols-2 gap-6 lg:grid-cols-4">
          {trustBadges?.map((badge, index) => (
            <div
              key={badge.title}
              className={`bg-background rounded-xl border border-none border-stone-200 p-6 text-center transition-all duration-700 ease-out lg:p-8 ${
                isVisible
                  ? "translate-y-0 opacity-100"
                  : "translate-y-8 opacity-0"
              }`}
              style={{ transitionDelay: `${index * 150}ms` }}
            >
              <badge.icon
                className="text-primary mx-auto mb-4 size-12"
                strokeWidth={1}
              />
              <h3 className="text-foreground mb-2 font-serif text-2xl">
                {badge.title}
              </h3>
              <p className="text-muted-foreground text-sm">
                {badge.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
