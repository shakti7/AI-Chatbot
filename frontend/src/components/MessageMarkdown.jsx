import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'

export default function MessageMarkdown({ text }) {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none prose-pre:bg-neutral-950 prose-pre:border prose-pre:border-neutral-800 prose-code:before:content-[''] prose-code:after:content-['']">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeHighlight, { detect: true, ignoreMissing: true }]]}
        components={{
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto border border-neutral-200 dark:border-neutral-800 rounded">
              <table className="min-w-full text-sm" {...props} />
            </div>
          ),
          th: ({ node, ...props }) => (
            <th className="px-3 py-2 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900" {...props} />
          ),
          td: ({ node, ...props }) => (
            <td className="px-3 py-2 align-top border-b border-neutral-200 dark:border-neutral-800" {...props} />
          ),
          code: ({node, inline, className, children, ...props}) => {
            const match = /language-(\w+)/.exec(className || '')
            if (!inline && match) {
              return (
                <pre className="bg-neutral-950 border border-neutral-800 rounded p-3 overflow-auto" {...props}>
                  <code className={className}>{children}</code>
                </pre>
              )
            }
            return (
              <code className="px-1 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800" {...props}>
                {children}
              </code>
            )
          },
        }}
      >
        {text || ''}
      </ReactMarkdown>
    </div>
  )
}
