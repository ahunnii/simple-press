"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Minus, Plus, ShoppingBag, X } from "lucide-react";

import { formatPrice } from "~/lib/prices";
import { useCart } from "~/providers/cart-context";

const ease = "cubic-bezier(0.22, 1, 0.36, 1)";

export function ElegantCartDrawer() {
  const {
    items,
    removeItem,
    updateQuantity,
    isOpen,
    setIsOpen,
    itemCount,
    subtotal,
    isHydrated,
  } = useCart();

  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<Element | null>(null);

  // Lock body scroll when open
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Mark background content as inert when drawer is open so screen readers
  // cannot navigate outside the dialog (supplements aria-modal).
  useEffect(() => {
    if (!isOpen) return;
    const main = document.querySelector("main");
    const footer = document.querySelector(".elegant footer");
    main?.setAttribute("inert", "");
    footer?.setAttribute("inert", "");
    return () => {
      main?.removeAttribute("inert");
      footer?.removeAttribute("inert");
    };
  }, [isOpen]);

  // Focus management: move focus into drawer on open, restore on close
  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement;
      requestAnimationFrame(() => closeButtonRef.current?.focus());
    } else if (triggerRef.current instanceof HTMLElement) {
      triggerRef.current.focus();
      triggerRef.current = null;
    }
  }, [isOpen]);

  // Global Escape key to close
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, setIsOpen]);

  const trapFocus = (e: React.KeyboardEvent) => {
    if (e.key !== "Tab") return;
    const el = drawerRef.current;
    if (!el) return;
    const focusable = Array.from(
      el.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    );
    if (focusable.length === 0) return;
    const first = focusable[0]!;
    const last = focusable[focusable.length - 1]!;
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  if (!isHydrated) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={() => setIsOpen(false)}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(28, 26, 23, 0.4)",
          backdropFilter: "blur(4px)",
          zIndex: 200,
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? "auto" : "none",
          transition: `opacity 0.45s ${ease}`,
        }}
        aria-hidden={true}
      />

      {/* Drawer — inert when closed so keyboard/AT cannot reach invisible contents */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal={true}
        aria-label="Shopping bag"
        aria-hidden={!isOpen}
        inert={!isOpen ? true : undefined}
        onKeyDown={trapFocus}
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "min(460px, 100vw)",
          background: "var(--el-paper, #fbf8f2)",
          zIndex: 201,
          display: "flex",
          flexDirection: "column",
          transform: isOpen ? "translateX(0)" : "translateX(100%)",
          transition: `transform 0.55s ${ease}`,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "22px 28px",
            borderBottom: "1px solid var(--el-line, rgba(28,26,23,0.12))",
            flexShrink: 0,
          }}
        >
          <h2
            style={{
              fontFamily: "var(--font-serif, 'Cormorant Garamond', serif)",
              fontSize: 22,
              fontWeight: 500,
              color: "var(--el-ink, #1c1a17)",
            }}
          >
            Your bag{" "}
            <span
              style={{
                fontFamily: "var(--font-mono, ui-monospace)",
                fontSize: 13,
                letterSpacing: "0.1em",
                color: "var(--el-ink-soft, #6b6659)",
              }}
            >
              ({itemCount})
            </span>
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label="Close bag"
            style={{
              width: 36,
              height: 36,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 999,
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: "var(--el-ink, #1c1a17)",
              transition: `background 0.3s ${ease}`,
            }}
            className="el-icon-btn"
          >
            <X aria-hidden={true} style={{ width: 18, height: 18 }} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 28px" }}>
          {items.length === 0 ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 18,
                padding: "60px 0",
                textAlign: "center",
              }}
            >
              <ShoppingBag
                aria-hidden={true}
                style={{
                  width: 32,
                  height: 32,
                  color: "var(--el-ink-soft, #6b6659)",
                }}
                strokeWidth={1}
              />
              <span
                style={{
                  fontFamily: "var(--font-mono, ui-monospace)",
                  fontSize: 11,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: "var(--el-ink-soft, #6b6659)",
                }}
              >
                Empty bag
              </span>
              <p
                style={{
                  fontFamily: "var(--font-serif, serif)",
                  fontSize: 26,
                  color: "var(--el-ink, #1c1a17)",
                }}
              >
                Nothing here yet.
              </p>
              <p
                style={{
                  fontSize: 15,
                  color: "var(--el-ink-soft, #6b6659)",
                  maxWidth: 240,
                  fontFamily: "var(--font-sans, sans-serif)",
                }}
              >
                Find something to take home.
              </p>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "12px 22px",
                  borderRadius: 999,
                  fontSize: 12,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  fontWeight: 500,
                  background: "var(--el-sage, #4a5240)",
                  color: "var(--el-paper, #fbf8f2)",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "var(--font-sans, sans-serif)",
                }}
              >
                Browse shop
                <ArrowRight
                  aria-hidden={true}
                  style={{ width: 13, height: 13 }}
                />
              </button>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={`${item.productId}-${item.variantId}`}
                style={{
                  display: "flex",
                  gap: 16,
                  padding: "18px 0",
                  borderBottom:
                    "1px solid var(--el-line-2, rgba(28,26,23,0.06))",
                }}
              >
                {/* Thumb */}
                <div
                  style={{
                    width: 80,
                    aspectRatio: "4/5",
                    borderRadius: 6,
                    flexShrink: 0,
                    position: "relative",
                    overflow: "hidden",
                    background: "var(--el-cream-2, #ebe6dc)",
                  }}
                >
                  {item.imageUrl && (
                    <Image
                      src={item.imageUrl}
                      alt={item.productName}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  )}
                </div>

                {/* Info */}
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                  }}
                >
                  <div
                    style={{
                      fontFamily:
                        "var(--font-serif, 'Cormorant Garamond', serif)",
                      fontSize: 17,
                      fontWeight: 500,
                      color: "var(--el-ink, #1c1a17)",
                      lineHeight: 1.2,
                    }}
                  >
                    {item.productName}
                  </div>
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
                  {/* Qty stepper */}
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 12,
                      border: "1px solid var(--el-line, rgba(28,26,23,0.12))",
                      borderRadius: 999,
                      padding: "2px 4px",
                      marginTop: 6,
                      fontSize: 13,
                      width: "fit-content",
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
                        width: 24,
                        height: 24,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: 999,
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                        color: "var(--el-ink, #1c1a17)",
                      }}
                      className="el-qty-sm"
                    >
                      <Minus
                        aria-hidden={true}
                        style={{ width: 11, height: 11 }}
                      />
                    </button>
                    <span
                      aria-live="polite"
                      aria-atomic="true"
                      style={{ color: "var(--el-ink, #1c1a17)" }}
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
                        width: 24,
                        height: 24,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: 999,
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                        color: "var(--el-ink, #1c1a17)",
                      }}
                      className="el-qty-sm"
                    >
                      <Plus
                        aria-hidden={true}
                        style={{ width: 11, height: 11 }}
                      />
                    </button>
                  </div>
                </div>

                {/* Price + remove */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                    justifyContent: "space-between",
                  }}
                >
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
                  <span
                    style={{
                      fontFamily:
                        "var(--font-serif, 'Cormorant Garamond', serif)",
                      fontSize: 18,
                      color: "var(--el-ink, #1c1a17)",
                    }}
                  >
                    {formatPrice(item.price * item.quantity)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div
            style={{
              padding: "22px 28px",
              borderTop: "1px solid var(--el-line, rgba(28,26,23,0.12))",
              flexShrink: 0,
            }}
          >
            {/* Subtotal row */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 14,
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-mono, ui-monospace)",
                  fontSize: 12,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "var(--el-ink-soft, #6b6659)",
                }}
              >
                Subtotal
              </span>
              <span
                style={{
                  fontFamily: "var(--font-serif, 'Cormorant Garamond', serif)",
                  fontSize: 22,
                  color: "var(--el-ink, #1c1a17)",
                }}
              >
                {formatPrice(subtotal)}
              </span>
            </div>
            <p
              style={{
                fontSize: 12,
                color: "var(--el-ink-soft, #6b6659)",
                marginBottom: 14,
                fontFamily: "var(--font-sans, sans-serif)",
              }}
            >
              Shipping and taxes calculated at checkout.
            </p>
            <Link
              href="/checkout"
              onClick={() => setIsOpen(false)}
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
              className="el-drawer-checkout"
            >
              Checkout
              <ArrowRight
                aria-hidden={true}
                style={{ width: 14, height: 14 }}
              />
            </Link>
            <Link
              href="/cart"
              onClick={() => setIsOpen(false)}
              style={{
                display: "block",
                marginTop: 12,
                width: "100%",
                textAlign: "center",
                fontSize: 12,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--el-ink-soft, #6b6659)",
                textDecoration: "none",
                fontFamily: "var(--font-mono, ui-monospace)",
              }}
            >
              View full bag
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
