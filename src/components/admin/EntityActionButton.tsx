'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { adminFetch } from '@/lib/api/adminClient';
import { Button } from '@/components/ui/Button';

export function EntityActionButton({
  url,
  method = 'PATCH',
  label,
  confirmMessage,
  variant = 'outline',
  body = {},
}: {
  url: string;
  method?: 'PATCH' | 'DELETE' | 'POST';
  label: string;
  confirmMessage?: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  body?: Record<string, unknown>;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function run() {
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    setLoading(true);
    try {
      await adminFetch(url, { method, body: method === 'DELETE' ? undefined : JSON.stringify(body) });
      router.refresh();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Thao tác thất bại.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button type="button" variant={variant} onClick={run} disabled={loading}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {label}
    </Button>
  );
}
