"use client";

import type { UseFormReturn } from "react-hook-form";
import { Plus, Trash2, AlertCircle } from "lucide-react";
import { useFieldArray } from "react-hook-form";

import type {
  CalculatorFormValues,
  LocationQuestionInput,
} from "./builder-shared";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

import { BuilderNumberField } from "./builder-number-field";
import { makeDistance } from "./builder-shared";

const MAX_DISTANCES = 5;

type Props = {
  form: UseFormReturn<CalculatorFormValues>;
  /** Every ZIP-code or address question, in visitor order. */
  locationQuestions: LocationQuestionInput[];
};

/**
 * Distance variables — a straight-line mileage between the answers to two
 * location questions.
 *
 * Either endpoint may be a ZIP code question or a full address: an address
 * carries a ZIP, and the ZIP is all the server needs to place it on the map.
 *
 * The card renders only when at least two location questions exist (the caller
 * enforces that): a distance needs two endpoints, and offering the panel with
 * one available question would only ever produce a save the validator refuses.
 *
 * The visitor never sees or answers these. The server computes the miles from
 * the two ZIPs it already has, which is also why the mileage cannot be
 * previewed here — see the test panel's sample input.
 */
export function CalculatorDistancesCard({ form, locationQuestions }: Props) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "definition.distances",
  });

  const locationOptions = locationQuestions.map((question, index) => ({
    id: question.id,
    label: question.title.trim() || `Untitled location question ${index + 1}`,
  }));

  const firstLocationId = locationOptions[0]?.id ?? "";
  const secondLocationId = locationOptions[1]?.id ?? "";

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle>Distance variables</CardTitle>
            <CardDescription>
              Turns two locations into a straight-line (&quot;as the crow
              flies&quot;) mileage number your formula can use. Straight-line
              miles run shorter than road miles — pad your per-mile rate to
              compensate. Computed on the server; visitors never see the mileage.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={fields.length >= MAX_DISTANCES}
            onClick={() =>
              append(makeDistance(firstLocationId, secondLocationId))
            }
          >
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            Add distance
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {fields.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No distance variables yet.
          </p>
        ) : (
          fields.map((field, index) => {
            const base = `definition.distances.${index}` as const;

            return (
              <div
                key={field.id}
                className="bg-muted/40 space-y-3 rounded-lg border p-3"
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name={`${base}.variableName`}
                    render={({ field: nameField }) => (
                      <FormItem>
                        <FormLabel>
                          Variable name{" "}
                          <span className="text-destructive" aria-hidden="true">
                            *
                          </span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            className="font-mono"
                            placeholder="e.g. distance"
                            {...nameField}
                          />
                        </FormControl>
                        <FormDescription>
                          Holds the straight-line miles between the two locations
                          below.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <BuilderNumberField
                    form={form}
                    name={`${base}.hiddenDefault`}
                    label="Value when unavailable"
                    description="Used when either location is skipped, branched away, or its ZIP is not in the lookup table."
                    placeholder="0"
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name={`${base}.fromQuestionId`}
                    render={({ field: fromField }) => (
                      <FormItem>
                        <FormLabel>From</FormLabel>
                        <Select
                          value={
                            typeof fromField.value === "string"
                              ? fromField.value
                              : ""
                          }
                          onValueChange={fromField.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Pick a ZIP code or address question" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {locationOptions.map((option) => (
                              <SelectItem key={option.id} value={option.id}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`${base}.toQuestionId`}
                    render={({ field: toField }) => (
                      <FormItem>
                        <FormLabel>To</FormLabel>
                        <Select
                          value={
                            typeof toField.value === "string"
                              ? toField.value
                              : ""
                          }
                          onValueChange={toField.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Pick a ZIP code or address question" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {locationOptions.map((option) => (
                              <SelectItem key={option.id} value={option.id}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {(() => {
                  // form.watch (not getValues): the endpoint selects render
                  // through Controllers, so only a subscription re-renders
                  // this warning when the owner picks a different question.
                  const fromId = form.watch(`${base}.fromQuestionId`);
                  const toId = form.watch(`${base}.toQuestionId`);

                  const fromQuestion = fromId
                    ? locationQuestions.find((q) => q.id === fromId)
                    : undefined;
                  const toQuestion = toId
                    ? locationQuestions.find((q) => q.id === toId)
                    : undefined;

                  const isFromFragile =
                    fromQuestion &&
                    (fromQuestion.required !== true || fromQuestion.showIf);
                  const isToFragile =
                    toQuestion &&
                    (toQuestion.required !== true || toQuestion.showIf);

                  const fragileQuestions = [
                    ...(isFromFragile ? [{ question: fromQuestion, label: "From" }] : []),
                    ...(isToFragile ? [{ question: toQuestion, label: "To" }] : []),
                  ];

                  return fragileQuestions.length > 0 ? (
                    <div className="space-y-2 rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/30 dark:bg-amber-950/20">
                      {fragileQuestions.map((item) => (
                        <p
                          key={item.label}
                          className="flex items-start gap-2 text-sm text-amber-800 dark:text-amber-200"
                        >
                          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                          <span>
                            <strong>{item.question?.title || "This question"}</strong>{" "}
                            is optional or shown conditionally. If a visitor skips
                            it, this distance silently falls back to its
                            &quot;Value when unavailable&quot; above.
                            That&apos;s intentional for branched designs — just
                            make sure your formula still prices sensibly when that
                            happens.
                          </span>
                        </p>
                      ))}
                    </div>
                  ) : null;
                })()}

                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive/80"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                    Remove distance
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
