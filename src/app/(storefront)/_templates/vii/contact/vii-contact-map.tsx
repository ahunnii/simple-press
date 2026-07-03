"use client";

import { useState } from "react";

import type { MapViewport } from "~/components/ui/map";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import {
  Map,
  MapMarker,
  MarkerContent,
  MarkerPopup,
  MarkerTooltip,
} from "~/components/ui/map";

import { useViiReveal } from "../hooks/use-vii-reveal";

type Props = {
  heading: string;
  businessName: string;
  address?: string;
  latitude: number;
  longitude: number;
  viewUrl: string;
  directionsUrl: string;
};

export function ViiContactMap({
  heading,
  businessName,
  address,
  latitude,
  longitude,
  viewUrl,
  directionsUrl,
}: Props) {
  const { ref, visible } = useViiReveal(0.08);

  const [viewport, setViewport] = useState<MapViewport>({
    center: [longitude, latitude],
    zoom: 12,
    bearing: 0,
    pitch: 0,
  });

  return (
    <section
      aria-labelledby="contact-map-heading"
      {...sectionGroupAttr("contact", "map")}
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
            {...fieldAttr("vii.contact.map-heading")}
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

        <div className="relative h-[420px] w-full">
          <Map
            viewport={viewport}
            onViewportChange={setViewport}
            styles={{
              light: "https://tiles.openfreemap.org/styles/bright",
              dark: "https://tiles.openfreemap.org/styles/bright",
            }}
          >
            <MapMarker longitude={longitude} latitude={latitude}>
              <MarkerContent>
                <div className="bg-primary size-4 rounded-full border-2 border-white shadow-lg" />
              </MarkerContent>
              <MarkerTooltip>{businessName}</MarkerTooltip>
              <MarkerPopup>
                <div className="space-y-1">
                  <p className="text-foreground font-medium">{businessName}</p>
                  {address && (
                    <p className="text-muted-foreground text-xs">{address}</p>
                  )}
                </div>
              </MarkerPopup>
            </MapMarker>
          </Map>

          <div
            style={{
              position: "absolute",
              bottom: 16,
              left: 16,
              zIndex: 10,
              maxWidth: "min(320px, calc(100% - 2rem))",
              background: "var(--vii-paper)",
              border: "1px solid var(--vii-hairline)",
              borderRadius: "var(--radius)",
              padding: 20,
            }}
          >
            <p
              style={{
                fontFamily: "var(--font-serif)",
                fontWeight: 400,
                fontSize: 18,
                color: "var(--vii-navy)",
                margin: 0,
              }}
            >
              {businessName}
            </p>
            {address && (
              <p
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 13,
                  color: "var(--vii-ink-soft)",
                  margin: "4px 0 0",
                  lineHeight: 1.5,
                }}
              >
                {address}
              </p>
            )}
            <div
              style={{
                marginTop: 16,
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: 16,
              }}
            >
              <a
                href={directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Get directions (opens in a new tab)"
                className="vii-cta-btn"
                style={{
                  position: "relative",
                  overflow: "hidden",
                  display: "inline-block",
                  background: "var(--vii-copper-deep)",
                  color: "var(--vii-paper)",
                  fontFamily: "var(--font-sans)",
                  fontSize: 12,
                  fontWeight: 500,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  padding: "14px 28px",
                  borderRadius: "var(--radius)",
                  textDecoration: "none",
                }}
              >
                Directions
              </a>
              <a
                href={viewUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="View larger map (opens in a new tab)"
                style={{
                  display: "inline-block",
                  fontFamily: "var(--font-sans)",
                  fontSize: 12,
                  fontWeight: 500,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "var(--vii-navy)",
                  textDecoration: "none",
                  borderBottom: "1px solid var(--vii-copper-deep)",
                  paddingBottom: 2,
                }}
              >
                View larger map
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
