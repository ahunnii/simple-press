"use client";

import { useEffect, useState } from "react";

export function SocialPreviewCard({
  title,
  description,
  ogImageFile,
  existingOgImage,
  siteHost,
}: {
  title: string;
  description: string;
  ogImageFile: File | null | undefined;
  existingOgImage?: string;
  siteHost: string;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!(ogImageFile instanceof File)) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(ogImageFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [ogImageFile]);

  const imageToShow = previewUrl ?? existingOgImage ?? null;

  return (
    <div className="overflow-hidden rounded-lg border bg-white">
      {imageToShow ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageToShow}
          alt="Open Graph preview"
          className="aspect-[1200/630] w-full object-cover"
        />
      ) : (
        <div className="flex aspect-[1200/630] items-center justify-center bg-gray-100 text-sm text-gray-400">
          1200 × 630 — no image set
        </div>
      )}
      <div className="border-t p-3">
        <p className="text-xs tracking-wide text-gray-400 uppercase">
          {siteHost}
        </p>
        <p className="truncate text-sm font-medium text-gray-900">{title}</p>
        {description && (
          <p className="mt-0.5 line-clamp-2 text-sm text-gray-500">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

export function SearchResultPreview({
  host,
  pathPrefix,
  slug,
  title,
  description,
}: {
  host: string;
  pathPrefix: string;
  slug: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="mb-1 truncate text-sm font-medium text-blue-600">
        {title}
      </div>
      <div className="mb-1 text-xs text-green-700">
        {host}
        {pathPrefix}/{slug}
      </div>
      <div className="line-clamp-2 text-sm text-gray-600">{description}</div>
    </div>
  );
}
