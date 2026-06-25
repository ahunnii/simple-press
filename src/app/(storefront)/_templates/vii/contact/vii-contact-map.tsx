"use client";

import { useState } from "react";

import type { MapViewport } from "~/components/ui/map";
import { Button } from "~/components/ui/button";
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

          <div className="bg-background/95 absolute bottom-4 left-4 z-10 max-w-[min(320px,calc(100%-2rem))] rounded-lg border p-4 shadow-lg backdrop-blur">
            <p className="text-foreground font-semibold">{businessName}</p>
            {address && (
              <p className="text-muted-foreground mt-0.5 text-sm">{address}</p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline">
                <a href={viewUrl} target="_blank" rel="noopener noreferrer">
                  View larger map
                </a>
              </Button>
              <Button asChild size="sm">
                <a
                  href={directionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Directions
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
