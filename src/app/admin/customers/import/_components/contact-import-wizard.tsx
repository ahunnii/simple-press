"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  FileText,
  History,
  Loader2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import type { RouterOutputs } from "~/trpc/react";
import { CONTACT_IMPORT_SOURCE_LABELS } from "~/lib/marketing/contact-import";
import { api } from "~/trpc/react";
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
import { Label } from "~/components/ui/label";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";

import { InviteCard } from "./invite-card";

type Preview = RouterOutputs["contactImport"]["preview"];
type ColumnMap = {
  email: string;
  firstName: string | null;
  lastName: string | null;
  status: string | null;
};
type Step = "upload" | "preview" | "invite";
/** "Everyone in this file is …"; "unsure" sends nothing (nobody is invited). */
type FileStatusChoice = "unsure" | "subscribed" | "unsubscribed";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const NONE = "__none__";

const FILE_STATUS_OPTIONS: { value: FileStatusChoice; label: string }[] = [
  { value: "unsure", label: "Not sure / not stated (nobody is invited)" },
  {
    value: "subscribed",
    label: "Everyone in this file subscribed (a subscriber-list export)",
  },
  {
    value: "unsubscribed",
    label: "Everyone in this file unsubscribed (blocked for good)",
  },
];

function toServerFileStatus(
  choice: FileStatusChoice,
): "subscribed" | "unsubscribed" | undefined {
  return choice === "unsure" ? undefined : choice;
}

type Props = {
  businessName: string;
  hasPostalAddress: boolean;
  /** Reopened from history: go straight to the invite step. */
  initialImportId: string | null;
};

export function ContactImportWizard({
  businessName,
  hasPostalAddress,
  initialImportId,
}: Props) {
  const utils = api.useUtils();
  const fileInput = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>(initialImportId ? "invite" : "upload");
  const [fileName, setFileName] = useState("");
  const [csv, setCsv] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [columnMap, setColumnMap] = useState<ColumnMap | null>(null);
  const [fileStatus, setFileStatus] = useState<FileStatusChoice>("unsure");
  const [importId, setImportId] = useState<string | null>(initialImportId);
  const [committed, setCommitted] = useState<
    RouterOutputs["contactImport"]["commit"]["counts"] | null
  >(null);

  const previewMutation = api.contactImport.preview.useMutation({
    onSuccess: (data) => {
      setPreview(data);
      setColumnMap((prev) => ({
        // Keep an explicit pick; otherwise adopt what was detected.
        email: data.columns.email ?? prev?.email ?? "",
        firstName: data.columns.firstName,
        lastName: data.columns.lastName,
        status: data.columns.status,
      }));
      setStep("preview");
    },
    onError: (error) => {
      toast.error(error.message || "Couldn't read that file");
    },
  });

  const commit = api.contactImport.commit.useMutation({
    onSuccess: (data) => {
      setImportId(data.importId);
      setCommitted(data.counts);
      setStep("invite");
      void utils.contactImport.list.invalidate();
      void utils.customer.invalidate();
      toast.success(
        `Imported ${data.counts.created.toLocaleString()} ${data.counts.created === 1 ? "contact" : "contacts"}`,
      );
    },
    onError: (error) => {
      toast.error(error.message || "The import failed");
    },
  });

  const reset = () => {
    setStep("upload");
    setCsv("");
    setFileName("");
    setPreview(null);
    setColumnMap(null);
    setFileStatus("unsure");
    setFileError(null);
    if (fileInput.current) fileInput.current.value = "";
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileError(null);
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setFileError("That doesn't look like a CSV file. Choose a .csv export.");
      e.target.value = "";
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setFileError(
        "That file is over 5 MB. Split it into smaller files and import them one at a time.",
      );
      e.target.value = "";
      return;
    }
    const text = await file.text();
    setCsv(text);
    setFileName(file.name);
    previewMutation.mutate({ csvContent: text });
  };

  const changeColumn = (key: keyof ColumnMap, value: string) => {
    if (!columnMap) return;
    const next: ColumnMap = {
      ...columnMap,
      [key]: value === NONE ? null : value,
    };
    setColumnMap(next);
    // The server refuses a whole-file status alongside a status column.
    const nextFileStatus = next.status ? "unsure" : fileStatus;
    if (next.status) setFileStatus("unsure");
    // The server needs an email column before it can classify anything.
    if (next.email)
      previewMutation.mutate({
        csvContent: csv,
        columnMap: next,
        fileStatus: toServerFileStatus(nextFileStatus),
      });
  };

  const changeFileStatus = (value: FileStatusChoice) => {
    setFileStatus(value);
    previewMutation.mutate({
      csvContent: csv,
      columnMap: mapForServer,
      fileStatus: toServerFileStatus(value),
    });
  };

  // What commit sends: the (possibly hand-fixed) map, once an email column is set.
  const mapForServer = columnMap?.email ? columnMap : undefined;
  const canCommit =
    !!preview &&
    !!preview.columns.email &&
    preview.counts.valid > 0 &&
    !previewMutation.isPending &&
    !commit.isPending;

  return (
    <div className="bg-muted/30 min-h-screen py-8">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-foreground text-3xl font-bold">
              Import contacts
            </h1>
            <p className="text-muted-foreground mt-2">
              Bring over the email contacts from your previous website
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/customers/import/history">
              <History aria-hidden="true" className="mr-2 h-4 w-4" />
              Import history
            </Link>
          </Button>
        </div>

        <ol className="mb-8 flex flex-wrap items-center gap-x-6 gap-y-3">
          <StepMarker
            number={1}
            label="Upload"
            active={step === "upload"}
            completed={step !== "upload"}
          />
          <StepMarker
            number={2}
            label="Review"
            active={step === "preview"}
            completed={step === "invite"}
          />
          <StepMarker
            number={3}
            label="Invite"
            active={step === "invite"}
            completed={false}
          />
        </ol>

        {step === "upload" && (
          <Card>
            <CardHeader>
              <CardTitle>Upload a contact list</CardTitle>
              <CardDescription>
                Your previous website&apos;s contact export (Wix, Shopify,
                Square, or any spreadsheet with an email column), saved as a CSV
                file.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <FileText aria-hidden="true" />
                <AlertTitle>How this works</AlertTitle>
                <AlertDescription>
                  <ul className="mt-1 list-disc space-y-1 pl-5">
                    <li>
                      Only people marked as subscribed on the old site can get a
                      one-time invite email.
                    </li>
                    <li>
                      Nobody is added to your email list until they click
                      &quot;join&quot; in that email.
                    </li>
                    <li>
                      People marked as unsubscribed are blocked from marketing
                      email for good.
                    </li>
                    <li>Customers you already have are not changed.</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <div className="border-border rounded-lg border-2 border-dashed p-8">
                <div className="text-center">
                  <Upload
                    aria-hidden="true"
                    className="text-muted-foreground mx-auto h-12 w-12"
                  />
                  <div className="mt-4">
                    <Button
                      variant="outline"
                      onClick={() => fileInput.current?.click()}
                      disabled={previewMutation.isPending}
                    >
                      {previewMutation.isPending ? (
                        <>
                          <Loader2
                            aria-hidden="true"
                            className="mr-2 h-4 w-4 animate-spin"
                          />
                          Reading file…
                        </>
                      ) : (
                        "Choose a CSV file"
                      )}
                    </Button>
                    <input
                      ref={fileInput}
                      id="contact-csv"
                      type="file"
                      accept=".csv,text/csv"
                      onChange={(e) => void handleFile(e)}
                      className="sr-only"
                      aria-label="Contact list CSV file"
                    />
                  </div>
                  <p className="text-muted-foreground mt-2 text-xs">
                    CSV up to 5 MB, 5,000 contacts at a time
                  </p>
                </div>
              </div>

              {fileError && (
                <Alert variant="destructive" role="alert">
                  <AlertCircle aria-hidden="true" />
                  <AlertDescription>{fileError}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {step === "preview" && preview && columnMap && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-2">
                  Review {fileName}
                  <Badge variant="secondary">
                    {CONTACT_IMPORT_SOURCE_LABELS[preview.sourceKind]} file
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Nothing has been imported yet. Check the columns and counts,
                  then import.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {preview.warnings.length > 0 && (
                  <Alert variant="warning">
                    <AlertTriangle aria-hidden="true" />
                    <AlertTitle>Read before importing</AlertTitle>
                    <AlertDescription>
                      <ul className="mt-1 list-disc space-y-1 pl-5">
                        {preview.warnings.map((w) => (
                          <li key={w}>{w}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                <div>
                  <h3 className="mb-3 font-medium">Columns</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <ColumnSelect
                      id="map-email"
                      label="Email (required)"
                      headers={preview.headers}
                      value={columnMap.email || null}
                      allowNone={false}
                      disabled={previewMutation.isPending}
                      onChange={(v) => changeColumn("email", v)}
                    />
                    <ColumnSelect
                      id="map-status"
                      label="Subscribed or not"
                      headers={preview.headers}
                      value={columnMap.status}
                      disabled={previewMutation.isPending}
                      onChange={(v) => changeColumn("status", v)}
                    />
                    <ColumnSelect
                      id="map-first"
                      label="First name"
                      headers={preview.headers}
                      value={columnMap.firstName}
                      disabled={previewMutation.isPending}
                      onChange={(v) => changeColumn("firstName", v)}
                    />
                    <ColumnSelect
                      id="map-last"
                      label="Last name"
                      headers={preview.headers}
                      value={columnMap.lastName}
                      disabled={previewMutation.isPending}
                      onChange={(v) => changeColumn("lastName", v)}
                    />
                  </div>
                </div>

                {!preview.hasStatusColumn && (
                  <fieldset
                    className="space-y-3"
                    disabled={previewMutation.isPending}
                  >
                    <legend className="font-medium">
                      Is everyone in this file subscribed?
                    </legend>
                    <p className="text-muted-foreground text-sm">
                      This file has no subscribed-or-not column. If it is a
                      subscriber list on its own (for example a Squarespace or
                      Mailchimp subscriber export), say so here. Don&apos;t pick
                      subscribed for a list of all customers.
                    </p>
                    <RadioGroup
                      value={fileStatus}
                      onValueChange={(v) =>
                        changeFileStatus(v as FileStatusChoice)
                      }
                      className="space-y-2"
                    >
                      {FILE_STATUS_OPTIONS.map((opt) => (
                        <div
                          key={opt.value}
                          className="flex items-start space-x-2"
                        >
                          <RadioGroupItem
                            value={opt.value}
                            id={`file-status-${opt.value}`}
                            className="mt-0.5"
                          />
                          <Label
                            htmlFor={`file-status-${opt.value}`}
                            className="cursor-pointer leading-snug font-normal"
                          >
                            {opt.label}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </fieldset>
                )}

                <div aria-live="polite">
                  <h3 className="mb-3 font-medium">
                    What will happen{" "}
                    {previewMutation.isPending && (
                      <Loader2
                        aria-hidden="true"
                        className="ml-1 inline h-4 w-4 animate-spin"
                      />
                    )}
                  </h3>
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    <Stat
                      label="Valid contacts"
                      value={preview.counts.valid}
                      tone="green"
                    />
                    <Stat
                      label="Can be invited"
                      value={preview.counts.inviteEligible}
                      tone="blue"
                    />
                    <Stat
                      label="Already customers"
                      value={preview.counts.matchedExisting}
                      hint="Left unchanged"
                    />
                    <Stat
                      label="Blocked from marketing"
                      value={preview.counts.onDoNotEmail}
                      hint="Already on your blocked list"
                    />
                    <Stat
                      label="Marked subscribed"
                      value={preview.counts.subscribed}
                    />
                    <Stat
                      label="Marked unsubscribed"
                      value={preview.counts.unsubscribed}
                      hint="Blocked for good"
                    />
                    <Stat
                      label="Status unknown"
                      value={preview.counts.unknown}
                      hint="Added, never emailed"
                    />
                    <Stat
                      label="Skipped"
                      value={
                        preview.counts.invalid + preview.counts.duplicatesInFile
                      }
                      hint={`${preview.counts.invalid} invalid, ${preview.counts.duplicatesInFile} repeated`}
                      tone={preview.counts.invalid > 0 ? "red" : undefined}
                    />
                  </div>
                </div>

                {preview.sample.length > 0 && (
                  <div>
                    <h3 className="mb-3 font-medium">First few contacts</h3>
                    <div className="overflow-x-auto rounded-lg border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Email</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Status in file</TableHead>
                            <TableHead>Note</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {preview.sample.map((row) => (
                            <TableRow key={row.email}>
                              <TableCell className="font-medium">
                                {row.email}
                              </TableCell>
                              <TableCell>
                                {[row.firstName, row.lastName]
                                  .filter(Boolean)
                                  .join(" ") || (
                                  <span className="text-muted-foreground">
                                    —
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    row.status === "subscribed"
                                      ? "success"
                                      : row.status === "unsubscribed"
                                        ? "secondary"
                                        : "outline"
                                  }
                                >
                                  {row.status === "subscribed"
                                    ? "Subscribed"
                                    : row.status === "unsubscribed"
                                      ? "Unsubscribed"
                                      : "Unknown"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {row.alreadyCustomer
                                  ? "Already a customer"
                                  : row.onDoNotEmail
                                    ? "Blocked from marketing"
                                    : ""}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                {preview.errorCount > 0 && (
                  <Alert variant="destructive">
                    <AlertCircle aria-hidden="true" />
                    <AlertTitle>
                      {preview.errorCount.toLocaleString()}{" "}
                      {preview.errorCount === 1 ? "row has" : "rows have"} a
                      problem and will be skipped
                    </AlertTitle>
                    <AlertDescription>
                      <ul className="mt-1 max-h-40 space-y-1 overflow-y-auto text-sm">
                        {preview.errors.slice(0, 5).map((err) => (
                          <li key={err.row}>
                            Row {err.row}: {err.message}
                          </li>
                        ))}
                      </ul>
                      {preview.errorCount > 5 && (
                        <p className="mt-2 text-sm">
                          …and {(preview.errorCount - 5).toLocaleString()} more
                        </p>
                      )}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex flex-wrap justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={reset}
                    disabled={commit.isPending}
                  >
                    Choose a different file
                  </Button>
                  <Button
                    disabled={!canCommit}
                    onClick={() =>
                      commit.mutate({
                        csvContent: csv,
                        columnMap: mapForServer,
                        fileStatus: preview.hasStatusColumn
                          ? undefined
                          : toServerFileStatus(fileStatus),
                        fileName,
                      })
                    }
                  >
                    {commit.isPending ? (
                      <>
                        <Loader2
                          aria-hidden="true"
                          className="mr-2 h-4 w-4 animate-spin"
                        />
                        Importing…
                      </>
                    ) : (
                      // Existing customers are left alone, so count only the
                      // rows this import will actually add.
                      preview.counts.created > 0
                        ? `Import ${preview.counts.created.toLocaleString()} new ${preview.counts.created === 1 ? "contact" : "contacts"}`
                        : "Import"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {step === "invite" && importId && (
          <div className="space-y-6">
            {committed && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle
                      aria-hidden="true"
                      className="h-5 w-5 text-green-600"
                    />
                    Contacts imported
                  </CardTitle>
                  <CardDescription>
                    None of them have been added to your email list.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    <Stat
                      label="Added"
                      value={committed.created}
                      tone="green"
                    />
                    <Stat
                      label="Already customers"
                      value={committed.matchedExisting}
                      hint="Left unchanged"
                    />
                    <Stat
                      label="Blocked for good"
                      value={committed.unsubscribed}
                      hint="Unsubscribed on the old site"
                    />
                    <Stat
                      label="Can be invited"
                      value={committed.inviteEligible}
                      tone="blue"
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            <InviteCard
              importId={importId}
              businessName={businessName}
              hasPostalAddress={hasPostalAddress}
            />

            <div className="flex flex-wrap justify-end gap-3">
              <Button variant="outline" asChild>
                <Link href="/admin/customers/import/history">
                  Import history
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/admin/customers">Go to Customers</Link>
              </Button>
              {!initialImportId && (
                <Button variant="outline" onClick={reset}>
                  Import another file
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ColumnSelect({
  id,
  label,
  headers,
  value,
  allowNone = true,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  headers: string[];
  value: string | null;
  allowNone?: boolean;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Select
        value={value ?? (allowNone ? NONE : "")}
        onValueChange={onChange}
        disabled={disabled}
      >
        <SelectTrigger id={id} className="w-full">
          <SelectValue placeholder="Pick a column" />
        </SelectTrigger>
        <SelectContent>
          {allowNone && <SelectItem value={NONE}>None</SelectItem>}
          {headers.map((h) => (
            <SelectItem key={h} value={h}>
              {h}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: number;
  hint?: string;
  tone?: "green" | "blue" | "red";
}) {
  const toneClass =
    tone === "green"
      ? "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300"
      : tone === "blue"
        ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
        : tone === "red"
          ? "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
          : "bg-muted";
  return (
    <div className={`rounded-lg p-4 ${toneClass}`}>
      <p className="text-sm">{label}</p>
      <p className="text-2xl font-bold tabular-nums">
        {value.toLocaleString()}
      </p>
      {hint && <p className="mt-0.5 text-xs opacity-80">{hint}</p>}
    </div>
  );
}

function StepMarker({
  number,
  label,
  active,
  completed,
}: {
  number: number;
  label: string;
  active: boolean;
  completed: boolean;
}) {
  return (
    <li
      className="flex items-center gap-2"
      aria-current={active ? "step" : undefined}
    >
      <span
        className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${completed ? "bg-green-600 text-white" : active ? "bg-blue-600 text-white" : "bg-muted text-muted-foreground"}`}
      >
        {completed ? (
          <CheckCircle aria-hidden="true" className="h-5 w-5" />
        ) : (
          number
        )}
      </span>
      <span
        className={`text-sm ${active ? "font-medium" : "text-muted-foreground"}`}
      >
        {label}
      </span>
    </li>
  );
}
