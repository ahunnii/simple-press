"use client";

type Props = {
  value: string;
  onChange: (value: string) => void;
  resultCount?: number;
};

export function SledgeBlogSearch({ value, onChange, resultCount }: Props) {
  const showResults = value.trim().length > 0 && resultCount !== undefined;

  return (
    <div className="sl-blog-search">
      <svg
        width="14"
        height="14"
        viewBox="0 0 16 16"
        fill="none"
        className="flex-shrink-0 text-[var(--sl-ink)] opacity-50"
        aria-hidden="true"
      >
        <circle
          cx="6.5"
          cy="6.5"
          r="5"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M10.5 10.5L14 14"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
      <input
        type="search"
        placeholder="Search posts…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Search blog posts"
      />
      {showResults ? (
        <span className="sl-eyebrow flex-shrink-0 font-sans text-xs tracking-[0.12em] uppercase">
          {resultCount} result{resultCount !== 1 ? "s" : ""}
        </span>
      ) : null}
    </div>
  );
}
