"use client";

import { resolveNewsImageUrl } from "@/lib/intelFeed";

interface NewsArticleImageProps {
  src: string;
  alt: string;
  className?: string;
}

export default function NewsArticleImage({
  src,
  alt,
  className,
}: NewsArticleImageProps) {
  const resolvedSrc = resolveNewsImageUrl(src);

  return (
    <img
      src={resolvedSrc}
      alt={alt}
      loading="lazy"
      referrerPolicy="no-referrer"
      className={className}
      onError={(event) => {
        const image = event.currentTarget;
        const fallback = src.replace(/\/english\.png$/i, ".png");
        if (fallback !== image.src) {
          image.src = fallback;
        }
      }}
    />
  );
}
