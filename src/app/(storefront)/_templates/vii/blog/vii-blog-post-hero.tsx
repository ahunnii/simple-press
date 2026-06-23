import Image from "next/image";

import { formatDate } from "~/lib/utils";

import { ViiOverline } from "../shared/vii-overline";

type Props = {
  image?: string;
  title: string;
  createdAt: Date;
};

export function ViiBlogPostHero({ image, title, createdAt }: Props) {
  const hasImage = !!image?.trim();

  return (
    <section
      aria-label={title}
      style={{
        position: "relative",
        width: "100%",
        minHeight: "clamp(360px, 52vw, 620px)",
        display: "flex",
        alignItems: "flex-end",
        overflow: "hidden",
        background: "var(--vii-navy)",
      }}
    >
      {/* Background image — meaningful alt (article lead image) */}
      {hasImage ? (
        <Image
          src={image!}
          alt={title}
          fill
          priority
          sizes="100vw"
          style={{ objectFit: "cover", objectPosition: "center 30%" }}
        />
      ) : (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(160deg, var(--vii-navy) 0%, var(--vii-slate) 100%)",
          }}
        />
      )}

      {/* Scrim */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to top, color-mix(in srgb, var(--vii-navy) 82%, transparent) 0%, color-mix(in srgb, var(--vii-navy) 30%, transparent) 55%, color-mix(in srgb, var(--vii-navy) 12%, transparent) 100%)",
          zIndex: 1,
        }}
      />

      {/* Content — bottom-left aligned */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          padding: "0 clamp(24px, 6vw, 96px) clamp(48px, 7vh, 88px)",
          maxWidth: 820,
        }}
      >
        <ViiOverline align="left" tone="dark" style={{ marginBottom: 16 }}>
          {`JOURNAL · ${formatDate(createdAt)}`}
        </ViiOverline>

        <h1
          style={{
            fontFamily: "var(--font-serif)",
            fontWeight: 400,
            fontSize: "clamp(36px, 6vw, 80px)",
            lineHeight: 1.05,
            color: "var(--vii-paper)",
            margin: 0,
            textWrap: "balance",
          }}
        >
          {title}
        </h1>
      </div>
    </section>
  );
}
