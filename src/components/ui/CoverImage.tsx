'use client';

import { useEffect, useMemo, useState } from 'react';
import { ImageOff } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { mediaUrlCandidates } from '@/lib/utils/mediaUrl';

export function CoverImage({
  source,
  alt,
  className,
  emptyLabel = 'Chưa có ảnh',
}: {
  source?: string | null;
  alt: string;
  className?: string;
  emptyLabel?: string;
}) {
  const candidates = useMemo(() => mediaUrlCandidates(source), [source]);
  const [candidateIndex, setCandidateIndex] = useState(0);

  useEffect(() => setCandidateIndex(0), [source]);

  const imageUrl = candidates[candidateIndex];
  if (!imageUrl) {
    return (
      <div className={cn('grid h-full w-full place-items-center bg-stone-200 text-stone-500', className)}>
        <span className="flex items-center gap-2 text-xs font-semibold">
          <ImageOff className="h-4 w-4" /> {emptyLabel}
        </span>
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={alt}
      className={cn('h-full w-full object-cover', className)}
      referrerPolicy="no-referrer"
      onError={() => setCandidateIndex((index) => index + 1)}
    />
  );
}
