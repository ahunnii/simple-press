"use client";

import type { ReactNode } from "react";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

import type { RouterOutputs } from "~/trpc/react";
import { MAX_IMPORT_BYTES } from "~/lib/inventory/csv";
import { api } from "~/trpc/react";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";

type Props = {
  trigger: ReactNode;
};

type PreviewResult = RouterOutputs["baseInventoryUnit"]["previewImport"];
type CommitResult = RouterOutputs["baseInventoryUnit"]["commitImport"];
type ChangedItem = PreviewResult["changedItems"][number];

const FIELD_LABELS: Record<string, string> = {
  name: "Name",
  sku: "SKU",
  itemType: "Type",
  category: "Category",
  storageLocation: "Location",
  lowInventoryThreshold: "Low stock alert at",
  unitCostCents: "Unit cost",
  description: "Description",
};

/** Field-aware rendering: cents → dollars, stock/rental → title case. */
function formatChangeValue(field: string, value: string | number | null) {
  if (value === null || value === "") return "—";
  if (field === "unitCostCents" && typeof value === "number") {
    return `$${(value / 100).toFixed(2)}`;
  }
  if (field === "itemType") return value === "rental" ? "Rental" : "Stock";
  return String(value);
}

export function ImportItemsDialog({ trigger }: Props) {
  const utils = api.useUtils();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [csvContent, setCsvContent] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [result, setResult] = useState<CommitResult | null>(null);

  const previewMutation = api.baseInventoryUnit.previewImport.useMutation({
    onSuccess: (data) => setPreview(data),
    onError: (error) => {
      toast.error(error.message || "Failed to read that file");
      resetFile();
    },
  });

  const commitMutation = api.baseInventoryUnit.commitImport.useMutation({
    onSuccess: (data) => {
      setResult(data);
      void utils.baseInventoryUnit.invalidate();
      router.refresh();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to import items");
    },
  });

  const resetFile = () => {
    setFileName(null);
    setCsvContent(null);
    setPreview(null);
    previewMutation.reset();
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const resetAll = () => {
    resetFile();
    setResult(null);
    commitMutation.reset();
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) resetAll();
    setOpen(next);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast.error("Please choose a .csv file");
      e.target.value = "";
      return;
    }
    if (file.size > MAX_IMPORT_BYTES) {
      toast.error("That file is too large — import at most 2 MB at a time");
      e.target.value = "";
      return;
    }

    const text = await file.text();
    if (text.length > MAX_IMPORT_BYTES) {
      toast.error("That file is too large — import at most 2 MB at a time");
      e.target.value = "";
      return;
    }

    setFileName(file.name);
    setCsvContent(text);
    previewMutation.mutate({ csvContent: text, fileName: file.name });
  };

  const handleConfirm = () => {
    if (!csvContent || !fileName || !preview) return;
    commitMutation.mutate({
      csvContent,
      fileName,
      expectedQuantities: preview.expectedQuantities,
    });
  };

  const blockingErrors = preview?.fileErrors ?? [];
  const changeCount = preview
    ? preview.counts.create + preview.counts.update
    : 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {result ? "Import complete" : "Import items"}
          </DialogTitle>
          {!result && (
            <DialogDescription>
              Upload a CSV of items — matched by SKU first, then by name.
              Columns: SKU, Name, Type (stock/rental), Category, Location,
              Quantity on hand, Low stock alert at, Unit cost, Description. Tip:
              export first, edit the file, then import it back. Blank cells
              leave existing values unchanged.
            </DialogDescription>
          )}
        </DialogHeader>

        {/* Step 1: choose a file */}
        {!fileName && !result && (
          <div className="border-border rounded-lg border-2 border-dashed p-8 text-center">
            <label htmlFor="inventory-csv-upload">
              <span className="text-primary cursor-pointer font-medium hover:underline">
                Choose a CSV file
              </span>
              <input
                ref={fileInputRef}
                id="inventory-csv-upload"
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => void handleFileSelect(e)}
              />
            </label>
            <p className="text-muted-foreground mt-1 text-sm">up to 2 MB</p>
          </div>
        )}

        {fileName && previewMutation.isPending && (
          <div className="flex items-center gap-2 py-8 text-sm" role="status">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Reading {fileName}…
          </div>
        )}

        {/* Step 2: preview */}
        {preview && !result && (
          <div className="space-y-4">
            {blockingErrors.length > 0 ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <ul className="list-inside list-disc">
                    {blockingErrors.map((message, i) => (
                      <li key={i}>{message}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="success">{preview.counts.create} new</Badge>
                  <Badge variant="secondary">
                    {preview.counts.update} updated
                  </Badge>
                  <Badge variant="secondary">
                    {preview.counts.quantityChanges} quantity change
                    {preview.counts.quantityChanges === 1 ? "" : "s"}
                  </Badge>
                  <Badge variant="outline">
                    {preview.counts.unchanged} unchanged
                  </Badge>
                  {preview.counts.errors > 0 && (
                    <Badge variant="destructive">
                      {preview.counts.errors} error
                      {preview.counts.errors === 1 ? "" : "s"} (skipped)
                    </Badge>
                  )}
                </div>

                {preview.skippedBlank > 0 && (
                  <p className="text-muted-foreground text-xs">
                    {preview.skippedBlank} blank{" "}
                    {preview.skippedBlank === 1 ? "row was" : "rows were"}{" "}
                    skipped.
                  </p>
                )}
                {preview.ignoredColumns.length > 0 && (
                  <p className="text-muted-foreground text-xs">
                    <span className="text-foreground font-medium">
                      Ignored columns:
                    </span>{" "}
                    {preview.ignoredColumns.join(", ")}
                  </p>
                )}

                {preview.errorCount > 0 && (
                  <RowMessageTable
                    title={`${preview.errorCount} row${preview.errorCount === 1 ? "" : "s"} skipped`}
                    rows={preview.errors}
                    totalCount={preview.errorCount}
                    tone="destructive"
                  />
                )}
                {preview.warningCount > 0 && (
                  <RowMessageTable
                    title={`${preview.warningCount} warning${preview.warningCount === 1 ? "" : "s"}`}
                    rows={preview.warnings}
                    totalCount={preview.warningCount}
                    tone="warning"
                  />
                )}

                {preview.sample.length > 0 && (
                  <div>
                    <p className="mb-2 text-sm font-medium">Quantity changes</p>
                    <div className="overflow-x-auto rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Item</TableHead>
                            <TableHead>Current</TableHead>
                            <TableHead>New</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {preview.sample.map((row) => (
                            <TableRow key={row.rowNumber}>
                              <TableCell>{row.itemName}</TableCell>
                              <TableCell className="tabular-nums">
                                {row.from}
                              </TableCell>
                              <TableCell className="tabular-nums">
                                {row.to}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                {preview.changedItems.length > 0 && (
                  <div>
                    <p className="mb-2 text-sm font-medium">Changes</p>
                    <div className="max-h-64 overflow-y-auto rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Row</TableHead>
                            <TableHead>Item</TableHead>
                            <TableHead>Changes</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {preview.changedItems.map((row) => (
                            <ChangedItemRow key={row.rowNumber} row={row} />
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Step 3: commit result */}
        {result && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="success">{result.created} created</Badge>
              <Badge variant="secondary">{result.updated} updated</Badge>
              <Badge variant="secondary">
                {result.quantityAdjusted} quantity adjusted
              </Badge>
              <Badge variant="outline">{result.unchanged} unchanged</Badge>
              {result.skippedErrors > 0 && (
                <Badge variant="destructive">
                  {result.skippedErrors} row
                  {result.skippedErrors === 1 ? "" : "s"} skipped
                </Badge>
              )}
            </div>

            {result.changedSincePreview.length > 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-medium">
                    {result.changedSincePreview.length} changed since preview —
                    quantity was skipped
                  </p>
                  <ul className="mt-1 list-inside list-disc">
                    {result.changedSincePreview.map((row) => (
                      <li key={row.rowNumber}>
                        {row.itemName}: expected {row.expected}, now{" "}
                        {row.current}
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {result.failed.length > 0 && (
              <RowMessageTable
                title={`${result.failed.length} row${result.failed.length === 1 ? "" : "s"} failed`}
                rows={result.failed}
                totalCount={result.failed.length}
                tone="destructive"
              />
            )}
          </div>
        )}

        <DialogFooter>
          {result ? (
            <Button type="button" onClick={() => handleOpenChange(false)}>
              Done
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  preview ? resetFile() : handleOpenChange(false)
                }
                disabled={commitMutation.isPending}
              >
                {preview ? "Back" : "Cancel"}
              </Button>
              {preview && blockingErrors.length === 0 && (
                <Button
                  type="button"
                  onClick={handleConfirm}
                  disabled={changeCount === 0 || commitMutation.isPending}
                >
                  {commitMutation.isPending
                    ? "Importing…"
                    : `Import ${changeCount} ${changeCount === 1 ? "item" : "items"}`}
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ChangedItemRow({ row }: { row: ChangedItem }) {
  return (
    <TableRow>
      <TableCell className="tabular-nums">{row.rowNumber}</TableCell>
      <TableCell>
        <Badge variant={row.action === "create" ? "success" : "secondary"}>
          {row.action === "create" ? "New" : "Update"}
        </Badge>{" "}
        {row.itemName}
      </TableCell>
      <TableCell className="whitespace-normal">
        <ul className="space-y-0.5 text-xs">
          {row.changes.map((change) => (
            <li key={change.field}>
              <span className="text-foreground font-medium">
                {FIELD_LABELS[change.field] ?? change.field}:
              </span>{" "}
              {row.action === "create" ? (
                formatChangeValue(change.field, change.to)
              ) : (
                <>
                  {formatChangeValue(change.field, change.from)}
                  {" → "}
                  {formatChangeValue(change.field, change.to)}
                </>
              )}
            </li>
          ))}
          {row.qtyChange && (
            <li>
              <span className="text-foreground font-medium">Quantity:</span>{" "}
              {row.qtyChange.from} → {row.qtyChange.to}
            </li>
          )}
        </ul>
      </TableCell>
    </TableRow>
  );
}

function RowMessageTable({
  title,
  rows,
  totalCount,
  tone,
}: {
  title: string;
  rows: { rowNumber: number; message: string }[];
  totalCount: number;
  tone: "destructive" | "warning";
}) {
  return (
    <Alert variant={tone}>
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        <p className="font-medium">{title}</p>
        <div className="mt-1 max-h-32 overflow-y-auto text-sm">
          {rows.map((row, i) => (
            <div key={i}>
              • Row {row.rowNumber}: {row.message}
            </div>
          ))}
        </div>
        {totalCount > rows.length && (
          <p className="mt-1 text-sm">…and {totalCount - rows.length} more</p>
        )}
      </AlertDescription>
    </Alert>
  );
}
