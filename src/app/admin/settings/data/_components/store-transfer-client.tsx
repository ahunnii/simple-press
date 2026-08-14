"use client";

import { useRef, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Download,
  FileArchive,
  Loader2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ImportResult {
  createdCount: number;
  updatedCount: number;
  mediaCount: number;
  mediaSkipped: number;
  warnings: string[];
  errors: string[];
  perModel: Record<string, { created: number; updated: number }>;
}

interface Props {
  isPlatformAdmin: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function StoreTransferClient({ isPlatformAdmin }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  // ─── File selection ──────────────────────────────────────────────────────

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    selectFile(file);
  }

  function selectFile(file: File | null) {
    if (!file) return;
    if (!file.name.endsWith(".zip")) {
      toast.error("Please select a .zip file exported from Store Transfer.");
      return;
    }
    setSelectedFile(file);
    setImportResult(null);
    setImportError(null);
  }

  // ─── Drag-and-drop ───────────────────────────────────────────────────────

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave() {
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0] ?? null;
    selectFile(file);
  }

  // ─── Import ───────────────────────────────────────────────────────────────

  async function handleImport() {
    if (!selectedFile) return;

    setIsImporting(true);
    setImportResult(null);
    setImportError(null);

    try {
      const body = new FormData();
      body.append("file", selectedFile);

      const res = await fetch("/api/admin/store-transfer/import", {
        method: "POST",
        body,
      });

      if (!res.ok) {
        let message = `Import failed (${res.status})`;
        try {
          const json = (await res.json()) as { message?: string };
          if (json.message) message = json.message;
        } catch {
          // ignore parse errors
        }
        setImportError(message);
        toast.error(message);
        return;
      }

      const result = (await res.json()) as ImportResult;
      setImportResult(result);

      if (result.errors.length > 0) {
        toast.warning(
          "Import completed with errors — review the summary below.",
        );
      } else {
        toast.success("Import complete!");
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      setImportError(message);
      toast.error(message);
    } finally {
      setIsImporting(false);
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── Export ──────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="text-muted-foreground h-5 w-5" />
            Export store content
          </CardTitle>
          <CardDescription>
            Download a ZIP archive containing all your store content and media.
            Use this to migrate your store to another SimplePress environment.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="text-muted-foreground space-y-1 text-sm">
            <li>
              Includes products, collections, pages, blog posts, galleries,
              services, discounts, shipping zones, and template fields
            </li>
            <li>All uploaded media files are bundled inside the archive</li>
            <li>
              Orders, customers, and inventory history are <strong>not</strong>{" "}
              included
            </li>
          </ul>

          {isPlatformAdmin && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                As a Platform Admin you can export any business by appending{" "}
                <code className="bg-muted rounded px-1 font-mono text-xs">
                  ?businessId=&lt;id&gt;
                </code>{" "}
                to the export URL.
              </AlertDescription>
            </Alert>
          )}

          <Button asChild>
            <a href="/api/admin/store-transfer/export" download>
              <Download className="mr-2 h-4 w-4" />
              Export store content
            </a>
          </Button>
        </CardContent>
      </Card>

      <Separator />

      {/* ── Import ──────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="text-muted-foreground h-5 w-5" />
            Import store content
          </CardTitle>
          <CardDescription>
            Upload a ZIP archive previously exported from Store Transfer.
            Content is matched by slug — existing entries are{" "}
            <strong>updated</strong>, new entries are <strong>created</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <Alert variant="default">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Import will overwrite existing content that shares a slug or
              natural key. This action cannot be undone — consider exporting a
              backup first.
            </AlertDescription>
          </Alert>

          {/* Dropzone */}
          <div
            role="button"
            tabIndex={0}
            aria-label="Drop zone: click or drag a ZIP file here"
            className={[
              "border-border flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-10 transition-colors",
              isDragging
                ? "border-primary bg-primary/5"
                : "hover:border-primary/50 hover:bg-muted/50",
            ].join(" ")}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                fileInputRef.current?.click();
              }
            }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <FileArchive
              className="text-muted-foreground h-10 w-10"
              aria-hidden
            />
            <div className="text-center">
              <p className="text-sm font-medium">
                Drop a ZIP file here, or{" "}
                <span className="text-primary">browse</span>
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                Only .zip files exported from Store Transfer are accepted
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".zip"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Selected file preview */}
          {selectedFile && (
            <div className="bg-muted flex items-center justify-between rounded-lg px-4 py-3">
              <div className="flex items-center gap-3">
                <FileArchive
                  className="text-muted-foreground h-5 w-5 shrink-0"
                  aria-hidden
                />
                <div>
                  <p className="text-sm font-medium">{selectedFile.name}</p>
                  <p className="text-muted-foreground text-xs">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <Button onClick={handleImport} disabled={isImporting} size="sm">
                {isImporting ? (
                  <>
                    <Loader2
                      className="mr-2 h-4 w-4 animate-spin"
                      aria-hidden
                    />
                    Importing…
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" aria-hidden />
                    Import
                  </>
                )}
              </Button>
            </div>
          )}

          {/* In-progress notice */}
          {isImporting && (
            <p className="text-muted-foreground text-center text-sm">
              Re-hosting media and upserting content — this may take a minute
              for large stores. Please keep this tab open.
            </p>
          )}

          {/* Inline error */}
          {importError && !isImporting && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Import failed</AlertTitle>
              <AlertDescription>{importError}</AlertDescription>
            </Alert>
          )}

          {/* Success summary */}
          {importResult && !isImporting && (
            <ImportSummary result={importResult} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Import summary sub-component ─────────────────────────────────────────────

function ImportSummary({ result }: { result: ImportResult }) {
  const hasWarnings = result.warnings.length > 0;
  const hasErrors = result.errors.length > 0;

  // Rows with any activity
  const modelRows = Object.entries(result.perModel).filter(
    ([, counts]) => counts.created > 0 || counts.updated > 0,
  );

  return (
    <div className="space-y-4">
      {/* Top-level counts */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Created" value={result.createdCount} color="green" />
        <StatTile label="Updated" value={result.updatedCount} color="blue" />
        <StatTile
          label="Media transferred"
          value={result.mediaCount}
          color="slate"
        />
        <StatTile
          label="Media skipped"
          value={result.mediaSkipped}
          color="amber"
        />
      </div>

      {/* Per-model breakdown */}
      {modelRows.length > 0 && (
        <Card>
          <CardHeader className="pt-4 pb-2">
            <CardTitle className="text-sm font-medium">
              Per-model breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="divide-border divide-y">
              {modelRows.map(([model, counts]) => (
                <div
                  key={model}
                  className="flex items-center justify-between py-2 text-sm"
                >
                  <span className="text-muted-foreground font-mono">
                    {model}
                  </span>
                  <div className="flex gap-2">
                    {counts.created > 0 && (
                      <Badge variant="success">+{counts.created} created</Badge>
                    )}
                    {counts.updated > 0 && (
                      <Badge
                        variant="outline"
                        className="border-blue-200 bg-blue-50 text-blue-700"
                      >
                        {counts.updated} updated
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Warnings */}
      {hasWarnings && (
        <Alert className="border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertTitle>
            {result.warnings.length}{" "}
            {result.warnings.length === 1 ? "warning" : "warnings"}
          </AlertTitle>
          <AlertDescription>
            <ul className="mt-1 space-y-0.5 text-sm">
              {result.warnings.map((w, i) => (
                <li key={i}>• {w}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Errors */}
      {hasErrors && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>
            {result.errors.length}{" "}
            {result.errors.length === 1 ? "error" : "errors"}
          </AlertTitle>
          <AlertDescription>
            <ul className="mt-1 space-y-0.5 text-sm">
              {result.errors.map((e, i) => (
                <li key={i}>• {e}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* All-clear */}
      {!hasWarnings && !hasErrors && (
        <Alert className="border-green-200 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-100">
          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertTitle>Import successful</AlertTitle>
          <AlertDescription>
            All content was transferred without warnings or errors.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

// ─── Stat tile ─────────────────────────────────────────────────────────────────

type TileColor = "green" | "blue" | "slate" | "amber";

const TILE_STYLES: Record<TileColor, string> = {
  green: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300",
  blue: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  slate: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  amber: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
};

function StatTile({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: TileColor;
}) {
  return (
    <div className={`rounded-lg p-4 ${TILE_STYLES[color]}`}>
      <p className="text-xs font-medium opacity-80">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}
