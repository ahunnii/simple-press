"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import type { GroupDraft, ValueDraft } from "./option-editor-types";
import { CUSTOMIZER_MAX_VALUES_PER_GROUP } from "~/lib/customizer/types";
import {
  optionGroupInputSchema,
  optionValueInputSchema,
} from "~/lib/validators/product-options";
import { api } from "~/trpc/react";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { MoneyInput } from "~/components/ui/money-input";
import { NumberInput } from "~/components/ui/number-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Skeleton } from "~/components/ui/skeleton";
import { Switch } from "~/components/ui/switch";
import { Textarea } from "~/components/ui/textarea";

import {
  emptyGroupDraft,
  emptyValueDraft,
  groupToDraft,
  toGroupPayload,
} from "./option-editor-types";
import { OptionValueRow } from "./option-value-row";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** `null` creates a new group. */
  groupId: string | null;
  mediaLibraryEnabled?: boolean;
  /** Called with the saved group's id after a successful save. */
  onSaved: (groupId: string, isNew: boolean) => void;
  onDeleted?: (groupId: string) => void;
};

/**
 * Create / edit one option group and its choices. Saves through
 * `productOption.upsertGroup` (one transaction) — never through the product
 * form. Plain `div`s and `type="button"` everywhere: the dialog is portaled,
 * but React events still bubble to the product `<form>` above it.
 */
export function OptionGroupEditor({
  open,
  onOpenChange,
  groupId,
  mediaLibraryEnabled,
  onSaved,
  onDeleted,
}: Props) {
  const existing = api.productOption.getGroup.useQuery(
    { id: groupId ?? "" },
    { enabled: open && groupId != null, gcTime: 0 },
  );

  const loading = groupId != null && existing.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 p-0 sm:max-w-3xl">
        {loading ? (
          <div className="space-y-4 p-6">
            <DialogHeader>
              <DialogTitle>Loading option…</DialogTitle>
              <DialogDescription className="sr-only">
                Loading this option group.
              </DialogDescription>
            </DialogHeader>
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-2/3" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : existing.isError ? (
          <div className="space-y-4 p-6">
            <DialogHeader>
              <DialogTitle>Couldn&apos;t load this option</DialogTitle>
              <DialogDescription>{existing.error.message}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Close
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <EditorBody
            key={groupId ?? "new"}
            initial={
              existing.data
                ? groupToDraft(existing.data)
                : { group: emptyGroupDraft(), values: [emptyValueDraft()] }
            }
            attachedProductCount={existing.data?.productCount ?? 0}
            mediaLibraryEnabled={mediaLibraryEnabled}
            onClose={() => onOpenChange(false)}
            onSaved={onSaved}
            onDeleted={onDeleted}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

type Errors = {
  summary: string | null;
  group: Partial<Record<string, string>>;
  values: Record<string, string>;
};

function validate(group: GroupDraft, values: ValueDraft[]): Errors {
  const errors: Errors = { summary: null, group: {}, values: {} };
  const payload = toGroupPayload(group, values);

  const parsedGroup = optionGroupInputSchema.safeParse(payload.group);
  if (!parsedGroup.success) {
    for (const issue of parsedGroup.error.issues) {
      const field = String(issue.path[0] ?? "name");
      errors.group[field] ??= issue.message;
    }
  }

  if (group.kind === "choice") {
    if (values.length === 0) {
      errors.summary = "Add at least one choice.";
    } else if (group.minSelections > values.length) {
      errors.group.minSelections =
        "Minimum picks can't be more than the number of choices";
    }
    values.forEach((value, index) => {
      const parsed = optionValueInputSchema.safeParse(payload.values[index]);
      if (!parsed.success) {
        errors.values[value.key] =
          parsed.error.issues[0]?.message ?? "Check this choice";
        return;
      }
      if (value.mode === "product") {
        if (!value.linked) {
          errors.values[value.key] =
            "Choose a product, or switch to an add-on price";
        } else if (
          value.linked.variants.length > 0 &&
          !value.linked.variantId
        ) {
          errors.values[value.key] =
            "This product has variants. Choose which one to use";
        }
      }
    });
  }

  const count =
    Object.keys(errors.group).length + Object.keys(errors.values).length;
  if (count > 0 && !errors.summary) {
    errors.summary =
      count === 1
        ? "Fix the highlighted problem and save again."
        : `Fix the ${count} highlighted problems and save again.`;
  }
  return errors;
}

const NO_ERRORS: Errors = { summary: null, group: {}, values: {} };

function EditorBody({
  initial,
  attachedProductCount,
  mediaLibraryEnabled,
  onClose,
  onSaved,
  onDeleted,
}: {
  initial: { group: GroupDraft; values: ValueDraft[] };
  attachedProductCount: number;
  mediaLibraryEnabled?: boolean;
  onClose: () => void;
  onSaved: (groupId: string, isNew: boolean) => void;
  onDeleted?: (groupId: string) => void;
}) {
  const utils = api.useUtils();
  const [group, setGroup] = useState<GroupDraft>(initial.group);
  const [values, setValues] = useState<ValueDraft[]>(initial.values);
  const [errors, setErrors] = useState<Errors>(NO_ERRORS);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isNew = group.id == null;
  const isText = group.kind === "text";

  const patchGroup = (patch: Partial<GroupDraft>) =>
    setGroup((previous) => ({ ...previous, ...patch }));
  const patchValue = (key: string, patch: Partial<ValueDraft>) =>
    setValues((previous) =>
      previous.map((value) =>
        value.key === key ? { ...value, ...patch } : value,
      ),
    );
  const moveValue = (index: number, direction: -1 | 1) =>
    setValues((previous) => {
      const next = [...previous];
      const target = index + direction;
      if (target < 0 || target >= next.length) return previous;
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });

  const save = api.productOption.upsertGroup.useMutation({
    onSuccess: async ({ id }) => {
      await utils.productOption.invalidate();
      toast.success(isNew ? "Option created" : "Option saved");
      onSaved(id, isNew);
      onClose();
    },
    onError: (error) =>
      toast.error(error.message || "Couldn't save this option"),
  });

  const remove = api.productOption.deleteGroup.useMutation({
    onSuccess: async () => {
      await utils.productOption.invalidate();
      toast.success("Option deleted");
      if (group.id) onDeleted?.(group.id);
      setConfirmDelete(false);
      onClose();
    },
    onError: (error) =>
      toast.error(error.message || "Couldn't delete this option"),
  });

  const handleSave = () => {
    const found = validate(group, values);
    setErrors(found);
    if (found.summary) return;
    save.mutate(toGroupPayload(group, values));
  };

  const maxValues = CUSTOMIZER_MAX_VALUES_PER_GROUP;
  const busy = save.isPending || remove.isPending;

  return (
    <>
      <DialogHeader className="border-b p-6 pb-4">
        <DialogTitle>{isNew ? "New option" : "Edit option"}</DialogTitle>
        <DialogDescription>
          An option is something customers choose or type before adding this
          product to their cart, like a color, a charm or an engraving. You can
          use the same option on more than one product.
        </DialogDescription>
      </DialogHeader>

      <div className="flex-1 space-y-6 overflow-y-auto p-6">
        {errors.summary && (
          <Alert variant="destructive" role="alert">
            <AlertTitle>Can&apos;t save yet</AlertTitle>
            <AlertDescription>{errors.summary}</AlertDescription>
          </Alert>
        )}

        {!isNew && attachedProductCount > 1 && (
          <Alert>
            <AlertTitle>Shared option</AlertTitle>
            <AlertDescription>
              Changes here apply to all {attachedProductCount} products that use
              this option.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="option-name"
            label="Name"
            hint="What customers see, like “Charms” or “Engraving”."
            error={errors.group.name}
          >
            <Input
              id="option-name"
              value={group.name}
              maxLength={80}
              aria-invalid={errors.group.name ? true : undefined}
              onChange={(event) => patchGroup({ name: event.target.value })}
            />
          </Field>
          <Field
            id="option-admin-label"
            label="Internal label (optional)"
            hint="Only you see this. Handy if two options share a name."
            error={errors.group.adminLabel}
          >
            <Input
              id="option-admin-label"
              value={group.adminLabel}
              maxLength={80}
              onChange={(event) =>
                patchGroup({ adminLabel: event.target.value })
              }
            />
          </Field>
        </div>

        <Field
          id="option-help"
          label="Help text (optional)"
          hint="A short note shown under the name."
          error={errors.group.helpText}
        >
          <Textarea
            id="option-help"
            value={group.helpText}
            maxLength={300}
            rows={2}
            onChange={(event) => patchGroup({ helpText: event.target.value })}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="option-kind" label="What do customers do?">
            <Select
              value={group.kind}
              onValueChange={(kind) =>
                patchGroup({ kind: kind as GroupDraft["kind"] })
              }
            >
              <SelectTrigger id="option-kind" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="choice">Pick from choices</SelectItem>
                <SelectItem value="text">Type some text</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <div className="flex items-center gap-3 self-end pb-2">
            <Switch
              id="option-required"
              checked={group.required}
              onCheckedChange={(required) => patchGroup({ required })}
            />
            <Label htmlFor="option-required" className="font-normal">
              Customers must answer this
            </Label>
          </div>
        </div>

        {isText ? (
          <fieldset className="space-y-4 rounded-lg border p-4">
            <legend className="px-1 text-sm font-medium">Text box</legend>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field
                id="option-max-length"
                label="Longest answer"
                hint="Characters allowed."
                error={errors.group.maxLength}
              >
                <NumberInput
                  id="option-max-length"
                  min="1"
                  step="1"
                  value={group.maxLength}
                  onChange={(maxLength) => patchGroup({ maxLength })}
                />
              </Field>
              <Field
                id="option-placeholder"
                label="Example text"
                hint="Faded hint inside the box."
                error={errors.group.placeholder}
              >
                <Input
                  id="option-placeholder"
                  value={group.placeholder}
                  maxLength={120}
                  onChange={(event) =>
                    patchGroup({ placeholder: event.target.value })
                  }
                />
              </Field>
              <Field
                id="option-text-price"
                label="Extra charge"
                hint="Added only when they type something."
                error={errors.group.textPriceCents}
              >
                <MoneyInput
                  id="option-text-price"
                  value={group.textPriceDollars}
                  onChange={(textPriceDollars) =>
                    patchGroup({ textPriceDollars })
                  }
                  placeholder="0.00"
                />
              </Field>
            </div>
          </fieldset>
        ) : (
          <>
            <fieldset className="space-y-4 rounded-lg border p-4">
              <legend className="px-1 text-sm font-medium">
                How many can they pick?
              </legend>
              <div className="grid gap-4 sm:grid-cols-4">
                <Field
                  id="option-min"
                  label="At least"
                  error={errors.group.minSelections}
                >
                  <NumberInput
                    id="option-min"
                    min="0"
                    step="1"
                    value={group.minSelections}
                    onChange={(value) =>
                      patchGroup({ minSelections: value ?? 0 })
                    }
                  />
                </Field>
                <Field
                  id="option-max"
                  label="At most"
                  error={errors.group.maxSelections}
                >
                  <NumberInput
                    id="option-max"
                    min="1"
                    step="1"
                    value={group.maxSelections}
                    onChange={(value) =>
                      patchGroup({ maxSelections: value ?? 1 })
                    }
                  />
                </Field>
                <Field
                  id="option-included"
                  label="First ones free"
                  hint="Their cheapest picks cost nothing."
                  error={errors.group.includedCount}
                >
                  <NumberInput
                    id="option-included"
                    min="0"
                    step="1"
                    value={group.includedCount}
                    onChange={(value) =>
                      patchGroup({ includedCount: value ?? 0 })
                    }
                  />
                </Field>
                <Field id="option-display" label="Look">
                  <Select
                    value={group.display}
                    onValueChange={(display) =>
                      patchGroup({ display: display as GroupDraft["display"] })
                    }
                  >
                    <SelectTrigger id="option-display" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tiles">Picture tiles</SelectItem>
                      <SelectItem value="swatches">Color swatches</SelectItem>
                      <SelectItem value="list">Simple list</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <p className="text-muted-foreground text-xs">
                Example: “first charm free” is At least 0, At most 3, First ones
                free 1.
              </p>
            </fieldset>

            <section
              aria-labelledby="option-choices-heading"
              className="space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3
                    id="option-choices-heading"
                    className="text-sm font-medium"
                  >
                    Choices
                  </h3>
                  <p className="text-muted-foreground text-xs">
                    Each choice can have a photo or color, and its own price.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={values.length >= maxValues}
                  onClick={() =>
                    setValues((previous) => [...previous, emptyValueDraft()])
                  }
                >
                  <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                  Add choice
                </Button>
              </div>

              {values.length === 0 ? (
                <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
                  No choices yet. Add the first one.
                </p>
              ) : (
                <ul className="space-y-3">
                  {values.map((value, index) => (
                    <OptionValueRow
                      key={value.key}
                      index={index}
                      count={values.length}
                      value={value}
                      error={errors.values[value.key]}
                      mediaLibraryEnabled={mediaLibraryEnabled}
                      onChange={(patch) => patchValue(value.key, patch)}
                      onMove={(direction) => moveValue(index, direction)}
                      onRemove={() =>
                        setValues((previous) =>
                          previous.filter((v) => v.key !== value.key),
                        )
                      }
                    />
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>

      {/* One row at every width: stacked buttons ate half the dialog on phones. */}
      <DialogFooter className="flex-row items-center justify-between border-t px-4 py-3 sm:justify-between sm:p-6 sm:pt-4">
        <div>
          {!isNew && (
            <Button
              type="button"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              disabled={busy}
              onClick={() => setConfirmDelete(true)}
            >
              Delete option
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button type="button" disabled={busy} onClick={handleSave}>
            {save.isPending
              ? "Saving…"
              : isNew
                ? "Create option"
                : "Save option"}
          </Button>
        </div>
      </DialogFooter>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete “{group.name || "this option"}”?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {attachedProductCount > 0
                ? `It will be removed from ${attachedProductCount} ${
                    attachedProductCount === 1 ? "product" : "products"
                  }. `
                : ""}
              Past orders keep what customers chose. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={remove.isPending}
              onClick={(event) => {
                event.preventDefault();
                if (group.id) remove.mutate({ id: group.id });
              }}
            >
              {remove.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && !error && (
        <p className="text-muted-foreground text-xs">{hint}</p>
      )}
      {error && <p className="text-destructive text-sm">{error}</p>}
    </div>
  );
}
