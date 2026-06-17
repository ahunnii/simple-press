"use client";

import { MapPin } from "lucide-react";

import { useViiReveal } from "../hooks/use-vii-reveal";

type Props = {
  heading: string;
  mapImage: string;
  mapsUrl?: string;
};

export function ViiContactMap({ heading, mapImage, mapsUrl }: Props) {
  const { ref, visible } = useViiReveal(0.08);

  return (
    <section
      aria-labelledby="contact-map-heading"
      style={{
        background: "var(--vii-paper)",
        padding: "clamp(56px, 8vw, 104px) clamp(24px, 6vw, 96px)",
      }}
    >
      <div
        ref={ref}
        className={`vii-reveal${visible ? " is-visible" : ""}`}
        style={{ maxWidth: 1180, margin: "0 auto" }}
      >
        {heading && (
          <h2
            id="contact-map-heading"
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "var(--vii-ink-soft)",
              marginBottom: 20,
            }}
          >
            {heading}
          </h2>
        )}

        <a
          href={mapsUrl ?? "#!"}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View our location on Google Maps (opens in a new tab)"
          className="group relative block aspect-[21/9] w-full overflow-hidden"
          style={{ borderRadius: "var(--radius)", background: "var(--vii-slate)" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={mapImage}
            alt=""
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
            style={{ background: "rgba(30, 53, 64, 0.55)" }}
          >
            <div className="flex flex-col items-center gap-3">
              <MapPin
                className="h-10 w-10"
                style={{ color: "var(--vii-paper)" }}
              />
              <p
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 12,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "var(--vii-paper)",
                }}
              >
                View on Google Maps
              </p>
            </div>
          </div>
        </a>
      </div>
    </section>
  );
}
