"use client";

import type { ReactNode } from "react";
import { useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { formatAnswerOrDash } from "~/lib/forms/answers";
import { FORM_IMPORT_MAX_CSV_LENGTH } from "~/lib/validators/form";
import { api } from "~/trpc/react";
import { Alert, AlertDescription } from "~/components/ui/alert";
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
  formId: string;
  trigger: ReactNode;
};

/** Rough client-side size guard — the server enforces the real cap
 *  (`FORM_IMPORT_MAX_CSV_LENGTH`, characters) once the file is read as text. */
const MAX_FILE_BYTES = 2 * 1024 * 1024;

export function ImportEntriesDialog({ formId, trigger }: Props) {
  const utils = api.useUtils();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [csvContent, setCsvContent] = useState<string | null>(null);

  const previewMutation = api.formSubmission.previewImport.useMutation({
    onError: (error) => {
      toast.error(error.message ?? "Failed to read that file");
      reset();
    },
  });

  const commitMutation = api.formSubmission.commitImport.useMutation({
    onSuccess: (data) => {
      toast.success(
        `Imported ${data.imported} ${data.imported === 1 ? "entry" : "entries"}`,
      );
      void utils.formSubmission.invalidate();
      void utils.form.invalidate();
      handleOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message ?? "Failed to import entries");
    },
  });

  const reset = () => {
    setFileName(null);
    setCsvContent(null);
    previewMutation.reset();
    commitMutation.reset();
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
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
    if (file.size > MAX_FILE_BYTES) {
      toast.error("That file is too large — the limit is 2 MB");
      e.target.value = "";
      return;
    }

    const text = await file.text();
    if (text.length > FORM_IMPORT_MAX_CSV_LENGTH) {
      toast.error("That file is too large — the limit is 2 MB");
      e.target.value = "";
      return;
    }

    setFileName(file.name);
    setCsvContent(text);
    previewMutation.mutate({ formId, csvContent: text });
  };

  const handleConfirm = () => {
    if (!csvContent) return;
    commitMutation.mutate({ formId, csvContent });
  };

  const preview = previewMutation.data;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import entries</DialogTitle>
          <DialogDescription>
            Upload a CSV of past entries — matched by column header to this
            form&apos;s fields. Tip: export first to get a CSV with the right
            column headers.
          </DialogDescription>
        </DialogHeader>

        {!fileName && (
          <div className="border-border rounded-lg border-2 border-dashed p-8 text-center">
            <label htmlFor="entries-csv-upload">
              <span className="text-primary cursor-pointer font-medium hover:underline">
                Choose a CSV file
              </span>
              <input
                ref={fileInputRef}
                id="entries-csv-upload"
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

        {preview && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <SummaryStat label="Rows" value={preview.totalRows} />
              <SummaryStat
                label="Valid"
                value={preview.validCount}
                tone="success"
              />
              <SummaryStat
                label="Errors"
                value={preview.errorCount}
                tone={preview.errorCount > 0 ? "destructive" : undefined}
              />
              <SummaryStat label="Empty skipped" value={preview.skippedEmptyRows} />
            </div>

            <div className="space-y-1 text-sm">
              <p>
                <span className="font-medium">Matched columns: </span>
                {preview.matchedColumns.length > 0
                  ? preview.matchedColumns.map((c) => c.label).join(", ")
                  : "none"}
              </p>
              {preview.missingFields.length > 0 && (
                <p className="text-muted-foreground">
                  <span className="font-medium text-foreground">
                    Fields with no matching column:
                  </span>{" "}
                  {preview.missingFields.join(", ")}
                </p>
              )}
              {preview.ignoredColumns.length > 0 && (
                <p className="text-muted-foreground">
                  <span className="font-medium text-foreground">
                    Ignored columns:
                  </span>{" "}
                  {preview.ignoredColumns.join(", ")}
                </p>
              )}
            </div>

            {preview.errorCount > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>
                    {preview.errorCount}{" "}
                    {preview.errorCount === 1 ? "row has" : "rows have"} errors
                    (rows skipped are spreadsheet row numbers — the header is
                    row 1)
                  </strong>
                  <div className="mt-2 max-h-32 overflow-y-auto text-sm">
                    {preview.errors.slice(0, 5).map((error) => (
                      <div key={error.row}>
                        • Row {error.row}: {error.message}
                      </div>
                    ))}
                    {preview.errorCount > 5 && (
                      <p className="mt-1">
                        …and {preview.errorCount - 5} more
                      </p>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {preview.sample.length > 0 && (
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Status</TableHead>
                      {preview.sample[0]!.answers.slice(0, 3).map((a) => (
                        <TableHead key={a.fieldId}>{a.label}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.sample.map((row, i) => (
                      <TableRow key={i}>
                        <TableCell className="whitespace-nowrap">
                          {new Date(row.submittedAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{row.status}</TableCell>
                        {row.answers.slice(0, 3).map((a) => (
                          <TableCell key={a.fieldId}>
                            {formatAnswerOrDash(a)}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <p className="text-muted-foreground text-xs">
              Imported entries don&apos;t send emails. Rows with errors are
              skipped.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={commitMutation.isPending}
          >
            Cancel
          </Button>
          {preview && (
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={preview.validCount === 0 || commitMutation.isPending}
            >
              {commitMutation.isPending
                ? "Importing…"
                : `Import ${preview.validCount} ${
                    preview.validCount === 1 ? "entry" : "entries"
                  }`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SummaryStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "success" | "destructive";
}) {
  return (
    <div className="bg-muted rounded-lg p-3">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p
        className={
          tone === "success"
            ? "text-lg font-bold text-green-600 dark:text-green-400"
            : tone === "destructive"
              ? "text-destructive text-lg font-bold"
              : "text-lg font-bold"
        }
      >
        {value}
        {tone === "success" && value > 0 && (
          <CheckCircle2 className="ml-1 inline h-4 w-4" aria-hidden="true" />
        )}
      </p>
    </div>
  );
}
