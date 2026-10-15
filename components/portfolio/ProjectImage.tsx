"use client";

import Image from "next/image";
import { useState } from "react";

export default function ProjectImage({
  src,
  alt,
  sizes,
  className = "object-cover",
}: {
  src: string | null | undefined;
  alt: string;
  sizes: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const usableSrc = src?.trim();

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-cyan-950 to-slate-900">
      {usableSrc && !failed ? (
        <Image
          src={usableSrc}
          alt={alt}
          fill
          unoptimized
          sizes={sizes}
          className={className}
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-3xl text-cyan-100" aria-hidden="true">
          ◇
        </div>
      )}
    </div>
  );
}
