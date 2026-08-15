/* eslint-disable @typescript-eslint/no-unsafe-assignment */

"use client";

import type { NodeViewProps } from "@tiptap/core";
import { useState } from "react";
import { NodeViewWrapper } from "@tiptap/react";
import { Calculator, Loader2, X } from "lucide-react";

import type { QuoteCalculatorOptions } from "./index";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

export function QuoteCalculatorNodeView({
  node,
  updateAttributes,
  deleteNode,
  extension,
}: NodeViewProps) {
  const opts = extension.options as QuoteCalculatorOptions;
  const quotesEnabled = opts.quotesEnabled !== false;

  const [isEditing, setIsEditing] = useState(!node.attrs.calculatorId);

  // The ONE query this node view makes. `list` carries id / name / published /
  // questionCount — everything both states below need — and is the picker feed
  // this component already had to load anyway.
  //
  // It deliberately does NOT call `quoteCalculator.getById`. That returns the
  // raw stored row, which means the owner's formula, every option `value` and
  // every `hiddenDefault` land in the editor's client cache to render the words
  // "3 questions". The count is computed server-side in `list` instead, so the
  // pricing model never crosses into the browser for a preview card.
  const { data: calculators, isLoading: loadingCalculators } =
    api.quoteCalculator.list.useQuery(undefined, { enabled: quotesEnabled });

  const selectedId =
    typeof node.attrs.calculatorId === "string"
      ? node.attrs.calculatorId
      : null;
  const calculator = selectedId
    ? calculators?.find((entry) => entry.id === selectedId)
    : undefined;

  const handleCalculatorSelect = (calculatorId: string) => {
    updateAttributes({
      calculatorId,
    });
    setIsEditing(false);
  };

  const handleRemove = () => {
    if (confirm("Remove this quote calculator?")) {
      deleteNode();
    }
  };

  // Disabled state — preserve the node in the document but show a notice
  if (!quotesEnabled) {
    return (
      <NodeViewWrapper className="quote-calculator-node my-4">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-center text-sm text-amber-700">
          Quote calculators are currently disabled for this business. Re-enable
          the quote calculator feature to display this content.
        </div>
      </NodeViewWrapper>
    );
  }

  // Editing/Selection State
  if (isEditing || !node.attrs.calculatorId) {
    return (
      <NodeViewWrapper className="quote-calculator-node my-4">
        <div className="rounded-lg border-2 border-dashed border-blue-300 bg-blue-50 p-6">
          <div className="flex items-start gap-4">
            <div className="shrink-0">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                <Calculator className="h-6 w-6 text-blue-600" />
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="mb-1 font-medium text-gray-900">
                Insert Quote Calculator
              </h3>
              <p className="mb-4 text-sm text-gray-600">
                Select a quote calculator to display in your page
              </p>

              {loadingCalculators ? (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading quote calculators...
                </div>
              ) : calculators && calculators.length > 0 ? (
                <div className="flex items-center gap-3">
                  <Select
                    value={node.attrs.calculatorId ?? undefined}
                    onValueChange={handleCalculatorSelect}
                  >
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder="Select a quote calculator..." />
                    </SelectTrigger>
                    <SelectContent>
                      {calculators.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          <span>
                            {c.name}
                            {!c.published && " (draft)"}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button variant="outline" size="sm" onClick={handleRemove}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="text-sm text-gray-600">
                  <p className="mb-2">No quote calculators found.</p>
                  <Button size="sm" variant="outline" asChild>
                    <a href="/admin/quotes/calculators/new" target="_blank">
                      Create a Quote Calculator
                    </a>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </NodeViewWrapper>
    );
  }

  // Display State — a STATIC preview card, not the live calculator runner.
  // An interactive multi-step form inside ProseMirror would be a focus trap
  // (tab/arrow keys would fight the editor); the storefront renders the real,
  // interactive calculator from this same `calculatorId`.
  const questionCount = calculator?.questionCount ?? 0;

  return (
    <NodeViewWrapper className="quote-calculator-node my-6">
      <div className="group relative">
        {/* Edit Overlay */}
        <div className="absolute top-2 right-2 z-10 opacity-0 transition-opacity group-hover:opacity-100">
          <div className="flex gap-2 rounded-lg bg-white p-1 shadow-lg">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setIsEditing(true)}
            >
              Change
            </Button>
            <Button size="sm" variant="destructive" onClick={handleRemove}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Quote Calculator Display */}
        {loadingCalculators ? (
          <div className="flex items-center justify-center rounded-lg bg-gray-50 py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : calculator ? (
          <div className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-6">
            <div className="shrink-0">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                <Calculator className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-gray-900">{calculator.name}</p>
              <p className="text-sm text-gray-600">
                {questionCount} question{questionCount === 1 ? "" : "s"}
              </p>
              <p className="text-muted-foreground mt-1 text-xs uppercase">
                Quote calculator
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-gray-200 bg-gray-50 py-12 text-center">
            <p className="text-gray-600">Quote calculator not found</p>
            <Button
              size="sm"
              variant="outline"
              className="mt-2"
              onClick={() => setIsEditing(true)}
            >
              Select Different Quote Calculator
            </Button>
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}
