"use client";

type Props = {
  variantOptions: Record<string, string[]>;
  selectedOptions: Record<string, string>;
  onSelect: (optionType: string, value: string) => void;
};

/**
 * Dedicated pill-style variant selector, driven entirely by `useProduct`'s
 * derived `variantOptions`/`selectedOptions`/`handleOptionSelect` — no cart
 * or price logic lives here (page-playbooks.md → ProductPage: "delegate to a
 * dedicated variant-selector component").
 */
export function PinkProductVariantPills({ variantOptions, selectedOptions, onSelect }: Props) {
  const entries = Object.entries(variantOptions);
  if (entries.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      {entries.map(([optionType, values]) => (
        <div key={optionType} className="flex flex-col gap-2.5">
          <p className="pink-label">{optionType}</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label={optionType}>
            {values.map((value) => {
              const active = selectedOptions[optionType] === value;
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onSelect(optionType, value)}
                  className="px-4 py-2.5 text-[14px] font-medium transition-colors"
                  style={{
                    border: `1px solid ${active ? "var(--pink-ink)" : "var(--pink-line-strong)"}`,
                    background: active ? "var(--pink-ink)" : "transparent",
                    color: active ? "var(--pink-paper)" : "var(--pink-ink)",
                  }}
                >
                  {value}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
