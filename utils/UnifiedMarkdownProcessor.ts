// utils/UnifiedMarkdownProcessor.ts
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkRehype from 'remark-rehype';
import rehypeKatex from 'rehype-katex';
import rehypeStringify from 'rehype-stringify';

// Note: We'll skip problematic plugins for now and add them incrementally
// import remarkEmoji from 'remark-emoji';
// import remarkFootnotes from 'remark-footnotes'; // This package has type issues
// import rehypeHighlight from 'rehype-highlight'; // Also has compatibility issues

export interface ProcessingStats {
  inlineMath: number;
  displayMath: number;
  codeBlocks: number;
  tables: number;
  footnotes: number;
  processingTime: number;
}

export interface ProcessingResult {
  html: string;
  stats: ProcessingStats;
  success: boolean;
  error?: string;
  processor: 'unified' | 'fallback';
}

export class UnifiedMarkdownProcessor {
  private processor: any;
  private isInitialized = false;

  constructor() {
    this.initializeProcessor();
  }

  private initializeProcessor() {
    try {
      this.processor = unified()
        .use(remarkParse)
        .use(remarkGfm)
        .use(remarkMath)
        .use(remarkRehype, {
          allowDangerousHtml: true,
        })
        .use(rehypeKatex as any, {
          throwOnError: false,
          errorColor: '#cc0000',
          macros: {
            '\\R': '\\mathbb{R}',
            '\\N': '\\mathbb{N}',
            '\\Z': '\\mathbb{Z}',
            '\\Q': '\\mathbb{Q}',
            '\\C': '\\mathbb{C}',
          },
        })
        .use(rehypeStringify, {
          allowDangerousHtml: true,
        });

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize unified processor:', error);
      this.isInitialized = false;
    }
  }

  /**
   * Wrap tables in scrollable divs for better responsive handling
   */
  private wrapTablesInScrollableDiv(html: string): string {
    // First, wrap standalone tables (not already in a wrapper)
    const wrappedHtml = html
      .replace(/<table([^>]*)>/g, '<div class="table-wrapper"><table$1>')
      .replace(/<\/table>/g, '</table></div>');

    return wrappedHtml;
  }

  /**
   * Post-process HTML to improve table handling and other enhancements
   */
  private postProcessHtml(html: string): string {
    let processedHtml = html;

    // Wrap tables for better responsive behavior
    processedHtml = this.wrapTablesInScrollableDiv(processedHtml);

    // Ensure proper spacing around block elements
    processedHtml = processedHtml
      // Add proper spacing around headings
      .replace(/(<\/h[1-6]>)(?!\s*<)/g, '$1\n')
      // Add proper spacing around paragraphs
      .replace(/(<\/p>)(?!\s*<)/g, '$1\n')
      // Clean up excessive whitespace
      .replace(/\n\s*\n\s*\n/g, '\n\n');

    return processedHtml;
  }

  /**
   * Process markdown text with full statistics
   */
  async processMarkdown(markdown: string): Promise<ProcessingResult> {
    const startTime = performance.now();

    if (!markdown || typeof markdown !== 'string') {
      return {
        html: '',
        stats: this.getEmptyStats(),
        success: true,
        processor: 'unified',
      };
    }

    if (!this.isInitialized) {
      console.warn('Processor not initialized, using fallback');
      return this.fallbackProcess(markdown);
    }

    try {
      // Process the markdown
      const result = await this.processor.process(markdown);
      let html = result.toString();

      // Post-process the HTML for table improvements and other enhancements
      html = this.postProcessHtml(html);

      // Debug: Log the HTML to see what's being generated
      console.log('Generated HTML:', html.substring(0, 500) + '...');

      // Calculate statistics
      const stats = this.calculateStats(
        markdown,
        html,
        performance.now() - startTime
      );

      return {
        html,
        stats,
        success: true,
        processor: 'unified',
      };
    } catch (error) {
      console.error('Unified processing failed:', error);

      // Fallback to basic processing
      const fallbackResult = this.fallbackProcess(markdown);
      fallbackResult.error =
        error instanceof Error ? error.message : 'Processing failed';

      return fallbackResult;
    }
  }

  /**
   * Quick processing without statistics (for performance)
   */
  async processMarkdownFast(markdown: string): Promise<string> {
    if (!markdown || !this.isInitialized) {
      return this.escapeHtml(markdown || '').replace(/\n/g, '<br>');
    }

    try {
      const result = await this.processor.process(markdown);
      let html = result.toString();

      // Apply post-processing for tables
      html = this.postProcessHtml(html);

      return html;
    } catch (error) {
      console.warn('Fast processing failed, using escape fallback:', error);
      return this.escapeHtml(markdown)
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>');
    }
  }

  /**
   * Check if specific features are available
   */
  getFeatureSupport() {
    return {
      math: true,
      tables: true,
      footnotes: false, // Disabled due to compatibility issues
      emoji: false, // Disabled due to compatibility issues
      codeHighlighting: false, // We'll handle this manually
      strikethrough: true,
      taskLists: true,
      autolinks: true,
    };
  }

  /**
   * Validate markdown syntax
   */
  validateMarkdown(markdown: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for unmatched delimiters
    const dollarSigns = (markdown.match(/\$/g) || []).length;
    if (dollarSigns % 2 !== 0) {
      errors.push('Unmatched math delimiters ($)');
    }

    // Check for problematic patterns
    if (markdown.includes('$$$$')) {
      errors.push('Invalid math delimiter pattern ($$$$)');
    }

    // Check for unclosed code blocks
    const codeBlockMatches = markdown.match(/```/g) || [];
    if (codeBlockMatches.length % 2 !== 0) {
      errors.push('Unclosed code block (```)');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  private fallbackProcess(markdown: string): ProcessingResult {
    try {
      // Basic markdown-like processing as fallback
      let html = this.escapeHtml(markdown);

      // Basic formatting
      html = html
        // Headers
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        // Bold and italic
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        // Code
        .replace(/`(.*?)`/g, '<code>$1</code>')
        // Code blocks
        .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
        // Links
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
        // Line breaks
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>');

      // Wrap in paragraphs
      html = `<p>${html}</p>`;

      // Apply table wrapping to fallback as well
      html = this.postProcessHtml(html);

      return {
        html,
        stats: this.getEmptyStats(),
        success: false,
        error: 'Using basic fallback processing',
        processor: 'fallback',
      };
    } catch (error) {
      return {
        html: this.escapeHtml(markdown).replace(/\n/g, '<br>'),
        stats: this.getEmptyStats(),
        success: false,
        error: 'All processing failed',
        processor: 'fallback',
      };
    }
  }

  private calculateStats(
    markdown: string,
    html: string,
    processingTime: number
  ): ProcessingStats {
    return {
      inlineMath: (markdown.match(/\$[^$\n]+?\$/g) || []).length,
      displayMath: (markdown.match(/\$\$[\s\S]+?\$\$/g) || []).length,
      codeBlocks: (markdown.match(/```[\s\S]*?```/g) || []).length,
      tables: (html.match(/<table>/g) || []).length, // Count from HTML since GFM processes tables
      footnotes: 0, // Will be 0 for now since footnotes plugin is disabled
      processingTime: Math.round(processingTime),
    };
  }

  private getEmptyStats(): ProcessingStats {
    return {
      inlineMath: 0,
      displayMath: 0,
      codeBlocks: 0,
      tables: 0,
      footnotes: 0,
      processingTime: 0,
    };
  }

  private escapeHtml(text: string): string {
    if (typeof document !== 'undefined') {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    } else {
      // Server-side fallback
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }
  }
}

// Export singleton instance
export const markdownProcessor = new UnifiedMarkdownProcessor();
