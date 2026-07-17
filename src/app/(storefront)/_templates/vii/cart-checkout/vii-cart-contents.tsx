"use client";

import Image from "next/image";
import Link from "next/link";
import { X } from "lucide-react";

import { formatPrice } from "~/lib/prices";
import { useCart } from "~/providers/cart-context";

import { useViiReveal } from "../hooks/use-vii-reveal";
import { ViiOverline } from "../shared/vii-overline";

type Business = {
  id: string;
  siteContent: { primaryColor: string | null } | null;
};

type Props = {
  business: Business;
  emptyHeading: string;
  emptyBody: string;
  emptyCta: string;
  continueShoppingLabel: string;
};

export function ViiCartContents({
  emptyHeading,
  emptyBody,
  emptyCta,
  continueShoppingLabel,
}: Props) {
  const { items, incrementItem, decrementItem, removeItem, total, isHydrated } =
    useCart();

  const { ref, visible } = useViiReveal(0.05);

  // ── Hydration guard — neutral placeholder prevents empty→filled flash ────────
  if (!isHydrated) {
    return (
      <div
        aria-hidden="true"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 32,
          minHeight: 320,
        }}
      >
        {[1, 2].map((n) => (
          <div
            key={n}
            style={{
              height: 100,
              borderRadius: "var(--radius)",
              background: "var(--vii-paper)",
              opacity: 0.5,
            }}
          />
        ))}
      </div>
    );
  }

  // ── Empty state ──────────────────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          padding: "clamp(64px, 10vh, 120px) 24px",
        }}
      >
        {/* Large serif numeral as ambient decoration — tan, per product-card empty state pattern */}
        <span
          aria-hidden="true"
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "clamp(80px, 12vw, 140px)",
            fontWeight: 500,
            fontStyle: "italic",
            color: "var(--vii-tan)",
            lineHeight: 1,
            display: "block",
            marginBottom: 16,
            userSelect: "none",
          }}
        >
          0
        </span>

        <h2
          style={{
            fontFamily: "var(--font-serif)",
            fontWeight: 500,
            fontSize: "clamp(22px, 3vw, 32px)",
            lineHeight: 1.15,
            color: "var(--vii-navy)",
            margin: "0 0 12px",
          }}
        >
          {emptyHeading}
        </h2>

        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 15,
            lineHeight: 1.6,
            letterSpacing: "0.02em",
            color: "var(--vii-ink-soft)",
            maxWidth: 420,
            margin: "0 0 36px",
            textWrap: "pretty",
          }}
        >
          {emptyBody}
        </p>

        <Link
          href="/shop"
          className="vii-cta-btn"
          style={{
            position: "relative",
            overflow: "hidden",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--vii-copper-deep)",
            color: "var(--vii-paper)",
            fontFamily: "var(--font-sans)",
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            textDecoration: "none",
            padding: "14px 32px",
            borderRadius: "var(--radius)",
            transition: "background 0.25s, opacity 0.25s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.background =
              "var(--vii-copper)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.background =
              "var(--vii-copper-deep)";
          }}
        >
          {emptyCta}
        </Link>
      </div>
    );
  }

  // ── Populated cart ───────────────────────────────────────────────────────────
  return (
    <div
      ref={ref}
      className={`vii-reveal-group${visible ? " is-visible" : ""} grid grid-cols-1 items-start lg:grid-cols-[1fr_360px]`}
      style={{ gap: "clamp(32px, 5vw, 64px)" }}
    >
      {/* Visually-hidden section heading keeps the h1 → h2 → h3 order intact */}
      <h2 className="sr-only">Items in your bag</h2>
      {/* ── Line items ──────────────────────────────────────────────────── */}
      <div
        role="list"
        aria-label="Items in your bag"
        style={{ display: "flex", flexDirection: "column" }}
      >
        {items.map((item, index) => {
          const lineTotal = item.price * item.quantity;
          const productPath = `/shop/${item.productSlug ?? item.productId}`;

          return (
            <div
              key={`${item.productId}-${item.variantId ?? "no-variant"}`}
              role="listitem"
              className="vii-reveal-item"
              style={
                {
                  display: "flex",
                  gap: "clamp(16px, 3vw, 28px)",
                  padding: "clamp(20px, 3vh, 32px) 0",
                  borderTop:
                    index === 0 ? "none" : "1px solid var(--vii-hairline)",
                  "--i": Math.min(index, 7),
                } as React.CSSProperties
              }
            >
              {/* Product image — square paper field, object-contain */}
              <div
                aria-hidden="true"
                style={{
                  position: "relative",
                  width: "clamp(80px, 10vw, 112px)",
                  height: "clamp(80px, 10vw, 112px)",
                  flexShrink: 0,
                  background: "var(--vii-paper)",
                  borderRadius: "var(--radius)",
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt=""
                    fill
                    sizes="112px"
                    style={{
                      objectFit: "contain",
                      padding: "8%",
                    }}
                  />
                ) : (
                  /* Empty image placeholder: large tan italic numeral, per product-card pattern */
                  <span
                    style={{
                      fontFamily: "var(--font-serif)",
                      fontStyle: "italic",
                      fontWeight: 500,
                      fontSize: "clamp(28px, 4vw, 40px)",
                      color: "var(--vii-tan)",
                      lineHeight: 1,
                      userSelect: "none",
                    }}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                )}
              </div>

              {/* Item info */}
              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                {/* Top row: name + remove */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <h3
                      style={{
                        fontFamily: "var(--font-serif)",
                        fontWeight: 500,
                        fontSize: 18,
                        lineHeight: 1.2,
                        color: "var(--vii-navy)",
                        margin: 0,
                      }}
                    >
                      <Link
                        href={productPath}
                        style={{
                          color: "inherit",
                          textDecoration: "none",
                          transition: "opacity 0.2s",
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLAnchorElement).style.opacity =
                            "0.7";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLAnchorElement).style.opacity =
                            "1";
                        }}
                      >
                        {item.productName}
                      </Link>
                    </h3>

                    {item.variantName && (
                      <p
                        style={{
                          fontFamily: "var(--font-sans)",
                          fontSize: 13,
                          lineHeight: 1.4,
                          color: "var(--vii-ink-soft)",
                          margin: "4px 0 0",
                        }}
                      >
                        {item.variantName}
                      </p>
                    )}
                  </div>

                  {/* Remove button */}
                  <button
                    type="button"
                    onClick={() => removeItem(item.productId, item.variantId)}
                    aria-label={`Remove ${item.productName}${item.variantName ? ` — ${item.variantName}` : ""} from bag`}
                    style={{
                      flexShrink: 0,
                      background: "none",
                      border: "none",
                      width: 44,
                      height: 44,
                      marginRight: -10,
                      marginTop: -10,
                      cursor: "pointer",
                      color: "var(--vii-ink-soft)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "color 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.color =
                        "var(--vii-navy)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.color =
                        "var(--vii-ink-soft)";
                    }}
                  >
                    <X size={16} aria-hidden="true" />
                  </button>
                </div>

                {/* Bottom row: qty stepper + line total */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 16,
                    marginTop: "auto",
                    paddingTop: 8,
                  }}
                >
                  {/* Qty stepper */}
                  <div
                    role="group"
                    aria-label={`Quantity for ${item.productName}${item.variantName ? ` — ${item.variantName}` : ""}`}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      height: 44,
                      width: 120,
                      border: "1px solid var(--vii-hairline)",
                      borderRadius: "var(--radius)",
                      overflow: "hidden",
                      background: "var(--vii-paper)",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        decrementItem(item.productId, item.variantId)
                      }
                      disabled={item.quantity <= 1}
                      aria-label={`Decrease quantity of ${item.productName}`}
                      style={{
                        flex: 1,
                        height: "100%",
                        background: "none",
                        border: "none",
                        cursor: item.quantity <= 1 ? "not-allowed" : "pointer",
                        fontFamily: "var(--font-sans)",
                        fontSize: 16,
                        fontWeight: 300,
                        color: "var(--vii-navy)",
                        opacity: item.quantity <= 1 ? 0.3 : 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        if (item.quantity > 1) {
                          (
                            e.currentTarget as HTMLButtonElement
                          ).style.background = "var(--vii-cream)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        (
                          e.currentTarget as HTMLButtonElement
                        ).style.background = "none";
                      }}
                    >
                      <span aria-hidden="true">−</span>
                    </button>

                    <span
                      style={{
                        width: 32,
                        textAlign: "center",
                        fontFamily: "var(--font-sans)",
                        fontSize: 14,
                        fontWeight: 500,
                        color: "var(--vii-navy)",
                        userSelect: "none",
                      }}
                      aria-live="polite"
                      aria-atomic="true"
                    >
                      {item.quantity}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        incrementItem(item.productId, item.variantId)
                      }
                      disabled={
                        item.maxInventory !== undefined &&
                        item.quantity >= item.maxInventory
                      }
                      aria-label={`Increase quantity of ${item.productName}`}
                      style={{
                        flex: 1,
                        height: "100%",
                        background: "none",
                        border: "none",
                        cursor:
                          item.maxInventory !== undefined &&
                          item.quantity >= item.maxInventory
                            ? "not-allowed"
                            : "pointer",
                        fontFamily: "var(--font-sans)",
                        fontSize: 16,
                        fontWeight: 300,
                        color: "var(--vii-navy)",
                        opacity:
                          item.maxInventory !== undefined &&
                          item.quantity >= item.maxInventory
                            ? 0.3
                            : 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        const atMax =
                          item.maxInventory !== undefined &&
                          item.quantity >= item.maxInventory;
                        if (!atMax) {
                          (
                            e.currentTarget as HTMLButtonElement
                          ).style.background = "var(--vii-cream)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        (
                          e.currentTarget as HTMLButtonElement
                        ).style.background = "none";
                      }}
                    >
                      <span aria-hidden="true">+</span>
                    </button>
                  </div>

                  {/* Line total */}
                  <p
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 15,
                      fontWeight: 500,
                      color: "var(--vii-navy)",
                      margin: 0,
                    }}
                  >
                    {formatPrice(lineTotal)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Order summary card (sticky on large screens) ─────────────── */}
      <aside
        aria-label="Order summary"
        className="vii-reveal-item"
        style={{ "--i": Math.min(items.length, 7) } as React.CSSProperties}
      >
        <div
          style={{
            position: "sticky",
            top: "calc(var(--vii-header-offset) + 24px)",
            background: "var(--vii-paper)",
            borderRadius: "var(--radius)",
            padding: "clamp(24px, 3vw, 36px)",
          }}
        >
          <ViiOverline tone="light" style={{ marginBottom: 20 }}>
            Order Summary
          </ViiOverline>

          {/* Line rows */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 14,
                  color: "var(--vii-ink-soft)",
                }}
              >
                Subtotal
              </span>
              <span
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 14,
                  fontWeight: 500,
                  color: "var(--vii-navy)",
                }}
              >
                {formatPrice(total)}
              </span>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 14,
                  color: "var(--vii-ink-soft)",
                }}
              >
                Shipping
              </span>
              <span
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 14,
                  color: "var(--vii-ink-soft)",
                }}
              >
                Calculated at checkout
              </span>
            </div>
          </div>

          {/* Divider */}
          <div
            aria-hidden="true"
            style={{
              height: 1,
              background: "var(--vii-hairline)",
              margin: "20px 0",
            }}
          />

          {/* Estimated total */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              marginBottom: 28,
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: 16,
                fontWeight: 500,
                color: "var(--vii-navy)",
              }}
            >
              Estimated total
            </span>
            <span
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: 18,
                fontWeight: 500,
                color: "var(--vii-navy)",
              }}
            >
              {formatPrice(total)}
            </span>
          </div>

          {/* CTA — Continue to checkout */}
          <Link
            href="/checkout"
            className="vii-cta-btn"
            style={{
              position: "relative",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              background: "var(--vii-copper-deep)",
              color: "var(--vii-paper)",
              fontFamily: "var(--font-sans)",
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              textDecoration: "none",
              padding: "14px 32px",
              borderRadius: "var(--radius)",
              transition: "background 0.25s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background =
                "var(--vii-copper)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background =
                "var(--vii-copper-deep)";
            }}
          >
            Continue to checkout
          </Link>

          {/* Quiet continue-shopping link */}
          <Link
            href="/shop"
            style={{
              display: "block",
              textAlign: "center",
              marginTop: 16,
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              color: "var(--vii-ink-soft)",
              textDecoration: "underline",
              textUnderlineOffset: 3,
              textDecorationColor:
                "color-mix(in srgb, var(--vii-ink-soft) 40%, transparent)",
              transition: "color 0.2s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.color =
                "var(--vii-navy)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.color =
                "var(--vii-ink-soft)";
            }}
          >
            {continueShoppingLabel}
          </Link>
        </div>
      </aside>
    </div>
  );
}
