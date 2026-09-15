import type { CSSProperties } from "react";

import { OliveImageTile, OliveRevealGroup, OliveSection } from "../shared";

type Tile = {
  image: string;
  label: string;
  href: string;
  /** Field key whose value is exactly `label` — enables editor live text. */
  labelFieldKey?: string;
};

type Props = {
  first: Tile;
  second: Tile;
  sectionAttrs?: Record<string, string>;
};

/**
 * Two big tiles — the page's one moment of scale between the dense category
 * row and the dense product grid. Each photograph carries its label on a
 * white card in the bottom corner, so the print sits on the picture rather
 * than beside it.
 *
 * There is no heading here on purpose: the pair is a visual break, and
 * design.md's heading rule (a heading plus at most one line) would make it
 * read as a third content section instead.
 */
export function OliveMoodSection({ first, second, sectionAttrs }: Props) {
  const tiles = [first, second].filter((tile) => tile.label.trim().length > 0);
  if (tiles.length === 0) return null;

  return (
    <OliveSection bleed tone="paper" aria-label="Featured" {...sectionAttrs}>
      <OliveRevealGroup fan className="grid gap-3 md:grid-cols-2">
        {tiles.map((tile, index) => (
          <OliveImageTile
            key={tile.labelFieldKey ?? tile.label}
            image={tile.image}
            alt=""
            label={tile.label}
            labelFieldKey={tile.labelFieldKey}
            href={tile.href}
            className="olive-reveal-item"
            style={{ "--i": index } as CSSProperties}
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        ))}
      </OliveRevealGroup>
    </OliveSection>
  );
}
