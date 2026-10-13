"use client";

import { useState } from "react";
import { ChevronDown, Pencil, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { api } from "~/trpc/react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

import { OptionGroupEditor } from "./option-group-editor";

type Props = {
  /** `null` on the new-product page: options attach to a saved product. */
  productId: string | null;
  /** `media` feature flag — gates "Choose from library" on choice photos. */
  mediaLibraryEnabled?: boolean;
};

type EditorTarget = { groupId: string | null } | null;

/**
 * The product form's "Options" card: which option groups (colors, charms,
 * engraving…) customers can choose from on this product.
 *
 * It saves on its own — every action here is an immediate mutation — and is
 * deliberately not part of the product form's react-hook-form state or its
 * Save button. Every control is `type="button"` so nothing here can submit
 * the surrounding `<form>`.
 *
 * Rendered only when the `productOptions` feature flag is on (resolved
 * server-side by the page, like the Subscriptions card).
 */
export function ProductOptionsCard({ productId, mediaLibraryEnabled }: Props) {
  if (!productId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Options</CardTitle>
          <CardDescription>
            Let customers choose colors, add-ons or type a personal message
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Save this product first, then come back to add options.
          </p>
        </CardContent>
      </Card>
    );
  }
  return (
    <SavedProductOptions
      productId={productId}
      mediaLibraryEnabled={mediaLibraryEnabled}
    />
  );
}

function SavedProductOptions({
  productId,
  mediaLibraryEnabled,
}: {
  productId: string;
  mediaLibraryEnabled?: boolean;
}) {
  const utils = api.useUtils();
  const [editor, setEditor] = useState<EditorTarget>(null);
  const [pickValue, setPickValue] = useState<string>("");

  const attached = api.productOption.listForProduct.useQuery({ productId });
  const all = api.productOption.listGroups.useQuery();

  const refresh = () => utils.productOption.invalidate();
  const fail = (fallback: string) => (error: { message: string }) =>
    toast.error(error.message || fallback);

  const attach = api.productOption.attach.useMutation({
    onSuccess: refresh,
    onError: fail("Couldn't add this option"),
  });
  const detach = api.productOption.detach.useMutation({
    onSuccess: async () => {
      await refresh();
      toast.success("Option removed from this product");
    },
    onError: fail("Couldn't remove this option"),
  });
  const reorder = api.productOption.reorder.useMutation({
    onSuccess: refresh,
    onError: fail("Couldn't reorder options"),
  });

  const groups = attached.data ?? [];
  const attachedIds = new Set(groups.map((group) => group.id));
  const available = (all.data ?? []).filter(
    (group) => !attachedIds.has(group.id),
  );
  const busy = attach.isPending || detach.isPending || reorder.isPending;

  const move = (index: number, direction: -1 | 1) => {
    const next = groups.map((group) => group.id);
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target]!, next[index]!];
    reorder.mutate({ productId, groupIds: next });
  };

  const labelFor = (group: { name: string; adminLabel: string | null }) =>
    group.adminLabel ? `${group.name} (${group.adminLabel})` : group.name;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Options</CardTitle>
        <CardDescription>
          Let customers choose colors, add-ons or type a personal message.
          Changes here save right away. You don&apos;t need to press Save on the
          product.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {attached.isError ? (
          <p className="text-destructive text-sm" role="alert">
            Couldn&apos;t load this product&apos;s options.{" "}
            {attached.error.message}
          </p>
        ) : attached.isPending ? (
          <p className="text-muted-foreground text-sm">Loading options…</p>
        ) : groups.length === 0 ? (
          <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-center text-sm">
            No options yet. Add one below.
          </p>
        ) : (
          <ol className="space-y-2" aria-label="Options on this product">
            {groups.map((group, index) => (
              <li
                key={group.id}
                className="bg-muted/40 flex flex-wrap items-center gap-3 rounded-lg border p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {labelFor(group)}
                  </p>
                  <p className="text-muted-foreground flex flex-wrap items-center gap-x-2 text-xs">
                    <span>
                      {group.kind === "text"
                        ? "Text box"
                        : `${group.valueCount} ${
                            group.valueCount === 1 ? "choice" : "choices"
                          }`}
                    </span>
                    {group.required && (
                      <Badge variant="secondary">Required</Badge>
                    )}
                    {group.productCount > 1 && (
                      <span>Used on {group.productCount} products</span>
                    )}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Move ${group.name} up`}
                    disabled={busy || index === 0}
                    onClick={() => move(index, -1)}
                  >
                    <ChevronDown
                      className="h-4 w-4 rotate-180"
                      aria-hidden="true"
                    />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Move ${group.name} down`}
                    disabled={busy || index === groups.length - 1}
                    onClick={() => move(index, 1)}
                  >
                    <ChevronDown className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setEditor({ groupId: group.id })}
                  >
                    <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
                    Edit
                    <span className="sr-only"> {group.name}</span>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove ${group.name} from this product`}
                    disabled={busy}
                    onClick={() =>
                      detach.mutate({ productId, groupId: group.id })
                    }
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </li>
            ))}
          </ol>
        )}

        <div className="flex flex-wrap items-end gap-3">
          {available.length > 0 && (
            <div className="min-w-48 flex-1 space-y-1.5 sm:max-w-sm">
              <Label htmlFor="attach-option-group">
                Add an option you&apos;ve already made
              </Label>
              <Select
                value={pickValue}
                disabled={busy}
                onValueChange={(groupId) => {
                  setPickValue("");
                  attach.mutate({ productId, groupId });
                }}
              >
                <SelectTrigger id="attach-option-group" className="w-full">
                  <SelectValue placeholder="Choose an option…" />
                </SelectTrigger>
                <SelectContent>
                  {available.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {labelFor(group)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={() => setEditor({ groupId: null })}
          >
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            Create a new option
          </Button>
        </div>
      </CardContent>

      {editor && (
        <OptionGroupEditor
          open
          onOpenChange={(open) => {
            if (!open) setEditor(null);
          }}
          groupId={editor.groupId}
          mediaLibraryEnabled={mediaLibraryEnabled}
          onSaved={(groupId, isNew) => {
            // A brand-new option is made for this product, so attach it.
            if (isNew) attach.mutate({ productId, groupId });
          }}
        />
      )}
    </Card>
  );
}
