"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, FileText, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";

import type { FormBuilderValues } from "./builder-shared";
import type { AdminFormMoreMenuItem } from "~/app/admin/_components/admin-form-more-menu";
import type { FormFieldType } from "~/lib/validators/form";
import { applyTrpcErrorToForm } from "~/lib/forms/apply-trpc-error";
import { cn } from "~/lib/utils";
import { formCreateSchema } from "~/lib/validators/form";
import { api } from "~/trpc/react";
import { useDirtyForm } from "~/hooks/use-dirty-form";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Form, FormField, FormItem, FormMessage } from "~/components/ui/form";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import { InputFormField } from "~/components/inputs/input-form-field";
import { SaveFormButton } from "~/components/shared/save-form-button";
import { AdminFormMoreMenu } from "~/app/admin/_components/admin-form-more-menu";

import { AdminEmpty } from "../../_components/admin-empty";
import {
  dismissLoadingToast,
  loadingToast,
} from "../../_lib/admin-mutation-toast";
import {
  convertFieldType,
  FIELD_TYPE_META,
  FIELD_TYPE_ORDER,
  makeEmptyBuilderDefinition,
  makeField,
  normalizeBuilderDefinition,
} from "./builder-shared";
import { FormFieldCard } from "./form-field-card";
import { FormPreviewPanel } from "./form-preview-panel";
import { FormSettingsCard } from "./form-settings-card";

const LIST_PATH = "/admin/forms";
const MAX_FIELDS = 50;

type Props = {
  /** Present in edit mode, absent when creating. */
  form?: {
    id: string;
    name: string;
    published: boolean;
    definition: FormBuilderValues["definition"];
    totalEntries: number;
  };
};

export function FormBuilder({ form: existingForm }: Props) {
  const router = useRouter();
  const utils = api.useUtils();

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [openFieldIds, setOpenFieldIds] = useState<string[]>([]);

  // Placeholder text only — never required for the form to save. `business.get`
  // is the general-purpose business read every settings surface already uses;
  // nothing here needs more than `supportEmail` off it.
  const { data: business } = api.business.get.useQuery();

  const rhf = useForm<FormBuilderValues>({
    resolver: zodResolver(formCreateSchema),
    mode: "onTouched",
    defaultValues: {
      name: existingForm?.name ?? "",
      published: existingForm?.published ?? false,
      definition: existingForm
        ? normalizeBuilderDefinition(existingForm.definition)
        : makeEmptyBuilderDefinition(),
    },
  });

  const {
    fields: fieldRows,
    append: appendField,
    remove: removeField,
    move: moveField,
    insert: insertField,
  } = useFieldArray({ control: rhf.control, name: "definition.fields" });

  const watchedFields = rhf.watch("definition.fields") ?? [];
  const confirmationFieldId = rhf.watch(
    "definition.settings.confirmationFieldId",
  );
  const confirmationMessage =
    rhf.watch("definition.settings.confirmationMessage") ?? "";
  const successMessage = rhf.watch("definition.settings.successMessage") ?? "";
  const published = rhf.watch("published") ?? false;
  const watchedDefinition = rhf.watch("definition");

  // ── Field mutations ───────────────────────────────────────────────────────

  const addField = (type: FormFieldType) => {
    const field = makeField(type);
    appendField(field);
    setOpenFieldIds((previous) => [...previous, field.id]);
  };

  const duplicateField = (index: number) => {
    const source = watchedFields[index];
    if (!source) return;
    // " (copy)" avoids an immediate duplicate-label error — labels are a key
    // (see the note atop src/lib/validators/form.ts), so an exact copy of the
    // label would fail validation the moment it's added.
    const copy = {
      ...source,
      id: crypto.randomUUID(),
      label: source.label.trim() ? `${source.label} (copy)` : "",
    };
    insertField(index + 1, copy);
    setOpenFieldIds((previous) => [...previous, copy.id]);
  };

  const changeFieldType = (index: number, nextType: FormFieldType) => {
    const definition = rhf.getValues("definition");
    const field = definition.fields[index];
    if (!field) return;

    const next = convertFieldType(field, nextType);
    rhf.setValue(`definition.fields.${index}`, next, {
      shouldDirty: true,
      shouldValidate: rhf.formState.isSubmitted,
    });
    // A confirmation target that stops being an email field must be
    // cleared, mirroring what `ChangeTypeDialog` told the owner would
    // happen.
    if (
      rhf.getValues("definition.settings.confirmationFieldId") === field.id &&
      nextType !== "email"
    ) {
      rhf.setValue("definition.settings.confirmationFieldId", null, {
        shouldDirty: true,
      });
    }
  };

  // ── Mutations ──────────────────────────────────────────────────────────────

  const createMutation = api.form.create.useMutation({
    onMutate: loadingToast("Creating form…"),
    onSuccess: (data, _variables, context) => {
      dismissLoadingToast(context);
      toast.success("Form created");
      void utils.form.invalidate();
      rhf.reset(rhf.getValues());
      router.push(`${LIST_PATH}/${data.id}`);
    },
    onError: (error, _variables, context) => {
      dismissLoadingToast(context);
      applyTrpcErrorToForm(rhf, error, {
        fallbackMessage: "Failed to create form",
      });
    },
  });

  const updateMutation = api.form.update.useMutation({
    onMutate: loadingToast("Saving form…"),
    onSuccess: (data, _variables, context) => {
      dismissLoadingToast(context);
      toast.success("Form saved");
      void utils.form.invalidate();
      rhf.reset({
        name: data.name,
        published: data.published,
        definition: rhf.getValues("definition"),
      });
      router.refresh();
    },
    onError: (error, _variables, context) => {
      dismissLoadingToast(context);
      applyTrpcErrorToForm(rhf, error, {
        fallbackMessage: "Failed to save form",
      });
    },
  });

  const deleteMutation = api.form.delete.useMutation({
    onMutate: loadingToast("Deleting form…"),
    onSuccess: (_data, _variables, context) => {
      dismissLoadingToast(context);
      toast.success("Form deleted");
      setShowDeleteDialog(false);
      void utils.form.invalidate();
      rhf.reset(rhf.getValues());
      router.push(LIST_PATH);
      router.refresh();
    },
    onError: (error, _variables, context) => {
      dismissLoadingToast(context);
      toast.error(error.message ?? "Failed to delete form");
    },
  });

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const isDeleting = deleteMutation.isPending;
  const isDirty = rhf.formState.isDirty;

  useDirtyForm(isDirty);

  const onSubmit = (values: FormBuilderValues) => {
    const parsed = formCreateSchema.parse(values);
    if (existingForm) {
      updateMutation.mutate({ id: existingForm.id, ...parsed });
    } else {
      createMutation.mutate(parsed);
    }
  };

  const moreMenuItems: AdminFormMoreMenuItem[] = [
    {
      label: "Reset",
      icon: RotateCcw,
      disabled: isSubmitting || !isDirty,
      onSelect: () => rhf.reset(),
    },
    ...(existingForm
      ? [
          {
            label: "Delete",
            icon: Trash2,
            destructive: true,
            disabled: isSubmitting || isDeleting,
            onSelect: () => setShowDeleteDialog(true),
          } satisfies AdminFormMoreMenuItem,
        ]
      : []),
  ];

  return (
    <Form {...rhf}>
      <form
        onSubmit={(event) =>
          void rhf.handleSubmit(onSubmit, () => {
            toast.error("Please fix the highlighted fields and try again.");
          })(event)
        }
        className="bg-muted/40 min-h-screen"
      >
        <div className={cn("admin-form-toolbar", isDirty ? "dirty" : "")}>
          <div className="toolbar-info">
            <Button variant="ghost" size="sm" asChild className="shrink-0">
              <Link href={LIST_PATH}>
                <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
                Back
              </Link>
            </Button>
            <div className="bg-border hidden h-6 w-px shrink-0 sm:block" />
            <div className="hidden min-w-0 flex-1 basis-0 items-center gap-2 sm:flex">
              <h1 className="truncate text-base font-medium">
                {existingForm ? rhf.watch("name") || "Edit form" : "New form"}
              </h1>
              <span
                className={cn(
                  "admin-status-badge shrink-0",
                  isDirty
                    ? "isDirty"
                    : existingForm && published
                      ? "isPublished"
                      : "isDraft",
                )}
              >
                {isDirty
                  ? "Unsaved Changes"
                  : !existingForm
                    ? "Draft"
                    : published
                      ? "Published"
                      : "Unpublished"}
              </span>
            </div>
          </div>

          <div className="toolbar-actions">
            <FormField
              control={rhf.control}
              name="published"
              render={({ field }) => (
                <div className="flex shrink-0 items-center gap-2">
                  <Label htmlFor="form-published" className="text-sm">
                    Published
                  </Label>
                  <Switch
                    id="form-published"
                    aria-label="Published"
                    checked={field.value ?? false}
                    onCheckedChange={field.onChange}
                  />
                </div>
              )}
            />

            <AdminFormMoreMenu items={moreMenuItems} />

            <SaveFormButton disabled={isSubmitting} isSaving={isSubmitting} />
          </div>
        </div>

        <div className="admin-container space-y-6">
          {existingForm && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <Link
                href={`${LIST_PATH}/${existingForm.id}/entries`}
                className="text-primary hover:underline"
              >
                View entries ({existingForm.totalEntries})
              </Link>
              <span className="text-muted-foreground">
                How to embed: insert it into any page via the editor&apos;s
                Insert → Form.
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
            {/* Left: what the visitor fills out. */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Form</CardTitle>
                  <CardDescription>
                    Only you see this name — it labels the form in the admin.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <InputFormField
                    form={rhf}
                    name="name"
                    label="Name"
                    required
                    placeholder="e.g. Contact us"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <CardTitle>Fields</CardTitle>
                      <CardDescription>
                        What the visitor answers, in order.
                      </CardDescription>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          size="sm"
                          disabled={fieldRows.length >= MAX_FIELDS}
                        >
                          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                          Add field
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-72">
                        <DropdownMenuLabel>Field type</DropdownMenuLabel>
                        {FIELD_TYPE_ORDER.map((type) => (
                          <DropdownMenuItem
                            key={type}
                            onClick={() => addField(type)}
                            className="flex-col items-start gap-0.5"
                          >
                            <span className="font-medium">
                              {FIELD_TYPE_META[type].label}
                            </span>
                            <span className="text-muted-foreground text-xs whitespace-normal">
                              {FIELD_TYPE_META[type].hint}
                            </span>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  {fieldRows.length === 0 ? (
                    <AdminEmpty
                      icon={FileText}
                      title="No fields yet"
                      description="Add the first field visitors will fill out."
                    />
                  ) : (
                    <div className="space-y-3">
                      {fieldRows.map((row, index) => {
                        const field = watchedFields[index];
                        if (!field) return null;

                        return (
                          <FormFieldCard
                            key={row.id}
                            form={rhf}
                            base={`definition.fields.${index}`}
                            index={index}
                            field={field}
                            confirmationFieldId={confirmationFieldId}
                            open={openFieldIds.includes(field.id)}
                            onOpenChange={(next) =>
                              setOpenFieldIds((previous) =>
                                next
                                  ? [...previous, field.id]
                                  : previous.filter((id) => id !== field.id),
                              )
                            }
                            onRemove={() => removeField(index)}
                            onDuplicate={() => duplicateField(index)}
                            onMoveUp={() => moveField(index, index - 1)}
                            onMoveDown={() => moveField(index, index + 1)}
                            isFirst={index === 0}
                            isLast={index === fieldRows.length - 1}
                            onChangeType={(nextType) =>
                              changeFieldType(index, nextType)
                            }
                          />
                        );
                      })}
                    </div>
                  )}

                  {/* Array-level errors ("Add at least one field", "at most
                      50 fields") attach to `fields` itself. */}
                  <FormField
                    control={rhf.control}
                    name="definition.fields"
                    render={() => (
                      <FormItem>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Right: what happens after, and a live preview. */}
            <div className="space-y-6 xl:sticky xl:top-24">
              <FormPreviewPanel
                definition={watchedDefinition}
                formId={existingForm?.id ?? "preview"}
              />

              <FormSettingsCard
                form={rhf}
                fields={watchedFields}
                confirmationFieldId={confirmationFieldId}
                confirmationMessage={confirmationMessage}
                successMessage={successMessage}
                defaultNotifyEmail={business?.supportEmail ?? null}
              />
            </div>
          </div>
        </div>
      </form>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {`Delete “${existingForm?.name ?? "this form"}”?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {existingForm && existingForm.totalEntries > 0
                ? `This permanently deletes the form and all ${existingForm.totalEntries} ${
                    existingForm.totalEntries === 1 ? "entry" : "entries"
                  } it collected. Export your entries first if you want to keep them. Any page embedding this form will stop showing it.`
                : "This permanently deletes the form. Any page embedding this form will stop showing it."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={(event) => {
                event.preventDefault();
                if (existingForm) deleteMutation.mutate({ id: existingForm.id });
              }}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Form>
  );
}
