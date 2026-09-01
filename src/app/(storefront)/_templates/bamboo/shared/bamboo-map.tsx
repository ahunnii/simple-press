"use client";

import { useState } from "react";
import { MapPin } from "lucide-react";

import type { MapViewport } from "~/components/ui/map";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import {
  Map,
  MapMarker,
  MarkerContent,
  MarkerPopup,
  MarkerTooltip,
} from "~/components/ui/map";

type BambooMapProps = {
  businessName: string;
  address?: string;
  latitude: number;
  longitude: number;
  viewUrl: string;
  directionsUrl: string;
};

/**
 * Real, functional locator (MapLibre) — restyled to the "Illustrated & Alive"
 * `.bamboo-map`/`.bamboo-map-chip` frame (radius/shadow/caption). This is a
 * real embed with a real marker, so unlike the mockup's illustrated map it
 * gets NO fake bouncing pin animation — the marker just renders where it is.
 * Props and `sectionGroupAttr` wiring are unchanged; this component is shared
 * by both the homepage Location section and the Contact page map.
 */
export function BambooMap({
  businessName,
  address,
  latitude,
  longitude,
  viewUrl,
  directionsUrl,
}: BambooMapProps) {
  const [viewport, setViewport] = useState<MapViewport>({
    center: [longitude, latitude],
    zoom: 13.5,
    bearing: 0,
    pitch: 0,
  });

  return (
    <div
      {...sectionGroupAttr("global", "location")}
      role="region"
      aria-label="Location map"
      className="bamboo-map relative h-[420px] w-full"
    >
      <Map
        viewport={viewport}
        onViewportChange={setViewport}
        styles={{
          light: "https://tiles.openfreemap.org/styles/bright",
          dark: "https://tiles.openfreemap.org/styles/bright",
        }}
      >
        <MapMarker longitude={longitude} latitude={latitude} anchor="bottom">
          <MarkerContent>
            <MapPin
              className="size-10 fill-[var(--bamboo-terracotta)] text-[var(--bamboo-roll)] drop-shadow-md"
              aria-hidden="true"
            />
          </MarkerContent>
          <MarkerTooltip>{businessName}</MarkerTooltip>
          <MarkerPopup>
            <div className="space-y-1">
              <p className="font-heading font-semibold text-[var(--bamboo-pine)]">
                {businessName}
              </p>
              {address && (
                <p className="text-xs text-[var(--bamboo-ink-soft)]">
                  {address}
                </p>
              )}
            </div>
          </MarkerPopup>
        </MapMarker>
      </Map>

      <div className="bamboo-map-chip">
        <b>{businessName}</b>
        <span>{address ?? "Find us here"}</span>
        <div className="mt-3 flex items-center gap-4">
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Get directions (opens in new tab)"
            className="bamboo-swipe text-sm font-semibold text-[var(--bamboo-pine)]"
          >
            Directions
          </a>
          <a
            href={viewUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View larger map on Google Maps (opens in new tab)"
            className="bamboo-swipe text-sm font-semibold text-[var(--bamboo-pine)]"
          >
            View larger map
          </a>
        </div>
      </div>
    </div>
  );
}
