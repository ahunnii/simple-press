"use client";

import type { UseFormReturn } from "react-hook-form";
import { useMemo } from "react";
import { CheckCircle2, XCircle } from "lucide-react";

import type { CalculatorFormValues } from "./builder-shared";
import { parseFormula } from "~/lib/quote/formula";
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
  FormField,
  FormItem,
  FormMessage,
} from "~/components/ui/form";
import { Textarea } from "~/components/ui/textarea";

type Props = {
  form: UseFormReturn<CalculatorFormValues>;
  /** The current formula text, watched by the parent. */
  formula: string;
  /** Every variable name the questions and distances currently declare. */
  availableVariables: string[];
};

/**
 * The pricing formula, with the same parser the server uses.
 *
 * `parseFormula` is pure and isomorphic on purpose (see its docblock), so the
 * feedback below is not an approximation of what the server will say — it is
 * the identical check, run on the identical string. A formula this panel calls
 * good is one `quoteCalculatorDefinitionSchema` will accept, and the unknown-
 * variable list is computed against the same declared set the validator uses.
 */
export function CalculatorFormulaCard({
  form,
  formula,
  availableVariables,
}: Props) {
  const trimmed = formula.trim();

  const parsed = useMemo(
    () => (trimmed === "" ? null : parseFormula(trimmed)),
    [trimmed],
  );

  const unknownVariables =
    parsed?.ok === true
      ? parsed.variables.filter((name) => !availableVariables.includes(name))
      : [];

  const appendVariable = (name: string) => {
    const current = form.getValues("definition.formula") ?? "";
    // A space only where one is needed — appending onto "(" or an operator
    // should not leave "( bedrooms".
    const needsSpace = current !== "" && !/[\s(+\-*/,]$/.test(current);
    form.setValue(
      "definition.formula",
      `${current}${needsSpace ? " " : ""}${name}`,
      { shouldDirty: true, shouldValidate: true },
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pricing formula</CardTitle>
        <CardDescription>
          One arithmetic expression, evaluated on the server for every
          submission. The result is dollars.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <FormField
          control={form.control}
          name="definition.formula"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Textarea
                  rows={3}
                  spellCheck={false}
                  autoCapitalize="off"
                  autoCorrect="off"
                  className="font-mono text-sm"
                  placeholder="(500 + bedrooms * 350 + packing + distance * 4) * move_type"
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  name={field.name}
                />
              </FormControl>
              {/* The resolver's own message for this path — it covers the
                  server-side rules (length, unknown variable) as well as
                  syntax, and fires on submit. */}
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Live feedback, independent of the resolver so it updates on every
            keystroke rather than on touch/submit. */}
        {parsed === null ? (
          <p className="text-muted-foreground text-sm">
            Start typing to check the formula.
          </p>
        ) : parsed.ok ? (
          <div className="text-sm">
            <p className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
              Formula parses.
            </p>
            {unknownVariables.length > 0 && (
              <p className="mt-1 text-amber-600 dark:text-amber-400">
                Not defined by any question or distance:{" "}
                <span className="font-mono">{unknownVariables.join(", ")}</span>
              </p>
            )}
          </div>
        ) : (
          <div className="text-sm">
            <p className="text-destructive flex items-start gap-2">
              <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{parsed.error.message}</span>
            </p>
            {parsed.error.position !== undefined && (
              // whitespace-pre + a monospace font is what makes the caret line
              // up with the character it is pointing at.
              <pre className="bg-muted text-muted-foreground mt-2 overflow-x-auto rounded-md p-2 font-mono text-xs whitespace-pre">
                {trimmed}
                {"\n"}
                {`${" ".repeat(parsed.error.position)}^`}
              </pre>
            )}
          </div>
        )}

        <div className="space-y-2">
          <p className="text-sm font-medium">Available variables</p>
          {availableVariables.length === 0 ? (
            <p className="text-muted-foreground text-xs">
              Name a variable on a choice, multi-select, dropdown or number
              question and it will appear here.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {availableVariables.map((name) => (
                <Button
                  key={name}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 font-mono text-xs"
                  onClick={() => appendVariable(name)}
                >
                  {name}
                </Button>
              ))}
            </div>
          )}
        </div>

        <p className="text-muted-foreground text-xs">
          Operators: <span className="font-mono">+ - * /</span> and parentheses.
          Functions: <span className="font-mono">min(a, b, …)</span>,{" "}
          <span className="font-mono">max(a, b, …)</span>,{" "}
          <span className="font-mono">round(x)</span>,{" "}
          <span className="font-mono">ceil(x)</span>,{" "}
          <span className="font-mono">floor(x)</span>.
        </p>
      </CardContent>
    </Card>
  );
}
