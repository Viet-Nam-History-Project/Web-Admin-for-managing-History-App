import { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils/cn';

export function StatCard({
  title,
  value,
  icon: Icon,
  hint,
  valueClassName,
}: {
  title: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string;
  valueClassName?: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold uppercase tracking-wide text-stone-500">{title}</p>
          <p
            className={cn('mt-2 text-3xl font-black text-charcoal truncate', valueClassName)}
            title={typeof value === 'string' ? value : undefined}
          >
            {value}
          </p>
          {hint ? <p className="mt-1 truncate text-xs text-stone-500">{hint}</p> : null}
        </div>
        <div className="shrink-0 rounded-xl bg-gold/18 p-3 text-bronze">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}
