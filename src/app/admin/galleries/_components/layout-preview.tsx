"use client";

type Props = {
  layout: string;
  columns: number;
  gap: number;
  aspectRatio?: string;
};

function aspectClass(ratio: string | undefined): string {
  switch (ratio) {
    case "4:3":
      return "aspect-[4/3]";
    case "16:9":
      return "aspect-video";
    case "3:4":
      return "aspect-[3/4]";
    case "original":
      return "aspect-auto";
    case "1:1":
    default:
      return "aspect-square";
  }
}

export function LayoutPreview({ layout, columns, gap, aspectRatio }: Props) {
  const placeholders = Array.from({ length: 6 }, (_, i) => i);

  if (layout === "carousel") {
    return (
      <div className="relative aspect-video overflow-hidden rounded-lg bg-gray-100">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-full w-full bg-gray-200" />
        </div>
        <div className="absolute top-1/2 left-3 -translate-y-1/2 rounded-full bg-gray-500/60 p-1 text-white text-xs">
          ‹
        </div>
        <div className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full bg-gray-500/60 p-1 text-white text-xs">
          ›
        </div>
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`h-2 w-2 rounded-full ${i === 0 ? "bg-gray-700" : "bg-gray-300"}`}
            />
          ))}
        </div>
      </div>
    );
  }

  if (layout === "masonry") {
    return (
      <div
        style={{
          columnCount: columns,
          columnGap: `${gap}px`,
        }}
      >
        {placeholders.map((i) => (
          <div
            key={i}
            className="break-inside-avoid"
            style={{
              marginBottom: `${gap}px`,
              height: i % 3 === 0 ? "100px" : i % 3 === 1 ? "70px" : "55px",
            }}
          >
            <div className="h-full w-full rounded bg-gray-200" />
          </div>
        ))}
      </div>
    );
  }

  if (layout === "collage") {
    return (
      <div
        className="grid"
        style={{
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: `${gap}px`,
        }}
      >
        {placeholders.map((i) => (
          <div
            key={i}
            className="rounded bg-gray-200"
            style={
              i === 0
                ? { gridColumn: "span 2", gridRow: "span 2", aspectRatio: "1" }
                : { aspectRatio: "1/1" }
            }
          />
        ))}
      </div>
    );
  }

  if (layout === "justified") {
    return (
      <div
        className="flex flex-wrap"
        style={{ gap: `${gap}px` }}
      >
        {placeholders.map((i) => (
          <div
            key={i}
            className="rounded bg-gray-200"
            style={{
              height: "60px",
              flexGrow: 1,
              minWidth: "60px",
              flexBasis: `${60 + (i % 3) * 20}px`,
            }}
          />
        ))}
      </div>
    );
  }

  // Grid layout (default)
  return (
    <div
      className="grid"
      style={{
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: `${gap}px`,
      }}
    >
      {placeholders.map((i) => (
        <div key={i} className={`rounded bg-gray-200 ${aspectClass(aspectRatio)}`} />
      ))}
    </div>
  );
}
