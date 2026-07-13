import { AlertCircle, Archive, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export function LoadingState({ label = 'Đang tải dữ liệu...' }: { label?: string }) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center gap-3 text-sm text-stone-500">
      <Loader2 className="h-7 w-7 animate-spin text-bronze" />
      <span>{label}</span>
    </div>
  );
}

export function EmptyState({
  title = 'Chưa có dữ liệu',
  description = 'Khi có dữ liệu, danh sách sẽ hiển thị tại đây.',
  className,
}: {
  title?: string;
  description?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex min-h-56 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[var(--border)] bg-white/45 p-8 text-center',
        className,
      )}
    >
      <Archive className="h-9 w-9 text-bronze" />
      <div>
        <p className="font-bold text-charcoal">{title}</p>
        <p className="mt-1 text-sm text-stone-500">{description}</p>
      </div>
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-2xl border border-flag/20 bg-flag/5 p-8 text-center">
      <AlertCircle className="h-9 w-9 text-flag" />
      <p className="text-sm font-semibold text-flag">{message}</p>
    </div>
  );
}
