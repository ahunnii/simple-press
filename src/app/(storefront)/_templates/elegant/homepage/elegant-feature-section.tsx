/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

import type { RouterOutputs } from "~/trpc/react";
import {
  getListFieldValue,
  parseTemplateIconListRows,
} from "~/lib/template-fields";

import { DEFAULT_ELEGANT_ABOUT_FEATURES } from "..";

type Props = {
  homepage: RouterOutputs["business"]["getHomepage"];
  aboutTitle?: string;
  aboutText?: string;

  aboutVideo?: string;
  aboutImage?: string;
  aboutTagline?: string;
};

export function ElegantFeatureSection({
  homepage,
  aboutTitle,
  aboutText,
  aboutTagline,
  aboutVideo,
  aboutImage,
}: Props) {
  const [, setIsVisible] = useState(false);
  const [isVideoVisible, setIsVideoVisible] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(false);
  const bentoRef = useRef<HTMLDivElement>(null);
  const videoSectionRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  const hasVideo = !!aboutVideo?.trim();

  const featureCards = parseTemplateIconListRows(
    getListFieldValue(
      homepage?.siteContent?.customFields,
      "elegant.homepage.about-features-list",
    ),
    DEFAULT_ELEGANT_ABOUT_FEATURES,
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

    const videoObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsVideoVisible(true);
        }
      },
      { threshold: 0.1 },
    );

    const headerObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setHeaderVisible(true);
        }
      },
      { threshold: 0.1 },
    );

    if (bentoRef.current) {
      observer.observe(bentoRef.current);
    }

    if (videoSectionRef.current) {
      videoObserver.observe(videoSectionRef.current);
    }

    if (headerRef.current) {
      headerObserver.observe(headerRef.current);
    }

    return () => {
      if (bentoRef.current) {
        observer.unobserve(bentoRef.current);
      }
      if (videoSectionRef.current) {
        videoObserver.unobserve(videoSectionRef.current);
      }
      if (headerRef.current) {
        headerObserver.unobserve(headerRef.current);
      }
    };
  }, []);

  return (
    <section className="bg-background py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div
          ref={videoSectionRef}
          className="my-0 grid items-center gap-12 py-20 lg:grid-cols-2 lg:gap-20"
        >
          {hasVideo ? (
            <div
              className={`boty-shadow relative aspect-[4/5] overflow-hidden rounded-3xl transition-all duration-700 ease-out ${
                isVideoVisible ? "scale-100 opacity-100" : "scale-95 opacity-0"
              }`}
            >
              <video
                autoPlay
                muted
                loop
                playsInline
                className="absolute inset-0 h-full w-full object-cover"
              >
                <source
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/0c826034-d4f2-4d4f-8e99-50e94e4ce63f-dG1CBOjR36xFPTbhcROrHbomGXtlTQ.mp4"
                  type="video/mp4"
                />
              </video>
            </div>
          ) : (
            <div className="relative aspect-[4/5] overflow-hidden rounded-3xl">
              <Image
                src={aboutImage ?? ""}
                fill
                className="object-cover"
                priority
                alt="About image"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
          )}
          {/* Content */}
          <div
            ref={headerRef}
            className={`transition-all duration-700 ease-out ${
              isVideoVisible
                ? "translate-y-0 opacity-100"
                : "translate-y-8 opacity-0"
            }`}
            style={{ transitionDelay: "100ms" }}
          >
            <span
              className={`text-primary mb-4 block text-sm tracking-[0.3em] uppercase ${headerVisible ? "animate-blur-in opacity-0" : "opacity-0"}`}
              style={
                headerVisible
                  ? { animationDelay: "0.2s", animationFillMode: "forwards" }
                  : {}
              }
            >
              {aboutTagline}
            </span>
            <h2
              className={`text-foreground mb-6 font-serif text-4xl leading-tight text-balance md:text-7xl ${headerVisible ? "animate-blur-in opacity-0" : "opacity-0"}`}
              style={
                headerVisible
                  ? { animationDelay: "0.4s", animationFillMode: "forwards" }
                  : {}
              }
            >
              {aboutTitle}
            </h2>
            <p
              className={`text-muted-foreground mb-10 max-w-md text-lg leading-relaxed ${headerVisible ? "animate-blur-in opacity-0" : "opacity-0"}`}
              style={
                headerVisible
                  ? { animationDelay: "0.6s", animationFillMode: "forwards" }
                  : {}
              }
            >
              {aboutText}
            </p>

            {/* Feature Cards */}
            <div className="grid gap-4 sm:grid-cols-2">
              {featureCards?.map((feature) => (
                <div
                  key={feature.title}
                  className="group boty-transition rounded-md bg-white p-5 hover:scale-[1.02]"
                >
                  <div className="group-hover:bg-primary/20 boty-transition mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-stone-50">
                    <feature.icon className="text-primary h-5 w-5" />
                  </div>
                  <h3 className="text-foreground mb-1 font-medium">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
