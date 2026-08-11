"use client";

import { useState } from "react";
import { MapPin } from "lucide-react";

import type { MapViewport } from "~/components/ui/map";
import {
  Map,
  MapControls,
  MapMarker,
  MarkerContent,
  MarkerTooltip,
} from "~/components/ui/map";

/**
 * The Contact page's interactive location map — a MapLibre island beside the
 * "Visit Us" address block (design.md → Contact §2; the source's dead Google
 * Maps raster widget is deviation #4).
 *
 * Built on the same pattern as `_templates/bamboo/shared/bamboo-map.tsx`: a
 * thin `"use client"` wrapper over the shared `~/components/ui/map` primitives,
 * holding the controlled viewport so panning/zooming works. Coordinates are
 * owner-editable template fields; the server page parses and validates them and
 * simply doesn't render this component when they're missing or malformed.
 *
 * Colours ride the `--relocation-*` tokens only; the basemap is the same
 * OpenFreeMap "bright" style bamboo uses, in both light and dark so the map
 * never inverts inside this fixed-brand white template.
 */

const BASEMAP_STYLE = "https://tiles.openfreemap.org/styles/bright";

export function RelocationContactMap({
  latitude,
  longitude,
  zoom,
  /** Plain-text address used for the marker tooltip and the region label. */
  label,
}: {
  latitude: number;
  longitude: number;
  zoom: number;
  label: string;
}) {
  const [viewport, setViewport] = useState<MapViewport>({
    center: [longitude, latitude],
    zoom,
    bearing: 0,
    pitch: 0,
  });

  return (
    <div
      role="region"
      aria-label={label === "" ? "Location map" : `Location map: ${label}`}
      className="relative aspect-[16/10] w-full overflow-hidden rounded-[var(--relocation-radius)] border border-[var(--relocation-border)]"
    >
      <Map
        viewport={viewport}
        onViewportChange={setViewport}
        styles={{ light: BASEMAP_STYLE, dark: BASEMAP_STYLE }}
      >
        <MapMarker longitude={longitude} latitude={latitude} anchor="bottom">
          <MarkerContent>
            <MapPin
              className="size-10 fill-[var(--relocation-terracotta)] text-[var(--relocation-paper)] drop-shadow-md"
              aria-hidden="true"
            />
          </MarkerContent>
          {label === "" ? null : (
            <MarkerTooltip className="bg-[var(--relocation-charcoal)] [font-family:var(--font-relocation-display)] text-[var(--relocation-paper)]">
              {label}
            </MarkerTooltip>
          )}
        </MapMarker>

        <MapControls position="bottom-right" showZoom />
      </Map>
    </div>
  );
}
