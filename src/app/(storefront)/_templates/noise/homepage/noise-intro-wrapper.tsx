"use client";

import { useState } from "react";

import { NoiseIntroOverlay } from "./noise-intro-overlay";

/** Client wrapper that manages intro-done state and renders the overlay above page content */
export function NoiseIntroWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const [done, setDone] = useState(false);

  return (
    <>
      {!done && <NoiseIntroOverlay onDone={() => setDone(true)} />}
      {children}
    </>
  );
}
