"use client";

import type { KeyboardEvent } from "react";
import { useEffect, useState } from "react";
import Image from "next/image";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ChevronLeft, ChevronRight, Maximize2, X } from "lucide-react";

import { cn } from "~/lib/utils";
import { useVariantImage } from "~/app/(storefront)/_components/product-page/variant-image-context";

type GalleryImage = { url: string; altText?: string | null };

type Props = {
  images: GalleryImage[];
  productName: string;
};

/**
 * PDP gallery (design.md Product §2): the main photo sits in a rounded
 * --glove-mist card with a round zoom button; a thumbnail row below marks the
 * active photo with a purple ring. The lightbox (B6.1) is a Radix dialog
 * portaled INTO the `.glove` root so tokens resolve: focus trap, Esc, visible
 * close, Left/Right arrows, focus returned to the trigger on close. The
 * selected variant's photo is followed via the route's VariantImageProvider.
 */
export function GloveProductGallery({ images, productName }: Props) {
  const list: GalleryImage[] =
    images.length > 0 ? images : [{ url: "/placeholder.svg", altText: "" }];
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const { variantImageUrl } = useVariantImage();

  useEffect(() => {
    setContainer(document.querySelector<HTMLElement>(".glove"));
  }, []);

  // Jump to the chosen variant's photo; manual thumbnail picks stay put.
  useEffect(() => {
    if (!variantImageUrl) return;
    const i = list.findIndex((img) => img.url === variantImageUrl);
    if (i >= 0) setIndex(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variantImageUrl]);

  const count = list.length;
  const current = list[Math.min(index, count - 1)] ?? list[0];
  const altFor = (img: GalleryImage | undefined, i: number) => {
    const own = img?.altText?.trim() ?? "";
    if (own !== "") return own;
    return count > 1
      ? `${productName}, photo ${i + 1} of ${count}`
      : productName;
  };

  const step = (dir: -1 | 1) => setIndex((i) => (i + dir + count) % count);

  const onLightboxKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (count < 2) return;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      step(1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      step(-1);
    }
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <div className="flex flex-col gap-4">
        <div className="glove-mist-panel relative overflow-hidden p-3 md:p-4">
          <DialogPrimitive.Trigger asChild>
            <button
              type="button"
              className="relative block aspect-square w-full cursor-zoom-in overflow-hidden rounded-[var(--glove-radius-card)] bg-[var(--glove-paper)]"
              aria-label={`Enlarge photo of ${productName}`}
            >
              <Image
                key={current?.url}
                src={current?.url ?? "/placeholder.svg"}
                alt={altFor(current, index)}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 560px"
                className="object-contain motion-safe:animate-[glove-fade-in_300ms_ease-out]"
              />
            </button>
          </DialogPrimitive.Trigger>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute bottom-6 left-6 inline-flex size-10 items-center justify-center rounded-full bg-[var(--glove-paper)] text-[var(--glove-ink)] shadow-[var(--glove-shadow-sm)] md:bottom-7 md:left-7"
          >
            <Maximize2 className="size-4" />
          </span>
        </div>

        {count > 1 ? (
          <ul
            className="m-0 grid list-none grid-cols-4 gap-3 p-0 sm:grid-cols-5"
            aria-label="Product photos"
          >
            {list.map((img, i) => {
              const active = i === index;
              return (
                <li key={`${img.url}-${i}`}>
                  <button
                    type="button"
                    onClick={() => setIndex(i)}
                    aria-pressed={active}
                    aria-label={`Show photo ${i + 1} of ${count}`}
                    className={cn(
                      "relative block aspect-square w-full overflow-hidden rounded-[var(--glove-radius-card)] border bg-[var(--glove-mist)] transition-[box-shadow,border-color] duration-150",
                      active
                        ? "border-[var(--glove-primary)] shadow-[0_0_0_2px_var(--glove-primary)]"
                        : "border-[var(--glove-mist-line)] hover:border-[var(--glove-primary-tint)]",
                    )}
                  >
                    <Image
                      src={img.url}
                      alt=""
                      fill
                      sizes="120px"
                      className="object-cover"
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>

      <DialogPrimitive.Portal container={container}>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[80] bg-[var(--glove-ink)]/90 motion-safe:animate-[glove-fade-in_200ms_ease-out]" />
        <DialogPrimitive.Content
          onKeyDown={onLightboxKey}
          className="glove-on-dark fixed inset-0 z-[81] flex flex-col items-center justify-center p-4 outline-none md:p-10"
          aria-describedby={undefined}
        >
          <DialogPrimitive.Title className="sr-only">
            {productName}
          </DialogPrimitive.Title>
          <div className="relative h-full max-h-[85vh] w-full max-w-5xl">
            <Image
              src={current?.url ?? "/placeholder.svg"}
              alt={altFor(current, index)}
              fill
              sizes="100vw"
              className="object-contain"
            />
          </div>
          {count > 1 ? (
            <>
              <p
                className="glove-body mt-4 text-[14px] text-[var(--glove-on-primary)]"
                aria-live="polite"
              >
                {index + 1} / {count}
              </p>
              <button
                type="button"
                onClick={() => step(-1)}
                aria-label="Previous photo"
                className="absolute top-1/2 left-3 inline-flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--glove-paper)] text-[var(--glove-primary)] shadow-[var(--glove-shadow-md)] md:left-6"
              >
                <ChevronLeft className="size-6" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => step(1)}
                aria-label="Next photo"
                className="absolute top-1/2 right-3 inline-flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--glove-paper)] text-[var(--glove-primary)] shadow-[var(--glove-shadow-md)] md:right-6"
              >
                <ChevronRight className="size-6" aria-hidden="true" />
              </button>
            </>
          ) : null}
          <DialogPrimitive.Close
            aria-label="Close enlarged photo"
            className="absolute top-3 right-3 inline-flex size-12 items-center justify-center rounded-full bg-[var(--glove-paper)] text-[var(--glove-ink)] shadow-[var(--glove-shadow-md)] md:top-6 md:right-6"
          >
            <X className="size-6" aria-hidden="true" />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
