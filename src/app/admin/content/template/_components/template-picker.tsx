"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { TEMPLATES } from "~/lib/constants";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";

type Props = {
  currentTemplateId: string;
  availableTemplateIds: string[];
};

export function TemplatePicker({
  currentTemplateId,
  availableTemplateIds,
}: Props) {
  const router = useRouter();

  // Only templates this business may use, plus its current one (so an existing
  // assignment always stays visible/active even if it isn't otherwise allowed).
  const selectableTemplates = TEMPLATES.filter(
    (t) =>
      availableTemplateIds.includes(t.id) || t.id === currentTemplateId,
  );
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const updateTemplate = api.business.updateTemplate.useMutation({
    onSuccess: () => {
      toast.success("Template updated. Your storefront now uses the new template.");
      setConfirmOpen(false);
      setPendingId(null);
      router.refresh();
    },
    onError: (err) => {
      toast.error(err.message ?? "Failed to update template.");
    },
  });

  const pendingTemplate = TEMPLATES.find((t) => t.id === pendingId);
  const currentTemplate = TEMPLATES.find((t) => t.id === currentTemplateId);

  function handleSelect(id: string) {
    if (id === currentTemplateId) return;
    setPendingId(id);
    setConfirmOpen(true);
  }

  function handleConfirm() {
    if (!pendingId) return;
    updateTemplate.mutate({ templateId: pendingId });
  }

  return (
    <>
      <div className="mb-8">
        <div className="mb-4 flex items-center gap-3">
          <div>
            <h2 className="text-lg font-semibold">Active Template</h2>
            <p className="text-muted-foreground text-sm">
              Select a template to switch your storefront design. Your content
              fields will be preserved, but template-specific fields may reset
              to defaults.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {selectableTemplates.map((template) => {
            const isCurrent = template.id === currentTemplateId;
            return (
              <Card
                key={template.id}
                onClick={() => handleSelect(template.id)}
                className={cn(
                  "relative cursor-pointer transition-all",
                  isCurrent
                    ? "ring-primary ring-2"
                    : "hover:ring-muted-foreground/30 hover:ring-2",
                )}
              >
                {isCurrent && (
                  <CheckCircle2 className="text-primary absolute top-3 right-3 h-5 w-5" />
                )}

                {/* Preview image or gradient fallback */}
                <div className="bg-muted relative aspect-video overflow-hidden rounded-t-lg">
                  <Image
                    src={template.previewImage}
                    alt={`${template.name} preview`}
                    fill
                    className="object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display =
                        "none";
                    }}
                  />
                </div>

                <CardHeader className="p-4 pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-sm font-semibold">
                      {template.name}
                    </CardTitle>
                    {isCurrent && (
                      <Badge variant="secondary" className="shrink-0 text-xs">
                        Active
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="text-xs leading-relaxed">
                    {template.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Switch to {pendingTemplate?.name}?</DialogTitle>
            <DialogDescription>
              Your storefront will immediately switch from{" "}
              <strong>{currentTemplate?.name ?? currentTemplateId}</strong> to{" "}
              <strong>{pendingTemplate?.name}</strong>. Saved content fields
              remain intact, but any template-specific fields will show their
              default values until you customise them.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={updateTemplate.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={updateTemplate.isPending}
            >
              {updateTemplate.isPending ? "Switching…" : "Switch template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
