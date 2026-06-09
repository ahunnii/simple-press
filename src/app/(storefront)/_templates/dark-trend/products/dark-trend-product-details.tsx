"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { RouterOutputs } from "~/trpc/react";
import { parseCardAdditionalFields } from "~/lib/products";
import { isContentEmpty } from "~/lib/template-fields";
import { TiptapRenderer } from "~/components/tiptap-renderer";

type Props = {
  product: NonNullable<RouterOutputs["product"]["get"]>;
};

const panels = [
  { id: "description", number: "01.", title: "Description" },
  { id: "additional", number: "02.", title: "Additional Information" },
] as const;

export function DarkTrendProductDetails({ product }: Props) {
  const [open, setOpen] = useState<string | null>("description");
  const shouldReduceMotion = useReducedMotion();
  const additional = parseCardAdditionalFields(product.additionalFields);

  const isAdditionalEmpty = isContentEmpty(
    additional?.additionalInformation as TiptapJSON,
  );

  return (
    <div className="py-16">
      <div className="border-t border-white/10">
        {panels.map((panel) => {
          const isOpen = open === panel.id;
          const btnId = `dark-trend-btn-${panel.id}`;
          const panelId = `dark-trend-panel-${panel.id}`;
          return (
            <div key={panel.id} className="border-b border-white/10">
              <button
                id={btnId}
                type="button"
                onClick={() => setOpen(isOpen ? null : panel.id)}
                aria-expanded={isOpen}
                aria-controls={panelId}
                className="flex w-full items-center justify-between py-6 text-left"
              >
                <div className="flex items-baseline gap-4">
                  <span className="font-mono text-sm text-purple-400">
                    {panel.number}
                  </span>
                  <span className="text-lg font-semibold tracking-tight">
                    {panel.title}
                  </span>
                </div>
                <span className="text-muted-foreground">
                  {isOpen ? (
                    <Minus className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Plus className="h-4 w-4" aria-hidden="true" />
                  )}
                </span>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    key={panel.id}
                    id={panelId}
                    role="region"
                    aria-labelledby={btnId}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{
                      duration: shouldReduceMotion ? 0 : 0.35,
                      ease: [0.25, 0.46, 0.45, 0.94],
                    }}
                    className="overflow-hidden"
                    style={{ overflowX: "hidden" }}
                  >
                    <div className="pr-4 pb-8 pl-12">
                      {panel.id === "description" && (
                        <p className="text-base leading-relaxed whitespace-pre-line text-white/70">
                          {product.description}
                        </p>
                      )}
                      {panel.id === "additional" && (
                        <>
                          {!isAdditionalEmpty ? (
                            <TiptapRenderer
                              content={
                                additional.additionalInformation as TiptapJSON
                              }
                              className="prose prose-sm prose-invert max-w-none text-white/70"
                            />
                          ) : (
                            <p className="text-sm text-white/60">
                              No additional information available.
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
