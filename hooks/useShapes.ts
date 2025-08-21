import { useState, useEffect, useCallback } from 'react';
import { Shape } from '@/components/ShapeTool';

export function useShapes(pdfId: string | null) {
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load shapes for a PDF
  const loadShapes = useCallback(async (pdfId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/shapes?pdfId=${pdfId}`);
      if (response.ok) {
        const shapesData = await response.json();
        setShapes(shapesData);
      } else {
        console.error('Failed to load shapes');
        setShapes([]);
      }
    } catch (error) {
      console.error('Error loading shapes:', error);
      setShapes([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load shapes when pdfId changes
  useEffect(() => {
    if (pdfId) {
      loadShapes(pdfId);
    } else {
      setShapes([]);
    }
  }, [pdfId, loadShapes]);

  // Get shapes for a specific page
  const getShapesForPage = useCallback(
    (pageNumber: number) => {
      return shapes.filter(shape => shape.pageNumber === pageNumber);
    },
    [shapes]
  );

  // Add a new shape
  const addShape = useCallback((newShape: Shape) => {
    setShapes(prev => [...prev, newShape]);
  }, []);

  // Update an existing shape
  const updateShape = useCallback((updatedShape: Shape) => {
    setShapes(prev =>
      prev.map(shape =>
        shape.id === updatedShape.id ? updatedShape : shape
      )
    );
  }, []);

  // Delete a shape
  const deleteShape = useCallback((shapeId: string) => {
    setShapes(prev => prev.filter(shape => shape.id !== shapeId));
  }, []);

  // Clear all shapes (when switching PDFs)
  const clearShapes = useCallback(() => {
    setShapes([]);
  }, []);

  return {
    shapes,
    isLoading,
    getShapesForPage,
    addShape,
    updateShape,
    deleteShape,
    clearShapes,
    reload: () => pdfId && loadShapes(pdfId),
  };
}