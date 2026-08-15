"use client";

import type { UseFormReturn } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { useFieldArray } from "react-hook-form";

import type { CalculatorFormValues, QuestionInput } from "./builder-shared";
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
  /** Every zip-type question, in question order. */
  zipQuestions: QuestionInput[];
};

/**
 * Distance variables — a straight-line mileage between the answers to two ZIP
 * questions.
 *
 * The card renders only when at least two ZIP questions exist (the caller
 * enforces that): a distance needs two endpoints, and offering the panel with
 * one available question would only ever produce a save the validator refuses.
 *
 * The visitor never sees or answers these. The server computes the miles from
 * the two ZIPs it already has, which is also why the mileage cannot be
 * previewed here — see the test panel's sample input.
 */
export function CalculatorDistancesCard({ form, zipQuestions }: Props) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "definition.distances",
  });

  const zipOptions = zipQuestions.map((question, index) => ({
    id: question.id,
    label: question.title.trim() || `Untitled ZIP question ${index + 1}`,
  }));

  const firstZipId = zipOptions[0]?.id ?? "";
  const secondZipId = zipOptions[1]?.id ?? "";

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle>Distance variables</CardTitle>
            <CardDescription>
              Turn a pair of ZIP code answers into a miles number your formula
              can use. Computed on the server — visitors never see the mileage.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={fields.length >= MAX_DISTANCES}
            onClick={() => append(makeDistance(firstZipId, secondZipId))}
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
                          Holds the miles between the two ZIPs below.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <BuilderNumberField
                    form={form}
                    name={`${base}.hiddenDefault`}
                    label="Value when unavailable"
                    description="Used when either ZIP is skipped, branched away, or not in the lookup table."
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
                              <SelectValue placeholder="Pick a ZIP question" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {zipOptions.map((option) => (
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
                              <SelectValue placeholder="Pick a ZIP question" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {zipOptions.map((option) => (
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
