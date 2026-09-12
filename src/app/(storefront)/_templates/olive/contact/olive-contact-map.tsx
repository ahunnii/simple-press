"use client";

import { useState } from "react";

import type { MapViewport } from "~/components/ui/map";
import { fieldAttr } from "~/lib/preview/section-attrs";
import {
  Map,
  MapMarker,
  MarkerContent,
  MarkerPopup,
  MarkerTooltip,
} from "~/components/ui/map";

import { OliveButton } from "../shared";

type Props = {
  sectionAttrs: Record<string, string>;
  heading: string;
  headingFieldKey: string;
  businessName: string;
  address?: string;
  latitude: number;
  longitude: number;
  viewUrl: string;
  directionsUrl: string;
};

/**
 * contact.map — only rendered by the page when both coordinates parse as
 * numbers. A pin plus a card with the view/directions links, styled from the
 * template's own tokens rather than the map library's defaults.
 */
export function OliveContactMap({
  sectionAttrs,
  heading,
  headingFieldKey,
  businessName,
  address,
  latitude,
  longitude,
  viewUrl,
  directionsUrl,
}: Props) {
  const [viewport, setViewport] = useState<MapViewport>({
    center: [longitude, latitude],
    zoom: 12,
    bearing: 0,
    pitch: 0,
  });

  return (
    <section
      {...sectionAttrs}
      aria-label="Find us"
      className="mx-auto w-full"
      style={{
        maxWidth: "var(--olive-container)",
        paddingBlock: "var(--olive-section-pad-y)",
        paddingInline: "var(--olive-section-pad-x)",
        backgroundColor: "var(--olive-white)",
      }}
    >
      {heading ? (
        <h2 className="olive-h2 mb-6" {...fieldAttr(headingFieldKey)}>
          {heading}
        </h2>
      ) : null}

      <div
        className="relative h-[380px] w-full overflow-hidden"
        style={{ borderRadius: "var(--olive-card-radius)" }}
      >
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
              <span
                aria-hidden="true"
                className="block rounded-full border-2"
                style={{
                  width: 16,
                  height: 16,
                  backgroundColor: "var(--olive-leaf)",
                  borderColor: "var(--olive-white)",
                  boxShadow: "var(--olive-shadow)",
                }}
              />
            </MarkerContent>
            <MarkerTooltip>{businessName}</MarkerTooltip>
            <MarkerPopup>
              <div className="space-y-1">
                <p className="olive-h3">{businessName}</p>
                {address ? <p className="olive-caption">{address}</p> : null}
              </div>
            </MarkerPopup>
          </MapMarker>
        </Map>

        <div className="olive-card absolute bottom-3 left-3 max-w-[min(300px,calc(100%-1.5rem))] p-4">
          <p className="olive-h3">{businessName}</p>
          {address ? <p className="olive-caption mt-1">{address}</p> : null}
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <OliveButton
              variant="primary"
              size="sm"
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Get directions, opens in a new tab"
            >
              Directions
            </OliveButton>
            <OliveButton
              variant="ghost"
              size="sm"
              href={viewUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View larger map, opens in a new tab"
            >
              View larger map
            </OliveButton>
          </div>
        </div>
      </div>
    </section>
  );
}
