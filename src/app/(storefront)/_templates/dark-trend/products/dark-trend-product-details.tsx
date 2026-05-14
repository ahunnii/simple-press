"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { RouterOutputs } from "~/trpc/react";
import { parseCardAdditionalFields } from "~/lib/products";
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
  const additional = parseCardAdditionalFields(product.additionalFields);

  return (
    <div className="py-16">
      <div className="border-t border-white/10">
        {panels.map((panel) => {
          const isOpen = open === panel.id;
          return (
            <div key={panel.id} className="border-b border-white/10">
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : panel.id)}
                className="flex w-full items-center justify-between py-6 text-left"
              >
                <div className="flex items-baseline gap-4">
                  <span className="font-mono text-sm text-purple-500">
                    {panel.number}
                  </span>
                  <span className="text-lg font-semibold tracking-tight text-white">
                    {panel.title}
                  </span>
                </div>
                <span className="text-white/60">
                  {isOpen ? (
                    <Minus className="h-4 w-4" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                </span>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    key={panel.id}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
                    className="overflow-hidden"
                    style={{ overflowX: "hidden" }}
                  >
                    <div className="pb-8 pl-12 pr-4">
                      {panel.id === "description" && (
                        <p className="whitespace-pre-line text-base leading-relaxed text-white/70">
                          {product.description}
                        </p>
                      )}
                      {panel.id === "additional" && (
                        <>
                          {additional?.additionalInformation ? (
                            <TiptapRenderer
                              content={additional.additionalInformation as TiptapJSON}
                              className="prose prose-sm prose-invert max-w-none text-white/70"
                            />
                          ) : (
                            <p className="text-sm text-white/40">
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
