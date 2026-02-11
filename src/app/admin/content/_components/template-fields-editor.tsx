/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { api } from "~/trpc/react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";

// Template field definitions
const TEMPLATE_FIELDS: Record<
  string,
  Array<{
    key: string;
    label: string;
    description: string;
    type: "text" | "textarea" | "url";
  }>
> = {
  modern: [
    {
      key: "modern.banner.text",
      label: "Banner Text",
      description: "Text shown in the top banner",
      type: "text",
    },
    {
      key: "modern.cta.primary",
      label: "Primary CTA Text",
      description: "Main call-to-action button text",
      type: "text",
    },
    {
      key: "modern.cta.secondary",
      label: "Secondary CTA Text",
      description: "Secondary call-to-action button text",
      type: "text",
    },
    {
      key: "modern.announcement",
      label: "Announcement",
      description: "Special announcement or promo message",
      type: "textarea",
    },
  ],
  vintage: [
    {
      key: "vintage.tagline",
      label: "Tagline",
      description: "Your store's tagline",
      type: "text",
    },
    {
      key: "vintage.welcome",
      label: "Welcome Message",
      description: "Greeting message for visitors",
      type: "textarea",
    },
    {
      key: "vintage.signature",
      label: "Signature",
      description: "Personal signature or sign-off",
      type: "text",
    },
  ],
  minimal: [
    {
      key: "minimal.motto",
      label: "Motto",
      description: "Short motto or slogan",
      type: "text",
    },
    {
      key: "minimal.statement",
      label: "Brand Statement",
      description: "Your brand's mission statement",
      type: "textarea",
    },
  ],
};

type TemplateFieldsEditorProps = {
  business: {
    id: string;
    templateId: string;
  };
  siteContent: {
    customFields: any;
  };
};

export function TemplateFieldsEditor({
  business,
  siteContent,
}: TemplateFieldsEditorProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  // Initialize custom fields
  const initialFields = siteContent.customFields ?? {};
  const [customFields, setCustomFields] =
    useState<Record<string, string>>(initialFields);

  // Custom key-value pairs
  const [customPairs, setCustomPairs] = useState<
    Array<{ key: string; value: string }>
  >(
    Object.entries(initialFields)
      .filter(([key]) => !key.includes(".")) // Only custom, not template fields
      .map(([key, value]) => ({ key, value: value as string })),
  );

  const templateFields = TEMPLATE_FIELDS[business.templateId] ?? [];

  const updateSiteContent = api.content.updateSiteContent.useMutation({
    onSuccess: () => {
      toast.success("Template fields updated");
      router.refresh();
      setIsSaving(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update");
      setIsSaving(false);
    },
  });

  const handleSave = () => {
    // Merge template fields and custom pairs
    const allFields = { ...customFields };
    customPairs.forEach((pair) => {
      if (pair.key && pair.value) {
        allFields[pair.key] = pair.value;
      }
    });

    setIsSaving(true);
    updateSiteContent.mutate({
      businessId: business.id,
      data: { customFields: allFields },
    });
  };

  const addCustomPair = () => {
    setCustomPairs([...customPairs, { key: "", value: "" }]);
  };

  const updateCustomPair = (
    index: number,
    field: "key" | "value",
    value: string,
  ) => {
    const updated = [...customPairs];
    updated[index]![field] = value;
    setCustomPairs(updated);
  };

  const deleteCustomPair = (index: number) => {
    setCustomPairs(customPairs.filter((_, i) => i !== index));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="mb-4 flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/content">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Link>
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Template Fields
              </h1>
              <p className="mt-2 text-gray-600">
                Customize template-specific content
              </p>
              <Badge variant="outline" className="mt-2 capitalize">
                {business.templateId} Template
              </Badge>
            </div>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Template-Specific Fields */}
          {templateFields.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Template Fields</CardTitle>
                <CardDescription>
                  Pre-defined fields for the {business.templateId} template
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {templateFields.map((field) => (
                  <div key={field.key}>
                    <Label htmlFor={field.key}>{field.label}</Label>
                    {field.type === "textarea" ? (
                      <Textarea
                        id={field.key}
                        value={customFields[field.key] ?? ""}
                        onChange={(e) =>
                          setCustomFields({
                            ...customFields,
                            [field.key]: e.target.value,
                          })
                        }
                        placeholder={field.description}
                        rows={3}
                        className="mt-2"
                      />
                    ) : (
                      <Input
                        id={field.key}
                        value={customFields[field.key] ?? ""}
                        onChange={(e) =>
                          setCustomFields({
                            ...customFields,
                            [field.key]: e.target.value,
                          })
                        }
                        placeholder={field.description}
                        className="mt-2"
                      />
                    )}
                    <p className="mt-1 text-xs text-gray-500">
                      {field.description}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Custom Key-Value Pairs */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Custom Fields</CardTitle>
                  <CardDescription>
                    Add your own custom key-value pairs
                  </CardDescription>
                </div>
                <Button onClick={addCustomPair} size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Field
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {customPairs.length === 0 ? (
                <div className="py-8 text-center text-gray-500">
                  <p>
                    No custom fields yet. Click &quot;Add Field&quot; to create
                    one.
                  </p>
                </div>
              ) : (
                customPairs.map((pair, index) => (
                  <Card key={index}>
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        <div className="grid flex-1 grid-cols-2 gap-4">
                          <div>
                            <Label>Key</Label>
                            <Input
                              value={pair.key}
                              onChange={(e) =>
                                updateCustomPair(index, "key", e.target.value)
                              }
                              placeholder="custom.field.name"
                              className="mt-1"
                            />
                          </div>

                          <div>
                            <Label>Value</Label>
                            <Input
                              value={pair.value}
                              onChange={(e) =>
                                updateCustomPair(index, "value", e.target.value)
                              }
                              placeholder="Field value"
                              className="mt-1"
                            />
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteCustomPair(index)}
                          className="mt-6"
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </CardContent>
          </Card>

          {/* Usage Example */}
          <Card>
            <CardHeader>
              <CardTitle>Using Custom Fields</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-gray-600">
                Access custom fields in your templates:
              </p>
              <pre className="overflow-x-auto rounded-lg bg-gray-900 p-4 text-sm text-gray-100">
                {`// In your template
const siteContent = await getSiteContent();
const customFields = siteContent.customFields;

// Access template field
const bannerText = customFields["modern.banner.text"];

// Access custom field
const myField = customFields["my.custom.key"];`}
              </pre>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
