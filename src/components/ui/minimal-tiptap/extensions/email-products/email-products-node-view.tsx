"use client";

import type { NodeViewProps } from "@tiptap/core";
import * as React from "react";
import { NodeViewWrapper } from "@tiptap/react";
import { ImageOff, ShoppingBag, Trash2 } from "lucide-react";

import type { EmailProductItem } from "~/lib/tiptap/email-products-node";
import { formatPrice } from "~/lib/prices";
import {
  coerceEmailProductsButtonLabel,
  EMAIL_PRODUCTS_BUTTON_LABEL_MAX,
  EMAIL_PRODUCTS_MAX,
  sanitizeEmailProductItems,
} from "~/lib/tiptap/email-products-node";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

import { ProductPickerDialog } from "../../components/email-products/product-picker-dialog";

/**
 * One product card, styled after the email (white card, photo, name, price,
 * a dark button). `large` is the single-product layout.
 */
function ProductCard({
  item,
  buttonLabel,
  large,
}: {
  item: EmailProductItem;
  buttonLabel: string;
  large: boolean;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <div
        className={cn(
          "mb-3 flex w-full items-center justify-center overflow-hidden rounded-md bg-[#f3f4f6] text-[#9ca3af]",
          large ? "aspect-[4/3] max-w-md" : "aspect-square",
        )}
      >
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- mirrors the email's plain <img>
          <img
            src={item.imageUrl}
            alt=""
            draggable={false}
            className="size-full object-cover"
          />
        ) : (
          <ImageOff className="size-6" aria-hidden />
        )}
      </div>
      <p
        className={cn(
          "font-semibold text-[#111827]",
          large ? "text-lg" : "line-clamp-2 text-sm",
        )}
      >
        {item.name}
      </p>
      <p className={cn("mt-1 text-[#374151]", large ? "text-base" : "text-sm")}>
        {formatPrice(item.priceCents)}
        {item.compareAtCents !== null && (
          <s className="ml-2 text-[#9ca3af]">
            {formatPrice(item.compareAtCents)}
          </s>
        )}
      </p>
      <span
        aria-hidden
        className={cn(
          "mt-3 inline-block rounded-md bg-[#111827] font-semibold text-white",
          large ? "px-5 py-2.5 text-sm" : "px-3 py-1.5 text-xs",
        )}
      >
        {buttonLabel}
      </span>
    </div>
  );
}

/**
 * Editor view of an `emailProducts` block: a card preview close to the
 * email (one product = one big card, 2–4 = two per row), a "Choose
 * products" state while empty, and — on hover, focus or selection — a small
 * bar to change the products, edit the button text, or remove the block.
 */
export function EmailProductsNodeView({
  node,
  editor,
  selected,
  updateAttributes,
  deleteNode,
}: NodeViewProps) {
  const items = React.useMemo(
    () => sanitizeEmailProductItems(node.attrs.items),
    [node.attrs.items],
  );
  const savedLabel = coerceEmailProductsButtonLabel(node.attrs.buttonLabel);
  const [labelDraft, setLabelDraft] = React.useState(savedLabel);
  // What blur commits: read through a ref, since Escape resets it and then
  // blurs the field within the same event.
  const labelDraftRef = React.useRef(savedLabel);
  const [editingLabel, setEditingLabel] = React.useState(false);
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const isEditable = editor.isEditable;

  // Follow outside changes (undo, the other half of a collab edit) while
  // the owner isn't typing in the field.
  React.useEffect(() => {
    if (!editingLabel) {
      labelDraftRef.current = savedLabel;
      setLabelDraft(savedLabel);
    }
  }, [savedLabel, editingLabel]);

  const changeLabelDraft = (value: string) => {
    labelDraftRef.current = value;
    setLabelDraft(value);
  };

  const commitLabel = () => {
    const next = coerceEmailProductsButtonLabel(labelDraftRef.current);
    changeLabelDraft(next);
    if (next !== savedLabel) updateAttributes({ buttonLabel: next });
  };

  const previewLabel = coerceEmailProductsButtonLabel(labelDraft);
  const count = items.length;

  return (
    <NodeViewWrapper
      className="group/email-products relative my-4"
      data-email-products=""
    >
      <div
        data-drag-handle
        className={cn(
          "rounded-lg border border-[#e5e7eb] bg-white p-5",
          selected && "outline-primary outline-2 outline-offset-2",
        )}
      >
        {count === 0 ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <span className="bg-muted text-muted-foreground flex size-10 items-center justify-center rounded-full">
              <ShoppingBag className="size-5" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-medium text-[#111827]">Products</p>
              <p className="text-xs text-[#6b7280]">
                Feature up to {EMAIL_PRODUCTS_MAX} products with a button to
                each one&apos;s page.
              </p>
            </div>
            {isEditable && (
              <Button
                type="button"
                size="sm"
                onClick={() => setPickerOpen(true)}
              >
                Choose products
              </Button>
            )}
          </div>
        ) : (
          <div
            className={cn(
              "grid gap-6",
              count === 1 ? "grid-cols-1" : "grid-cols-2",
            )}
          >
            {items.map((item) => (
              <ProductCard
                key={item.productId}
                item={item}
                buttonLabel={previewLabel}
                large={count === 1}
              />
            ))}
          </div>
        )}
      </div>

      {isEditable && count > 0 && (
        <div
          className={cn(
            "bg-popover text-popover-foreground absolute -top-4 right-3 z-10 flex items-center gap-1 rounded-md border p-1 shadow-md transition-opacity",
            selected || editingLabel
              ? "opacity-100"
              : "pointer-events-none opacity-0 group-focus-within/email-products:pointer-events-auto group-focus-within/email-products:opacity-100 group-hover/email-products:pointer-events-auto group-hover/email-products:opacity-100",
          )}
        >
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setPickerOpen(true)}
          >
            Change products
          </Button>
          <label className="text-muted-foreground flex items-center gap-1.5 pl-1 text-xs">
            Button
            <Input
              value={labelDraft}
              maxLength={EMAIL_PRODUCTS_BUTTON_LABEL_MAX}
              aria-label="Button text"
              className="h-7 w-32 px-2 text-xs"
              onFocus={() => setEditingLabel(true)}
              onChange={(event) => changeLabelDraft(event.target.value)}
              onBlur={() => {
                setEditingLabel(false);
                commitLabel();
              }}
              onKeyDown={(event) => {
                // Never let Enter submit the form around the editor.
                if (event.key === "Enter") {
                  event.preventDefault();
                  commitLabel();
                  editor.commands.focus();
                }
                if (event.key === "Escape") {
                  event.preventDefault();
                  changeLabelDraft(savedLabel);
                  editor.commands.focus();
                }
              }}
            />
          </label>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Remove products"
            title="Remove products"
            className="text-destructive hover:text-destructive size-7"
            onClick={() => deleteNode()}
          >
            <Trash2 className="size-4" aria-hidden />
          </Button>
        </div>
      )}

      {isEditable && (
        <ProductPickerDialog
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          initialItems={items}
          onConfirm={(next) =>
            updateAttributes({ items: sanitizeEmailProductItems(next) })
          }
        />
      )}
    </NodeViewWrapper>
  );
}
