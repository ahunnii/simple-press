type Props = {
  title: string;
  lines: string[];
  links?: (string | null)[];
};
export function NoiseContactInfoBlock({ title, lines, links }: Props) {
  return (
    <div className="bg-(--vn-bone) px-6 py-[22px] text-left">
      <p className="mb-3 font-mono text-[10px] tracking-[0.22em] text-(--vn-steel-mist) uppercase">
        {title}
      </p>
      <div className="font-sans text-[14px] leading-[1.85] text-(--vn-ink)">
        {lines.map((line, i) => {
          const href = links?.[i];
          return href ? (
            <a
              key={i}
              href={href}
              className="block transition-opacity hover:opacity-70"
            >
              {line}
            </a>
          ) : (
            <span key={i} className="block">
              {line}
            </span>
          );
        })}
      </div>
    </div>
  );
}
