'use client';

import { useMemo } from 'react';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeKatex from 'rehype-katex';
import rehypeStringify from 'rehype-stringify';

interface MarkdownRendererProps {
  content: string;
  compact?: boolean;
}

export default function MarkdownRenderer({
  content,
  compact = false,
}: MarkdownRendererProps) {
  const processedContent = useMemo(() => {
    if (!content.trim()) return '';

    try {
      const processor = unified()
        .use(remarkParse)
        .use(remarkMath)
        .use(remarkGfm)
        .use(remarkRehype)
        .use(rehypeKatex, {
          throwOnError: false,
          errorColor: '#cc0000',
          macros: {
            '\\\\R': '\\\\mathbb{R}',
            '\\\\N': '\\\\mathbb{N}',
            '\\\\Z': '\\\\mathbb{Z}',
            '\\\\Q': '\\\\mathbb{Q}',
            '\\\\C': '\\\\mathbb{C}',
          },
        } as any)
        .use(rehypeStringify);

      const result = processor.processSync(content);
      return String(result);
    } catch (error) {
      console.error('Markdown processing error:', error);
      return content; // Fallback to plain text
    }
  }, [content]);

  if (!content.trim()) {
    return null;
  }

  return (
    <>
      {/* KaTeX CSS */}
      <link
        rel='stylesheet'
        href='https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css'
        integrity='sha384-n8MVd4RsNIU0tAv4ct0nTaAbDJwPJzDEaqSD1odI+WdtXRGWt2kTvGFasHpSy3SV'
        crossOrigin='anonymous'
      />

      <div
        className={`markdown-content ${compact ? 'compact-mode' : ''}`}
        dangerouslySetInnerHTML={{ __html: processedContent }}
      />

      <style jsx>{`
        .markdown-content {
          color: var(--text-primary);
          line-height: 1.6;
        }

        .markdown-content h1,
        .markdown-content h2,
        .markdown-content h3,
        .markdown-content h4,
        .markdown-content h5,
        .markdown-content h6 {
          color: var(--text-primary);
          font-weight: 600;
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
        }

        .markdown-content h1 {
          font-size: 1.5rem;
          border-bottom: 1px solid var(--border);
          padding-bottom: 0.5rem;
        }

        .markdown-content h2 {
          font-size: 1.25rem;
        }

        .markdown-content h3 {
          font-size: 1.125rem;
        }

        .markdown-content p {
          margin-bottom: 1rem;
        }

        .markdown-content ul,
        .markdown-content ol {
          margin-bottom: 1rem;
          padding-left: 1.5rem;
        }

        .markdown-content li {
          margin-bottom: 0.25rem;
        }

        .markdown-content blockquote {
          border-left: 4px solid var(--accent);
          padding-left: 1rem;
          margin: 1rem 0;
          color: var(--text-secondary);
          font-style: italic;
        }

        .markdown-content code {
          background-color: var(--faded-white);
          color: var(--text-primary);
          padding: 0.125rem 0.25rem;
          border-radius: 0.25rem;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          font-size: 0.875em;
        }

        .markdown-content pre {
          background-color: var(--faded-white);
          border: 1px solid var(--border);
          border-radius: 0.5rem;
          padding: 1rem;
          margin: 1rem 0;
          overflow-x: auto;
        }

        .markdown-content pre code {
          background: none;
          padding: 0;
        }

        .markdown-content table {
          width: 100%;
          border-collapse: collapse;
          margin: 1rem 0;
        }

        .markdown-content th,
        .markdown-content td {
          border: 1px solid var(--border);
          padding: 0.5rem;
          text-align: left;
        }

        .markdown-content th {
          background-color: var(--faded-white);
          font-weight: 600;
        }

        .markdown-content a {
          color: var(--accent);
          text-decoration: underline;
        }

        .markdown-content a:hover {
          opacity: 0.8;
        }

        /* Math styling */
        .markdown-content .katex {
          font-size: 1em;
        }

        .markdown-content .katex-display {
          margin: 1rem 0;
          text-align: center;
        }

        /* Compact mode for chat messages */
        .markdown-content.compact-mode h1,
        .markdown-content.compact-mode h2,
        .markdown-content.compact-mode h3,
        .markdown-content.compact-mode h4,
        .markdown-content.compact-mode h5,
        .markdown-content.compact-mode h6 {
          margin-top: 0.75rem;
          margin-bottom: 0.5rem;
        }

        .markdown-content.compact-mode h1 {
          font-size: 1.25rem;
          border-bottom: none;
          padding-bottom: 0;
        }

        .markdown-content.compact-mode h2 {
          font-size: 1.125rem;
        }

        .markdown-content.compact-mode h3 {
          font-size: 1rem;
        }

        .markdown-content.compact-mode p {
          margin-bottom: 0.5rem;
        }

        .markdown-content.compact-mode ul,
        .markdown-content.compact-mode ol {
          margin-bottom: 0.5rem;
        }

        .markdown-content.compact-mode blockquote {
          margin: 0.5rem 0;
        }

        .markdown-content.compact-mode pre {
          margin: 0.5rem 0;
        }

        .markdown-content.compact-mode table {
          margin: 0.5rem 0;
        }

        .markdown-content.compact-mode .katex-display {
          margin: 0.5rem 0;
        }
      `}</style>
    </>
  );
}
