'use client';

import { useState, useCallback } from 'react';
import { Citation } from '@/types/citations';

interface UseCitationsReturn {
  handleCitationClick: (citation: Citation, onNavigateToPage?: (pageNumber: number) => void) => void;
  hoveredCitation: Citation | null;
  tooltipPosition: { x: number; y: number };
  isTooltipVisible: boolean;
  hideTooltip: () => void;
  showTooltip: (citation: Citation, x: number, y: number) => void;
}

export function useCitations(): UseCitationsReturn {
  const [hoveredCitation, setHoveredCitation] = useState<Citation | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);

  const handleCitationClick = useCallback((citation: Citation, onNavigateToPage?: (pageNumber: number) => void) => {
    if (onNavigateToPage) {
      onNavigateToPage(citation.pageNumber);
    }
    hideTooltip();
  }, []);

  const showTooltip = useCallback((citation: Citation, x: number, y: number) => {
    setHoveredCitation(citation);
    setTooltipPosition({ x, y });
    setIsTooltipVisible(true);
  }, []);

  const hideTooltip = useCallback(() => {
    setHoveredCitation(null);
    setIsTooltipVisible(false);
  }, []);

  return {
    handleCitationClick,
    hoveredCitation,
    tooltipPosition,
    isTooltipVisible,
    hideTooltip,
    showTooltip,
  };
}