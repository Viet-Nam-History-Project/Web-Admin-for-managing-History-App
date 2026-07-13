import { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';

type BadgeTone = 'gold' | 'red' | 'green' | 'neutral' | 'dark';

const tones: Record<BadgeTone, string> = {
  gold: 'bg-gold/18 text-[#8F6410] ring-gold/25',
  red: 'bg-flag/10 text-flag ring-flag/18',
  green: 'bg-emerald-600/10 text-emerald-700 ring-emerald-700/15',
  neutral: 'bg-stone-900/5 text-stone-600 ring-stone-900/10',
  dark: 'bg-charcoal text-ivory ring-white/10',
};

export function Badge({
  className,
  tone = 'neutral',
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ring-1',
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
