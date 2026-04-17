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

import { PoolDialog } from "./pool-dialog";
import { PoolAdjustInventory } from "./pool-adjust-inventory";

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
          <p className="text-gray-500">No base units yet.</p>
          <p className="mt-1 text-sm text-gray-400">
            Create your first base unit to start tracking shared inventory.
          </p>
          <Button className="mt-4" size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Base Unit
          </Button>
        </Card>
      ) : (
        <Card className="bg-linear-to-b from-gray-50 to-white">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Current Qty
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Products
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Threshold
                  </th>
                  <th className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pools.map((pool) => (
                  <tr key={pool.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{pool.name}</div>
                      {pool.description && (
                        <div className="text-sm text-gray-500">{pool.description}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={
                            pool.inventoryQty === 0
                              ? "font-semibold text-red-600"
                              : pool.lowInventoryThreshold !== null &&
                                  pool.inventoryQty <= pool.lowInventoryThreshold
                                ? "font-semibold text-amber-600"
                                : "text-gray-900"
                          }
                        >
                          {pool.inventoryQty}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() => setAdjustPool(pool)}
                        >
                          Adjust
                        </Button>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      {pool._count.products}
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      {pool.lowInventoryThreshold ?? "—"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditPool(pool)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600"
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

      <PoolDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
      />

      <PoolDialog
        open={!!editPool}
        onOpenChange={(open) => { if (!open) setEditPool(null); }}
        pool={editPool ?? undefined}
      />

      {adjustPool && (
        <PoolAdjustInventory
          pool={adjustPool}
          open={!!adjustPool}
          onOpenChange={(open) => { if (!open) setAdjustPool(null); }}
        />
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &ldquo;{deleteName}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the pool. Linked products will be
              detached and set to out of stock — you&apos;ll need to restock
              them manually before they become purchasable again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (deleteId) {
                  deletePool.mutate({ id: deleteId });
                  setDeleteId(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
