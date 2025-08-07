// components/EnhancedMarkdownRenderer.tsx
'use client';

import { memo, useState, useEffect, useCallback } from 'react';
import {
  markdownProcessor,
  type ProcessingResult,
} from '@/utils/UnifiedMarkdownProcessor';

interface EnhancedMarkdownRendererProps {
  markdownText: string;
  fontSize?: number;
  onRenderComplete?: (
    success: boolean,
    stats: { codeBlocks: number; processingTime: number }
  ) => void;
  className?: string;
  compact?: boolean;
}

const EnhancedMarkdownRenderer = memo(
  ({
    markdownText,
    fontSize = 16,
    onRenderComplete,
    className = '',
    compact = false,
  }: EnhancedMarkdownRendererProps) => {
    const [result, setResult] = useState<ProcessingResult>({
      html: '',
      stats: {
        inlineMath: 0,
        displayMath: 0,
        codeBlocks: 0,
        tables: 0,
        footnotes: 0,
        processingTime: 0,
      },
      success: true,
      processor: 'unified',
    });
    const [isProcessing, setIsProcessing] = useState(false);

    const processMarkdown = useCallback(async () => {
      if (!markdownText) {
        setResult({
          html: '',
          stats: {
            inlineMath: 0,
            displayMath: 0,
            codeBlocks: 0,
            tables: 0,
            footnotes: 0,
            processingTime: 0,
          },
          success: true,
          processor: 'unified',
        });
        return;
      }

      setIsProcessing(true);

      try {
        const processingResult = await markdownProcessor.processMarkdown(
          markdownText
        );
        setResult(processingResult);

        onRenderComplete?.(processingResult.success, {
          codeBlocks: processingResult.stats.codeBlocks,
          processingTime: processingResult.stats.processingTime,
        });
      } catch (error) {
        console.error('Markdown processing failed:', error);
        setResult({
          html: markdownText.replace(/\n/g, '<br>'),
          stats: {
            inlineMath: 0,
            displayMath: 0,
            codeBlocks: 0,
            tables: 0,
            footnotes: 0,
            processingTime: 0,
          },
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          processor: 'fallback',
        });
        onRenderComplete?.(false, { codeBlocks: 0, processingTime: 0 });
      } finally {
        setIsProcessing(false);
      }
    }, [markdownText, onRenderComplete]);

    useEffect(() => {
      processMarkdown();
    }, [processMarkdown]);

    return (
      <div
        className={`unified-markdown-content ${className} ${
          compact ? 'compact-mode' : ''
        }`}
        style={
          {
            '--font-size': `${fontSize}px`,
            '--text-color': 'var(--text-primary)',
            '--heading-color': 'var(--text-primary)',
            '--accent-color': '#8975EA',
            '--highlight-bg': 'rgba(137, 117, 234, 0.2)',
            '--border-color': 'var(--border)',
            fontSize: `${fontSize}px`,
            color: 'var(--text-primary)',
            lineHeight: 1.7,
            wordWrap: 'break-word',
            minWidth: 0,
            overflow: 'hidden',
            maxWidth: '100%',
            position: 'relative',
          } as React.CSSProperties
        }
      >
        {/* Processing indicator */}
        {isProcessing && (
          <div className='processing-indicator'>
            <div className='spinner'></div>
            <span>Processing with unified processor...</span>
          </div>
        )}

        {/* Error display */}
        {result.error && (
          <div className='error-banner'>
            <strong>Processing Note:</strong> {result.error}
          </div>
        )}

        {/* Rendered content */}
        <div
          className='rendered-content'
          dangerouslySetInnerHTML={{ __html: result.html }}
        />

        {/* Enhanced styles for unified processing */}
        <style jsx global>{`
          /* Thin scrollbar for code blocks */

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
            margin-bottom: 1.5rem;
            line-height: 1.8;
            display: block;
            margin-top: 0;
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
            border: none;
            height: 3px;
            background-color: var(--border-color);
            margin: 3rem 0;
            border-radius: 1px;
            display: block;
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
          .unified-markdown-content.compact-mode .processing-stats,
          .unified-markdown-content.compact-mode .error-banner {
            display: none; /* Hide processing info in chat */
          }

          .unified-markdown-content.compact-mode .rendered-content h1,
          .unified-markdown-content.compact-mode .rendered-content h2,
          .unified-markdown-content.compact-mode .rendered-content h3,
          .unified-markdown-content.compact-mode .rendered-content h4,
          .unified-markdown-content.compact-mode .rendered-content h5,
          .unified-markdown-content.compact-mode .rendered-content h6 {
            margin-top: 1rem;
            margin-bottom: 0.5rem;
          }

          .unified-markdown-content.compact-mode .rendered-content h1 {
            font-size: calc(var(--font-size) * 1.6);
            border-bottom: 2px solid var(--border-color);
            margin-bottom: 1rem;
          }

          .unified-markdown-content.compact-mode .rendered-content h2 {
            font-size: calc(var(--font-size) * 1.4);
          }

          .unified-markdown-content.compact-mode .rendered-content h3 {
            font-size: calc(var(--font-size) * 1.2);
          }

          .unified-markdown-content.compact-mode .rendered-content p {
            margin-bottom: 1rem;
            line-height: 1.6;
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

          .unified-markdown-content.compact-mode .rendered-content blockquote {
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
      </div>
    );
  }
);

EnhancedMarkdownRenderer.displayName = 'EnhancedMarkdownRenderer';

export default EnhancedMarkdownRenderer;
