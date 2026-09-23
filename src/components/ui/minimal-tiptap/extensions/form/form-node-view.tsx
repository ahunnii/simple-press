/* eslint-disable @typescript-eslint/no-unsafe-assignment */

"use client";

import type { NodeViewProps } from "@tiptap/core";
import { useState } from "react";
import { NodeViewWrapper } from "@tiptap/react";
import { FormInput, Loader2, X } from "lucide-react";

import type { FormOptions } from "./index";
import { api } from "~/trpc/react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

export function FormNodeView({
  node,
  updateAttributes,
  deleteNode,
  extension,
}: NodeViewProps) {
  const opts = extension.options as FormOptions;
  const formsEnabled = opts.formsEnabled !== false;

  const [isEditing, setIsEditing] = useState(!node.attrs.formId);

  // Lean picker feed — id/name/published/entry counts, exactly what both
  // states below need. Mirrors `QuoteCalculatorNodeView`'s use of
  // `quoteCalculator.list`.
  const { data: forms, isLoading: loadingForms } = api.form.list.useQuery(
    undefined,
    { enabled: formsEnabled },
  );

  const selectedId =
    typeof node.attrs.formId === "string" ? node.attrs.formId : null;
  const form = selectedId
    ? forms?.find((entry) => entry.id === selectedId)
    : undefined;

  const handleFormSelect = (formId: string) => {
    updateAttributes({ formId });
    setIsEditing(false);
  };

  const handleRemove = () => {
    if (confirm("Remove this form?")) {
      deleteNode();
    }
  };

  // Disabled state — preserve the node in the document but show a notice.
  if (!formsEnabled) {
    return (
      <NodeViewWrapper className="form-node my-4">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-center text-sm text-amber-700">
          Forms are currently disabled for this business. Re-enable the forms
          feature to display this content.
        </div>
      </NodeViewWrapper>
    );
  }

  // Editing/Selection state.
  if (isEditing || !node.attrs.formId) {
    return (
      <NodeViewWrapper className="form-node my-4">
        <div className="rounded-lg border-2 border-dashed border-blue-300 bg-blue-50 p-6">
          <div className="flex items-start gap-4">
            <div className="shrink-0">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                <FormInput className="h-6 w-6 text-blue-600" />
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="mb-1 font-medium text-gray-900">Insert Form</h3>
              <p className="mb-4 text-sm text-gray-600">
                Select a form to display in your page
              </p>

              {loadingForms ? (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading forms...
                </div>
              ) : forms && forms.length > 0 ? (
                <div className="flex items-center gap-3">
                  <Select
                    value={node.attrs.formId ?? undefined}
                    onValueChange={handleFormSelect}
                  >
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder="Select a form..." />
                    </SelectTrigger>
                    <SelectContent>
                      {forms.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          <span>
                            {f.name}
                            {!f.published && " (draft)"}
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
                  <p className="mb-2">No forms found.</p>
                  <Button size="sm" variant="outline" asChild>
                    <a href="/admin/forms/new" target="_blank">
                      Create a Form
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

  // Display state — a STATIC preview card. The storefront renders the real,
  // interactive form from this same `formId` via `FormRenderer`.
  const totalEntries = form?.totalEntries ?? 0;

  return (
    <NodeViewWrapper className="form-node my-6">
      <div className="group relative">
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

        {loadingForms ? (
          <div className="flex items-center justify-center rounded-lg bg-gray-50 py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : form ? (
          <div className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-6">
            <div className="shrink-0">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                <FormInput className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="font-medium text-gray-900">{form.name}</p>
                {!form.published && (
                  <Badge variant="outline" className="text-amber-700">
                    Draft
                  </Badge>
                )}
              </div>
              <p className="text-sm text-gray-600">
                {totalEntries} {totalEntries === 1 ? "entry" : "entries"}
              </p>
              {!form.published && (
                <p className="mt-1 text-xs text-amber-700">
                  Publish this form so visitors can see it
                </p>
              )}
              <a
                href={`/admin/forms/${form.id}`}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block text-xs text-blue-600 underline underline-offset-2"
              >
                Edit form
              </a>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-gray-200 bg-gray-50 py-12 text-center">
            <p className="text-gray-600">Form not found</p>
            <Button
              size="sm"
              variant="outline"
              className="mt-2"
              onClick={() => setIsEditing(true)}
            >
              Select Different Form
            </Button>
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}
