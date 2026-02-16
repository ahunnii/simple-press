// /* eslint-disable @typescript-eslint/no-unsafe-argument */
// /* eslint-disable @typescript-eslint/no-unsafe-assignment */
// /* eslint-disable @typescript-eslint/no-explicit-any */
// "use client";

// import { useEffect, useState } from "react";
// import Link from "next/link";
// import { useRouter } from "next/navigation";
// import { ArrowLeft, Loader2, Plus, Save, Trash2 } from "lucide-react";
// import { toast } from "sonner";

// import { TEMPLATE_FIELDS } from "~/lib/template-fields";
// import { api } from "~/trpc/react";
// import { Badge } from "~/components/ui/badge";
// import { Button } from "~/components/ui/button";
// import {
//   Card,
//   CardContent,
//   CardDescription,
//   CardHeader,
//   CardTitle,
// } from "~/components/ui/card";
// import { Input } from "~/components/ui/input";
// import { Label } from "~/components/ui/label";
// import { Textarea } from "~/components/ui/textarea";

// type TemplateFieldsEditorProps = {
//   business: {
//     id: string;
//     templateId: string;
//   };
//   siteContent: {
//     customFields: any;
//   };
// };

// export function TemplateFieldsEditor({
//   business,
//   siteContent,
// }: TemplateFieldsEditorProps) {
//   const router = useRouter();
//   const [isSaving, setIsSaving] = useState(false);

//   // Initialize custom fields
//   const initialFields = siteContent.customFields ?? {};
//   const templateFields = TEMPLATE_FIELDS[business.templateId] ?? [];
//   // Keys that belong to any template — don't show those in Custom Fields
//   const allTemplateKeys = new Set(
//     Object.values(TEMPLATE_FIELDS).flat().map((f) => f.key),
//   );

//   const [customFields, setCustomFields] =
//     useState<Record<string, string>>(initialFields);

//   // Custom key-value pairs = fields not defined in any template's TEMPLATE_FIELDS
//   const [customPairs, setCustomPairs] = useState<
//     Array<{ key: string; value: string }>
//   >(() =>
//     Object.entries(initialFields)
//       .filter(([key]) => !allTemplateKeys.has(key))
//       .map(([key, value]) => ({ key, value: value as string })),
//   );

//   // Sync state from server when siteContent changes (e.g. after router.refresh())
//   useEffect(() => {
//     const nextFields = siteContent.customFields ?? {};
//     const nextAllTemplateKeys = new Set(
//       Object.values(TEMPLATE_FIELDS).flat().map((f) => f.key),
//     );
//     setCustomFields(nextFields);
//     setCustomPairs(
//       Object.entries(nextFields)
//         .filter(([key]) => !nextAllTemplateKeys.has(key))
//         .map(([key, value]) => ({ key, value: value as string })),
//     );
//     // eslint-disable-next-line react-hooks/exhaustive-deps -- sync when server customFields or template changes
//   }, [JSON.stringify(siteContent.customFields), business.templateId]);

//   const updateSiteContent = api.content.updateSiteContent.useMutation({
//     onSuccess: () => {
//       toast.success("Template fields updated");
//       router.refresh();
//       setIsSaving(false);
//     },
//     onError: (error) => {
//       toast.error(error.message || "Failed to update");
//       setIsSaving(false);
//     },
//   });

//   const handleSave = () => {
//     // Merge template fields and custom pairs
//     const allFields = { ...customFields };
//     customPairs.forEach((pair) => {
//       if (pair.key && pair.value) {
//         allFields[pair.key] = pair.value;
//       }
//     });

//     setIsSaving(true);
//     updateSiteContent.mutate({
//       businessId: business.id,
//       data: { customFields: allFields },
//     });
//   };

//   const addCustomPair = () => {
//     setCustomPairs([...customPairs, { key: "", value: "" }]);
//   };

//   const updateCustomPair = (
//     index: number,
//     field: "key" | "value",
//     value: string,
//   ) => {
//     const updated = [...customPairs];
//     updated[index]![field] = value;
//     setCustomPairs(updated);
//   };

//   const deleteCustomPair = (index: number) => {
//     setCustomPairs(customPairs.filter((_, i) => i !== index));
//   };

//   return (
//     <div className="min-h-screen bg-gray-50">
//       <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
//         <div className="mb-8">
//           <div className="mb-4 flex items-center gap-4">
//             <Button variant="ghost" size="sm" asChild>
//               <Link href="/admin/content">
//                 <ArrowLeft className="mr-2 h-4 w-4" />
//                 Back
//               </Link>
//             </Button>
//           </div>

//           <div className="flex items-center justify-between">
//             <div>
//               <h1 className="text-3xl font-bold text-gray-900">
//                 Template Fields
//               </h1>
//               <p className="mt-2 text-gray-600">
//                 Customize template-specific content
//               </p>
//               <Badge variant="outline" className="mt-2 capitalize">
//                 {business.templateId} Template
//               </Badge>
//             </div>
//             <Button onClick={handleSave} disabled={isSaving}>
//               {isSaving ? (
//                 <>
//                   <Loader2 className="mr-2 h-4 w-4 animate-spin" />
//                   Saving...
//                 </>
//               ) : (
//                 <>
//                   <Save className="mr-2 h-4 w-4" />
//                   Save Changes
//                 </>
//               )}
//             </Button>
//           </div>
//         </div>

//         <div className="space-y-6">
//           {/* Template-Specific Fields */}
//           {templateFields.length > 0 && (
//             <Card>
//               <CardHeader>
//                 <CardTitle>Template Fields</CardTitle>
//                 <CardDescription>
//                   Pre-defined fields for the {business.templateId} template
//                 </CardDescription>
//               </CardHeader>
//               <CardContent className="space-y-6">
//                 {templateFields.map((field) => (
//                   <div key={field.key}>
//                     <Label htmlFor={field.key}>{field.label}</Label>
//                     {field.type === "textarea" ? (
//                       <Textarea
//                         id={field.key}
//                         value={customFields[field.key] ?? ""}
//                         onChange={(e) =>
//                           setCustomFields({
//                             ...customFields,
//                             [field.key]: e.target.value,
//                           })
//                         }
//                         placeholder={field.description}
//                         rows={3}
//                         className="mt-2"
//                       />
//                     ) : (
//                       <Input
//                         id={field.key}
//                         value={customFields[field.key] ?? ""}
//                         onChange={(e) =>
//                           setCustomFields({
//                             ...customFields,
//                             [field.key]: e.target.value,
//                           })
//                         }
//                         placeholder={field.description}
//                         className="mt-2"
//                       />
//                     )}
//                     <p className="mt-1 text-xs text-gray-500">
//                       {field.description}
//                     </p>
//                   </div>
//                 ))}
//               </CardContent>
//             </Card>
//           )}

//           {/* Custom Key-Value Pairs */}
//           <Card>
//             <CardHeader>
//               <div className="flex items-center justify-between">
//                 <div>
//                   <CardTitle>Custom Fields</CardTitle>
//                   <CardDescription>
//                     Add your own custom key-value pairs
//                   </CardDescription>
//                 </div>
//                 <Button onClick={addCustomPair} size="sm">
//                   <Plus className="mr-2 h-4 w-4" />
//                   Add Field
//                 </Button>
//               </div>
//             </CardHeader>
//             <CardContent className="space-y-4">
//               {customPairs.length === 0 ? (
//                 <div className="py-8 text-center text-gray-500">
//                   <p>
//                     No custom fields yet. Click &quot;Add Field&quot; to create
//                     one.
//                   </p>
//                 </div>
//               ) : (
//                 customPairs.map((pair, index) => (
//                   <Card key={index}>
//                     <CardContent className="pt-6">
//                       <div className="flex items-start gap-4">
//                         <div className="grid flex-1 grid-cols-2 gap-4">
//                           <div>
//                             <Label>Key</Label>
//                             <Input
//                               value={pair.key}
//                               onChange={(e) =>
//                                 updateCustomPair(index, "key", e.target.value)
//                               }
//                               placeholder="custom.field.name"
//                               className="mt-1"
//                             />
//                           </div>

//                           <div>
//                             <Label>Value</Label>
//                             <Input
//                               value={pair.value}
//                               onChange={(e) =>
//                                 updateCustomPair(index, "value", e.target.value)
//                               }
//                               placeholder="Field value"
//                               className="mt-1"
//                             />
//                           </div>
//                         </div>

//                         <Button
//                           variant="ghost"
//                           size="sm"
//                           onClick={() => deleteCustomPair(index)}
//                           className="mt-6"
//                         >
//                           <Trash2 className="h-4 w-4 text-red-600" />
//                         </Button>
//                       </div>
//                     </CardContent>
//                   </Card>
//                 ))
//               )}
//             </CardContent>
//           </Card>

//           {/* Usage Example */}
//           <Card>
//             <CardHeader>
//               <CardTitle>Using Custom Fields</CardTitle>
//             </CardHeader>
//             <CardContent>
//               <p className="mb-4 text-sm text-gray-600">
//                 Access custom fields in your templates:
//               </p>
//               <pre className="overflow-x-auto rounded-lg bg-gray-900 p-4 text-sm text-gray-100">
//                 {`// In your template
// const siteContent = await getSiteContent();
// const customFields = siteContent.customFields;

// // Access template field
// const bannerText = customFields["modern.banner.text"];

// // Access custom field
// const myField = customFields["my.custom.key"];`}
//               </pre>
//             </CardContent>
//           </Card>
//         </div>
//       </div>
//     </div>
//   );
// }

// // /* eslint-disable @typescript-eslint/no-unsafe-argument */
// // /* eslint-disable @typescript-eslint/no-unsafe-assignment */
// // /* eslint-disable @typescript-eslint/no-explicit-any */
// // "use client";

// // import { useEffect, useState } from "react";
// // import Link from "next/link";
// // import { useRouter } from "next/navigation";
// // import { ArrowLeft, Loader2, Plus, Save, Trash2 } from "lucide-react";
// // import { toast } from "sonner";

// // import { api } from "~/trpc/react";
// // import { Badge } from "~/components/ui/badge";
// // import { Button } from "~/components/ui/button";
// // import {
// //   Card,
// //   CardContent,
// //   CardDescription,
// //   CardHeader,
// //   CardTitle,
// // } from "~/components/ui/card";
// // import { Input } from "~/components/ui/input";
// // import { Label } from "~/components/ui/label";
// // import { Textarea } from "~/components/ui/textarea";

// // // Template field definitions
// // const TEMPLATE_FIELDS: Record<
// //   string,
// //   Array<{
// //     key: string;
// //     label: string;
// //     description: string;
// //     type: "text" | "textarea" | "url";
// //   }>
// // > = {
// //   modern: [
// //     {
// //       key: "modern.banner.text",
// //       label: "Banner Text",
// //       description: "Text shown in the top banner",
// //       type: "text",
// //     },
// //     {
// //       key: "modern.cta.primary",
// //       label: "Primary CTA Text",
// //       description: "Main call-to-action button text",
// //       type: "text",
// //     },
// //     {
// //       key: "modern.cta.secondary",
// //       label: "Secondary CTA Text",
// //       description: "Secondary call-to-action button text",
// //       type: "text",
// //     },
// //     {
// //       key: "modern.announcement",
// //       label: "Announcement",
// //       description: "Special announcement or promo message",
// //       type: "textarea",
// //     },
// //   ],
// //   elegant: [
// //     {
// //       key: "elegant.tagline",
// //       label: "Tagline",
// //       description: "Your store's tagline",
// //       type: "text",
// //     },
// //   ],
// //   vintage: [
// //     {
// //       key: "vintage.tagline",
// //       label: "Tagline",
// //       description: "Your store's tagline",
// //       type: "text",
// //     },
// //     {
// //       key: "vintage.welcome",
// //       label: "Welcome Message",
// //       description: "Greeting message for visitors",
// //       type: "textarea",
// //     },
// //     {
// //       key: "vintage.signature",
// //       label: "Signature",
// //       description: "Personal signature or sign-off",
// //       type: "text",
// //     },
// //   ],
// //   minimal: [
// //     {
// //       key: "minimal.motto",
// //       label: "Motto",
// //       description: "Short motto or slogan",
// //       type: "text",
// //     },
// //     {
// //       key: "minimal.statement",
// //       label: "Brand Statement",
// //       description: "Your brand's mission statement",
// //       type: "textarea",
// //     },
// //   ],
// // };

// // type TemplateFieldsEditorProps = {
// //   business: {
// //     id: string;
// //     templateId: string;
// //   };
// //   siteContent: {
// //     customFields: any;
// //   };
// // };

// // export function TemplateFieldsEditor({
// //   business,
// //   siteContent,
// // }: TemplateFieldsEditorProps) {
// //   const router = useRouter();
// //   const [isSaving, setIsSaving] = useState(false);

// //   // Initialize custom fields
// //   const initialFields = siteContent.customFields ?? {};
// //   const [customFields, setCustomFields] =
// //     useState<Record<string, string>>(initialFields);

// //   // Custom key-value pairs
// //   const [customPairs, setCustomPairs] = useState<
// //     Array<{ key: string; value: string }>
// //   >  (
// //     Object.entries(initialFields)
// //       .filter(([key]) => !(TEMPLATE_FIELDS[business.templateId] ?? []).some((f) => f.key === key))
// //       .map(([key, value]) => ({ key, value: value as string })),
// //   );

// //   const templateFields = TEMPLATE_FIELDS[business.templateId] ?? [];

// //   // Sync state from server when siteContent changes (e.g. after router.refresh())
// //   useEffect(() => {
// //     const nextFields = siteContent.customFields ?? {};
// //     const templateKeys = new Set(
// //       (TEMPLATE_FIELDS[business.templateId] ?? []).map((f) => f.key),
// //     );
// //     setCustomFields(nextFields);
// //     setCustomPairs(
// //       Object.entries(nextFields)
// //         .filter(([key]) => !templateKeys.has(key))
// //         .map(([key, value]) => ({ key, value: value as string })),
// //     );
// //     // eslint-disable-next-line react-hooks/exhaustive-deps
// //   }, [JSON.stringify(siteContent.customFields), business.templateId]);

// //   const updateSiteContent = api.content.updateSiteContent.useMutation({
// //     onSuccess: () => {
// //       toast.success("Template fields updated");
// //       router.refresh();
// //       setIsSaving(false);
// //     },
// //     onError: (error) => {
// //       toast.error(error.message || "Failed to update");
// //       setIsSaving(false);
// //     },
// //   });

// //   const handleSave = () => {
// //     // Merge template fields and custom pairs
// //     const allFields = { ...customFields };
// //     customPairs.forEach((pair) => {
// //       if (pair.key && pair.value) {
// //         allFields[pair.key] = pair.value;
// //       }
// //     });

// //     setIsSaving(true);
// //     updateSiteContent.mutate({
// //       businessId: business.id,
// //       data: { customFields: allFields },
// //     });
// //   };

// //   const addCustomPair = () => {
// //     setCustomPairs([...customPairs, { key: "", value: "" }]);
// //   };

// //   const updateCustomPair = (
// //     index: number,
// //     field: "key" | "value",
// //     value: string,
// //   ) => {
// //     const updated = [...customPairs];
// //     updated[index]![field] = value;
// //     setCustomPairs(updated);
// //   };

// //   const deleteCustomPair = (index: number) => {
// //     setCustomPairs(customPairs.filter((_, i) => i !== index));
// //   };

// //   return (
// //     <div className="min-h-screen bg-gray-50">
// //       <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
// //         <div className="mb-8">
// //           <div className="mb-4 flex items-center gap-4">
// //             <Button variant="ghost" size="sm" asChild>
// //               <Link href="/admin/content">
// //                 <ArrowLeft className="mr-2 h-4 w-4" />
// //                 Back
// //               </Link>
// //             </Button>
// //           </div>

// //           <div className="flex items-center justify-between">
// //             <div>
// //               <h1 className="text-3xl font-bold text-gray-900">
// //                 Template Fields
// //               </h1>
// //               <p className="mt-2 text-gray-600">
// //                 Customize template-specific content
// //               </p>
// //               <Badge variant="outline" className="mt-2 capitalize">
// //                 {business.templateId} Template
// //               </Badge>
// //             </div>
// //             <Button onClick={handleSave} disabled={isSaving}>
// //               {isSaving ? (
// //                 <>
// //                   <Loader2 className="mr-2 h-4 w-4 animate-spin" />
// //                   Saving...
// //                 </>
// //               ) : (
// //                 <>
// //                   <Save className="mr-2 h-4 w-4" />
// //                   Save Changes
// //                 </>
// //               )}
// //             </Button>
// //           </div>
// //         </div>

// //         <div className="space-y-6">
// //           {/* Template-Specific Fields */}
// //           {templateFields.length > 0 && (
// //             <Card>
// //               <CardHeader>
// //                 <CardTitle>Template Fields</CardTitle>
// //                 <CardDescription>
// //                   Pre-defined fields for the {business.templateId} template
// //                 </CardDescription>
// //               </CardHeader>
// //               <CardContent className="space-y-6">
// //                 {templateFields.map((field) => (
// //                   <div key={field.key}>
// //                     <Label htmlFor={field.key}>{field.label}</Label>
// //                     {field.type === "textarea" ? (
// //                       <Textarea
// //                         id={field.key}
// //                         value={customFields[field.key] ?? ""}
// //                         onChange={(e) =>
// //                           setCustomFields({
// //                             ...customFields,
// //                             [field.key]: e.target.value,
// //                           })
// //                         }
// //                         placeholder={field.description}
// //                         rows={3}
// //                         className="mt-2"
// //                       />
// //                     ) : (
// //                       <Input
// //                         id={field.key}
// //                         value={customFields[field.key] ?? ""}
// //                         onChange={(e) =>
// //                           setCustomFields({
// //                             ...customFields,
// //                             [field.key]: e.target.value,
// //                           })
// //                         }
// //                         placeholder={field.description}
// //                         className="mt-2"
// //                       />
// //                     )}
// //                     <p className="mt-1 text-xs text-gray-500">
// //                       {field.description}
// //                     </p>
// //                   </div>
// //                 ))}
// //               </CardContent>
// //             </Card>
// //           )}

// //           {/* Custom Key-Value Pairs */}
// //           <Card>
// //             <CardHeader>
// //               <div className="flex items-center justify-between">
// //                 <div>
// //                   <CardTitle>Custom Fields</CardTitle>
// //                   <CardDescription>
// //                     Add your own custom key-value pairs
// //                   </CardDescription>
// //                 </div>
// //                 <Button onClick={addCustomPair} size="sm">
// //                   <Plus className="mr-2 h-4 w-4" />
// //                   Add Field
// //                 </Button>
// //               </div>
// //             </CardHeader>
// //             <CardContent className="space-y-4">
// //               {customPairs.length === 0 ? (
// //                 <div className="py-8 text-center text-gray-500">
// //                   <p>
// //                     No custom fields yet. Click &quot;Add Field&quot; to create
// //                     one.
// //                   </p>
// //                 </div>
// //               ) : (
// //                 customPairs.map((pair, index) => (
// //                   <Card key={index}>
// //                     <CardContent className="pt-6">
// //                       <div className="flex items-start gap-4">
// //                         <div className="grid flex-1 grid-cols-2 gap-4">
// //                           <div>
// //                             <Label>Key</Label>
// //                             <Input
// //                               value={pair.key}
// //                               onChange={(e) =>
// //                                 updateCustomPair(index, "key", e.target.value)
// //                               }
// //                               placeholder="custom.field.name"
// //                               className="mt-1"
// //                             />
// //                           </div>

// //                           <div>
// //                             <Label>Value</Label>
// //                             <Input
// //                               value={pair.value}
// //                               onChange={(e) =>
// //                                 updateCustomPair(index, "value", e.target.value)
// //                               }
// //                               placeholder="Field value"
// //                               className="mt-1"
// //                             />
// //                           </div>
// //                         </div>

// //                         <Button
// //                           variant="ghost"
// //                           size="sm"
// //                           onClick={() => deleteCustomPair(index)}
// //                           className="mt-6"
// //                         >
// //                           <Trash2 className="h-4 w-4 text-red-600" />
// //                         </Button>
// //                       </div>
// //                     </CardContent>
// //                   </Card>
// //                 ))
// //               )}
// //             </CardContent>
// //           </Card>

// //           {/* Usage Example */}
// //           <Card>
// //             <CardHeader>
// //               <CardTitle>Using Custom Fields</CardTitle>
// //             </CardHeader>
// //             <CardContent>
// //               <p className="mb-4 text-sm text-gray-600">
// //                 Access custom fields in your templates:
// //               </p>
// //               <pre className="overflow-x-auto rounded-lg bg-gray-900 p-4 text-sm text-gray-100">
// //                 {`// In your template
// // const siteContent = await getSiteContent();
// // const customFields = siteContent.customFields;

// // // Access template field
// // const bannerText = customFields["modern.banner.text"];

// // // Access custom field
// // const myField = customFields["my.custom.key"];`}
// //               </pre>
// //             </CardContent>
// //           </Card>
// //         </div>
// //       </div>
// //     </div>
// //   );
// // }
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Plus, Save, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { groupFieldsByPage, PAGE_METADATA } from "~/lib/template-fields";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("global");

  // Group fields by page
  const groupedFields = groupFieldsByPage(business.templateId);
  const allPages = Object.keys(groupedFields);

  // Initialize custom fields
  const initialFields = siteContent.customFields ?? {};
  const [customFields, setCustomFields] =
    useState<Record<string, string>>(initialFields);

  // Track which fields have been modified
  const [modifiedFields, setModifiedFields] = useState<Set<string>>(new Set());

  // Custom key-value pairs (organized by page)
  const [customPairs, setCustomPairs] = useState<
    Array<{ key: string; value: string; page: string }>
  >(() => {
    const allTemplateKeys = new Set(
      Object.values(groupedFields)
        .flat()
        .map((f) => f.key),
    );
    return Object.entries(initialFields)
      .filter(([key]) => !allTemplateKeys.has(key))
      .map(([key, value]) => {
        // Try to infer page from key (e.g., "homepage.hero.title" → "homepage")
        const page = key.split(".")[0] ?? "global";
        return { key, value: value as string, page };
      });
  });

  // Sync state from server
  useEffect(() => {
    const nextFields = siteContent.customFields ?? {};
    const nextAllTemplateKeys = new Set(
      Object.values(groupedFields)
        .flat()
        .map((f) => f.key),
    );
    setCustomFields(nextFields);
    setCustomPairs(
      Object.entries(nextFields)
        .filter(([key]) => !nextAllTemplateKeys.has(key))
        .map(([key, value]) => {
          const page = key.split(".")[0] ?? "global";
          return { key, value: value as string, page };
        }),
    );
    setModifiedFields(new Set());
  }, [JSON.stringify(siteContent.customFields), business.templateId]);

  const updateSiteContent = api.content.updateSiteContent.useMutation({
    onSuccess: () => {
      toast.success("Template fields updated");
      setModifiedFields(new Set());
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
  const filterFields = (fields: (typeof groupedFields)[string]) => {
    if (!searchQuery) return fields;
    return fields.filter(
      (field) =>
        field.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        field.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        field.key.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  };

  const getFieldsForPage = (page: string) => {
    const templateFields = groupedFields[page] ?? [];
    const pageCustomPairs = customPairs.filter((p) => p.page === page);
    return { templateFields, customPairs: pageCustomPairs };
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
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
        </div>

        {/* Main Content */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Template Content</CardTitle>
                <CardDescription>
                  Edit content organized by page
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
              <TabsList className="mb-6 grid w-full grid-cols-4 lg:grid-cols-8">
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
                    <TabsTrigger key={page} value={page} className="relative">
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

                    {/* Template Fields */}
                    {filteredFields.length > 0 && (
                      <div className="space-y-6">
                        <div>
                          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900">
                            Template Fields
                            <Badge variant="outline">
                              {filteredFields.length}
                            </Badge>
                          </h3>

                          <div className="space-y-6">
                            {filteredFields.map((field) => (
                              <div key={field.key} className="space-y-2">
                                <Label
                                  htmlFor={field.key}
                                  className="flex items-center gap-2"
                                >
                                  {field.label}
                                  {modifiedFields.has(field.key) && (
                                    <Badge
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      Modified
                                    </Badge>
                                  )}
                                </Label>

                                {field.type === "gallery" ? (
                                  <GalleryFieldSelect
                                    value={customFields[field.key] ?? undefined}
                                    onChange={(value) =>
                                      handleFieldChange(field.key, value)
                                    }
                                    businessId={business.id}
                                  />
                                ) : field.type === "textarea" ? (
                                  <Textarea
                                    id={field.key}
                                    value={customFields[field.key] ?? ""}
                                    onChange={(e) =>
                                      handleFieldChange(
                                        field.key,
                                        e.target.value,
                                      )
                                    }
                                    placeholder={field.description}
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
                                    value={customFields[field.key] ?? ""}
                                    onChange={(e) =>
                                      handleFieldChange(
                                        field.key,
                                        e.target.value,
                                      )
                                    }
                                    placeholder={field.description}
                                  />
                                )}

                                <p className="text-xs text-gray-500">
                                  {field.description}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

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

                    {/* Custom Fields for this page */}
                    <div>
                      <div className="mb-4 flex items-center justify-between">
                        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                          Custom Fields
                          {pagePairs.length > 0 && (
                            <Badge variant="outline">{pagePairs.length}</Badge>
                          )}
                        </h3>
                        <Button
                          onClick={() => addCustomPair(page)}
                          size="sm"
                          variant="outline"
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add Custom Field
                        </Button>
                      </div>

                      {pagePairs.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
                          <p className="mb-3 text-sm text-gray-500">
                            No custom fields for this page yet
                          </p>
                          <Button
                            onClick={() => addCustomPair(page)}
                            size="sm"
                            variant="outline"
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Add First Custom Field
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {pagePairs.map((pair, index) => {
                            const globalIndex = customPairs.indexOf(pair);
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
                                            updateCustomPair(
                                              globalIndex,
                                              "key",
                                              e.target.value,
                                            )
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
                                            updateCustomPair(
                                              globalIndex,
                                              "value",
                                              e.target.value,
                                            )
                                          }
                                          placeholder="Field value"
                                          className="mt-1"
                                        />
                                      </div>
                                    </div>

                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        deleteCustomPair(globalIndex)
                                      }
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

                    {/* Empty state if no fields at all */}
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

// Gallery Field Select Component
function GalleryFieldSelect({
  value,
  onChange,
  businessId,
}: {
  value: string | undefined;
  onChange: (value: string) => void;
  businessId: string;
}) {
  const { data: galleries } = api.gallery.list.useQuery({ businessId });

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="mt-2">
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
