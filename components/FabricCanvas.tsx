'use client';

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { fabric } from 'fabric';
import { useDebounce } from '@/hooks/useDebounce';

export interface Shape {
  id: string;
  type: 'rectangle' | 'circle' | 'arrow' | 'line';
  x: number; // percentage
  y: number; // percentage
  width: number; // percentage
  height: number; // percentage
  rotation: number; // degrees
  color: string;
  strokeWidth: number;
  fillColor?: string;
  opacity: number;
  pageNumber: number;
  zIndex: number;
  createdAt: Date;
  updatedAt: Date;
  pdfId: string;
  userId: string;
}

interface FabricCanvasProps {
  pageNumber: number;
  shapes: Shape[];
  isShapeMode: boolean;
  activeShapeType: string;
  selectedShapeId: string | null;
  onShapeCreate: (shapeData: Partial<Shape>) => Promise<void>;
  onShapeUpdate: (shapeId: string, updates: Partial<Shape>) => Promise<void>;
  onShapeDelete: (shapeId: string) => Promise<void>;
  onShapeSelect: (shapeId: string | null) => void;
}

const FabricCanvas: React.FC<FabricCanvasProps> = ({
  pageNumber,
  shapes,
  isShapeMode,
  activeShapeType,
  onShapeCreate,
  onShapeUpdate,
  onShapeDelete,
  onShapeSelect,
}) => {
  const canvasEl = useRef<HTMLCanvasElement>(null);
  const fabricCanvas = useRef<fabric.Canvas | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(
    null
  );

  // Debounced update function
  const debouncedUpdate = useDebounce(
    (shapeId: string, updates: Partial<Shape>) => {
      onShapeUpdate(shapeId, updates);
    },
    300
  );

  // Convert fabric coordinates to percentages
  const toPercentage = useCallback(
    (value: number, dimension: 'width' | 'height') => {
      if (!fabricCanvas.current) return 0;
      const canvas = fabricCanvas.current;
      const canvasSize =
        dimension === 'width' ? canvas.getWidth() : canvas.getHeight();
      return (value / canvasSize) * 100;
    },
    []
  );

  // Convert percentages to fabric coordinates
  const fromPercentage = useCallback(
    (percentage: number, dimension: 'width' | 'height') => {
      if (!fabricCanvas.current) return 0;
      const canvas = fabricCanvas.current;
      const canvasSize =
        dimension === 'width' ? canvas.getWidth() : canvas.getHeight();
      return (percentage / 100) * canvasSize;
    },
    []
  );

  // Create fabric object from shape data
  const createFabricObject = useCallback(
    (shape: Shape) => {
      const left = fromPercentage(shape.x, 'width');
      const top = fromPercentage(shape.y, 'height');
      const width = fromPercentage(shape.width, 'width');
      const height = fromPercentage(shape.height, 'height');

      const commonProps = {
        left,
        top,
        fill: shape.fillColor || 'transparent',
        stroke: shape.color,
        strokeWidth: shape.strokeWidth,
        opacity: shape.opacity,
        selectable: !isShapeMode,
        data: { id: shape.id, type: shape.type },
      };

      let fabricObj: fabric.Object;

      switch (shape.type) {
        case 'rectangle':
          fabricObj = new fabric.Rect({
            ...commonProps,
            width,
            height,
            rx: 4,
            ry: 4,
          });
          break;

        case 'circle':
          fabricObj = new fabric.Ellipse({
            ...commonProps,
            rx: width / 2,
            ry: height / 2,
          });
          break;

        case 'line':
          fabricObj = new fabric.Line([0, height, width, 0], {
            ...commonProps,
            fill: '',
          });
          break;

        case 'arrow':
          const arrowGroup = new fabric.Group(
            [
              new fabric.Line([0, height, width, 0], {
                stroke: shape.color,
                strokeWidth: shape.strokeWidth,
              }),
              new fabric.Triangle({
                left: width - 10,
                top: -5,
                width: 10,
                height: 10,
                fill: shape.color,
                angle: 45,
              }),
            ],
            commonProps
          );
          fabricObj = arrowGroup;
          break;

        default:
          fabricObj = new fabric.Rect({
            ...commonProps,
            width,
            height,
          });
      }

      return fabricObj;
    },
    [fromPercentage, isShapeMode]
  );

  // Convert fabric object to shape data
  const fabricObjectToShape = useCallback(
    (obj: fabric.Object): Partial<Shape> => {
      const data = obj.data as { id: string; type: string };

      return {
        id: data.id,
        type: data.type as Shape['type'],
        x: toPercentage(obj.left || 0, 'width'),
        y: toPercentage(obj.top || 0, 'height'),
        width: toPercentage((obj.width || 0) * (obj.scaleX || 1), 'width'),
        height: toPercentage((obj.height || 0) * (obj.scaleY || 1), 'height'),
        rotation: obj.angle || 0,
        color: obj.stroke as string,
        strokeWidth: obj.strokeWidth || 2,
        fillColor:
          (obj.fill as string) === 'transparent'
            ? undefined
            : (obj.fill as string),
        opacity: obj.opacity || 1,
      };
    },
    [toPercentage]
  );

  // Create shape function
  const createShape = useCallback(
    async (start: { x: number; y: number }, end: { x: number; y: number }) => {
      console.log('Creating shape:', { activeShapeType, start, end });
      if (!fabricCanvas.current) return;

      const canvas = fabricCanvas.current;

      // Remove preview objects
      canvas.remove(
        ...canvas.getObjects().filter((obj) => obj.data?.isPreview)
      );

      const width = Math.abs(end.x - start.x);
      const height = Math.abs(end.y - start.y);

      if (width < 10 && height < 10) return; // Too small

      const left = Math.min(end.x, start.x);
      const top = Math.min(end.y, start.y);

      const shapeData: Partial<Shape> = {
        type: activeShapeType as Shape['type'],
        x: toPercentage(left, 'width'),
        y: toPercentage(top, 'height'),
        width: toPercentage(width, 'width'),
        height: toPercentage(height, 'height'),
        rotation: 0,
        color: '#000000',
        strokeWidth: 2,
        fillColor:
          activeShapeType === 'rectangle' || activeShapeType === 'circle'
            ? '#E5E7EB'
            : undefined,
        opacity: 1,
        pageNumber,
        zIndex: shapes.length,
      };

      // Create the shape in database
      await onShapeCreate(shapeData);
    },
    [activeShapeType, toPercentage, pageNumber, shapes.length, onShapeCreate]
  );

  // Initialize Fabric.js canvas
  useEffect(() => {
    if (!canvasEl.current) return;

    // Get container dimensions
    const container = canvasEl.current.parentElement;
    const width = container?.clientWidth || 800;
    const height = container?.clientHeight || 600;

    const canvas = new fabric.Canvas(canvasEl.current, {
      width,
      height,
      selection: !isShapeMode,
    });

    fabricCanvas.current = canvas;

    // Handle object selection
    canvas.on('selection:created', (e) => {
      const activeObject = e.selected?.[0];
      if (activeObject && activeObject.data) {
        onShapeSelect(activeObject.data.id);
      }
    });

    canvas.on('selection:cleared', () => {
      onShapeSelect(null);
    });

    // Handle object modifications
    canvas.on('object:modified', (e) => {
      const obj = e.target;
      if (obj && obj.data) {
        const shapeData = fabricObjectToShape(obj);
        debouncedUpdate(obj.data.id, shapeData);
      }
    });

    return () => {
      canvas.dispose();
      fabricCanvas.current = null;
    };
  }, []); // Only initialize once

  // Handle mouse events for drawing - separate useEffect for event handlers
  useEffect(() => {
    if (!fabricCanvas.current) return;
    
    const canvas = fabricCanvas.current;

    const handleMouseDown = (e: fabric.IEvent) => {
      console.log('FabricCanvas mouseDown:', { isShapeMode, activeShapeType });
      if (!isShapeMode) return;

      const pointer = canvas.getPointer(e.e);
      console.log('Mouse down at:', pointer);
      setStartPoint(pointer);
      setIsDrawing(true);

      if (activeShapeType === 'line' || activeShapeType === 'arrow') {
        // For line and arrow, we handle differently
        if (!startPoint) {
          // First click
          setStartPoint(pointer);
        } else {
          // Second click - create the shape
          createShape(startPoint, pointer);
          setStartPoint(null);
          setIsDrawing(false);
        }
      }
    };

    const handleMouseMove = (e: fabric.IEvent) => {
      if (!isDrawing || !startPoint) return;

      const pointer = canvas.getPointer(e.e);

      if (activeShapeType === 'rectangle' || activeShapeType === 'circle') {
        // Live preview for rectangle and circle
        canvas.remove(
          ...canvas.getObjects().filter((obj) => obj.data?.isPreview)
        );

        const width = Math.abs(pointer.x - startPoint.x);
        const height = Math.abs(pointer.y - startPoint.y);
        const left = Math.min(pointer.x, startPoint.x);
        const top = Math.min(pointer.y, startPoint.y);

        let previewObj: fabric.Object;

        if (activeShapeType === 'rectangle') {
          previewObj = new fabric.Rect({
            left,
            top,
            width,
            height,
            fill: 'rgba(229, 231, 235, 0.7)',
            stroke: '#000000',
            strokeWidth: 2,
            strokeDashArray: [5, 5],
            selectable: false,
            evented: false,
            data: { isPreview: true },
          });
        } else {
          previewObj = new fabric.Ellipse({
            left: left + width / 2,
            top: top + height / 2,
            rx: width / 2,
            ry: height / 2,
            fill: 'rgba(229, 231, 235, 0.7)',
            stroke: '#000000',
            strokeWidth: 2,
            strokeDashArray: [5, 5],
            selectable: false,
            evented: false,
            data: { isPreview: true },
          });
        }

        canvas.add(previewObj);
        canvas.renderAll();
      } else if (
        (activeShapeType === 'line' || activeShapeType === 'arrow') &&
        startPoint
      ) {
        // Live preview for line and arrow
        canvas.remove(
          ...canvas.getObjects().filter((obj) => obj.data?.isPreview)
        );

        const line = new fabric.Line(
          [startPoint.x, startPoint.y, pointer.x, pointer.y],
          {
            stroke: '#007bff',
            strokeWidth: 2,
            strokeDashArray: [5, 5],
            selectable: false,
            evented: false,
            data: { isPreview: true },
          }
        );

        canvas.add(line);

        if (activeShapeType === 'arrow') {
          // Add arrowhead
          const angle = Math.atan2(
            pointer.y - startPoint.y,
            pointer.x - startPoint.x
          );
          const arrowhead = new fabric.Triangle({
            left: pointer.x,
            top: pointer.y,
            width: 10,
            height: 10,
            fill: '#007bff',
            angle: (angle * 180) / Math.PI + 90,
            originX: 'center',
            originY: 'center',
            selectable: false,
            evented: false,
            data: { isPreview: true },
          });
          canvas.add(arrowhead);
        }

        canvas.renderAll();
      }
    };

    const handleMouseUp = (e: fabric.IEvent) => {
      if (!isDrawing || !startPoint) return;

      if (activeShapeType === 'rectangle' || activeShapeType === 'circle') {
        const pointer = canvas.getPointer(e.e);
        createShape(startPoint, pointer);
        setIsDrawing(false);
        setStartPoint(null);
      }
    };

    canvas.on('mouse:down', handleMouseDown);
    canvas.on('mouse:move', handleMouseMove);
    canvas.on('mouse:up', handleMouseUp);

    return () => {
      canvas.off('mouse:down', handleMouseDown);
      canvas.off('mouse:move', handleMouseMove);
      canvas.off('mouse:up', handleMouseUp);
    };
  }, [isShapeMode, activeShapeType, isDrawing, startPoint, createShape]);

  // Load shapes into canvas
  useEffect(() => {
    if (!fabricCanvas.current) return;

    const canvas = fabricCanvas.current;

    // Clear existing objects (except previews)
    const existingObjects = canvas
      .getObjects()
      .filter((obj) => !obj.data?.isPreview);
    canvas.remove(...existingObjects);

    // Add shapes
    shapes.forEach((shape) => {
      const fabricObj = createFabricObject(shape);
      canvas.add(fabricObj);
    });

    canvas.renderAll();
  }, [shapes, createFabricObject]);

  // Update canvas settings based on mode
  useEffect(() => {
    if (!fabricCanvas.current) return;

    const canvas = fabricCanvas.current;
    canvas.selection = !isShapeMode;

    // Update cursor
    canvas.defaultCursor = isShapeMode ? 'crosshair' : 'default';
    canvas.hoverCursor = isShapeMode ? 'crosshair' : 'move';

    // Update object selectability
    canvas.getObjects().forEach((obj) => {
      if (!obj.data?.isPreview) {
        obj.selectable = !isShapeMode;
        obj.evented = !isShapeMode;
      }
    });

    canvas.renderAll();
  }, [isShapeMode]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (!fabricCanvas.current || !canvasEl.current?.parentElement) return;

      const parent = canvasEl.current.parentElement;
      const canvas = fabricCanvas.current;

      canvas.setWidth(parent.clientWidth);
      canvas.setHeight(parent.clientHeight);
      canvas.renderAll();
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial call

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!fabricCanvas.current) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        const activeObject = fabricCanvas.current.getActiveObject();
        if (activeObject && activeObject.data) {
          onShapeDelete(activeObject.data.id);
          fabricCanvas.current.remove(activeObject);
        }
      }

      if (e.key === 'Escape') {
        // Clear selection and cancel drawing
        fabricCanvas.current.discardActiveObject();
        fabricCanvas.current.remove(
          ...fabricCanvas.current
            .getObjects()
            .filter((obj) => obj.data?.isPreview)
        );
        fabricCanvas.current.renderAll();
        setIsDrawing(false);
        setStartPoint(null);
        onShapeSelect(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onShapeDelete, onShapeSelect]);

  return (
    <div
      className='absolute inset-0 pointer-events-auto'
      style={{ zIndex: 10 }}
    >
      <canvas
        ref={canvasEl}
        className='absolute inset-0'
        style={{
          cursor: isShapeMode ? 'crosshair' : 'default',
        }}
      />
    </div>
  );
};

export default FabricCanvas;
