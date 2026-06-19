"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Minus, Plus, ShoppingBag } from "lucide-react";

import { formatPrice } from "~/lib/prices";
import { useCart } from "~/providers/cart-context";

const ease = "cubic-bezier(0.22, 1, 0.36, 1)";

export function ElegantCartContent() {
  const { items, updateQuantity, removeItem, subtotal } = useCart();

  if (items.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "80px 0",
          textAlign: "center",
        }}
      >
        <ShoppingBag
          aria-hidden={true}
          style={{
            width: 40,
            height: 40,
            color: "var(--el-ink-soft, #6b6659)",
            marginBottom: 20,
          }}
          strokeWidth={1}
        />
        <p
          style={{
            fontFamily: "var(--font-serif, 'Cormorant Garamond', serif)",
            fontSize: 28,
            color: "var(--el-ink, #1c1a17)",
            marginBottom: 10,
          }}
        >
          Your bag is empty.
        </p>
        <p
          style={{
            fontSize: 15,
            color: "var(--el-ink-soft, #6b6659)",
            marginBottom: 32,
            fontFamily: "var(--font-sans, sans-serif)",
          }}
        >
          Find something to take home.
        </p>
        <Link
          href="/shop"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            padding: "14px 26px",
            borderRadius: 999,
            fontSize: 13,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            fontWeight: 500,
            background: "var(--el-sage, #4a5240)",
            color: "var(--el-paper, #fbf8f2)",
            textDecoration: "none",
            fontFamily: "var(--font-sans, sans-serif)",
          }}
        >
          Browse shop
          <ArrowRight aria-hidden={true} style={{ width: 14, height: 14 }} />
        </Link>
      </div>
    );
  }

  return (
    <div
      className="el-cart-grid"
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 360px",
        gap: 60,
        alignItems: "start",
      }}
    >
      {/* ── Items ── */}
      <div>
        {items.map((item) => (
          <div
            key={`${item.productId}-${item.variantId}`}
            style={{
              display: "flex",
              gap: 24,
              padding: "24px 0",
              borderBottom: "1px solid var(--el-line-2, rgba(28,26,23,0.06))",
            }}
          >
            {/* Thumbnail */}
            <Link
              href={`/shop/${item.productSlug ?? item.productId}`}
              style={{ textDecoration: "none", flexShrink: 0 }}
            >
              <div
                style={{
                  width: 100,
                  aspectRatio: "4/5",
                  borderRadius: 6,
                  overflow: "hidden",
                  position: "relative",
                  background: "var(--el-cream-2, #ebe6dc)",
                }}
              >
                {item.imageUrl && (
                  <Image
                    src={item.imageUrl}
                    alt={item.productName}
                    fill
                    className="object-cover"
                    sizes="100px"
                  />
                )}
              </div>
            </Link>

            {/* Info */}
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <div>
                  <Link
                    href={`/shop/${item.productSlug ?? item.productId}`}
                    style={{ textDecoration: "none" }}
                  >
                    <div
                      style={{
                        fontFamily:
                          "var(--font-serif, 'Cormorant Garamond', serif)",
                        fontSize: 20,
                        fontWeight: 500,
                        color: "var(--el-ink, #1c1a17)",
                        lineHeight: 1.2,
                        marginBottom: 4,
                      }}
                    >
                      {item.productName}
                    </div>
                  </Link>
                  {item.variantName && (
                    <div
                      style={{
                        fontFamily: "var(--font-mono, ui-monospace)",
                        fontSize: 10,
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                        color: "var(--el-ink-soft, #6b6659)",
                      }}
                    >
                      {item.variantName}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(item.productId, item.variantId)}
                  aria-label={`Remove ${item.productName}`}
                  style={{
                    fontSize: 11,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "var(--el-ink-soft, #6b6659)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontFamily: "var(--font-mono, ui-monospace)",
                  }}
                >
                  Remove
                </button>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginTop: 16,
                }}
              >
                {/* Qty stepper */}
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 12,
                    border: "1px solid var(--el-line, rgba(28,26,23,0.12))",
                    borderRadius: 999,
                    padding: "2px 4px",
                  }}
                >
                  <button
                    type="button"
                    onClick={() =>
                      updateQuantity(
                        item.productId,
                        item.variantId,
                        item.quantity - 1,
                      )
                    }
                    aria-label={`Decrease quantity of ${item.productName}`}
                    style={{
                      width: 28,
                      height: 28,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 999,
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      color: "var(--el-ink, #1c1a17)",
                    }}
                    className="el-qty-btn"
                  >
                    <Minus
                      aria-hidden={true}
                      style={{ width: 12, height: 12 }}
                    />
                  </button>
                  <span
                    aria-live="polite"
                    aria-atomic="true"
                    style={{
                      minWidth: 24,
                      textAlign: "center",
                      fontSize: 14,
                      fontWeight: 500,
                      color: "var(--el-ink, #1c1a17)",
                      fontFamily: "var(--font-sans, sans-serif)",
                    }}
                  >
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      updateQuantity(
                        item.productId,
                        item.variantId,
                        item.quantity + 1,
                      )
                    }
                    aria-label={`Increase quantity of ${item.productName}`}
                    style={{
                      width: 28,
                      height: 28,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 999,
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      color: "var(--el-ink, #1c1a17)",
                    }}
                    className="el-qty-btn"
                  >
                    <Plus
                      aria-hidden={true}
                      style={{ width: 12, height: 12 }}
                    />
                  </button>
                </div>

                <span
                  style={{
                    fontFamily:
                      "var(--font-serif, 'Cormorant Garamond', serif)",
                    fontSize: 20,
                    color: "var(--el-ink, #1c1a17)",
                  }}
                >
                  {formatPrice(item.price * item.quantity)}
                </span>
              </div>
            </div>
          </div>
        ))}

        <Link
          href="/shop"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            marginTop: 24,
            fontSize: 12,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--el-ink-soft, #6b6659)",
            textDecoration: "none",
            fontFamily: "var(--font-mono, ui-monospace)",
          }}
        >
          <ArrowLeft aria-hidden={true} style={{ width: 12, height: 12 }} />
          Continue shopping
        </Link>
      </div>

      {/* ── Summary ── */}
      <div style={{ position: "sticky", top: 120 }}>
        <div
          style={{
            background: "var(--el-paper, #fbf8f2)",
            border: "1px solid var(--el-line, rgba(28,26,23,0.12))",
            borderRadius: 8,
            padding: "28px 28px",
          }}
        >
          <h2
            style={{
              fontFamily: "var(--font-serif, 'Cormorant Garamond', serif)",
              fontSize: 22,
              fontWeight: 500,
              color: "var(--el-ink, #1c1a17)",
              marginBottom: 24,
            }}
          >
            Order summary
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span
                style={{
                  fontFamily: "var(--font-mono, ui-monospace)",
                  fontSize: 11,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "var(--el-ink-soft, #6b6659)",
                }}
              >
                Subtotal
              </span>
              <span
                style={{
                  fontFamily: "var(--font-sans, sans-serif)",
                  fontSize: 14,
                  color: "var(--el-ink, #1c1a17)",
                }}
              >
                {formatPrice(subtotal)}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span
                style={{
                  fontFamily: "var(--font-mono, ui-monospace)",
                  fontSize: 11,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "var(--el-ink-soft, #6b6659)",
                }}
              >
                Shipping
              </span>
              <span
                style={{
                  fontFamily: "var(--font-sans, sans-serif)",
                  fontSize: 14,
                  color: "var(--el-ink-soft, #6b6659)",
                }}
              >
                At checkout
              </span>
            </div>
          </div>

          <div
            style={{
              borderTop: "1px solid var(--el-line, rgba(28,26,23,0.12))",
              marginTop: 16,
              paddingTop: 16,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              marginBottom: 20,
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-mono, ui-monospace)",
                fontSize: 11,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--el-ink, #1c1a17)",
              }}
            >
              Estimated total
            </span>
            <span
              style={{
                fontFamily: "var(--font-serif, 'Cormorant Garamond', serif)",
                fontSize: 24,
                color: "var(--el-ink, #1c1a17)",
              }}
            >
              {formatPrice(subtotal)}
            </span>
          </div>

          <Link
            href="/checkout"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              padding: "15px 24px",
              borderRadius: 999,
              fontSize: 13,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              fontWeight: 500,
              background: "var(--el-ink, #1c1a17)",
              color: "var(--el-paper, #fbf8f2)",
              textDecoration: "none",
              fontFamily: "var(--font-sans, sans-serif)",
              transition: `background 0.4s ${ease}`,
            }}
            className="el-checkout-btn"
          >
            Proceed to checkout
            <ArrowRight aria-hidden={true} style={{ width: 14, height: 14 }} />
          </Link>
          <p
            style={{
              marginTop: 12,
              textAlign: "center",
              fontSize: 11,
              color: "var(--el-ink-soft, #6b6659)",
              fontFamily: "var(--font-mono, ui-monospace)",
              letterSpacing: "0.1em",
            }}
          >
            Tax & shipping at checkout
          </p>
        </div>
      </div>
    </div>
  );
}
