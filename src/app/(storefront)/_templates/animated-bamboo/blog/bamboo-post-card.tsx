import Image from "next/image";
import Link from "next/link";

import { cn, formatDate } from "~/lib/utils";

import { BambooGlyph } from "../shared/bamboo-glyph";

/**
 * Blog card art + the card itself, shared by the Insights index
 * (`bamboo-blog-page.tsx`) and the "Keep reading" rail at the foot of a post
 * (`bamboo-blog-post-page.tsx`).
 *
 * Two art states, both sitting on the card system's `.bamboo-blob`:
 *  - the post HAS a cover image → the `.bamboo-card-photo` roll-paper frame;
 *  - the post has NO cover image → an illustrated fallback composed here from
 *    the sprite's `#leafP` primitive inside a POSITIVE-origin viewBox of our
 *    own (never a symbol's negative-origin viewBox on the wrapper — see
 *    `shared/bamboo-glyph.tsx`). Three compositions cycle by index so a grid
 *    of image-less posts never reads stamped.
 */

/** Per-card blob personality — shape, tint and angle vary by position. */
export function bambooBlobStyle(index: number): React.CSSProperties {
  const variant = index % 3;
  if (variant === 1) {
    return {
      "--bc": "var(--bamboo-sage-deep)",
      "--br": "9deg",
      "--bw": "74%",
      "--bh": "81%",
      "--brad": "44% 56% 62% 38% / 53% 42% 58% 47%",
    } as React.CSSProperties;
  }
  if (variant === 2) {
    return {
      "--bc":
        "color-mix(in srgb, var(--bamboo-sage) 55%, var(--bamboo-sage-deep) 45%)",
      "--br": "-3deg",
      "--bw": "79%",
      "--bh": "73%",
      "--brad": "64% 36% 39% 61% / 37% 59% 41% 63%",
    } as React.CSSProperties;
  }
  return {
    "--bc": "var(--bamboo-sage)",
    "--br": "-13deg",
    "--bw": "80%",
    "--bh": "76%",
    "--brad": "58% 42% 47% 53% / 45% 52% 48% 55%",
  } as React.CSSProperties;
}

export function BambooPostArt({
  index,
  className,
}: {
  index: number;
  className?: string;
}) {
  const variant = index % 3;

  if (variant === 1) {
    return (
      <svg
        viewBox="0 0 200 160"
        className={cn("relative block h-auto", className)}
        aria-hidden="true"
        focusable="false"
      >
        <ellipse
          cx="88"
          cy="150"
          rx="40"
          ry="6"
          fill="var(--bamboo-ill-stem)"
          opacity={0.16}
        />
        <path
          d="M74,150 C 72,138 72,132 74,124"
          fill="none"
          stroke="var(--bamboo-ill-stem)"
          strokeWidth={5}
          strokeLinecap="round"
        />
        <use
          href="#leafP"
          fill="var(--bamboo-ill-leaf-dark)"
          transform="translate(74,122) rotate(-64) scale(0.56)"
        />
        <use
          href="#leafP"
          fill="var(--bamboo-ill-leaf-mid)"
          transform="translate(74,124) rotate(-34) scale(0.64)"
        />
        <use
          href="#leafP"
          fill="var(--bamboo-ill-leaf-light)"
          transform="translate(74,126) rotate(-6) scale(0.58)"
        />
        <use
          href="#leafP"
          fill="var(--bamboo-ill-leaf-pale)"
          transform="translate(74,128) rotate(22) scale(0.46)"
        />
      </svg>
    );
  }

  if (variant === 2) {
    return (
      <svg
        viewBox="0 0 200 160"
        className={cn("relative block h-auto", className)}
        aria-hidden="true"
        focusable="false"
      >
        <ellipse
          cx="101"
          cy="150"
          rx="30"
          ry="6"
          fill="var(--bamboo-ill-stem)"
          opacity={0.16}
        />
        <rect
          x="88"
          y="30"
          width="26"
          height="118"
          rx="11"
          fill="var(--bamboo-ill-culm)"
        />
        <rect
          x="92"
          y="35"
          width="6"
          height="108"
          rx="3"
          fill="var(--bamboo-ill-culm-hi)"
          opacity={0.8}
        />
        <path
          d="M88,68 H114"
          stroke="var(--bamboo-ill-culm-deep)"
          strokeWidth={4}
        />
        <path
          d="M88,106 H114"
          stroke="var(--bamboo-ill-culm-deep)"
          strokeWidth={4}
        />
        <use
          href="#leafP"
          fill="var(--bamboo-ill-leaf-mid)"
          transform="translate(112,64) rotate(-30) scale(0.5)"
        />
        <use
          href="#leafP"
          fill="var(--bamboo-ill-leaf-dark)"
          transform="translate(90,102) rotate(210) scale(0.46)"
        />
        <use
          href="#leafP"
          fill="var(--bamboo-ill-leaf-light)"
          transform="translate(112,102) rotate(-8) scale(0.4)"
        />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 200 160"
      className={cn("relative block h-auto", className)}
      aria-hidden="true"
      focusable="false"
    >
      <ellipse
        cx="100"
        cy="150"
        rx="34"
        ry="6"
        fill="var(--bamboo-ill-stem)"
        opacity={0.16}
      />
      <path
        d="M100,148 C 95,116 97,84 105,54"
        fill="none"
        stroke="var(--bamboo-ill-stem)"
        strokeWidth={5}
        strokeLinecap="round"
      />
      <use
        href="#leafP"
        fill="var(--bamboo-ill-leaf-dark)"
        transform="translate(99,120) rotate(-34) scale(0.44)"
      />
      <use
        href="#leafP"
        fill="var(--bamboo-ill-leaf-mid)"
        transform="translate(97,106) rotate(212) scale(0.4)"
      />
      <use
        href="#leafP"
        fill="var(--bamboo-ill-leaf-light)"
        transform="translate(101,88) rotate(-26) scale(0.48)"
      />
      <use
        href="#leafP"
        fill="var(--bamboo-ill-leaf-mid)"
        transform="translate(100,74) rotate(206) scale(0.42)"
      />
      <use
        href="#leafP"
        fill="var(--bamboo-ill-leaf-dark)"
        transform="translate(105,58) rotate(-48) scale(0.42)"
      />
    </svg>
  );
}

/**
 * The roll-paper frame around a real cover photo. `sizes` is passed in by the
 * caller because the lead card, the index grid and the related rail all
 * occupy very different fractions of the viewport.
 */
export function BambooPostPhoto({
  src,
  sizes,
  priority,
  width = "78%",
}: {
  src: string;
  sizes: string;
  priority?: boolean;
  width?: string;
}) {
  return (
    <span
      className="bamboo-card-photo"
      style={{ "--aw": width } as React.CSSProperties}
    >
      <span className="relative block aspect-[1200/1011] w-full overflow-hidden rounded-lg">
        <Image
          src={src}
          alt=""
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
        />
      </span>
    </span>
  );
}

/**
 * Structural, not `Page` — the blog routes hand templates a widened router
 * output (draft columns nulled, `createdAt` coalesced to `publishedAt`), so a
 * nominal `Page` prop would force every call site through an `as` cast.
 */
export type BambooPostCardPost = {
  slug: string;
  title: string;
  excerpt: string | null;
  image: string | null;
  createdAt: Date;
};

type PostCardProps = {
  post: BambooPostCardPost;
  index: number;
  sizes?: string;
};

export function BambooPostCard({ post, index, sizes }: PostCardProps) {
  return (
    <article
      className="bamboo-card bamboo-reveal-item flex flex-col"
      style={{ "--i": index } as React.CSSProperties}
    >
      <div className="bamboo-card-art">
        <span className="bamboo-blob" style={bambooBlobStyle(index)} />
        {post.image ? (
          <BambooPostPhoto
            src={post.image}
            sizes={
              sizes ?? "(max-width: 640px) 84vw, (max-width: 1024px) 40vw, 26vw"
            }
          />
        ) : (
          <BambooPostArt index={index} className="w-[84%]" />
        )}
        <span className="bamboo-sprout" aria-hidden="true">
          <BambooGlyph id="s-sprig" className="block h-auto w-full" />
        </span>
      </div>

      <h3 className="font-heading mt-4 text-[1.22rem] leading-snug font-semibold text-[var(--bamboo-pine)]">
        <Link href={`/blog/${post.slug}`} className="bamboo-card-link">
          {post.title}
        </Link>
      </h3>

      {post.excerpt ? (
        <p className="mt-2 text-[0.95rem] leading-relaxed text-[var(--bamboo-ink-soft)]">
          {post.excerpt}
        </p>
      ) : null}

      <div className="bamboo-card-foot mt-auto pt-4">
        <time
          className="text-[0.82rem] text-[var(--bamboo-muted)]"
          dateTime={new Date(post.createdAt).toISOString()}
        >
          {formatDate(post.createdAt)}
        </time>
        <span
          aria-hidden="true"
          className="text-[0.86rem] font-medium text-[var(--bamboo-terracotta-deep)]"
        >
          Read →
        </span>
      </div>
    </article>
  );
}
