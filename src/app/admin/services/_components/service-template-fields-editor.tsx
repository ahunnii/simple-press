"use client";

import {
  getServiceTemplateFieldGroups,
  getServiceTemplateFieldsByGroup,
  SERVICE_TEMPLATE_DEFS,
} from "~/lib/service-templates";
import { Card, CardContent } from "~/components/ui/card";
import { FieldGroup } from "~/app/admin/content/template/_components/template-field-widgets";

type Props = {
  serviceTemplateId: string;
  /** Draft field values owned by `ServiceEditor`. */
  customFields: Record<string, unknown>;
  onFieldChange: (key: string, value: unknown) => void;
  embedsEnabled?: boolean;
};

/**
 * Body of the "Page content" tab. Purely presentational — the draft state, the
 * dirty flag, and the `services.updateCustomFields` mutation all live in
 * `ServiceEditor` so they're covered by the shared toolbar and the
 * unsaved-changes navigation guard.
 */
export function ServiceTemplateFieldsEditor({
  serviceTemplateId,
  customFields,
  onFieldChange,
  embedsEnabled,
}: Props) {
  const fieldsByGroup = getServiceTemplateFieldsByGroup(serviceTemplateId);
  const fieldGroups = getServiceTemplateFieldGroups(serviceTemplateId);

  // Build a lookup map for group metadata
  const groupMetaMap = new Map(fieldGroups.map((g) => [g.id, g]));

  const hasFields = Object.values(fieldsByGroup).some((f) => f.length > 0);

  // Read the human label from the service-template registry. (The old
  // `serviceTemplateId.replace("service-", "Template ")` only produced
  // sensible text for the generic `service-one/two/three` ids.)
  const templateLabel =
    SERVICE_TEMPLATE_DEFS[serviceTemplateId]?.label ?? serviceTemplateId;

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        Editing page content for the{" "}
        <span className="text-foreground font-medium">{templateLabel}</span>{" "}
        layout
      </p>

      {!hasFields ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
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
              onFieldChange={onFieldChange}
              isUngrouped={isUngrouped}
              embedsEnabled={embedsEnabled}
            />
          );
        })
      )}
    </div>
  );
}
