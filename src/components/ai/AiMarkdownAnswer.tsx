'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function AiMarkdownAnswer({ children }: { children: string }) {
  return (
    <div className="text-[15px] leading-7 text-charcoal">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children: content }) => (
            <h1 className="mb-4 mt-7 text-2xl font-black leading-tight text-charcoal first:mt-0">
              {content}
            </h1>
          ),
          h2: ({ children: content }) => (
            <h2 className="mb-3 mt-7 text-xl font-black leading-tight text-charcoal first:mt-0">
              {content}
            </h2>
          ),
          h3: ({ children: content }) => (
            <h3 className="mb-2 mt-6 text-lg font-black leading-snug text-charcoal first:mt-0">
              {content}
            </h3>
          ),
          h4: ({ children: content }) => (
            <h4 className="mb-2 mt-5 font-black text-charcoal">{content}</h4>
          ),
          p: ({ children: content }) => (
            <p className="mb-3 last:mb-0">{content}</p>
          ),
          strong: ({ children: content }) => (
            <strong className="font-black text-charcoal">{content}</strong>
          ),
          ul: ({ children: content }) => (
            <ul className="mb-4 ml-5 list-disc space-y-1.5 marker:text-bronze">{content}</ul>
          ),
          ol: ({ children: content }) => (
            <ol className="mb-4 ml-5 list-decimal space-y-1.5 marker:font-bold marker:text-bronze">
              {content}
            </ol>
          ),
          li: ({ children: content }) => <li className="pl-1">{content}</li>,
          blockquote: ({ children: content }) => (
            <blockquote className="my-4 border-l-4 border-bronze bg-gold/10 px-4 py-3 italic text-stone-700">
              {content}
            </blockquote>
          ),
          table: ({ children: content }) => (
            <div className="my-5 max-w-full overflow-x-auto rounded-xl border border-[var(--border)] bg-white/65 shadow-sm">
              <table className="w-full min-w-[720px] border-collapse text-left text-sm leading-6">
                {content}
              </table>
            </div>
          ),
          thead: ({ children: content }) => (
            <thead className="bg-[#efe0d5] text-charcoal">{content}</thead>
          ),
          tbody: ({ children: content }) => (
            <tbody className="divide-y divide-[var(--border)]">{content}</tbody>
          ),
          tr: ({ children: content }) => (
            <tr className="align-top transition-colors hover:bg-gold/[0.06]">{content}</tr>
          ),
          th: ({ children: content }) => (
            <th className="border-r border-[var(--border)] px-4 py-3 font-black last:border-r-0">
              {content}
            </th>
          ),
          td: ({ children: content }) => (
            <td className="min-w-44 border-r border-[var(--border)] px-4 py-3 text-stone-700 last:border-r-0">
              {content}
            </td>
          ),
          hr: () => <hr className="my-6 border-[var(--border)]" />,
          code: ({ children: content }) => (
            <code className="rounded bg-black/[0.06] px-1.5 py-0.5 font-mono text-[0.9em] text-flag">
              {content}
            </code>
          ),
          a: ({ children: content, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="font-bold text-bronze underline decoration-bronze/40 underline-offset-2 hover:decoration-bronze"
            >
              {content}
            </a>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
