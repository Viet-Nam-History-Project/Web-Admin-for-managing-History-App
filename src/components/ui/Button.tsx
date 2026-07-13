import { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-bronze text-white shadow-sm hover:bg-primary-strong',
  secondary: 'bg-charcoal text-ivory hover:bg-[#211d18]',
  outline: 'border border-[var(--border)] bg-white/60 text-charcoal hover:bg-white',
  ghost: 'text-charcoal hover:bg-black/5',
  danger: 'bg-flag text-white hover:bg-[#a90d25]',
};

export function Button({
  className,
  variant = 'primary',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      className={cn(
        'inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
