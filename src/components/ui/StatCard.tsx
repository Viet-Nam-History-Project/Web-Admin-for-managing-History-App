import { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/Card';

export function StatCard({
  title,
  value,
  icon: Icon,
  hint,
}: {
  title: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-stone-500">{title}</p>
          <p className="mt-2 text-3xl font-black text-charcoal">{value}</p>
          {hint ? <p className="mt-1 text-xs text-stone-500">{hint}</p> : null}
        </div>
        <div className="rounded-xl bg-gold/18 p-3 text-bronze">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}
