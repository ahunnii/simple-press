import type { RouterOutputs } from "~/trpc/react";

/**
 * Draft shapes for the option group editor. Money is held in DOLLARS while an
 * owner types (the shared `MoneyInput` is dollars-based) and converted to
 * integer cents once, in `toGroupPayload`.
 */

export type LinkedTarget = {
  productId: string;
  productName: string;
  published: boolean;
  productPriceCents: number;
  variants: { id: string; name: string; priceCents: number }[];
  /** Required when the product has variants. */
  variantId: string | null;
};

export type ValueDraft = {
  /** Stable React key; also survives reordering. */
  key: string;
  /** Present for a value that already exists (kept in place on save). */
  id?: string;
  label: string;
  imageUrl: string | null;
  swatchColor: string | null;
  mode: "addon" | "product";
  addOnDollars: number | null;
  /** Linked values only: charge this instead of the product's own price. */
  overrideEnabled: boolean;
  overrideDollars: number | null;
  linked: LinkedTarget | null;
  available: boolean;
};

export type GroupDraft = {
  id?: string;
  name: string;
  adminLabel: string;
  helpText: string;
  kind: "choice" | "text";
  required: boolean;
  minSelections: number;
  maxSelections: number;
  includedCount: number;
  display: "tiles" | "swatches" | "list";
  maxLength: number | null;
  placeholder: string;
  textPriceDollars: number | null;
};

export const toCents = (dollars: number | null | undefined) =>
  Math.round((dollars ?? 0) * 100);

export const fromCents = (cents: number) => cents / 100;

let counter = 0;
export const newKey = () => `v${Date.now().toString(36)}${counter++}`;

export function emptyGroupDraft(): GroupDraft {
  return {
    name: "",
    adminLabel: "",
    helpText: "",
    kind: "choice",
    required: false,
    minSelections: 0,
    maxSelections: 1,
    includedCount: 0,
    display: "tiles",
    maxLength: 100,
    placeholder: "",
    textPriceDollars: 0,
  };
}

export function emptyValueDraft(): ValueDraft {
  return {
    key: newKey(),
    label: "",
    imageUrl: null,
    swatchColor: null,
    mode: "addon",
    addOnDollars: 0,
    overrideEnabled: false,
    overrideDollars: null,
    linked: null,
    available: true,
  };
}

type LoadedGroup = RouterOutputs["productOption"]["getGroup"];

export function groupToDraft(group: LoadedGroup): {
  group: GroupDraft;
  values: ValueDraft[];
} {
  return {
    group: {
      id: group.id,
      name: group.name,
      adminLabel: group.adminLabel ?? "",
      helpText: group.helpText ?? "",
      kind: group.kind === "text" ? "text" : "choice",
      required: group.required,
      minSelections: group.minSelections,
      maxSelections: group.maxSelections,
      includedCount: group.includedCount,
      display:
        group.display === "swatches" || group.display === "list"
          ? group.display
          : "tiles",
      maxLength: group.maxLength,
      placeholder: group.placeholder ?? "",
      textPriceDollars: fromCents(group.textPriceCents),
    },
    values: group.values.map((value) => ({
      key: value.id,
      id: value.id,
      label: value.label,
      imageUrl: value.imageUrl,
      swatchColor: value.swatchColor,
      mode: value.linked ? "product" : "addon",
      addOnDollars: fromCents(value.priceDelta),
      overrideEnabled: value.priceOverride != null,
      overrideDollars:
        value.priceOverride != null ? fromCents(value.priceOverride) : null,
      linked: value.linked
        ? {
            productId: value.linked.productId,
            productName: value.linked.productName,
            published: value.linked.published,
            productPriceCents: value.linked.productPriceCents,
            variants: value.linked.variants,
            variantId: value.linked.variantId,
          }
        : null,
      available: value.available,
    })),
  };
}

/** The linked target's price right now, in cents. */
export function linkedPriceCents(linked: LinkedTarget): number {
  if (linked.variantId) {
    const variant = linked.variants.find((v) => v.id === linked.variantId);
    if (variant) return variant.priceCents;
  }
  return linked.productPriceCents;
}

/** What the server accepts (`upsertGroup` input), before schema parsing. */
export function toGroupPayload(group: GroupDraft, values: ValueDraft[]) {
  const isText = group.kind === "text";
  return {
    group: {
      id: group.id,
      name: group.name,
      adminLabel: group.adminLabel.trim() || null,
      helpText: group.helpText.trim() || null,
      kind: group.kind,
      required: group.required,
      // Text groups ignore the pick counts; send neutral ones so a stale
      // hidden value can't fail validation.
      minSelections: isText ? 0 : group.minSelections,
      maxSelections: isText ? 1 : group.maxSelections,
      includedCount: isText ? 0 : group.includedCount,
      display: group.display,
      maxLength: isText ? group.maxLength : null,
      placeholder: isText ? group.placeholder.trim() || null : null,
      textPriceCents: isText ? toCents(group.textPriceDollars) : 0,
    },
    values: isText
      ? []
      : values.map((value) => {
          const linked = value.mode === "product" ? value.linked : null;
          return {
            id: value.id,
            label: value.label,
            imageUrl: value.imageUrl,
            swatchColor: value.swatchColor,
            priceDelta: linked ? 0 : toCents(value.addOnDollars),
            priceOverride:
              linked && value.overrideEnabled
                ? toCents(value.overrideDollars)
                : null,
            linkedProductId: linked?.productId ?? null,
            linkedVariantId: linked?.variantId ?? null,
            available: value.available,
          };
        }),
  };
}
