import type { CSSProperties } from "react";

import type { DreamCloudVariant } from "../lib/cloud-presets";
import { cn } from "~/lib/utils";

import { DREAM_CLOUD_PRESETS } from "../lib/cloud-presets";

type DreamCloudsProps = {
  variant: DreamCloudVariant;
  className?: string;
  /**
   * How many of this layer's sprites should load eagerly (design.md's
   * performance contract: "only two cloud sprites load eagerly, the rest
   * lazy"). Defaults to 2 on `hero` (the only variant present at first
   * paint above the fold) and 0 elsewhere.
   */
  eager?: number;
};

/**
 * Server component: renders the baked cloud/wisp sprite layer for a hero,
 * page-hero, or horizon-band background (design.md "Motion › Cloud
 * system"). Pure CSS/HTML — no client JS — so it costs nothing to render on
 * every page; `DreamAmbientController` (mounted once in the layout) is what
 * pauses drift when a layer scrolls out of view.
 *
 * Plain `<img>`, not `next/image`: these are decorative, absolutely
 * positioned, CSS-sized sprites animated on `transform` only — `next/image`
 * would add no optimization value here and fights the `--w` custom
 * property sizing.
 */
export function DreamClouds({ variant, className, eager }: DreamCloudsProps) {
  const sprites = DREAM_CLOUD_PRESETS[variant];
  const eagerCount = eager ?? (variant === "hero" ? 2 : 0);

  return (
    <div
      className={cn("dream-clouds", className)}
      data-variant={variant}
      aria-hidden="true"
    >
      {sprites.map((cloud, i) => {
        const style = {
          "--w": `${cloud.w}px`,
          "--top": cloud.top,
          "--op": cloud.op,
          "--dur": `${cloud.dur}s`,
          "--delay": `${cloud.delay}s`,
          "--rest": `${cloud.rest}px`,
        } as CSSProperties;

        return (
          <img
            key={cloud.sprite + i}
            className={cn("dream-cloud", cloud.reverse && "is-reverse")}
            src={cloud.sprite}
            alt=""
            draggable={false}
            decoding="async"
            fetchPriority="low"
            loading={i < eagerCount ? "eager" : "lazy"}
            style={style}
          />
        );
      })}
    </div>
  );
}
