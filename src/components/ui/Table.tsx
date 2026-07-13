import { HTMLAttributes, TableHTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';

export function DataTable({ className, ...props }: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white/72">
      <div className="overflow-x-auto">
        <table className={cn('w-full min-w-[760px] text-left text-sm', className)} {...props} />
      </div>
    </div>
  );
}

export function TableHead(props: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className="bg-charcoal text-xs uppercase tracking-wide text-ivory" {...props} />;
}

export function TableRow({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn('border-b border-[var(--border)] last:border-0', className)} {...props} />;
}

export function TableCell({ className, ...props }: HTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('px-4 py-3 align-middle', className)} {...props} />;
}

export function TableHeaderCell({ className, ...props }: HTMLAttributes<HTMLTableCellElement>) {
  return <th className={cn('px-4 py-3 font-bold', className)} {...props} />;
}
