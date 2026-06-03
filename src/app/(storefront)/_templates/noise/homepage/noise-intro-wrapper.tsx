"use client";

import { useState } from "react";

import { NoiseIntroOverlay } from "./noise-intro-overlay";

type IntroImage = { url: string; altText: string | null };

/** Client wrapper that manages intro-done state and renders the overlay above page content */
export function NoiseIntroWrapper({
  children,
  introImages,
  wordmark,
  locationTag,
}: {
  children: React.ReactNode;
  introImages?: IntroImage[];
  wordmark?: string;
  locationTag?: string;
}) {
  const [done, setDone] = useState(false);

  return (
    <>
      {!done && (
        <NoiseIntroOverlay
          images={introImages}
          onDone={() => setDone(true)}
          wordmark={wordmark}
          locationTag={locationTag}
        />
      )}
      {children}
    </>
  );
}
