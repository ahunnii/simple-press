"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import type { RouterOutputs } from "~/trpc/react";
import {
  getServiceTemplateFieldGroups,
  getServiceTemplateFieldsByGroup,
} from "~/lib/service-templates";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { FieldGroup } from "~/app/admin/content/template/_components/template-field-widgets";

type Props = {
  service: RouterOutputs["services"]["getById"];
  embedsEnabled?: boolean;
};

export function ServiceTemplateFieldsEditor({ service, embedsEnabled }: Props) {
  const router = useRouter();

  const initialFields = (service.customFields ?? {}) as Record<string, unknown>;
  const [customFields, setCustomFields] =
    useState<Record<string, unknown>>(initialFields);
  const [isDirty, setIsDirty] = useState(false);

  const updateMutation = api.services.updateCustomFields.useMutation({
    onSuccess: () => {
      toast.dismiss();
      toast.success("Page content saved");
      setIsDirty(false);
      router.refresh();
    },
    onError: (err) => {
      toast.dismiss();
      toast.error(err.message ?? "Failed to save page content");
    },
    onMutate: () => toast.loading("Saving page content…"),
  });

  const handleFieldChange = (key: string, value: unknown) => {
    setCustomFields((prev) => ({ ...prev, [key]: value }));
    setIsDirty(true);
  };

  const handleSave = () => {
    updateMutation.mutate({ id: service.id, customFields });
  };

  const handleReset = () => {
    setCustomFields({ ...initialFields });
    setIsDirty(false);
  };

  const fieldsByGroup = getServiceTemplateFieldsByGroup(
    service.serviceTemplateId,
  );
  const fieldGroups = getServiceTemplateFieldGroups(service.serviceTemplateId);

  // Build a lookup map for group metadata
  const groupMetaMap = new Map(fieldGroups.map((g) => [g.id, g]));

  const hasFields = Object.values(fieldsByGroup).some((f) => f.length > 0);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 rounded-lg border bg-white px-4 py-3">
        <p className="text-sm text-gray-600">
          Editing page content for the{" "}
          <span className="font-medium capitalize">
            {service.serviceTemplateId.replace("service-", "Template ")}
          </span>{" "}
          layout
        </p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!isDirty || updateMutation.isPending}
            onClick={handleReset}
          >
            Reset
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={updateMutation.isPending}
            onClick={handleSave}
          >
            {updateMutation.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      {!hasFields ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">
              No page-content fields are defined for this service template yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(fieldsByGroup).map(([groupId, fields]) => {
          if (fields.length === 0) return null;
          const groupMeta = groupMetaMap.get(groupId);
          const isUngrouped = groupId === "ungrouped";

          return (
            <FieldGroup
              key={groupId}
              groupId={groupId}
              page="service"
              groupMeta={groupMeta}
              fields={fields}
              customFields={customFields}
              onFieldChange={handleFieldChange}
              isUngrouped={isUngrouped}
              embedsEnabled={embedsEnabled}
            />
          );
        })
      )}
    </div>
  );
}
