import { ReactNode } from 'react';

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow ? (
          <p className="text-xs font-black uppercase tracking-[0.2em] text-bronze">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="mt-1 text-3xl font-black text-charcoal">{title}</h2>
        {description ? (
          <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
