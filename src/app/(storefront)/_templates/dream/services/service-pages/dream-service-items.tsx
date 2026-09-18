import type { ServiceTemplateProps } from "~/app/(storefront)/_templates/_service-pages/registry";
import {
  parseServiceAddOns,
  parseServicePriceTiers,
} from "~/lib/validators/services";
import { ServiceBookingDialog } from "~/components/service-booking-dialog";

import { DreamPhoto } from "../../shared/dream-photo";
import { DreamRevealGroup } from "../../shared/dream-reveal";
import { DreamMostLovedBadge } from "../dream-most-loved-badge";

type Item = ServiceTemplateProps["items"][number];

function OptionCard({
  item,
  embedsEnabled,
  index,
}: {
  item: Item;
  embedsEnabled: boolean;
  index: number;
}) {
  const priceTiers = parseServicePriceTiers(item.priceTiers);
  const addOns = parseServiceAddOns(item.addOns);

  return (
    <div
      className="dream-card dream-reveal-item flex h-full flex-col gap-4"
      style={{ "--i": Math.min(index, 7) } as React.CSSProperties}
    >
      <div className="relative">
        <DreamPhoto
          src={item.image ?? "/placeholder.svg"}
          alt={item.name}
          aspect="4 / 3"
        />
        {item.isSignature && <DreamMostLovedBadge />}
      </div>

      <div className="flex flex-1 flex-col gap-3">
        <h3 className="dream-heading">{item.name}</h3>

        {item.description && (
          <p className="text-[15px] leading-relaxed text-[var(--dream-soft)]">
            {item.description}
          </p>
        )}

        {(item.priceLabel ?? item.durationLabel) && (
          <div className="flex flex-wrap gap-2">
            {item.durationLabel && (
              <span className="rounded-full border border-[var(--dream-line)] px-3 py-1 text-[12px] text-[var(--dream-soft)]">
                {item.durationLabel}
              </span>
            )}
            {item.priceLabel && (
              <span className="rounded-full border border-[var(--dream-gold)] px-3 py-1 text-[12px] font-medium text-[var(--dream-gold-ink)]">
                {item.priceLabel}
              </span>
            )}
          </div>
        )}

        {priceTiers.length > 0 && (
          <ul className="flex flex-col gap-1.5 border-t border-[var(--dream-line)] pt-3 text-[13px] text-[var(--dream-soft)]">
            {priceTiers.map((tier, i) => (
              <li key={i} className="flex items-baseline justify-between gap-3">
                <span>{tier.label}</span>
                <span className="flex items-baseline gap-2 text-[var(--dream-ink)]">
                  {tier.compareAtPriceLabel && (
                    <span className="text-[var(--dream-soft)] line-through">
                      {tier.compareAtPriceLabel}
                    </span>
                  )}
                  {tier.priceLabel}
                </span>
              </li>
            ))}
          </ul>
        )}

        {addOns.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {addOns.map((addOn, i) => (
              <span
                key={i}
                className="rounded-full bg-[var(--dream-sky)] px-3 py-1 text-[12px] text-[var(--dream-ink)]"
              >
                {addOn.name}
                {addOn.priceLabel ? ` · ${addOn.priceLabel}` : ""}
              </span>
            ))}
          </div>
        )}

        {item.bookingEmbedSrc && (
          <div className="dream-service-book mt-auto pt-3">
            <ServiceBookingDialog
              triggerLabel="Book"
              itemName={item.name}
              embedSrc={item.bookingEmbedSrc}
              embedHeight={item.bookingEmbedHeight}
              embedsEnabled={embedsEnabled}
            />
          </div>
        )}
      </div>
    </div>
  );
}

type DreamServiceItemsProps = {
  items: ServiceTemplateProps["items"];
  embedsEnabled: boolean;
  heading: string;
};

/**
 * "Options" grid for the `dream-lane` service page (design.md "Service-page
 * variants → dream-lane"): one card per published `ServiceItem` — name,
 * description, image, price/duration chips, price tiers, add-on chips, a
 * "Most loved" ribbon for `isSignature`, and a booking dialog when a
 * booking embed is configured and the `embeds` flag is enabled. Hidden
 * entirely by the caller when there are no items.
 */
export function DreamServiceItems({
  items,
  embedsEnabled,
  heading,
}: DreamServiceItemsProps) {
  return (
    <div>
      <style>{`
        .dream-service-book button,
        .dream-service-book a {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          height: auto;
          padding: 10px 20px;
          border-radius: var(--dream-radius-pill);
          background: var(--dream-ink);
          color: var(--dream-paper) !important;
          font-family: var(--font-dream-body);
          font-size: 14px;
          font-weight: 600;
          border: none;
          cursor: pointer;
          box-shadow: none;
          transition: transform var(--dream-dur-hover) var(--dream-ease),
            box-shadow var(--dream-dur-hover) var(--dream-ease);
        }
        .dream-service-book button:hover,
        .dream-service-book a:hover {
          transform: translateY(-2px);
          box-shadow: var(--dream-shadow-btn);
        }
        .dream-service-book button:disabled {
          background: var(--dream-line);
          color: var(--dream-soft) !important;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }
        /* auto-fit + a max card width centers short rows (2 or 4 items)
           instead of left-aligning them with an orphan gap on the right —
           finish-review "Package variant + Options grid". */
        .dream-services-options-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 380px));
          justify-content: center;
          gap: clamp(24px, 3vw, 32px);
        }
      `}</style>

      <h2 className="dream-heading !mb-8 text-center">{heading}</h2>

      <DreamRevealGroup
        className="dream-services-options-grid"
        threshold={0.05}
      >
        {items.map((item, i) => (
          <OptionCard
            key={item.id}
            item={item}
            embedsEnabled={embedsEnabled}
            index={i}
          />
        ))}
      </DreamRevealGroup>
    </div>
  );
}
