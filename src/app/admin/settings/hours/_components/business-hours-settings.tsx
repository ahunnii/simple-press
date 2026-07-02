"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import type { DayCode } from "~/lib/business-hours";
import type { RouterOutputs } from "~/trpc/react";
import {
  DAY_CODES,
  formatBusinessHours,
  parseBusinessHours,
} from "~/lib/business-hours";
import { cn } from "~/lib/utils";
import { businessHoursSchema } from "~/lib/validators/business-hours";
import { api } from "~/trpc/react";
import { useDirtyForm } from "~/hooks/use-dirty-form";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { Switch } from "~/components/ui/switch";

// ─── Types ────────────────────────────────────────────────────────────────────

type Business = NonNullable<RouterOutputs["business"]["getWith"]>;

type Props = {
  business: Business;
};

// ─── Form schema wrapper ──────────────────────────────────────────────────────

const formSchema = z.object({ rows: businessHoursSchema });
type FormValues = z.infer<typeof formSchema>;

// ─── Day label map ────────────────────────────────────────────────────────────

const DAY_LABEL: Record<DayCode, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function BusinessHoursSettings({ business }: Props) {
  const router = useRouter();
  const utils = api.useUtils();

  // ── Form setup ────────────────────────────────────────────────────────────
  const initial = parseBusinessHours(business.businessHours);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: {
      rows: initial.length
        ? initial
        : [
            {
              days: ["mon", "tue", "wed", "thu", "fri"],
              closed: false,
              open: "09:00",
              close: "17:00",
            },
          ],
    },
  });

  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: "rows",
  });

  const watchedRows = form.watch("rows");
  const isDirty = form.formState.isDirty;
  const isSubmitting = form.formState.isSubmitting;

  useDirtyForm(isDirty);

  // ── Mutation ──────────────────────────────────────────────────────────────
  const mutation = api.business.updateBusinessHours.useMutation({
    onMutate: () => toast.loading("Saving business hours..."),
    onSuccess: () => {
      toast.dismiss();
      toast.success("Business hours saved");
      form.reset(form.getValues());
      void utils.business.invalidate();
      router.refresh();
    },
    onError: (error) => {
      toast.dismiss();
      toast.error(error.message ?? "Failed to save business hours");
    },
  });

  // ── Submit ────────────────────────────────────────────────────────────────
  const onSubmit = (data: FormValues) => {
    mutation.mutate({ businessHours: data.rows });
  };

  const handleToolbarSave = () => {
    void form.handleSubmit(onSubmit)();
  };

  const isPending = mutation.isPending || isSubmitting;

  // ── Preview ───────────────────────────────────────────────────────────────
  const preview = formatBusinessHours(
    (watchedRows ?? []).map((r) => ({
      ...r,
      days: r.days ?? [],
      open: r.open ?? null,
      close: r.close ?? null,
    })),
  );

  return (
    <div className="bg-muted min-h-screen">
      {/* Toolbar */}
      <div className={cn("admin-form-toolbar", isDirty ? "dirty" : "")}>
        <div className="toolbar-info">
          <Button variant="ghost" size="sm" asChild className="shrink-0">
            <Link href="/admin/settings">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
          <div className="bg-border hidden h-6 w-px shrink-0 sm:block" />
          <div className="hidden min-w-0 items-center gap-2 sm:flex">
            <h1 className="text-base font-medium">Business Hours</h1>
            <span
              className={`admin-status-badge ${
                isDirty ? "isDirty" : "isPublished"
              }`}
            >
              {isDirty ? "Unsaved Changes" : "Saved"}
            </span>
          </div>
        </div>
        <div className="toolbar-actions">
          <Button
            type="button"
            size="sm"
            disabled={isPending}
            onClick={handleToolbarSave}
          >
            {isPending ? (
              <>
                <span className="saving-indicator" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Save changes</span>
                <span className="sm:hidden">Save</span>
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="admin-container">
        <Form {...form}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleToolbarSave();
            }}
            className="space-y-6"
          >
            {/* Hours rows editor */}
            <Card>
              <CardHeader>
                <CardTitle>Business Hours</CardTitle>
                <CardDescription>
                  Shown on your storefront contact page and embedded as
                  structured data (schema.org openingHoursSpecification) so
                  search engines can display your hours directly in search
                  results. Each row can cover one or more days, but a day can
                  only belong to one row — rows display on your storefront in
                  the order listed below.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {fields.length === 0 && (
                  <p className="text-muted-foreground text-sm">
                    No hours configured yet. Add a row to get started.
                  </p>
                )}

                {fields.map((field, i) => {
                  const isClosed = watchedRows?.[i]?.closed ?? false;

                  return (
                    <div
                      key={field.id}
                      className="bg-card space-y-4 rounded-lg border p-4"
                    >
                      {/* Row header: reorder + remove */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-muted-foreground text-sm font-medium">
                          Row {i + 1}
                        </span>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            disabled={i === 0}
                            onClick={() => move(i, i - 1)}
                            aria-label="Move row up"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            disabled={i === fields.length - 1}
                            onClick={() => move(i, i + 1)}
                            aria-label="Move row down"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive h-7 w-7"
                            onClick={() => remove(i)}
                            aria-label="Remove row"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Day toggles */}
                      <FormField
                        control={form.control}
                        name={`rows.${i}.days`}
                        render={({ field: daysField }) => (
                          <FormItem>
                            <FormLabel className="text-muted-foreground text-xs tracking-wide uppercase">
                              Days
                            </FormLabel>
                            <FormControl>
                              <div className="flex flex-wrap gap-1.5">
                                {DAY_CODES.map((day) => {
                                  const selected =
                                    daysField.value.includes(day);
                                  return (
                                    <button
                                      key={day}
                                      type="button"
                                      aria-pressed={selected}
                                      onClick={() => {
                                        const current = daysField.value;
                                        const next = selected
                                          ? current.filter((d) => d !== day)
                                          : [...current, day];
                                        daysField.onChange(next);
                                      }}
                                      className={cn(
                                        "rounded-md px-2.5 py-1 text-sm font-medium transition-colors",
                                        "focus-visible:ring-ring border focus-visible:ring-2 focus-visible:outline-none",
                                        selected
                                          ? "bg-primary text-primary-foreground border-primary"
                                          : "bg-background text-muted-foreground border-input hover:bg-accent hover:text-accent-foreground",
                                      )}
                                    >
                                      {DAY_LABEL[day]}
                                    </button>
                                  );
                                })}
                              </div>
                            </FormControl>
                            <FormDescription>
                              Select the days this row applies to. A day can
                              only belong to one row — adding it here doesn&apos;t
                              remove it from another row, so doing so will
                              flag a conflict below when you save.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Closed toggle */}
                      <FormField
                        control={form.control}
                        name={`rows.${i}.closed`}
                        render={({ field: closedField }) => (
                          <FormItem className="gap-1">
                            <div className="flex flex-row items-center gap-3">
                              <FormControl>
                                <Switch
                                  checked={closedField.value}
                                  onCheckedChange={(checked) => {
                                    closedField.onChange(checked);
                                    if (checked) {
                                      form.setValue(`rows.${i}.open`, null, {
                                        shouldDirty: true,
                                      });
                                      form.setValue(`rows.${i}.close`, null, {
                                        shouldDirty: true,
                                      });
                                    }
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="!mt-0 cursor-pointer font-normal">
                                Closed
                              </FormLabel>
                            </div>
                            <FormDescription>
                              Clears the open/close times for this row.
                              Closed days are labeled &quot;Closed&quot; in the
                              storefront preview below, but are left out of
                              the structured data search engines read — so
                              they won&apos;t appear as explicitly closed in
                              search results, just absent.
                            </FormDescription>
                          </FormItem>
                        )}
                      />

                      {/* Time inputs — hidden when closed */}
                      {!isClosed && (
                        <div className="flex flex-wrap items-start gap-4">
                          <FormField
                            control={form.control}
                            name={`rows.${i}.open`}
                            render={({ field: openField }) => (
                              <FormItem className="min-w-[140px] flex-1">
                                <FormLabel>Opens</FormLabel>
                                <FormControl>
                                  <Input
                                    type="time"
                                    value={openField.value ?? ""}
                                    onChange={(e) =>
                                      openField.onChange(e.target.value || null)
                                    }
                                    disabled={isClosed}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`rows.${i}.close`}
                            render={({ field: closeField }) => (
                              <FormItem className="min-w-[140px] flex-1">
                                <FormLabel>Closes</FormLabel>
                                <FormControl>
                                  <Input
                                    type="time"
                                    value={closeField.value ?? ""}
                                    onChange={(e) =>
                                      closeField.onChange(
                                        e.target.value || null,
                                      )
                                    }
                                    disabled={isClosed}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      )}

                      {/* Row-level errors (days array duplicate, etc.) */}
                      {form.formState.errors.rows?.[i]?.days && (
                        <p className="text-destructive text-sm font-medium">
                          {form.formState.errors.rows[i]?.days?.message}
                        </p>
                      )}
                    </div>
                  );
                })}

                {/* Array-level root error (duplicate days across rows) */}
                {form.formState.errors.rows?.root?.message && (
                  <p className="text-destructive text-sm font-medium">
                    {form.formState.errors.rows.root.message}
                  </p>
                )}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    append({
                      days: [],
                      closed: false,
                      open: "09:00",
                      close: "17:00",
                    })
                  }
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add hours row
                </Button>
              </CardContent>
            </Card>

            {/* Live preview */}
            {preview.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Preview</CardTitle>
                  <CardDescription>
                    How your hours will appear on the storefront.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <dl className="space-y-1.5">
                    {preview.map(({ label, value }) => (
                      <div key={label} className="flex gap-4 text-sm">
                        <dt className="w-28 shrink-0 font-medium">{label}</dt>
                        <dd className="text-muted-foreground">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </CardContent>
              </Card>
            )}
          </form>
        </Form>
      </div>
    </div>
  );
}
