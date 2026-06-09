"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronUp, Layers } from "lucide-react";
import { toast } from "sonner";

import { getAvailableTemplates } from "~/lib/template-ownership";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

export function TemplateSelectorDevTool() {
  if (process.env.NODE_ENV !== "development") return null;
  return <TemplateSelectorInner />;
}

function TemplateSelectorInner() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const { data: business, isLoading } = api.business.simplifiedGet.useQuery();
  const utils = api.useUtils();

  const templates = getAvailableTemplates(business?.subdomain ?? "");

  const { mutate: updateTemplate, isPending } =
    api.content.updateSiteContent.useMutation({
      onSuccess: (_, variables) => {
        toast.success(`Template switched to "${variables.templateId}"`);
        void utils.business.simplifiedGet.invalidate();
        router.refresh();
        setOpen(false);
      },
      onError: () => {
        toast.error("Failed to switch template");
      },
    });

  const handleSelect = (templateId: string) => {
    if (templateId === business?.templateId || isPending) return;
    updateTemplate({ templateId });
  };

  const currentTemplate = templates.find(
    (t) => t.value === business?.templateId,
  );

  return (
    <div className="fixed right-4 bottom-4 z-9999 flex flex-col items-end gap-2">
      {open && (
        <div className="mb-1 overflow-hidden rounded-xl border border-white/10 bg-neutral-900 shadow-2xl">
          <div className="border-b border-white/10 px-3 py-2">
            <p className="text-[10px] font-semibold tracking-widest text-neutral-500 uppercase">
              Template
            </p>
          </div>
          <ul className="flex flex-col py-1">
            {templates.map((template) => {
              const isActive = template.value === business?.templateId;
              return (
                <li key={template.value}>
                  <button
                    onClick={() => handleSelect(template.value)}
                    disabled={isPending}
                    className={cn(
                      "flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors",
                      isActive
                        ? "text-white"
                        : "text-neutral-400 hover:bg-white/5 hover:text-white",
                      isPending && "cursor-not-allowed opacity-50",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                        isActive
                          ? "border-white bg-white"
                          : "border-neutral-600",
                      )}
                    >
                      {isActive && (
                        <Check className="h-2.5 w-2.5 text-neutral-900" />
                      )}
                    </span>
                    {template.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium shadow-lg transition-all select-none",
          open
            ? "border-white/20 bg-neutral-800 text-white"
            : "border-white/10 bg-neutral-900 text-neutral-400 hover:border-white/20 hover:text-white",
        )}
        title="Switch template"
      >
        <Layers className="h-3.5 w-3.5" />
        <span className="max-w-[96px] truncate">
          {isLoading
            ? "…"
            : (currentTemplate?.label ?? business?.templateId ?? "Template")}
        </span>
        <ChevronUp
          className={cn(
            "h-3 w-3 transition-transform duration-200",
            open ? "rotate-180" : "rotate-0",
          )}
        />
      </button>
    </div>
  );
}
