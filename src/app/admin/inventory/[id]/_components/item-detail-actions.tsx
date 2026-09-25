"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeftRight, Edit, PackageMinus, PackagePlus } from "lucide-react";

import type { RouterOutputs } from "~/trpc/react";
import { Button } from "~/components/ui/button";

import { MoveStockDialog } from "../../_components/move-stock-dialog";
import { PoolAdjustInventory } from "../../_components/pool-adjust-inventory";
import { PoolDialog } from "../../_components/pool-dialog";

type Item = RouterOutputs["baseInventoryUnit"]["getById"];

type Props = {
  item: Item;
  canManage: boolean;
  rentalsEnabled: boolean;
};

/**
 * The detail page's own header actions. Pulled into a client island — like
 * `pool-create-button.tsx` for the list page — because every action here
 * opens a dialog with its own open state, and the page around it is a server
 * component with none.
 *
 * `item` comes from `getById`, a different query shape than the list page's
 * `items()` rows (no `_count`, and `sales`/`outQty`/`openLines` differ in
 * shape) — the dialogs below only read the fields the two shapes share
 * (id, name, itemType, inventoryQty, reservedQty, sku, category,
 * storageLocation, unitCostCents, lowInventoryThreshold, description), so
 * passing `item` straight through type-checks without an adapter.
 */
export function ItemDetailActions({ item, canManage, rentalsEnabled }: Props) {
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [moveMode, setMoveMode] = useState<"use" | "restock" | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const isRental = item.itemType === "rental";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" onClick={() => setAdjustOpen(true)}>
        Adjust
      </Button>
      {!isRental && (
        <Button variant="outline" onClick={() => setMoveMode("use")}>
          <PackageMinus className="mr-2 h-4 w-4" />
          Use
        </Button>
      )}
      <Button variant="outline" onClick={() => setMoveMode("restock")}>
        <PackagePlus className="mr-2 h-4 w-4" />
        Restock
      </Button>
      {isRental && rentalsEnabled && (
        <Button variant="outline" asChild>
          <Link href={`/admin/inventory/checkouts/new?item=${item.id}`}>
            <ArrowLeftRight className="mr-2 h-4 w-4" />
            Check out
          </Link>
        </Button>
      )}
      {canManage && (
        <Button onClick={() => setEditOpen(true)}>
          <Edit className="mr-2 h-4 w-4" />
          Edit
        </Button>
      )}

      <PoolAdjustInventory
        pool={item}
        open={adjustOpen}
        onOpenChange={setAdjustOpen}
      />
      {moveMode && (
        <MoveStockDialog
          item={item}
          mode={moveMode}
          open={!!moveMode}
          onOpenChange={(open) => {
            if (!open) setMoveMode(null);
          }}
        />
      )}
      {canManage && (
        <PoolDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          item={item}
          // The datalist is a suggestion aid, not a validation source — an
          // empty list here (rather than a second `items()` fetch just for
          // every OTHER item's category) still lets the owner type a new or
          // matching category by hand.
          categories={[]}
          rentalsEnabled={rentalsEnabled}
        />
      )}
    </div>
  );
}
