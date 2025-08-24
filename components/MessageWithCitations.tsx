'use client';

import { useEffect, useRef } from 'react';

interface MessageWithCitationsProps {
  content: string;
  citations?: Array<{
    id: string;
    pageNumber: number;
    text: string;
    chunkId?: string;
  }>;
  role: 'user' | 'assistant';
  onNavigateToPage?: (pageNumber: number) => void;
}

export function MessageWithCitations({
  content,
  citations = [],
  role,
  onNavigateToPage
}: MessageWithCitationsProps) {
  const messageRef = useRef<HTMLDivElement>(null);

  // Add click handlers to citation markers after content is rendered
  useEffect(() => {
    if (messageRef.current) {
      const citationMarkers = messageRef.current.querySelectorAll('.citation-marker');
      
      const clickHandlers: Array<{ element: Element; handler: (e: Event) => void }> = [];
      
      citationMarkers.forEach((marker) => {
        const pageNumber = parseInt(marker.getAttribute('data-page-number') || '1');
        
        const handleClick = (e: Event) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('🎯 Citation clicked:', pageNumber);
          if (onNavigateToPage) {
            onNavigateToPage(pageNumber);
          }
        };
        
        marker.addEventListener('click', handleClick);
        clickHandlers.push({ element: marker, handler: handleClick });
      });
      
      // Cleanup function
      return () => {
        clickHandlers.forEach(({ element, handler }) => {
          element.removeEventListener('click', handler);
        });
      };
    }
  }, [content, onNavigateToPage]);

  // Process markdown first, then handle citations
  const processedContent = content
    .replace(/^---+$/gm, '<hr class="my-6 border-[var(--border)]" />') // Horizontal rules
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
    .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic
    .replace(/`([^`]+)`/g, '<code class="bg-[var(--background)] px-1.5 py-0.5 rounded text-sm font-mono">$1</code>') // Inline code
    .replace(/^### (.*$)/gm, '<h3 class="text-base font-semibold text-[var(--text-primary)] mb-2 mt-4">$1</h3>') // H3
    .replace(/^## (.*$)/gm, '<h2 class="text-lg font-semibold text-[var(--text-primary)] mb-3 mt-4">$1</h2>') // H2
    .replace(/^# (.*$)/gm, '<h1 class="text-xl font-bold text-[var(--text-primary)] mb-4 mt-4">$1</h1>') // H1
    .replace(/\n\n/g, '</p><p class="text-[var(--text-primary)] leading-relaxed mb-4">') // Paragraphs
    .replace(/^(.*)$/gm, '<p class="text-[var(--text-primary)] leading-relaxed mb-4">$1</p>') // Wrap remaining text in paragraphs
    .replace(/<p class="[^"]*"><\/p>/g, '') // Remove empty paragraphs
    .replace(/(<p[^>]*>)\s*(<h[1-6][^>]*>)/g, '$2') // Remove p tags before headers
    .replace(/(<\/h[1-6]>)\s*(<\/p>)/g, '$1') // Remove p tags after headers
    .replace(/(<p[^>]*>)\s*(<hr[^>]*>)/g, '$2') // Remove p tags before hr
    .replace(/(<hr[^>]*>)\s*(<\/p>)/g, '$1'); // Remove p tags after hr

  console.log('🎨 Processed content:', processedContent.substring(0, 300) + '...');

  return (
    <div className="space-y-4">
      <div 
        ref={messageRef} 
        className="prose prose-sm max-w-none"
        dangerouslySetInnerHTML={{ __html: processedContent }}
      />
    </div>
  );
}