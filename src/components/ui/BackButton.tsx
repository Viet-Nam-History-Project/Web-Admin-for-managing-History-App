'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function BackButton({ fallbackHref, label = 'Quay lại' }: { fallbackHref: string; label?: string }) {
  const router = useRouter();

  function goBack() {
    router.push(fallbackHref);
  }

  return (
    <Button type="button" variant="ghost" onClick={goBack}>
      <ArrowLeft className="h-4 w-4" /> {label}
    </Button>
  );
}
