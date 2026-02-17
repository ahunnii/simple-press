/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUploadFile } from "@better-upload/client";
import {
  ArrowLeft,
  Loader2,
  Plus,
  Save,
  Search,
  Trash,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import {
  getGroupMetadata,
  groupFieldsByGroup,
  groupFieldsByPage,
  PAGE_METADATA,
} from "~/lib/template-fields";
import { cn } from "~/lib/utils";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Separator } from "~/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Textarea } from "~/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";

type Props = {
  business: {
    id: string;
    templateId: string;
  };
  siteContent: {
    customFields: any;
  };
};

export function TemplateFieldsEditor({ business, siteContent }: Props) {
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("global");

  // Group fields by page
  const groupedByPage = groupFieldsByPage(business.templateId);
  const allPages = Object.keys(groupedByPage);

  // Initialize custom fields
  const initialFields = siteContent.customFields ?? {};
  const [customFields, setCustomFields] =
    useState<Record<string, string>>(initialFields);

  // Store initial state for comparison
  const [initialState, setInitialState] = useState({
    fields: { ...initialFields },
    customPairsKeys: new Set<string>(),
  });

  // Track which fields have been modified
  const [modifiedFields, setModifiedFields] = useState<Set<string>>(new Set());

  // Custom key-value pairs (organized by page)
  const [customPairs, setCustomPairs] = useState<
    Array<{ key: string; value: string; page: string }>
  >(() => {
    const allTemplateKeys = new Set(
      Object.values(groupedByPage)
        .flat()
        .map((f) => f.key),
    );
    return Object.entries(initialFields)
      .filter(([key]) => !allTemplateKeys.has(key))
      .map(([key, value]) => {
        const page = key.split(".")[0] ?? "global";
        return { key, value: value as string, page };
      });
  });

  const updateSiteContent = api.content.updateSiteContent.useMutation({
    onSuccess: () => {
      toast.dismiss();
      toast.success("Template fields updated");
      setModifiedFields(new Set());
      router.refresh();
    },
    onError: (error) => {
      toast.dismiss();
      toast.error(error.message || "Failed to update");
    },
    onSettled: () => {
      router.refresh();
    },
    onMutate: () => {
      toast.loading("Updating template fields...");
    },
  });

  const isSaving = updateSiteContent.isPending;

  const handleSave = () => {
    const allFields = { ...customFields };
    customPairs.forEach((pair) => {
      if (pair.key && pair.value) {
        allFields[pair.key] = pair.value;
      }
    });

    updateSiteContent.mutate({
      customFields: allFields,
    });
  };

  const handleReset = () => {
    setCustomFields({ ...initialFields });
    setCustomPairs(customPairs.filter((p) => p.key && p.value));
    setModifiedFields(new Set());
  };

  const handleFieldChange = (key: string, value: string) => {
    setCustomFields({ ...customFields, [key]: value });
    setModifiedFields(new Set(modifiedFields).add(key));
  };

  const addCustomPair = (page: string) => {
    setCustomPairs([...customPairs, { key: "", value: "", page }]);
  };

  const updateCustomPair = (
    index: number,
    field: "key" | "value" | "page",
    value: string,
  ) => {
    const updated = [...customPairs];
    updated[index]![field] = value;
    setCustomPairs(updated);
  };

  const deleteCustomPair = (index: number) => {
    setCustomPairs(customPairs.filter((_, i) => i !== index));
  };

  // Filter fields by search
  const filterFields = (fields: TemplateField[]) => {
    if (!searchQuery) return fields;
    return fields.filter(
      (field) =>
        field.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        field.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        field.key.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  };

  const getFieldsForPage = (page: string) => {
    const templateFields = groupedByPage[page] ?? [];
    const pageCustomPairs = customPairs.filter((p) => p.page === page);
    return { templateFields, customPairs: pageCustomPairs };
  };

  // Update initial state when data loads
  useEffect(() => {
    const allTemplateKeys = new Set(
      Object.values(groupedByPage)
        .flat()
        .map((f) => f.key),
    );
    const initialCustomKeys = new Set(
      Object.keys(initialFields).filter((key) => !allTemplateKeys.has(key)),
    );

    setInitialState({
      fields: { ...initialFields },
      customPairsKeys: initialCustomKeys,
    });
  }, [JSON.stringify(initialFields)]);

  // Check if there are unsaved changes
  const hasUnsavedChanges = useCallback(() => {
    // Check modified template fields
    if (modifiedFields.size > 0) return true;

    // Check if custom pairs changed
    const currentCustomKeys = new Set(
      customPairs.filter((p) => p.key && p.value).map((p) => p.key),
    );

    // Different number of custom fields
    if (currentCustomKeys.size !== initialState.customPairsKeys.size) {
      return true;
    }

    // Check if any custom field keys are different
    for (const key of currentCustomKeys) {
      if (!initialState.customPairsKeys.has(key)) {
        return true;
      }
    }

    // Check if any custom field values changed
    for (const pair of customPairs) {
      if (pair.key && pair.value) {
        const initialValue = initialState.fields[pair.key];
        if (initialValue !== pair.value) {
          return true;
        }
      }
    }

    return false;
  }, [modifiedFields, customPairs, initialState]);

  const isDirty = hasUnsavedChanges();

  // Warn before leaving page with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className={cn("admin-form-toolbar", isDirty ? "dirty" : "")}>
        <div className="toolbar-info">
          <Button variant="ghost" size="sm" asChild className="shrink-0">
            <Link href="/admin/content">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
          <div className="bg-border hidden h-6 w-px shrink-0 sm:block" />
          <div className="hidden min-w-0 items-center gap-2 sm:flex">
            <Tooltip>
              <TooltipTrigger asChild>
                <h1 className="text-base font-medium">
                  Template Fields{" "}
                  {/* <span className="text-muted-foreground hover:text-foreground text-sm">
                    ?
                  </span> */}
                </h1>
              </TooltipTrigger>
              <TooltipContent>
                <p>Customize content across your site, organized by page</p>
              </TooltipContent>
            </Tooltip>

            <span
              className={`admin-status-badge ${
                isDirty ? "isDirty" : "isPublished"
              }`}
            >
              {isDirty ? "Unsaved Changes" : "Saved"}
            </span>

            <Badge variant="outline" className="capitalize">
              {business.templateId} Template
            </Badge>
          </div>
        </div>

        <div className="toolbar-actions">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isSaving || !isDirty}
            onClick={handleReset}
            className="hidden md:inline-flex"
          >
            Reset
          </Button>

          <Button onClick={handleSave} size="sm" disabled={isSaving}>
            {isSaving ? (
              <>
                <span className="saving-indicator" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Save changes</span>
                <span className="sm:hidden">Save</span>
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header
        <div className="mb-8">
          <div className="mb-4">
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
                Customize content across your site, organized by page
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
                  {modifiedFields.size > 0 && (
                    <Badge variant="destructive" className="ml-2">
                      {modifiedFields.size}
                    </Badge>
                  )}
                </>
              )}
            </Button>
          </div>
        </div> */}

        {/* Main Content */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Template Content</CardTitle>
                <CardDescription>
                  Edit content organized by page and grouped by section
                </CardDescription>
              </div>

              {/* Search */}
              <div className="relative w-64">
                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search fields..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-6">
                {allPages.map((page) => {
                  const meta =
                    PAGE_METADATA[page as keyof typeof PAGE_METADATA];
                  const { templateFields, customPairs: pagePairs } =
                    getFieldsForPage(page);
                  const totalFields = templateFields.length + pagePairs.length;
                  const modifiedCount = [
                    ...templateFields.map((f) => f.key),
                    ...pagePairs.map((p) => p.key),
                  ].filter((key) => modifiedFields.has(key)).length;

                  return (
                    <TabsTrigger
                      key={page}
                      value={page}
                      className="relative w-fit"
                    >
                      <span className="mr-1">{meta?.icon || "📄"}</span>
                      <span className="hidden sm:inline">
                        {meta?.title || page}
                      </span>
                      {totalFields > 0 && (
                        <Badge
                          variant={modifiedCount > 0 ? "default" : "secondary"}
                          className="ml-1 h-5 w-5 rounded-full p-0 text-xs"
                        >
                          {totalFields}
                        </Badge>
                      )}
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {allPages.map((page) => {
                const meta = PAGE_METADATA[page as keyof typeof PAGE_METADATA];
                const { templateFields, customPairs: pagePairs } =
                  getFieldsForPage(page);
                const filteredFields = filterFields(templateFields);

                // Group fields by their group property
                const fieldGroups = groupFieldsByGroup(filteredFields);

                return (
                  <TabsContent key={page} value={page} className="space-y-6">
                    {/* Page Description */}
                    {meta && (
                      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{meta.icon}</span>
                          <div>
                            <h3 className="font-medium text-blue-900">
                              {meta.title}
                            </h3>
                            <p className="text-sm text-blue-700">
                              {meta.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Grouped Template Fields */}
                    {Object.entries(fieldGroups).map(([groupId, fields]) => {
                      if (fields.length === 0) return null;

                      const groupMeta = getGroupMetadata(
                        business.templateId,
                        groupId,
                      );
                      const isUngrouped = groupId === "ungrouped";

                      return (
                        <FieldGroup
                          key={groupId}
                          groupId={groupId}
                          groupMeta={groupMeta}
                          fields={fields}
                          customFields={customFields}
                          modifiedFields={modifiedFields}
                          onFieldChange={handleFieldChange}
                          isUngrouped={isUngrouped}
                          businessId={business.id}
                        />
                      );
                    })}

                    {filteredFields.length === 0 &&
                      templateFields.length > 0 && (
                        <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center">
                          <p className="text-gray-500">
                            No fields match your search
                          </p>
                          <Button
                            variant="link"
                            onClick={() => setSearchQuery("")}
                            className="mt-2"
                          >
                            Clear search
                          </Button>
                        </div>
                      )}

                    {templateFields.length > 0 && <Separator />}

                    {/* Custom Fields for this page - unchanged */}
                    {/* <CustomFieldsSection
                      page={page}
                      customPairs={pagePairs}
                      allCustomPairs={customPairs}
                      onAdd={() => addCustomPair(page)}
                      onUpdate={updateCustomPair}
                      onDelete={deleteCustomPair}
                    /> */}

                    {/* Empty state */}
                    {templateFields.length === 0 && pagePairs.length === 0 && (
                      <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center">
                        <p className="mb-3 text-gray-500">
                          No template fields defined for this page yet
                        </p>
                        <Button
                          onClick={() => addCustomPair(page)}
                          size="sm"
                          variant="outline"
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add Custom Field
                        </Button>
                      </div>
                    )}
                  </TabsContent>
                );
              })}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Field Group Component
function FieldGroup({
  groupId,
  groupMeta,
  fields,
  customFields,
  modifiedFields,
  onFieldChange,
  isUngrouped,
  businessId,
}: {
  groupId: string;
  groupMeta?: TemplateFieldGroup;
  fields: TemplateField[];
  customFields: Record<string, string>;
  modifiedFields: Set<string>;
  onFieldChange: (key: string, value: string) => void;
  isUngrouped: boolean;
  businessId: string;
}) {
  const columns = groupMeta?.columns ?? 1;

  return (
    <Card>
      <CardHeader>
        {!isUngrouped && groupMeta && (
          <div className="flex items-center gap-2">
            {groupMeta.icon && (
              <span className="text-xl">{groupMeta.icon}</span>
            )}
            <div>
              <CardTitle className="text-base">{groupMeta.title}</CardTitle>
              {groupMeta.description && (
                <CardDescription className="mt-1">
                  {groupMeta.description}
                </CardDescription>
              )}
            </div>
          </div>
        )}
        {isUngrouped && (
          <CardTitle className="text-base">Other Fields</CardTitle>
        )}
      </CardHeader>
      <CardContent>
        <div
          className={`grid gap-6 ${
            columns === 1
              ? "grid-cols-1"
              : columns === 2
                ? "grid-cols-1 md:grid-cols-2"
                : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
          }`}
        >
          {fields.map((field) => (
            <div key={field.key} className={field.gridColumn ?? "col-span-1"}>
              <FieldInput
                field={field}
                value={customFields[field.key] ?? ""}
                isModified={modifiedFields.has(field.key)}
                onChange={(value) => onFieldChange(field.key, value)}
                businessId={businessId}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Field Input Component (extracted for reuse)
function FieldInput({
  field,
  value,
  isModified,
  onChange,
  businessId,
}: {
  field: TemplateField;
  value: string;
  isModified: boolean;
  onChange: (value: string) => void;
  businessId: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={field.key} className="flex items-center gap-2">
        {field.label}
        {isModified && (
          <Badge variant="outline" className="text-xs">
            Modified
          </Badge>
        )}
      </Label>

      {field.type === "image" ? (
        // Image upload field (uses better-upload)
        <TemplateImageUploadField
          value={value}
          onChange={onChange}
          description={field.description}
        />
      ) : field.type === "gallery" ? (
        <GalleryFieldSelect value={value ?? undefined} onChange={onChange} />
      ) : field.type === "textarea" ? (
        <Textarea
          id={field.key}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder ?? field.description}
          rows={3}
        />
      ) : (
        <Input
          id={field.key}
          type={
            field.type === "url"
              ? "url"
              : field.type === "color"
                ? "color"
                : field.type === "number"
                  ? "number"
                  : "text"
          }
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder ?? field.description}
        />
      )}

      {/* Don't show description for image type (already in component) */}
      {field.type !== "image" && (
        <p className="text-xs text-gray-500">{field.description}</p>
      )}
    </div>
  );
}

// Gallery Field Select Component
function GalleryFieldSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const { data: galleries } = api.gallery.list.useQuery();

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder="Select a gallery..." />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">None</SelectItem>
        {galleries?.map((gallery) => (
          <SelectItem key={gallery.id} value={gallery.id}>
            {gallery.name} ({gallery._count.images} images)
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// Custom Fields Section Component (unchanged from before)
function CustomFieldsSection({
  page,
  customPairs,
  allCustomPairs,
  onAdd,
  onUpdate,
  onDelete,
}: {
  page: string;
  customPairs: { key: string; value: string; page: string }[];
  allCustomPairs: { key: string; value: string; page: string }[];
  onAdd: () => void;
  onUpdate: (
    index: number,
    field: "key" | "value" | "page",
    value: string,
  ) => void;
  onDelete: (index: number) => void;
}) {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          Custom Fields
          {customPairs.length > 0 && (
            <Badge variant="outline">{customPairs.length}</Badge>
          )}
        </h3>
        <Button onClick={onAdd} size="sm" variant="outline">
          <Plus className="mr-2 h-4 w-4" />
          Add Custom Field
        </Button>
      </div>

      {customPairs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
          <p className="mb-3 text-sm text-gray-500">
            No custom fields for this page yet
          </p>
          <Button onClick={onAdd} size="sm" variant="outline">
            <Plus className="mr-2 h-4 w-4" />
            Add First Custom Field
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {customPairs.map((pair, index) => {
            const globalIndex = allCustomPairs.indexOf(pair);
            return (
              <Card key={index}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="grid flex-1 grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-gray-500 uppercase">
                          Key
                        </Label>
                        <Input
                          value={pair.key}
                          onChange={(e) =>
                            onUpdate(globalIndex, "key", e.target.value)
                          }
                          placeholder={`${page}.custom.field`}
                          className="mt-1 font-mono text-sm"
                        />
                      </div>

                      <div>
                        <Label className="text-xs text-gray-500 uppercase">
                          Value
                        </Label>
                        <Input
                          value={pair.value}
                          onChange={(e) =>
                            onUpdate(globalIndex, "value", e.target.value)
                          }
                          placeholder="Field value"
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(globalIndex)}
                      className="mt-6"
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

type TemplateImageUploadFieldProps = {
  value: string; // Current image URL from customFields
  onChange: (url: string) => void; // Update customFields
  label?: string;
  description?: string;
  disabled?: boolean;
};

function isImageFile(file: File): boolean {
  return (
    file.type.startsWith("image/") ||
    /\.(jpg|jpeg|png|webp|gif|bmp)$/i.test(file.name)
  );
}

export function TemplateImageUploadField({
  value,
  onChange,
  label,
  description,
  disabled,
}: TemplateImageUploadFieldProps) {
  const [localFile, setLocalFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Better-upload hook
  const uploader = useUploadFile({
    api: "/api/upload",
    route: "image", // Same route as your existing uploads
    onError: (error) => {
      toast.error(error.message ?? "Image upload failed");
      setLocalFile(null);
    },
  });

  // Object URL for preview of selected file
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!localFile || !isImageFile(localFile)) {
      setObjectUrl(null);
      return;
    }
    const url = URL.createObjectURL(localFile);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [localFile]);

  // Preview URL: object URL (new file) or existing value
  const previewUrl = objectUrl ?? (value && !localFile ? value : null);
  const hasFile = localFile instanceof File;

  const triggerFileInput = useCallback(() => {
    if (disabled || uploader.isPending) return;
    fileInputRef.current?.click();
  }, [disabled, uploader.isPending]);

  const handleFileSelect = useCallback(
    async (file: File) => {
      if (!isImageFile(file)) {
        toast.error("Please select a valid image file");
        return;
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image must be less than 5MB");
        return;
      }

      setLocalFile(file);

      // Upload immediately
      try {
        const response = await uploader.upload(file);
        const fileLocation =
          (response.file.objectInfo.metadata?.pathname as string | undefined) ??
          "";

        if (fileLocation) {
          // Update parent with uploaded URL
          onChange(fileLocation);
          toast.success("Image uploaded successfully");
          setLocalFile(null); // Clear local file after upload
        }
      } catch (error) {
        console.error("Upload error:", error);
        toast.error("Failed to upload image");
        setLocalFile(null);
      }
    },
    [onChange, uploader],
  );

  const handleRemove = useCallback(() => {
    onChange(""); // Clear value
    setLocalFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [onChange]);

  const isUploading = uploader.isPending;

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}

      <div className="space-y-2">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          disabled={disabled ?? isUploading}
          aria-label={label ?? "Choose image file"}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              void handleFileSelect(file);
            }
            e.target.value = "";
          }}
        />

        {/* Preview */}
        {previewUrl ? (
          <div className="bg-muted flex items-center gap-3 rounded-lg border p-3">
            <img
              src={previewUrl}
              alt={hasFile ? localFile.name : "Preview"}
              className="h-16 w-16 shrink-0 rounded-md object-cover"
            />
            <div className="min-w-0 flex-1">
              {hasFile && (
                <p className="truncate text-sm font-medium">{localFile.name}</p>
              )}
              <p className="text-muted-foreground text-xs">
                {isUploading
                  ? "Uploading..."
                  : hasFile
                    ? "Uploading..."
                    : "Current image"}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={disabled ?? isUploading}
              aria-label="Remove image"
              className="text-muted-foreground hover:text-destructive shrink-0"
              onClick={handleRemove}
            >
              <Trash className="h-4 w-4" />
            </Button>
          </div>
        ) : null}

        {/* Upload button */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled ?? isUploading}
          onClick={triggerFileInput}
          className="w-full"
        >
          {isUploading ? (
            <>
              <span className="border-background border-t-foreground mr-2 h-4 w-4 animate-spin rounded-full border-2" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              {previewUrl ? "Replace image" : "Choose image"}
            </>
          )}
        </Button>

        {/* Drag & drop area */}
        <div
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              triggerFileInput();
            }
          }}
          onDrop={(e) => {
            e.preventDefault();
            if (disabled || isUploading) return;
            const file = e.dataTransfer.files?.[0];
            if (file && isImageFile(file)) {
              void handleFileSelect(file);
            }
          }}
          onDragOver={(e) => e.preventDefault()}
          className={cn(
            "border-muted-foreground/25 rounded-lg border-2 border-dashed p-4 text-center text-sm transition-colors",
            "hover:border-muted-foreground/50 hover:bg-muted/50",
            (disabled ?? isUploading) && "pointer-events-none opacity-50",
          )}
          onClick={triggerFileInput}
        >
          Drag and drop an image here, or click to browse
        </div>
      </div>

      {description && <p className="text-xs text-gray-500">{description}</p>}
    </div>
  );
}
