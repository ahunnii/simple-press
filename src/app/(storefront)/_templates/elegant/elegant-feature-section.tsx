"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Flower2, Globe, Leaf, Recycle } from "lucide-react";

import type { RouterOutputs } from "~/trpc/react";
import { getThemeFields, TEMPLATE_FIELDS } from "~/lib/template-fields";

const features = [
  {
    icon: Recycle,
    title: "Eco-Friendly Packaging",
    description: "Recyclable and biodegradable materials",
  },
  {
    icon: Leaf,
    title: "100% Natural",
    description: "No synthetic chemicals or parabens",
  },
  {
    icon: Flower2,
    title: "Plant-Based",
    description: "Botanical extracts and essential oils",
  },
  {
    icon: Globe,
    title: "Ethical Sourcing",
    description: "Fair trade certified ingredients",
  },
];

type Props = {
  homepage: RouterOutputs["business"]["getHomepage"];
};

export function ElegantFeatureSection({ homepage }: Props) {
  const [isVisible, setIsVisible] = useState(false);
  const [isVideoVisible, setIsVideoVisible] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(false);
  const bentoRef = useRef<HTMLDivElement>(null);
  const videoSectionRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  /* eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call -- getThemeFields accepts unknown (Prisma JsonValue) */
  const themeSpecificFields = getThemeFields(
    "elegant",
    homepage?.siteContent?.customFields as unknown,
  );

  const aboutTitle = themeSpecificFields["elegant.homepage.about.title"];
  const aboutText = themeSpecificFields["elegant.homepage.about.text"];
  // const features = homepage?.siteContent?.features as {
  //   title: string;
  //   description: string;
  //   icon: string;
  // }[];

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
        {/* Bento Grid */}
        {/* <div
          ref={bentoRef}
          className="mb-20 grid gap-6 md:grid-cols-4 md:grid-rows-[300px_300px]"
        >
          <div
            className={`relative h-[500px] overflow-hidden rounded-3xl transition-all duration-700 ease-out md:col-span-2 md:row-span-2 md:h-auto ${
              isVisible ? "scale-100 opacity-100" : "scale-95 opacity-0"
            }`}
            style={{ transitionDelay: "0ms" }}
          >
            <video
              autoPlay
              muted
              loop
              playsInline
              className="absolute inset-0 h-full w-full object-cover"
            >
              <source
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/c4baaf67-b900-4b90-af2a-daf25a5a4b78-5un5eTbj9Z67qEtEdsQwlYrte9dZM9.mp4"
                type="video/mp4"
              />
            </video>

            <div className="absolute right-8 bottom-8 left-8 rounded-xl bg-white p-6 shadow-lg">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0"></div>
                <div>
                  <h3 className="text-foreground mb-2 text-xl font-medium">
                    100% <span className="">Plant-Based</span>
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Formulated exclusively with botanical ingredients and
                    natural plant extracts.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div
            className={`relative flex flex-col justify-center overflow-hidden rounded-3xl p-6 transition-all duration-700 ease-out md:col-span-2 md:p-8 ${
              isVisible ? "scale-100 opacity-100" : "scale-95 opacity-0"
            }`}
            style={{ transitionDelay: "100ms" }}
          >
            <Image
              src="/images/products/0ed61900-dd29-4dd2-bc2d-abc2db54c352.png"
              alt="Natural ingredients"
              fill
              className="object-cover"
            />

            <div className="relative z-10">
              <h3 className="mb-2 text-3xl text-white md:text-4xl">
                100% Natural
              </h3>
              <h3 className="mb-4 text-2xl text-white/70 md:text-3xl">
                100% You
              </h3>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-white/90">
                  <Leaf className="h-4 w-4 flex-shrink-0" />
                  <span>No Harsh Chemicals</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-white/90">
                  <Flower2 className="h-4 w-4 flex-shrink-0" />
                  <span>Plant-Based Goodness</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-white/90">
                  <Globe className="h-4 w-4 flex-shrink-0" />
                  <span>Ethically Sourced</span>
                </div>
              </div>
            </div>
          </div>

          <div
            className={`relative flex flex-col justify-center overflow-hidden rounded-3xl p-6 transition-all duration-700 ease-out md:col-span-2 md:p-8 ${
              isVisible ? "scale-100 opacity-100" : "scale-95 opacity-0"
            }`}
            style={{ transitionDelay: "200ms" }}
          >
            <video
              autoPlay
              muted
              loop
              playsInline
              className="absolute inset-0 h-full w-full scale-[1.02] object-cover"
            >
              <source
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/a0b7c364-afa9-4afa-9716-45718578cc01-Ih8UaqQr1bl8aoNlbRha4FgaQ65eXX.mp4"
                type="video/mp4"
              />
            </video>

            <div className="absolute inset-0 bg-transparent" />

            <div className="relative z-10 flex h-full flex-col items-start justify-center text-left">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center">
                <Recycle className="h-8 w-8 text-black" />
              </div>
              <h3 className="mb-1 font-sans text-base text-black">
                Eco-Friendly
              </h3>
              <h3 className="mb-2 text-2xl text-black md:text-3xl">
                Packaging
              </h3>
            </div>
          </div>
        </div> */}

        <div
          ref={videoSectionRef}
          className="my-0 grid items-center gap-12 py-20 lg:grid-cols-2 lg:gap-20"
        >
          {/* Video */}
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
              About {homepage?.name}
            </span>
            <h2
              className={`text-foreground mb-6 font-serif text-4xl leading-tight text-balance md:text-7xl ${headerVisible ? "animate-blur-in opacity-0" : "opacity-0"}`}
              style={
                headerVisible
                  ? { animationDelay: "0.4s", animationFillMode: "forwards" }
                  : {}
              }
            >
              {!!aboutTitle ? aboutTitle : "About Us"}
            </h2>
            <p
              className={`text-muted-foreground mb-10 max-w-md text-lg leading-relaxed ${headerVisible ? "animate-blur-in opacity-0" : "opacity-0"}`}
              style={
                headerVisible
                  ? { animationDelay: "0.6s", animationFillMode: "forwards" }
                  : {}
              }
            >
              {!!aboutText
                ? aboutText
                : "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis nec sollicitudin urna, vitae dictum nisi. Nullam lobortis ut neque eget cursus."}
            </p>

            {/* Feature Cards */}
            <div className="grid gap-4 sm:grid-cols-2">
              {features?.map((feature) => (
                <div
                  key={feature.title}
                  className="group boty-transition rounded-md bg-white p-5 hover:scale-[1.02]"
                >
                  <div className="group-hover:bg-primary/20 boty-transition mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-stone-50">
                    {/* <feature.icon className="text-primary h-5 w-5" /> */}
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
