"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, X } from "lucide-react";

import { formatDate } from "~/lib/format-date";
import { formatPrice } from "~/lib/prices";
import { useWishlist } from "~/providers/wishlist-context";

/**
 * Template-agnostic wishlist page body (neutral styling, mirrors the
 * /order-status pages). Renders straight from localStorage — prices and
 * availability are snapshots from when items were saved, so a stale-data
 * note is shown instead of reconciling against the server (v1).
 */
export function WishlistPageClient() {
  const { items, isHydrated, remove } = useWishlist();

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-12 sm:py-16">
      <header className="mb-8">
        <p className="text-muted-foreground mb-2 text-[11px] font-medium tracking-[0.14em] uppercase">
          Saved items
        </p>
        <h1 className="text-2xl font-medium tracking-tight sm:text-3xl">
          Your Wishlist
        </h1>
        {isHydrated && items.length > 0 && (
          <p className="text-muted-foreground mt-3 text-sm">
            {items.length} {items.length === 1 ? "item" : "items"} saved on this
            device. Prices and availability may have changed since you saved
            them.
          </p>
        )}
      </header>

      {!isHydrated ? (
        // Avoid an empty-state flash before localStorage has loaded
        <div
          className="border-border rounded-[var(--radius)] border p-12"
          aria-hidden="true"
        />
      ) : items.length === 0 ? (
        <div className="border-border rounded-[var(--radius)] border p-8 text-center sm:p-12">
          <Heart
            className="text-muted-foreground mx-auto mb-4 h-8 w-8"
            aria-hidden="true"
          />
          <h2 className="mb-3 text-xl font-medium tracking-tight">
            Your wishlist is empty
          </h2>
          <p className="text-muted-foreground mx-auto mb-8 max-w-md text-sm leading-relaxed">
            Tap the heart on any product to save it here for later.
          </p>
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 border-b border-current pb-0.5 text-sm font-medium transition-[gap] hover:gap-3"
          >
            Browse the shop <span aria-hidden="true">→</span>
          </Link>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <li key={item.productId} className="group relative">
              <Link
                href={`/shop/${item.slug}`}
                className="block"
                tabIndex={-1}
                aria-hidden="true"
              >
                <div className="border-border bg-muted relative mb-3 aspect-square overflow-hidden rounded-[var(--radius)] border">
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt=""
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.015]"
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    />
                  ) : (
                    <div className="text-muted-foreground flex h-full w-full items-center justify-center">
                      <Heart className="h-8 w-8" aria-hidden="true" />
                    </div>
                  )}
                </div>
              </Link>

              <div className="flex flex-col gap-0.5 pr-8">
                <h2 className="line-clamp-2 text-[15px] font-medium tracking-[-0.005em]">
                  <Link
                    href={`/shop/${item.slug}`}
                    className="transition-opacity hover:opacity-70"
                  >
                    {item.name}
                  </Link>
                </h2>
                <p className="text-muted-foreground text-[14px]">
                  {formatPrice(item.price)}
                </p>
                <p className="text-muted-foreground text-[12px]">
                  Saved {formatDate(new Date(item.addedAt))}
                </p>
              </div>

              <button
                type="button"
                onClick={() => remove(item.productId)}
                aria-label={`Remove ${item.name} from wishlist`}
                className="border-border text-muted-foreground hover:border-foreground hover:text-foreground absolute right-0 bottom-0 inline-flex size-8 cursor-pointer items-center justify-center rounded-full border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
