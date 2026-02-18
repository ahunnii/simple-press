"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { RouterOutputs } from "~/trpc/react";

const heroMediaStyle = {
  position: "absolute" as const,
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  minWidth: "100%",
  minHeight: "100%",
  width: "auto",
  height: "auto",
  objectFit: "cover" as const,
};

const HERO_VIDEO_SRC =
  "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/f3d8cad2-8091-4809-aac0-eaac74b0be7c-Z4XUCz3CRR7qjaOsoq6rFmbJfIRdgs.mp4";

type Props = {
  homepage: RouterOutputs["business"]["getHomepage"];
};
export function ElegantHero({ homepage }: Props) {
  const heroImageUrl = "/placeholder.svg";
  const useImage = Boolean(heroImageUrl?.trim());

  return (
    <section
      className="relative flex min-h-screen items-center overflow-hidden"
      style={{ backgroundColor: "#e3e1e2" }}
    >
      {/* Background media (image or video) */}
      <div
        className="border-border/50 border-b p-6 py-2"
        style={{ backgroundColor: "#e3e1e2" }}
      >
        {useImage ? (
          <>
            <img
              src={heroImageUrl}
              alt=""
              className="pointer-events-none select-none"
              style={heroMediaStyle}
            />
            {/* Dark overlay for contrast when using hero image
            <div
              className="pointer-events-none absolute inset-0 bg-black/20"
              aria-hidden
            /> */}
          </>
        ) : (
          <video autoPlay muted loop playsInline style={heroMediaStyle}>
            <source src={HERO_VIDEO_SRC} type="video/mp4" />
          </video>
        )}
        {/* Bottom fade gradient */}
        <div className="from-background via-background/50 absolute right-0 bottom-0 left-0 h-[60%] bg-gradient-to-t to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 mr-14 w-full pt-20 lg:mr-0">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto w-full text-center lg:mx-0 lg:max-w-xl lg:text-left">
            <span
              className="animate-blur-in mb-6 block text-sm tracking-normal text-black uppercase opacity-0"
              style={{ animationDelay: "0.2s", animationFillMode: "forwards" }}
            >
              Natural Skincare
            </span>
            <h2 className="mb-6 font-serif text-5xl leading-[1.1] text-balance text-black md:text-6xl lg:text-7xl">
              {(() => {
                // Get the heroTitle from homepage or fallback text
                const heroTitle = "Made with care.\nEspecially for you.";
                // Split heroTitle into lines by newline, defaulting to two lines
                const [firstLine, secondLine = ""] = heroTitle.split("\n");
                return (
                  <>
                    <span
                      className="animate-blur-in block font-semibold opacity-0 text-shadow-xs"
                      style={{
                        animationDelay: "0.4s",
                        animationFillMode: "forwards",
                      }}
                    >
                      {firstLine}
                    </span>
                    <span
                      className="animate-blur-in block text-7xl font-semibold opacity-0 text-shadow-xs xl:text-9xl"
                      style={{
                        animationDelay: "0.6s",
                        animationFillMode: "forwards",
                      }}
                    >
                      {secondLine}
                    </span>
                  </>
                );
              })()}
            </h2>
            <p
              className="animate-blur-in mx-auto mb-10 max-w-md text-lg leading-relaxed text-black opacity-0 lg:mx-0"
              style={{ animationDelay: "0.8s", animationFillMode: "forwards" }}
            >
              {"Check out our products!"}
            </p>

            <div
              className="animate-blur-in flex flex-col justify-center gap-4 opacity-0 sm:flex-row lg:justify-start"
              style={{ animationDelay: "1s", animationFillMode: "forwards" }}
            >
              <Link
                href={"/shop"}
                className="group bg-primary text-primary-foreground boty-transition hover:bg-primary/90 boty-shadow inline-flex items-center justify-center gap-3 rounded-full px-8 py-4 text-sm tracking-wide"
              >
                {"Shop Now"}
                <ArrowRight className="boty-transition h-4 w-4 group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 text-black">
        <span className="text-xs font-bold tracking-widest uppercase">
          Scroll
        </span>
        <div className="bg-foreground/20 relative h-12 w-px overflow-hidden">
          <div className="bg-foreground/60 absolute top-0 left-0 h-1/2 w-full animate-pulse" />
        </div>
      </div>
    </section>
  );
}
