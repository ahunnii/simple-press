"use client";

import { Upload } from "lucide-react";

import { Button } from "~/components/ui/button";

import { ExportItemsButton } from "./export-items-button";
import { ImportItemsDialog } from "./import-items-dialog";

/**
 * Import + Export, as one header-row unit. Owner/manager only — the Items
 * page renders this conditionally on `canManage`, the same way
 * `PoolCreateButton` is unconditional but this pair isn't.
 */
export function InventoryImportExport() {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <ImportItemsDialog
        trigger={
          <Button variant="outline">
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>
        }
      />
      <ExportItemsButton />
    </div>
  );
}
