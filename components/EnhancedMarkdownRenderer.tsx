// components/EnhancedMarkdownRenderer.tsx
'use client';

import React, {
  memo,
  useMemo,
  useState,
  createContext,
  useContext,
} from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { marked } from 'marked';
import ShikiHighlighter from 'react-shiki';
import type { ComponentProps } from 'react';
import type { ExtraProps } from 'react-markdown';
import { Check, Copy } from 'lucide-react';
import Citation from './Citation';

type CodeComponentProps = ComponentProps<'code'> & ExtraProps;
type MarkdownSize = 'default' | 'small';

// Context to pass size down to components
const MarkdownSizeContext = createContext<MarkdownSize>('default');

// Context to pass navigation handler down to components
const NavigationContext = createContext<
  ((pageNumber: number) => void) | undefined
>(undefined);

// Custom text component that handles citations
function TextWithCitations({ children }: { children?: React.ReactNode }) {
  const onNavigateToPage = useContext(NavigationContext);

  console.log('TextWithCitations called with:', typeof children, children);

  // Handle different children types
  if (React.isValidElement(children)) {
    return <>{children}</>;
  }

  if (Array.isArray(children)) {
    return (
      <>
        {children.map((child, index) =>
          typeof child === 'string' ? (
            <TextWithCitations key={index}>{child}</TextWithCitations>
          ) : (
            child
          )
        )}
      </>
    );
  }

  if (typeof children !== 'string') {
    return <>{children}</>;
  }

  const text = children;
  const citationPattern = /\[cite:([^:]+):([^\]]+)\]/g;

  // Check if this text contains citations
  if (!citationPattern.test(text)) {
    return <>{text}</>;
  }

  console.log('Found citations in text:', text);

  // Reset the regex
  citationPattern.lastIndex = 0;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = citationPattern.exec(text)) !== null) {
    console.log('Processing citation match:', match);

    // Add text before citation
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    // Add citation component
    const pageNum = parseInt(match[1], 10);
    const previewText = match[2].trim();

    const navigationHandler =
      onNavigateToPage ||
      ((page: number) => {
        console.log('Citation clicked - navigate to page:', page);
        alert(`Navigate to page ${page} - ${previewText}`);
      });

    parts.push(
      <Citation
        key={`citation-${match.index}-${pageNum}`}
        pageNumber={pageNum}
        previewText={previewText}
        onNavigateToPage={navigationHandler}
      />
    );

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return <>{parts}</>;
}

interface EnhancedMarkdownRendererProps {
  markdownText: string;
  fontSize?: number;
  onRenderComplete?: (
    success: boolean,
    stats: { codeBlocks: number; processingTime: number }
  ) => void;
  className?: string;
  compact?: boolean;
  onNavigateToPage?: (pageNumber: number) => void;
}

const components: Components = {
  code: CodeBlock as Components['code'],
  pre: ({ children }) => <>{children}</>,
  // Add custom text processing for citations
  p: ({ children, ...props }) => (
    <p {...props}>
      <TextWithCitations>{children}</TextWithCitations>
    </p>
  ),
  h1: ({ children, ...props }) => (
    <h1
      className='text-2xl font-bold mb-4 mt-6 text-[var(--text-primary)]'
      {...props}
    >
      <TextWithCitations>{children}</TextWithCitations>
    </h1>
  ),
  h2: ({ children, ...props }) => (
    <h2
      className='text-xl font-bold mb-3 mt-5 text-[var(--text-primary)]'
      {...props}
    >
      <TextWithCitations>{children}</TextWithCitations>
    </h2>
  ),
  h3: ({ children, ...props }) => (
    <h3
      className='text-lg font-bold mb-2 mt-4 text-[var(--text-primary)]'
      {...props}
    >
      <TextWithCitations>{children}</TextWithCitations>
    </h3>
  ),
  h4: ({ children, ...props }) => (
    <h4
      className='text-base font-bold mb-2 mt-3 text-[var(--text-primary)]'
      {...props}
    >
      <TextWithCitations>{children}</TextWithCitations>
    </h4>
  ),
  h5: ({ children, ...props }) => (
    <h5
      className='text-sm font-bold mb-1 mt-2 text-[var(--text-primary)]'
      {...props}
    >
      <TextWithCitations>{children}</TextWithCitations>
    </h5>
  ),
  h6: ({ children, ...props }) => (
    <h6
      className='text-xs font-bold mb-1 mt-2 text-[var(--text-primary)]'
      {...props}
    >
      <TextWithCitations>{children}</TextWithCitations>
    </h6>
  ),
  // Add citation support to other text elements
  li: ({ children, ...props }) => (
    <li {...props}>
      <TextWithCitations>{children}</TextWithCitations>
    </li>
  ),
  strong: ({ children, ...props }) => (
    <strong {...props}>
      <TextWithCitations>{children}</TextWithCitations>
    </strong>
  ),
  em: ({ children, ...props }) => (
    <em {...props}>
      <TextWithCitations>{children}</TextWithCitations>
    </em>
  ),
  br: () => <br className='my-2' />,
  hr: ({ ...props }) => (
    <hr className='border-none h-0.5 bg-[var(--border)] my-6' {...props} />
  ),
};

function CodeBlock({ children, className, ...props }: CodeComponentProps) {
  const size = useContext(MarkdownSizeContext);
  const match = /language-(\w+)/.exec(className || '');

  if (match) {
    const lang = match[1];
    return (
      <div className='rounded-none my-4'>
        <Codebar lang={lang} codeString={String(children)} />
        <div className='overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200 dark:scrollbar-thumb-gray-600 dark:scrollbar-track-gray-800'>
          <ShikiHighlighter
            language={lang}
            theme={'material-theme-darker'}
            className='text-sm font-mono rounded-none bg-black'
            showLanguage={false}
          >
            {String(children)}
          </ShikiHighlighter>
        </div>
      </div>
    );
  }

  const inlineCodeClasses =
    size === 'small'
      ? 'mx-0.5 overflow-auto rounded-md px-1 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono text-xs'
      : 'mx-0.5 overflow-auto rounded-md px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono';

  return (
    <code className={inlineCodeClasses} {...props}>
      {children}
    </code>
  );
}

function Codebar({ lang, codeString }: { lang: string; codeString: string }) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(codeString);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to copy code to clipboard:', error);
    }
  };

  return (
    <div className='flex justify-between items-center px-4 py-3 bg-black text-gray-100 rounded-t-md border-gray-600'>
      <span className='text-sm font-mono font-medium'>{lang}</span>
      <button
        onClick={copyToClipboard}
        className='text-sm cursor-pointer hover:bg-gray-700 p-1 rounded transition-colors'
        title={copied ? 'Copied!' : 'Copy code'}
      >
        {copied ? (
          <Check className='w-4 h-4 text-green-400' />
        ) : (
          <Copy className='w-4 h-4' />
        )}
      </button>
    </div>
  );
}

function parseMarkdownIntoBlocks(markdown: string): string[] {
  const tokens = marked.lexer(markdown);
  return tokens.map((token) => token.raw);
}

function PureMarkdownRendererBlock({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, [remarkMath]]}
      rehypePlugins={[rehypeKatex]}
      components={components}
    >
      {content}
    </ReactMarkdown>
  );
}

const MarkdownRendererBlock = memo(
  PureMarkdownRendererBlock,
  (prevProps, nextProps) => {
    if (prevProps.content !== nextProps.content) return false;
    return true;
  }
);

MarkdownRendererBlock.displayName = 'MarkdownRendererBlock';

const EnhancedMarkdownRenderer = memo(
  ({
    markdownText,
    fontSize = 16,
    onRenderComplete,
    className = '',
    compact = false,
    onNavigateToPage,
  }: EnhancedMarkdownRendererProps) => {
    const blocks = useMemo(
      () => parseMarkdownIntoBlocks(markdownText),
      [markdownText]
    );
    const size: MarkdownSize = compact ? 'small' : 'default';

    // Notify completion
    useMemo(() => {
      if (onRenderComplete) {
        onRenderComplete(true, {
          codeBlocks: blocks.filter((block) => block.includes('```')).length,
          processingTime: 0,
        });
      }
    }, [blocks, onRenderComplete]);

    const proseClasses = compact
      ? 'prose prose-sm dark:prose-invert max-w-none w-full prose-code:before:content-none prose-code:after:content-none prose-p:mb-5 prose-headings:font-bold prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-h4:text-base prose-headings:mb-4 prose-headings:mt-6'
      : 'prose prose-base dark:prose-invert max-w-none w-full prose-code:before:content-none prose-code:after:content-none prose-p:mb-6 prose-headings:font-bold prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-h4:text-lg prose-headings:mb-4 prose-headings:mt-8';

    return (
      <MarkdownSizeContext.Provider value={size}>
        <NavigationContext.Provider value={onNavigateToPage}>
          <div
            className={`${proseClasses} ${className}`}
            style={{
              fontSize: `${fontSize}px`,
              lineHeight: 1.7,
              wordWrap: 'break-word',
              minWidth: 0,
              overflow: 'hidden',
              maxWidth: '100%',
              position: 'relative',
            }}
          >
            {blocks.map((block, index) => (
              <MarkdownRendererBlock
                content={block}
                key={`markdown-block-${index}`}
              />
            ))}
          </div>

          {/* Enhanced styles for unified processing */}
          <style jsx global>{`
            /* Thin scrollbar for code blocks */
            .scrollbar-thin::-webkit-scrollbar {
              width: 4px;
              height: 4px;
            }

            .scrollbar-thin::-webkit-scrollbar-track {
              background: rgba(156, 163, 175, 0.2);
              border-radius: 2px;
            }

            .scrollbar-thin::-webkit-scrollbar-thumb {
              background: rgba(156, 163, 175, 0.6);
              border-radius: 2px;
            }

            .scrollbar-thin::-webkit-scrollbar-thumb:hover {
              background: rgba(156, 163, 175, 0.8);
            }

            .dark .scrollbar-thin::-webkit-scrollbar-track {
              background: rgba(75, 85, 99, 0.3);
            }

            .dark .scrollbar-thin::-webkit-scrollbar-thumb {
              background: rgba(156, 163, 175, 0.5);
            }

            .dark .scrollbar-thin::-webkit-scrollbar-thumb:hover {
              background: rgba(156, 163, 175, 0.7);
            }

            .unified-markdown-content {
              font-family: var(--font-geist-sans), -apple-system,
                BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }

            .processing-indicator {
              display: flex;
              align-items: center;
              gap: 0.5rem;
              padding: 0.5rem;
              background-color: rgba(137, 117, 234, 0.1);
              border: 1px solid var(--accent-color);
              border-radius: 4px;
              margin-bottom: 1rem;
              font-size: 0.875rem;
              color: var(--accent-color);
            }

            .spinner {
              width: 1rem;
              height: 1rem;
              border: 2px solid transparent;
              border-top: 2px solid var(--accent-color);
              border-radius: 50%;
              animation: spin 1s linear infinite;
            }

            .processing-stats {
              display: flex;
              align-items: center;
              gap: 0.5rem;
              padding: 0.25rem 0.5rem;
              background-color: var(--border-color);
              border-radius: 4px;
              margin-bottom: 1rem;
              font-size: 0.75rem;
              flex-wrap: wrap;
            }

            .processor-badge {
              background-color: var(--accent-color);
              color: white;
              padding: 0.125rem 0.375rem;
              border-radius: 3px;
              font-weight: 500;
              text-transform: uppercase;
              font-size: 0.7rem;
            }

            .processing-stats span:not(.processor-badge) {
              color: var(--accent-color);
            }

            .error-banner {
              padding: 0.75rem;
              background-color: #2a1a1a;
              color: #ff6b6b;
              border: 1px solid #ff6b6b;
              border-radius: 4px;
              margin-bottom: 1rem;
              font-size: 0.875rem;
            }

            @keyframes spin {
              0% {
                transform: rotate(0deg);
              }
              100% {
                transform: rotate(360deg);
              }
            }

            /* Enhanced content styles for unified processor */
            .unified-markdown-content .rendered-content h1,
            .unified-markdown-content .rendered-content h2,
            .unified-markdown-content .rendered-content h3,
            .unified-markdown-content .rendered-content h4,
            .unified-markdown-content .rendered-content h5,
            .unified-markdown-content .rendered-content h6 {
              color: var(--heading-color);
              font-weight: 600;
              margin-top: 2rem;
              margin-bottom: 1rem;
              line-height: 1.3;
              display: block;
            }

            .unified-markdown-content .rendered-content h1 {
              font-size: calc(var(--font-size) * 2.2);
              border-bottom: 3px solid var(--border-color);
              padding-bottom: 0.5rem;
              margin-bottom: 1.5rem;
              font-weight: 700;
            }

            .unified-markdown-content .rendered-content h2 {
              font-size: calc(var(--font-size) * 1.8);
              margin-top: 2.5rem;
              font-weight: 650;
            }

            .unified-markdown-content .rendered-content h3 {
              font-size: calc(var(--font-size) * 1.4);
              margin-top: 2rem;
              font-weight: 600;
            }

            .unified-markdown-content .rendered-content h4 {
              font-size: calc(var(--font-size) * 1.2);
              margin-top: 1.5rem;
              font-weight: 600;
            }

            .unified-markdown-content .rendered-content p {
              margin-bottom: 1.5rem !important;
              line-height: 1.8 !important;
              display: block;
              margin-top: 0;
            }

            /* Additional targeting for Tailwind prose override */
            .prose p {
              margin-bottom: 1.5rem !important;
              line-height: 1.8 !important;
            }

            .prose.prose-sm p {
              margin-bottom: 5px !important;
              line-height: 1.7 !important;
            }

            /* Heading overrides for prose */
            .prose h1,
            .prose h2,
            .prose h3,
            .prose h4,
            .prose h5,
            .prose h6 {
              font-weight: 700 !important;
              color: var(--text-primary) !important;
              margin-top: 2rem !important;
              margin-bottom: 1rem !important;
              display: block !important;
            }

            .prose.prose-sm h1,
            .prose.prose-sm h2,
            .prose.prose-sm h3,
            .prose.prose-sm h4,
            .prose.prose-sm h5,
            .prose.prose-sm h6 {
              font-weight: 700 !important;
              color: var(--text-primary) !important;
              margin-top: 1.5rem !important;
              margin-bottom: 0.75rem !important;
              display: block !important;
            }

            .prose.prose-sm h1 {
              font-size: 1.5rem !important;
            }
            .prose.prose-sm h2 {
              font-size: 1.25rem !important;
            }
            .prose.prose-sm h3 {
              font-size: 1.125rem !important;
            }
            .prose.prose-sm h4 {
              font-size: 1rem !important;
            }

            .unified-markdown-content .rendered-content strong,
            .unified-markdown-content .rendered-content b {
              font-weight: 700;
              background-color: var(--highlight-bg);
              padding: 0 3px;
              border-radius: 3px;
              color: var(--text-color);
            }

            .unified-markdown-content .rendered-content em,
            .unified-markdown-content .rendered-content i {
              font-style: italic;
              color: #a78bfa;
              font-weight: 500;
            }

            /* Code highlighting (unified with highlight.js) */
            .unified-markdown-content .rendered-content pre {
              background-color: var(--border-color);
              padding: 1.5rem;
              border-radius: 8px;
              overflow-x: auto;
              margin: 2rem 0;
              font-family: 'Courier New', monospace;
              font-size: calc(var(--font-size) * 0.9);
              line-height: 1.5;
              display: block;
            }

            .unified-markdown-content .rendered-content code {
              background-color: var(--border-color);
              padding: 0.3rem 0.5rem;
              border-radius: 4px;
              font-family: 'Courier New', monospace;
              font-size: calc(var(--font-size) * 0.9);
              color: #a78bfa;
              font-weight: 500;
            }

            .unified-markdown-content .rendered-content pre code {
              background: none;
              padding: 0;
              border-radius: 0;
              color: #e5e7eb;
            }

            /* Enhanced table styles */
            .unified-markdown-content .rendered-content table {
              width: auto; /* Changed from 100% */
              min-width: 100%; /* Ensure it takes full width when content is narrow */
              border-collapse: collapse;
              margin: 2rem 0;
              border: 1px solid var(--border-color);
              border-radius: 6px;
              overflow: hidden;
              display: table;
            }

            .unified-markdown-content .rendered-content .table-wrapper {
              overflow-x: auto;
              overflow-y: visible;
              margin: 2rem 0;
              border: 1px solid var(--border-color);
              border-radius: 6px;
              width: 100%; /* Add this */
              min-width: 0; /* Add this */
              box-sizing: border-box; /* Add this */
            }

            .unified-markdown-content .rendered-content .table-wrapper table {
              margin: 0; /* Remove margin from table since wrapper has it */
              border: none; /* Remove border from table since wrapper has it */
              border-radius: 0;
            }

            .unified-markdown-content .rendered-content th,
            .unified-markdown-content .rendered-content td {
              padding: 0.75rem;
              border: 1px solid var(--border-color);
              text-align: left;
              vertical-align: top;
            }

            .unified-markdown-content .rendered-content th {
              background-color: var(--border-color);
              font-weight: 600;
            }

            /* Footnotes styling */
            .rendered-content .footnotes {
              margin-top: 3rem;
              border-top: 2px solid var(--border-color);
              padding-top: 1rem;
            }

            .rendered-content .footnotes ol {
              padding-left: 1.5rem;
            }

            .rendered-content .footnotes li {
              margin-bottom: 0.5rem;
              font-size: calc(var(--font-size) * 0.9);
              color: #9ca3af;
            }

            /* Task lists */
            .rendered-content .task-list-item {
              list-style: none;
            }

            .rendered-content .task-list-item input[type='checkbox'] {
              margin-right: 0.5rem;
            }

            /* Strikethrough */
            .rendered-content del {
              text-decoration: line-through;
              opacity: 0.7;
            }

            /* Emoji support */
            .rendered-content .emoji {
              font-style: normal;
              font-size: 1.1em;
            }

            /* Math expressions (KaTeX) */
            .rendered-content .katex {
              color: var(--text-color) !important;
            }

            .rendered-content .katex-display {
              margin: 1.5rem 0;
              text-align: center;
            }

            /* Blockquotes */
            .unified-markdown-content .rendered-content blockquote {
              border-left: 4px solid var(--accent-color);
              margin: 2rem 0;
              padding: 1rem 1.5rem;
              background-color: rgba(137, 117, 234, 0.1);
              font-style: italic;
              border-radius: 0 6px 6px 0;
              display: block;
            }

            /* Links */
            .unified-markdown-content .rendered-content a {
              color: var(--accent-color);
              text-decoration: underline;
              text-decoration-color: rgba(137, 117, 234, 0.5);
            }

            .unified-markdown-content .rendered-content a:hover {
              color: #a78bfa;
              text-decoration-color: #a78bfa;
            }

            /* Horizontal rules */
            .unified-markdown-content .rendered-content hr {
              border: none !important;
              height: 2px !important;
              background-color: var(--border-color) !important;
              margin: 2rem 0 !important;
              border-radius: 1px;
              display: block !important;
            }

            /* Prose HR overrides */
            .prose hr {
              border: none !important;
              height: 2px !important;
              background-color: var(--border) !important;
              margin: 2rem 0 !important;
              display: block !important;
            }

            .prose.prose-sm hr {
              margin: 1.5rem 0 !important;
            }

            /* Lists */
            .unified-markdown-content .rendered-content ul,
            .unified-markdown-content .rendered-content ol {
              margin: 1.5rem 0;
              padding-left: 2rem;
              display: block;
            }

            .unified-markdown-content .rendered-content li {
              margin-bottom: 0.8rem;
              line-height: 1.7;
              display: list-item;
            }

            .unified-markdown-content .rendered-content ul li {
              list-style-type: disc;
            }

            .unified-markdown-content .rendered-content ol li {
              list-style-type: decimal;
            }

            /* Images */
            .rendered-content img {
              max-width: 100%;
              height: auto;
              border-radius: 6px;
              margin: 1rem 0;
            }

            /* Syntax highlighting styles (highlight.js) */
            .rendered-content .hljs {
              display: block;
              overflow-x: auto;
              padding: 1rem;
              background: var(--border-color) !important;
              color: #e5e7eb !important;
            }

            .rendered-content .hljs-keyword,
            .rendered-content .hljs-selector-tag,
            .rendered-content .hljs-literal,
            .rendered-content .hljs-title,
            .rendered-content .hljs-section,
            .rendered-content .hljs-doctag,
            .rendered-content .hljs-type,
            .rendered-content .hljs-name,
            .rendered-content .hljs-strong {
              color: #8975ea !important;
              font-weight: bold;
            }

            .rendered-content .hljs-string,
            .rendered-content .hljs-number,
            .rendered-content .hljs-symbol,
            .rendered-content .hljs-bullet,
            .rendered-content .hljs-addition {
              color: #4ade80 !important;
            }

            .rendered-content .hljs-comment,
            .rendered-content .hljs-quote,
            .rendered-content .hljs-deletion,
            .rendered-content .hljs-meta {
              color: #6b7280 !important;
              font-style: italic;
            }

            .rendered-content .hljs-variable,
            .rendered-content .hljs-template-variable,
            .rendered-content .hljs-attribute,
            .rendered-content .hljs-attr {
              color: #f59e0b !important;
            }

            .rendered-content .hljs-built_in,
            .rendered-content .hljs-builtin-name {
              color: #06b6d4 !important;
            }

            .rendered-content .hljs-function,
            .rendered-content .hljs-class {
              color: #a78bfa !important;
            }

            /* Responsive adjustments */
            @media (max-width: 768px) {
              .unified-markdown-content {
                font-size: calc(var(--font-size) * 0.9);
              }

              .rendered-content table {
                font-size: calc(var(--font-size) * 0.8);
                overflow-x: auto;
              }

              .processing-stats {
                font-size: 0.7rem;
              }

              .rendered-content .katex-display {
                font-size: 1.1em;
              }

              .rendered-content pre {
                padding: 1rem;
                font-size: calc(var(--font-size) * 0.8);
              }
            }

            /* Compact mode for chat messages */
            .unified-markdown-content.compact-mode .processing-indicator,
            .unified-markdown-content.compact-mode .processing-stats {
              display: none; /* Hide processing info in chat */
            }

            .unified-markdown-content.compact-mode .rendered-content h1,
            .unified-markdown-content.compact-mode .rendered-content h2,
            .unified-markdown-content.compact-mode .rendered-content h3,
            .unified-markdown-content.compact-mode .rendered-content h4,
            .unified-markdown-content.compact-mode .rendered-content h5,
            .unified-markdown-content.compact-mode .rendered-content h6 {
              margin-top: 1.5rem !important;
              margin-bottom: 0.75rem !important;
              font-weight: 700 !important;
              color: var(--text-primary) !important;
              display: block !important;
            }

            .unified-markdown-content.compact-mode .rendered-content h1 {
              font-size: 1.5rem !important;
              border-bottom: 2px solid var(--border-color);
              margin-bottom: 1rem !important;
              padding-bottom: 0.25rem;
            }

            .unified-markdown-content.compact-mode .rendered-content h2 {
              font-size: 1.25rem !important;
            }

            .unified-markdown-content.compact-mode .rendered-content h3 {
              font-size: 1.125rem !important;
            }

            .unified-markdown-content.compact-mode .rendered-content h4 {
              font-size: 1rem !important;
            }

            .unified-markdown-content.compact-mode .rendered-content h5 {
              font-size: 0.875rem !important;
            }

            .unified-markdown-content.compact-mode .rendered-content h6 {
              font-size: 0.8rem !important;
            }

            .unified-markdown-content.compact-mode .rendered-content p {
              margin-bottom: 1.25rem !important;
              line-height: 1.7 !important;
            }

            .unified-markdown-content.compact-mode .rendered-content ul,
            .unified-markdown-content.compact-mode .rendered-content ol {
              margin: 1rem 0;
            }

            .unified-markdown-content.compact-mode .rendered-content li {
              margin-bottom: 0.4rem;
            }

            .unified-markdown-content.compact-mode .rendered-content pre {
              margin: 1rem 0;
              padding: 1rem;
            }

            .unified-markdown-content.compact-mode
              .rendered-content
              blockquote {
              margin: 1rem 0;
              padding: 0.75rem 1rem;
            }

            .unified-markdown-content.compact-mode
              .rendered-content
              .katex-display {
              margin: 1rem 0;
            }
            .rendered-content a:focus,
            .rendered-content button:focus {
              outline: 2px solid var(--accent-color);
              outline-offset: 2px;
            }

            .rendered-content .footnotes a {
              text-decoration: none;
            }

            .rendered-content .footnotes a:hover {
              text-decoration: underline;
            }

            /* Print styles */
            @media print {
              .processing-indicator,
              .processing-stats,
              .error-banner {
                display: none;
              }

              .rendered-content {
                color: black !important;
              }

              .rendered-content pre,
              .rendered-content code {
                background-color: #f5f5f5 !important;
                color: black !important;
                border: 1px solid #ddd;
              }

              .rendered-content table {
                border-color: #000 !important;
              }

              .rendered-content th,
              .rendered-content td {
                border-color: #000 !important;
              }
            }
          `}</style>

          {/* Global KaTeX CSS - Load only once */}
          <style jsx global>{`
            /* Import KaTeX CSS if not already loaded */
            @import url('https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css');

            /* Global KaTeX customizations for dark theme */
            .katex {
              font-size: 1.1em !important;
            }

            .katex-display .katex {
              font-size: 1.3em !important;
            }

            /* Override KaTeX colors for dark theme */
            .katex .mord,
            .katex .mrel,
            .katex .mbin,
            .katex .mop,
            .katex .mpunct {
              color: inherit !important;
            }

            .katex .accent {
              color: var(--accent-color, #8975ea) !important;
            }
          `}</style>
        </NavigationContext.Provider>
      </MarkdownSizeContext.Provider>
    );
  }
);

EnhancedMarkdownRenderer.displayName = 'EnhancedMarkdownRenderer';

export default EnhancedMarkdownRenderer;
