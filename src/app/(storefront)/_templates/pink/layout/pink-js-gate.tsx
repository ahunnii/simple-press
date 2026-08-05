"use client";

import { useEffect, useRef } from "react";

/**
 * Arms the `.pink-js` class on the nearest `.pink` scope root on mount.
 *
 * `use-pink-reveal.ts` also arms this class (on any node it observes), but
 * pages that render zero `<PinkReveal>`/scroll-revealed content still need
 * the CSS-only entrance animations (`.pink-anim-rise`, `.pink-anim-fade`,
 * `.pink-anim-doll`, `.pink-anim-drop`, `.pink-anim-rule`) gated so they never run with JS disabled. Mount this
 * once near the top of `pink-layout.tsx` to guarantee the gate is always
 * armed as soon as React hydrates, independent of what any given page does.
 */
export function PinkJsGate() {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    ref.current?.closest(".pink")?.classList.add("pink-js");
  }, []);

  return <span ref={ref} aria-hidden="true" className="hidden" />;
}
