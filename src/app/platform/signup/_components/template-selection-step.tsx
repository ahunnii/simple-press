"use client";

import { useState } from "react";
import { ArrowLeft, Check } from "lucide-react";

import type { SignupFormData } from "./wizard-client";
import { TEMPLATES } from "~/lib/constants";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

type TemplateSelectionStepProps = {
  formData: Partial<SignupFormData>;
  onNext: (data: Partial<SignupFormData>) => void;
  onBack?: () => void;
};

export function TemplateSelectionStep({
  formData,
  onNext,
  onBack,
}: TemplateSelectionStepProps) {
  const [selectedTemplate, setSelectedTemplate] = useState(
    formData.templateId ?? "modern",
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext({ templateId: selectedTemplate });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Choose your template</CardTitle>
        <CardDescription>
          You can switch templates anytime. Pick one that matches your brand.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Template Grid */}
          <div className="grid gap-4 md:grid-cols-3">
            {TEMPLATES.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => setSelectedTemplate(template.id)}
                className={cn(
                  "relative rounded-lg border-2 p-4 text-left transition-all hover:border-blue-300",
                  selectedTemplate === template.id
                    ? "border-blue-600 bg-blue-50"
                    : "border-gray-200 bg-white",
                )}
              >
                {/* Selected Indicator */}
                {selectedTemplate === template.id && (
                  <div className="absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded-full bg-blue-600">
                    <Check className="h-4 w-4 text-white" />
                  </div>
                )}

                {/* Template Preview */}
                <div className="mb-3 flex aspect-video items-center justify-center rounded bg-gradient-to-br from-gray-100 to-gray-200">
                  <span className="text-xs font-medium text-gray-500">
                    {template.name}
                  </span>
                </div>

                {/* Template Info */}
                <h3 className="mb-1 text-sm font-semibold">{template.name}</h3>
                <p className="line-clamp-2 text-xs text-gray-600">
                  {template.description}
                </p>
              </button>
            ))}
          </div>

          {/* Selected Template Details */}
          {selectedTemplate && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <h4 className="mb-2 text-sm font-semibold">
                {TEMPLATES.find((t) => t.id === selectedTemplate)?.name}{" "}
                Template
              </h4>
              <p className="text-sm text-gray-700">
                {TEMPLATES.find((t) => t.id === selectedTemplate)?.description}
              </p>
            </div>
          )}

          <div className="flex gap-3">
            {onBack && (
              <Button type="button" variant="outline" onClick={onBack}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            )}
            <Button type="submit" className="flex-1">
              Continue
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
