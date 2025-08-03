'use client';

import { useState } from 'react';
import { ProcessedOutlineItem } from '@/lib/pdfOutline';

interface PDFChapterNavigationProps {
  outline: ProcessedOutlineItem[] | null;
  currentPage: number;
  onPageNavigate: (pageNumber: number) => void;
  isOpen: boolean;
  onToggle: () => void;
}

interface ChapterItemProps {
  item: ProcessedOutlineItem;
  currentPage: number;
  onPageNavigate: (pageNumber: number) => void;
  level: number;
}

function ChapterItem({ item, currentPage, onPageNavigate, level }: ChapterItemProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = item.children && item.children.length > 0;
  const isCurrentPage = item.pageNumber === currentPage;
  
  // Calculate indentation based on level
  const indentClass = level === 0 ? '' : `ml-${Math.min(level * 4, 16)}`;
  
  return (
    <div className="chapter-item">
      <div
        className={`flex items-center gap-2 py-2 px-3 cursor-pointer rounded-lg transition-colors group hover:bg-[var(--faded-white)] ${
          isCurrentPage ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-primary)]'
        } ${indentClass}`}
        onClick={() => {
          if (item.pageNumber) {
            onPageNavigate(item.pageNumber);
          }
          if (hasChildren) {
            setIsExpanded(!isExpanded);
          }
        }}
      >
        {/* Expand/Collapse Icon */}
        {hasChildren && (
          <button
            className={`p-1 rounded transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            <svg
              className={`w-3 h-3 ${isCurrentPage ? 'text-white' : 'text-[var(--text-muted)]'}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        )}
        
        {/* Chapter Title */}
        <span 
          className={`flex-1 text-sm truncate ${!hasChildren ? 'ml-6' : ''} ${
            isCurrentPage ? 'font-medium' : ''
          }`}
          title={item.title}
        >
          {item.title}
        </span>
        
        {/* Page Number */}
        {item.pageNumber && (
          <span 
            className={`text-xs px-2 py-1 rounded ${
              isCurrentPage 
                ? 'bg-white/20 text-white' 
                : 'bg-[var(--border)] text-[var(--text-muted)]'
            }`}
          >
            {item.pageNumber}
          </span>
        )}
      </div>
      
      {/* Children */}
      {hasChildren && isExpanded && (
        <div className="mt-1">
          {item.children!.map((child, index) => (
            <ChapterItem
              key={`${child.title}-${index}`}
              item={child}
              currentPage={currentPage}
              onPageNavigate={onPageNavigate}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function PDFChapterNavigation({
  outline,
  currentPage,
  onPageNavigate,
  isOpen,
  onToggle,
}: PDFChapterNavigationProps) {
  // Don't render if no outline is available
  if (!outline || outline.length === 0) {
    return null;
  }

  return (
    <div
      className={`fixed top-20 left-4 bg-[var(--card-background)] border border-[var(--border)] rounded-lg shadow-lg transition-all duration-300 z-30 ${
        isOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-full pointer-events-none'
      }`}
      style={{ maxHeight: 'calc(100vh - 120px)', width: '280px' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <svg
            className="w-4 h-4 text-[var(--accent)]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
          <h3 className="text-sm font-medium text-[var(--text-primary)]">
            Table of Contents
          </h3>
        </div>
        <button
          onClick={onToggle}
          className="p-1 hover:bg-[var(--faded-white)] rounded transition-colors"
        >
          <svg
            className="w-4 h-4 text-[var(--text-muted)]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M18 6L6 18" />
            <path d="M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      {/* Chapter List */}
      <div className="overflow-y-auto max-h-96 p-2 chapter-nav-scroll">
        {outline.map((item, index) => (
          <ChapterItem
            key={`${item.title}-${index}`}
            item={item}
            currentPage={currentPage}
            onPageNavigate={onPageNavigate}
            level={0}
          />
        ))}
      </div>
    </div>
  );
}