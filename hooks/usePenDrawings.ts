import { useState, useEffect, useCallback } from 'react';

interface Point {
  x: number;
  y: number;
  pressure?: number;
}

interface Stroke {
  id: string;
  points: Point[];
  width: number;
  color: string;
  timestamp: number;
}

export interface PenDrawing {
  id: string;
  pdfId: string;
  pageNumber: number;
  strokes: Stroke[];
  createdAt: Date;
  updatedAt: Date;
}

export function usePenDrawings(pdfId: string | null) {
  const [drawings, setDrawings] = useState<PenDrawing[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load drawings for a PDF
  const loadDrawings = useCallback(async (pdfId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/pen-drawings?pdfId=${pdfId}`);
      if (response.ok) {
        const drawingsData = await response.json();
        setDrawings(drawingsData);
      } else {
        console.error('Failed to load pen drawings');
        setDrawings([]);
      }
    } catch (error) {
      console.error('Error loading pen drawings:', error);
      setDrawings([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load drawings when pdfId changes
  useEffect(() => {
    if (pdfId) {
      loadDrawings(pdfId);
    } else {
      setDrawings([]);
    }
  }, [pdfId, loadDrawings]);

  // Get drawings for a specific page
  const getDrawingsForPage = useCallback(
    (pageNumber: number): Stroke[] => {
      const pageDrawing = drawings.find(drawing => drawing.pageNumber === pageNumber);
      return pageDrawing?.strokes || [];
    },
    [drawings]
  );

  // Save drawings for a specific page
  const saveDrawingsForPage = useCallback(async (pageNumber: number, strokes: Stroke[]) => {
    if (!pdfId) return;

    try {
      const response = await fetch('/api/pen-drawings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdfId,
          pageNumber,
          strokes,
        }),
      });

      if (response.ok) {
        const savedDrawing = await response.json();
        
        // Update local state
        setDrawings(prev => {
          const existingIndex = prev.findIndex(d => d.pageNumber === pageNumber);
          if (existingIndex >= 0) {
            // Update existing drawing
            const updated = [...prev];
            updated[existingIndex] = savedDrawing;
            return updated;
          } else {
            // Add new drawing
            return [...prev, savedDrawing].sort((a, b) => a.pageNumber - b.pageNumber);
          }
        });
      }
    } catch (error) {
      console.error('Failed to save pen drawings:', error);
    }
  }, [pdfId]);

  // Update drawings for a page (used for real-time updates)
  const updateDrawingsForPage = useCallback((pageNumber: number, strokes: Stroke[]) => {
    setDrawings(prev => {
      const existingIndex = prev.findIndex(d => d.pageNumber === pageNumber);
      if (existingIndex >= 0) {
        // Update existing drawing
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          strokes,
          updatedAt: new Date(),
        };
        return updated;
      } else {
        // Add new drawing (temporary, will be saved later)
        const newDrawing: PenDrawing = {
          id: `temp-${pageNumber}`,
          pdfId: pdfId || '',
          pageNumber,
          strokes,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        return [...prev, newDrawing].sort((a, b) => a.pageNumber - b.pageNumber);
      }
    });
  }, [pdfId]);

  // Clear drawings for a page
  const clearDrawingsForPage = useCallback(async (pageNumber: number) => {
    if (!pdfId) return;

    try {
      const response = await fetch(`/api/pen-drawings?pdfId=${pdfId}&pageNumber=${pageNumber}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setDrawings(prev => prev.filter(d => d.pageNumber !== pageNumber));
      }
    } catch (error) {
      console.error('Failed to clear pen drawings:', error);
    }
  }, [pdfId]);

  // Clear all drawings (when switching PDFs)
  const clearAllDrawings = useCallback(() => {
    setDrawings([]);
  }, []);

  return {
    drawings,
    isLoading,
    getDrawingsForPage,
    saveDrawingsForPage,
    updateDrawingsForPage,
    clearDrawingsForPage,
    clearAllDrawings,
    reload: () => pdfId && loadDrawings(pdfId),
  };
}