import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '~/lib/utils';

interface MarkdownProps {
  content: string;
  className?: string;
}

export function Markdown({ content, className }: MarkdownProps) {
  return (
    <div className={cn('prose prose-sm dark:prose-invert max-w-none', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h1 className="text-xl font-bold mb-2">{children}</h1>,
          h2: ({ children }) => <h2 className="text-lg font-bold mb-2">{children}</h2>,
          h3: ({ children }) => <h3 className="text-base font-bold mb-1">{children}</h3>,
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
          ul: ({ children }) => <ul className="list-disc ml-4 mb-2">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal ml-4 mb-2">{children}</ol>,
          li: ({ children }) => <li className="mb-1">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-muted-foreground/20 pl-4 my-2 italic">
              {children}
            </blockquote>
          ),
          code({ children, ...props }) {
            const inline = !props.className;
            return inline ? (
              <code className="bg-muted px-1 py-0.5 rounded text-sm font-mono">{children}</code>
            ) : (
              <code className="block bg-muted p-2 rounded text-sm font-mono overflow-x-auto">{children}</code>
            );
          },
          a: ({ children, href }) => (
            <a href={href} className="text-primary hover:underline break-all" target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
          img: ({ src, alt }) => (
            <img src={src} alt={alt} className="max-w-full rounded-lg my-2" loading="lazy" />
          ),
          hr: () => <hr className="my-4 border-muted" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}