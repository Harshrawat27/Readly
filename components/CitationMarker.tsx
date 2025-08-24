'use client';

import { Citation } from '@/types/citations';

interface CitationMarkerProps {
  citations: Citation[];
  onCitationClick: (citation: Citation) => void;
}

export function CitationMarker({ citations, onCitationClick }: CitationMarkerProps) {
  return (
    <div className="mt-4 border-t border-[var(--border)] pt-4">
      <h4 className="text-sm font-semibold text-[var(--text-secondary)] mb-2">References:</h4>
      <div className="space-y-2">
        {citations.map((citation, index) => (
          <div
            key={citation.id}
            className="flex items-start space-x-2 p-2 bg-[var(--card-background)] border border-[var(--border)] rounded-lg cursor-pointer hover:bg-[var(--background)] transition-colors"
            onClick={() => onCitationClick(citation)}
          >
            <span className="flex-shrink-0 w-6 h-6 bg-[var(--accent)] text-white text-xs rounded-full flex items-center justify-center font-medium">
              {index + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[var(--text-primary)] font-medium">
                Page {citation.pageNumber}
              </p>
              <p className="text-xs text-[var(--text-muted)] truncate">
                &ldquo;{citation.text}&rdquo;
              </p>
            </div>
            <div className="flex-shrink-0">
              <svg className="w-4 h-4 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface CitationTooltipProps {
  citation: Citation;
  isVisible: boolean;
  position: { x: number; y: number };
  onClose: () => void;
}

export function CitationTooltip({ citation, isVisible, position, onClose }: CitationTooltipProps) {
  if (!isVisible) return null;

  return (
    <div 
      className="fixed z-50 bg-[var(--card-background)] border border-[var(--border)] rounded-lg shadow-lg p-3 max-w-xs"
      style={{ 
        left: position.x, 
        top: position.y - 10,
        transform: 'translateY(-100%)'
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-[var(--text-primary)]">
          Page {citation.pageNumber}
        </span>
        <button 
          onClick={onClose}
          className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <p className="text-xs text-[var(--text-secondary)]">
        &ldquo;{citation.text}&rdquo;
      </p>
      <button
        onClick={() => {/* Navigate to page */}}
        className="mt-2 text-xs text-[var(--accent)] hover:underline"
      >
        Go to page →
      </button>
    </div>
  );
}