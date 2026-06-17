import Image from "next/image";

type Props = {
  bandImage?: string;
};

export function ViiImageBand({ bandImage }: Props) {
  if (!bandImage?.trim()) {
    // Render a thin navy divider when no image is configured
    return (
      <div
        aria-hidden="true"
        style={{
          width: "100%",
          height: 8,
          background: "var(--vii-navy)",
        }}
      />
    );
  }

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "clamp(240px, 30vw, 480px)",
        overflow: "hidden",
      }}
    >
      <Image
        src={bandImage}
        alt=""
        fill
        sizes="100vw"
        style={{ objectFit: "cover" }}
      />
    </div>
  );
}
