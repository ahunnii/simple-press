"use client";

import type { UseFormReturn } from "react-hook-form";
import { useId, useState } from "react";
import {
  AlertCircle,
  ChevronDown,
  Copy,
  MoreHorizontal,
  Plus,
  Trash2,
} from "lucide-react";
import { useFieldArray } from "react-hook-form";

import type {
  FieldInput,
  FieldTypeChangeImpact,
  FormBuilderValues,
} from "./builder-shared";
import type { FormFieldType } from "~/lib/validators/form";
import { cn } from "~/lib/utils";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Switch } from "~/components/ui/switch";
import { Textarea } from "~/components/ui/textarea";

import { BuilderNumberField } from "../../quotes/calculators/_components/builder-number-field";
import {
  describeFieldTypeChangeImpact,
  FIELD_TYPE_META,
  FIELD_TYPE_ORDER,
  isOptionFieldInput,
  makeOption,
} from "./builder-shared";
import { ChangeTypeDialog } from "./change-type-dialog";

/** The react-hook-form path prefix for one field row. */
export type FieldPath = `definition.fields.${number}`;

const EMPTY_IMPACT: FieldTypeChangeImpact = {
  optionsDiscarded: false,
  wasConfirmationTarget: false,
};

const MAX_OPTIONS = 30;

/** Field types whose `placeholder` renders on the storefront. */
function supportsPlaceholder(type: FormFieldType): boolean {
  return (
    type === "text" ||
    type === "longtext" ||
    type === "email" ||
    type === "phone" ||
    type === "number"
  );
}

type Props = {
  form: UseFormReturn<FormBuilderValues>;
  base: FieldPath;
  index: number;
  field: FieldInput;
  confirmationFieldId: string | null | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
  /**
   * Applies a confirmed type change. Called from the `ChangeTypeDialog`'s
   * "Change type" button, never straight from the `Select` — every attempted
   * change opens the dialog first, same as the quote calculator builder.
   */
  onChangeType: (nextType: FormFieldType) => void;
};

export function FormFieldCard({
  form,
  base,
  index,
  field,
  confirmationFieldId,
  open,
  onOpenChange,
  onRemove,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  onChangeType,
}: Props) {
  const meta = FIELD_TYPE_META[field.type];
  const typeFieldId = useId();

  const [pendingTypeChange, setPendingTypeChange] = useState<{
    nextType: FormFieldType;
    impact: FieldTypeChangeImpact;
  } | null>(null);

  const rowState = form.getFieldState(base, form.formState);

  return (
    <Card className={cn("gap-0 py-0")}>
      <Collapsible open={open} onOpenChange={onOpenChange}>
        <div className="flex items-center gap-2 p-3">
          <div className="flex shrink-0 flex-col">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-4 w-8"
              aria-label={`Move field ${index + 1} up`}
              disabled={isFirst}
              onClick={onMoveUp}
            >
              <ChevronDown className="h-3 w-3 rotate-180" aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-4 w-8"
              aria-label={`Move field ${index + 1} down`}
              disabled={isLast}
              onClick={onMoveDown}
            >
              <ChevronDown className="h-3 w-3" aria-hidden="true" />
            </Button>
          </div>

          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="focus-visible:ring-ring flex min-w-0 flex-1 items-center gap-2 rounded-md py-1 text-left focus-visible:ring-2 focus-visible:outline-none"
            >
              <ChevronDown
                aria-hidden="true"
                className={cn(
                  "text-muted-foreground h-4 w-4 shrink-0 transition-transform",
                  open && "rotate-180",
                )}
              />
              <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                {index + 1}.
              </span>
              <span className="truncate text-sm font-medium">
                {field.label.trim() || "Untitled field"}
              </span>
              <Badge variant="secondary" className="shrink-0">
                {meta.label}
              </Badge>
              {field.required && (
                <Badge variant="outline" className="hidden shrink-0 sm:inline">
                  Required
                </Badge>
              )}
              {confirmationFieldId === field.id && (
                <Badge variant="outline" className="hidden shrink-0 sm:inline">
                  Confirmation email
                </Badge>
              )}
              {!open && rowState.invalid && (
                <Badge variant="destructive" className="shrink-0">
                  <AlertCircle className="h-3 w-3" aria-hidden="true" />
                  Needs attention
                </Badge>
              )}
            </button>
          </CollapsibleTrigger>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0"
                aria-label="More"
              >
                <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onDuplicate}>
                <Copy className="mr-2 h-4 w-4" aria-hidden="true" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={onRemove}
              >
                <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <CollapsibleContent className="space-y-4 border-t p-4">
          <FormField
            control={form.control}
            name={`${base}.label`}
            render={({ field: labelField }) => (
              <FormItem>
                <FormLabel>
                  Label{" "}
                  <span className="text-destructive" aria-hidden="true">
                    *
                  </span>
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g. Full name"
                    {...labelField}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name={`${base}.description`}
            render={({ field: descField }) => (
              <FormItem>
                <FormLabel>Help text</FormLabel>
                <FormControl>
                  <Textarea
                    rows={2}
                    placeholder="Optional — shown under the label."
                    value={descField.value ?? ""}
                    onChange={descField.onChange}
                    onBlur={descField.onBlur}
                    name={descField.name}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            {/* NOT `FormField`-registered — same pattern as the quote
                calculator builder's question type `Select`: the type is
                never written through react-hook-form directly, only via
                `onChangeType` after the owner confirms `ChangeTypeDialog`. */}
            <div className="space-y-1.5">
              <Label htmlFor={typeFieldId}>Type</Label>
              <Select
                value={field.type}
                onValueChange={(value) => {
                  const nextType = value as FormFieldType;
                  if (nextType === field.type) return;
                  const impact = describeFieldTypeChangeImpact(
                    field,
                    nextType,
                    confirmationFieldId,
                  );
                  setPendingTypeChange({ nextType, impact });
                }}
              >
                <SelectTrigger id={typeFieldId} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_TYPE_ORDER.map((type) => (
                    <SelectItem key={type} value={type}>
                      {FIELD_TYPE_META[type].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs">{meta.hint}</p>
            </div>

            <FormField
              control={form.control}
              name={`${base}.required`}
              render={({ field: requiredField }) => (
                <FormItem className="flex h-fit flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel>Required</FormLabel>
                    <FormDescription>
                      Visitors can&apos;t submit without answering.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={requiredField.value ?? false}
                      onCheckedChange={requiredField.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          {supportsPlaceholder(field.type) && (
            <FormField
              control={form.control}
              name={`${base}.placeholder`}
              render={({ field: placeholderField }) => (
                <FormItem>
                  <FormLabel>Placeholder</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Optional — shown inside the empty field."
                      value={placeholderField.value ?? ""}
                      onChange={placeholderField.onChange}
                      onBlur={placeholderField.onBlur}
                      name={placeholderField.name}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {(field.type === "text" || field.type === "longtext") && (
            <BuilderNumberField
              form={form}
              name={`${base}.maxLength`}
              label="Max length"
              description="Characters the visitor may type."
              placeholder={field.type === "text" ? "500" : "5000"}
              min={1}
              max={field.type === "text" ? 5000 : 20000}
            />
          )}

          {field.type === "number" && (
            <div className="grid gap-4 sm:grid-cols-3">
              <BuilderNumberField
                form={form}
                name={`${base}.min`}
                label="Minimum"
                placeholder="No minimum"
                emptyAs="null"
              />
              <BuilderNumberField
                form={form}
                name={`${base}.max`}
                label="Maximum"
                placeholder="No maximum"
                emptyAs="null"
              />
              <BuilderNumberField
                form={form}
                name={`${base}.step`}
                label="Step"
                placeholder="Any"
                emptyAs="null"
                min={0}
              />
            </div>
          )}

          {field.type === "date" && (
            <FormField
              control={form.control}
              name={`${base}.minDate`}
              render={({ field: minDateField }) => (
                <FormItem>
                  <FormLabel>Earliest allowed date</FormLabel>
                  <Select
                    value={minDateField.value ?? "none"}
                    onValueChange={minDateField.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Any date</SelectItem>
                      <SelectItem value="today">Today or later</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Measured against today in your business&apos;s time zone,
                    not the visitor&apos;s.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {isOptionFieldInput(field) && (
            <FieldOptionsEditor form={form} base={base} />
          )}
        </CollapsibleContent>
      </Collapsible>

      <ChangeTypeDialog
        open={pendingTypeChange !== null}
        onOpenChange={(next) => {
          if (!next) setPendingTypeChange(null);
        }}
        fromType={field.type}
        toType={pendingTypeChange?.nextType ?? field.type}
        impact={pendingTypeChange?.impact ?? EMPTY_IMPACT}
        onConfirm={() => {
          if (!pendingTypeChange) return;
          onChangeType(pendingTypeChange.nextType);
          setPendingTypeChange(null);
        }}
      />
    </Card>
  );
}

// ─── Options ────────────────────────────────────────────────────────────────

function FieldOptionsEditor({
  form,
  base,
}: {
  form: UseFormReturn<FormBuilderValues>;
  base: FieldPath;
}) {
  const name = `${base}.options` as const;

  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name,
  });

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">Options</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={fields.length >= MAX_OPTIONS}
          onClick={() => append(makeOption())}
        >
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          Add option
        </Button>
      </div>

      {fields.map((optionField, optionIndex) => (
        <div
          key={optionField.id}
          className="bg-muted/40 flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-start"
        >
          <FormField
            control={form.control}
            name={`${name}.${optionIndex}.label`}
            render={({ field: optionLabelField }) => (
              <FormItem className="min-w-0 flex-1">
                <FormControl>
                  <Input
                    placeholder={`Option ${optionIndex + 1}`}
                    {...optionLabelField}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex shrink-0 items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Move option ${optionIndex + 1} up`}
              disabled={optionIndex === 0}
              onClick={() => move(optionIndex, optionIndex - 1)}
            >
              <ChevronDown className="h-4 w-4 rotate-180" aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Move option ${optionIndex + 1} down`}
              disabled={optionIndex === fields.length - 1}
              onClick={() => move(optionIndex, optionIndex + 1)}
            >
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive/80"
              aria-label={`Remove option ${optionIndex + 1}`}
              disabled={fields.length <= 2}
              onClick={() => remove(optionIndex)}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      ))}

      {/* Array-level errors ("Add at least 2 options") attach to the options
          path itself, not to any row, so they need their own message slot. */}
      <FormField
        control={form.control}
        name={name}
        render={() => (
          <FormItem>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
