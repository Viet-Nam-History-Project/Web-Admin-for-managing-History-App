import { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-bold text-charcoal">{label}</span>
      {children}
      {hint ? <span className="text-xs text-stone-500">{hint}</span> : null}
    </label>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'h-11 rounded-lg border border-[var(--border)] bg-white/80 px-3 text-sm outline-none transition focus:border-bronze focus:ring-4 focus:ring-gold/15',
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'min-h-28 rounded-lg border border-[var(--border)] bg-white/80 px-3 py-2 text-sm outline-none transition focus:border-bronze focus:ring-4 focus:ring-gold/15',
        className,
      )}
      {...props}
    />
  );
}
