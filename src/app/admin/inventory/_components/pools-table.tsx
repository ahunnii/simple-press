"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Edit, MoreVertical, Plus, Trash } from "lucide-react";
import { toast } from "sonner";

import type { RouterOutputs } from "~/trpc/react";
import { api } from "~/trpc/react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

import { PoolAdjustInventory } from "./pool-adjust-inventory";
import { PoolDialog } from "./pool-dialog";

type Pool = RouterOutputs["baseInventoryUnit"]["list"][number];

type Props = {
  pools: Pool[];
};

export function PoolsTable({ pools }: Props) {
  const router = useRouter();
  const apiUtils = api.useUtils();

  const [createOpen, setCreateOpen] = useState(false);
  const [editPool, setEditPool] = useState<Pool | null>(null);
  const [adjustPool, setAdjustPool] = useState<Pool | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteName, setDeleteName] = useState<string>("");

  const deletePool = api.baseInventoryUnit.delete.useMutation({
    onSuccess: () => {
      toast.success("Base unit deleted");
      void apiUtils.baseInventoryUnit.invalidate();
      router.refresh();
    },
    onError: (err) => toast.error(err.message ?? "Failed to delete base unit"),
  });

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Base Unit
        </Button>
      </div>

      {pools.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No base units yet.</p>
          <p className="mt-1 text-sm text-muted-foreground/70">
            Create your first base unit to start tracking shared inventory.
          </p>
          <Button
            className="mt-4"
            size="sm"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Base Unit
          </Button>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <caption className="sr-only">Inventory base units</caption>
              <thead className="border-b">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase">
                    Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase">
                    Current Qty
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase">
                    Products
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase">
                    Threshold
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {pools.map((pool) => (
                  <tr key={pool.id} className="hover:bg-muted/50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-foreground">
                        {pool.name}
                      </div>
                      {pool.description && (
                        <div className="text-sm text-muted-foreground">
                          {pool.description}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={
                            pool.inventoryQty === 0
                              ? "font-semibold text-red-600"
                              : pool.lowInventoryThreshold !== null &&
                                  pool.inventoryQty <=
                                    pool.lowInventoryThreshold
                                ? "font-semibold text-amber-600"
                                : "text-foreground"
                          }
                        >
                          {pool.inventoryQty}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-2 text-xs"
                          onClick={() => setAdjustPool(pool)}
                        >
                          Adjust
                        </Button>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-foreground">
                      {pool._count.products}
                    </td>
                    <td className="px-6 py-4 text-foreground">
                      {pool.lowInventoryThreshold ?? "—"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 w-9 p-0"
                          >
                            <MoreVertical className="h-4 w-4" />
                            <span className="sr-only">Actions for {pool.name}</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditPool(pool)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => {
                              setDeleteId(pool.id);
                              setDeleteName(pool.name);
                            }}
                          >
                            <Trash className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <PoolDialog open={createOpen} onOpenChange={setCreateOpen} />

      <PoolDialog
        open={!!editPool}
        onOpenChange={(open) => {
          if (!open) setEditPool(null);
        }}
        pool={editPool ?? undefined}
      />

      {adjustPool && (
        <PoolAdjustInventory
          pool={adjustPool}
          open={!!adjustPool}
          onOpenChange={(open) => {
            if (!open) setAdjustPool(null);
          }}
        />
      )}

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete &ldquo;{deleteName}&rdquo;?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the pool. Linked products will be
              detached and set to out of stock — you&apos;ll need to restock
              them manually before they become purchasable again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePool.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              disabled={deletePool.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (deleteId) deletePool.mutate({ id: deleteId });
              }}
            >
              {deletePool.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
