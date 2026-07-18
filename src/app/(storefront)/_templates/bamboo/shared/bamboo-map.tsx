"use client";

import { useState } from "react";
import { MapPin } from "lucide-react";

import type { MapViewport } from "~/components/ui/map";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { Button } from "~/components/ui/button";
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
      className="border-border/60 relative h-[420px] w-full overflow-hidden rounded-2xl border shadow-sm"
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
              className="fill-primary size-10 text-white drop-shadow-md"
              aria-hidden="true"
            />
          </MarkerContent>
          <MarkerTooltip>{businessName}</MarkerTooltip>
          <MarkerPopup>
            <div className="space-y-1">
              <p className="font-heading text-foreground font-semibold">
                {businessName}
              </p>
              {address && (
                <p className="text-muted-foreground text-xs">{address}</p>
              )}
            </div>
          </MarkerPopup>
        </MapMarker>
      </Map>

      <div className="bg-card border-border/60 absolute bottom-4 left-4 z-10 max-w-[min(320px,calc(100%-2rem))] rounded-lg border p-5 shadow-sm">
        <p className="font-heading text-foreground text-lg font-bold">
          {businessName}
        </p>
        {address && (
          <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
            {address}
          </p>
        )}
        <div className="mt-4 flex items-center gap-4">
          <Button size="sm" asChild>
            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Get directions (opens in new tab)"
            >
              Directions
            </a>
          </Button>
          <a
            href={viewUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View larger map on Google Maps (opens in new tab)"
            className="text-primary text-sm font-semibold hover:underline"
          >
            View larger map
          </a>
        </div>
      </div>
    </div>
  );
}
