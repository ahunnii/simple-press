import Image from "next/image";

import type { ChipItem } from "./glove-chip-row";

import { chipStatus } from "./glove-chip-row";

/**
 * The shared "up close" view above the choice rows of the options panel: one
 * large photo of whichever chain or charm is hovered, focused or last picked,
 * with its group, name and the same status line the chip shows. The frame
 * keeps its size when empty so nothing shifts. Decorative for assistive tech
 * (the chips already expose name and price/status), so it is aria-hidden.
 */
export function GloveOptionPreview({
  groupName,
  item,
}: {
  groupName: string | null;
  item: ChipItem | null;
}) {
  const status = item ? chipStatus(item) : "";
  return (
    <div
      data-testid="glove-option-preview"
      aria-hidden="true"
      className="mt-4 flex items-center gap-4"
    >
      <div className="relative size-40 flex-none overflow-hidden rounded-[var(--glove-radius-card)] border border-[var(--glove-line)] bg-[var(--glove-wash)] md:size-[200px]">
        {item?.imageUrl ? (
          <Image
            key={item.id}
            src={item.imageUrl}
            alt=""
            fill
            sizes="(min-width: 768px) 200px, 160px"
            unoptimized={item.unoptimized}
            className="glove-option-photo glove-option-fade object-contain"
          />
        ) : item?.swatchColor ? (
          <span
            key={item.id}
            className="glove-option-fade absolute inset-8 rounded-full border border-black/10"
            style={{ backgroundColor: item.swatchColor }}
          />
        ) : null}
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        {item ? (
          <>
            {groupName ? (
              <span className="glove-body text-[13px] text-[var(--glove-muted)]">
                {groupName}
              </span>
            ) : null}
            <span className="glove-display text-[18px] leading-tight font-medium text-[var(--glove-ink)]">
              {item.name}
            </span>
            {status ? (
              <span
                className={
                  item.available
                    ? "glove-body text-[14px] font-bold text-[var(--glove-primary)]"
                    : "glove-body text-[14px] font-bold text-[var(--glove-muted)]"
                }
              >
                {status}
              </span>
            ) : null}
          </>
        ) : (
          <span className="glove-body text-[14px] leading-snug text-[var(--glove-muted)]">
            Choose an option to see it up close.
          </span>
        )}
      </div>
    </div>
  );
}
