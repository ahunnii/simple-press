"use client";

import { useEffect, useRef, useState } from "react";
import { Droplets, Flower2, Leaf, Sparkles } from "lucide-react";

const badges = [
  {
    icon: Leaf,
    title: "Organic Certified",
    description: "100% organic ingredients",
  },
  {
    icon: Droplets,
    title: "Natural Extracts",
    description: "Pure botanical formulas",
  },
  {
    icon: Sparkles,
    title: "Clean Beauty",
    description: "No toxic chemicals",
  },
  {
    icon: Flower2,
    title: "Vegan Formula",
    description: "Plant-powered skincare",
  },
];

export function ElegantTrustBadges() {
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
          {badges.map((badge, index) => (
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
