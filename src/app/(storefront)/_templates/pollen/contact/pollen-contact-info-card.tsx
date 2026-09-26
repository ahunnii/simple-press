import type { LucideIcon } from "lucide-react";
import Link from "next/link";

type Props = {
  Icon: LucideIcon;
  label: string;
  value: string;
  href?: string;
  /** Label/value rows (e.g. business hours) rendered instead of `value`. */
  lines?: { label: string; value: string }[];
};
export function PollenContactInfoCard({
  Icon,
  label,
  value,
  href,
  lines,
}: Props) {
  return (
    <div className="group rounded-lg bg-[#E5E8E0] px-6 py-8 text-left transition-colors duration-200 hover:bg-[#5B8A3F]">
      <div className="mb-4 flex justify-center">
        <Icon
          className="h-8 w-8 text-[#215935] transition-colors duration-200 group-hover:text-white"
          aria-hidden
        />
      </div>
      <h3 className="mb-2 text-lg font-bold text-[#215935] transition-colors duration-200 group-hover:text-white">
        {label}
      </h3>
      {lines ? (
        <dl className="space-y-1 text-sm text-[#215935] transition-colors duration-200 group-hover:text-white">
          {lines.map((line, i) => (
            <div
              key={line.label + String(i)}
              className="flex items-baseline justify-between gap-3"
            >
              <dt className="font-medium">{line.label}</dt>
              <dd>{line.value}</dd>
            </div>
          ))}
        </dl>
      ) : href ? (
        <Link
          href={href}
          className="text-sm font-normal text-[#215935] underline transition-colors duration-200 group-hover:text-white"
        >
          {value}
        </Link>
      ) : (
        <p className="text-sm font-normal text-[#215935] transition-colors duration-200 group-hover:text-white">
          {value}
        </p>
      )}
    </div>
  );
}
