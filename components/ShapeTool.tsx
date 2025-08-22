'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { ToolType } from './FigmaToolbar';

export interface Shape {
  id: string;
  pdfId: string;
  pageNumber: number;
  userId: string;
  type: 'rectangle' | 'ellipse' | 'line' | 'arrow';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  color: string;
  strokeWidth?: number;
  fillColor?: string;
  opacity?: number;
  selected: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ShapeToolProps {
  isActive: boolean;
  activeTool: ToolType;
  pdfId: string;
  pageNumber: number;
  userId: string;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onShapeCreate?: (shape: Shape) => void;
  onShapeUpdate?: (shape: Shape) => void;
  onShapeDelete?: (shapeId: string) => void;
  shapes: Shape[];
  shapeColor?: string;
  shapeStrokeWidth?: number;
  scale?: number; // PDF zoom scale factor
}

interface DrawingState {
  isDrawing: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  draggedShape?: Shape;
  dragOffset?: { x: number; y: number };
  resizing?: {
    shape: Shape;
    handle: 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w';
    startX: number;
    startY: number;
    startShapeX: number;
    startShapeY: number;
    startShapeWidth: number;
    startShapeHeight: number;
  };
  editingLineEndpoint?: {
    shape: Shape;
    endpoint: 'start' | 'end';
    startX: number;
    startY: number;
    startShapeX: number;
    startShapeY: number;
    startShapeWidth: number;
    startShapeHeight: number;
  };
}

const DEFAULT_SHAPE_SIZE = 100;
const MIN_SHAPE_SIZE = 10;

export default function ShapeTool({
  isActive,
  activeTool,
  pdfId,
  pageNumber,
  userId,
  containerRef,
  onShapeCreate,
  onShapeUpdate,
  onShapeDelete,
  shapes,
  shapeColor: propsShapeColor,
  shapeStrokeWidth: propsShapeStrokeWidth,
  scale = 1,
}: ShapeToolProps) {
  const [drawingState, setDrawingState] = useState<DrawingState>({
    isDrawing: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
  });

  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);

  // Use props or fallback to defaults
  const shapeColor = propsShapeColor || '#000000';
  const strokeWidth = propsShapeStrokeWidth || 2;

  const overlayRef = useRef<HTMLDivElement>(null);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Shape type mapping for tools
  const getShapeType = (tool: ToolType): Shape['type'] | null => {
    switch (tool) {
      case 'rectangle':
        return 'rectangle';
      case 'ellipse':
        return 'ellipse';
      case 'line':
        return 'line';
      case 'arrow':
        return 'arrow';
      default:
        return null;
    }
  };

  const isShapeToolActive = useCallback(() => {
    return (
      isActive &&
      ['rectangle', 'ellipse', 'line', 'arrow', 'move'].includes(activeTool)
    );
  }, [isActive, activeTool]);

  const isDrawingTool = useCallback(() => {
    return (
      isActive && ['rectangle', 'ellipse', 'line', 'arrow'].includes(activeTool)
    );
  }, [isActive, activeTool]);

  // For pointer events, we need auto when drawing OR when in move mode and there are shapes to interact with
  const shouldCapturePointerEvents = useCallback(() => {
    if (!isActive) return false;

    // Always capture for drawing tools
    if (['rectangle', 'ellipse', 'line', 'arrow'].includes(activeTool)) {
      return true;
    }

    // For move tool, only capture if there are shapes on this page that could be selected
    if (activeTool === 'move') {
      return shapes.some((shape) => shape.pageNumber === pageNumber);
    }

    return false;
  }, [isActive, activeTool, shapes, pageNumber]);

  // Create shape via API
  const createShape = useCallback(
    async (shapeData: Partial<Shape>) => {
      try {
        const response = await fetch('/api/shapes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(shapeData),
        });

        if (response.ok) {
          const newShape = await response.json();
          onShapeCreate?.(newShape);
          return newShape;
        }
      } catch (error) {
        console.error('Failed to create shape:', error);
      }
    },
    [onShapeCreate]
  );

  // Update shape via API with debouncing
  const updateShape = useCallback(
    async (shapeId: string, updates: Partial<Shape>) => {
      try {
        const response = await fetch(`/api/shapes/${shapeId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });

        if (response.ok) {
          const updatedShape = await response.json();
          onShapeUpdate?.(updatedShape);
          return updatedShape;
        }
      } catch (error) {
        console.error('Failed to update shape:', error);
      }
    },
    [onShapeUpdate]
  );

  // Debounced update for drag operations - reduced for smoother updates
  const debouncedUpdateShape = useCallback(
    (shapeId: string, updates: Partial<Shape>) => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }

      updateTimeoutRef.current = setTimeout(() => {
        updateShape(shapeId, updates);
      }, 50); // 50ms debounce for smoother updates
    },
    [updateShape]
  );

  // Delete shape via API
  const deleteShape = useCallback(
    async (shapeId: string) => {
      try {
        const response = await fetch(`/api/shapes/${shapeId}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          onShapeDelete?.(shapeId);
        }
      } catch (error) {
        console.error('Failed to delete shape:', error);
      }
    },
    [onShapeDelete]
  );

  // Get mouse position relative to container, adjusted for PDF scale
  const getMousePosition = useCallback(
    (e: MouseEvent | React.MouseEvent) => {
      // Try the containerRef first, otherwise use the event target
      const targetElement =
        containerRef.current ||
        (e.target as HTMLElement)?.closest('[data-page-number]') ||
        (e.target as HTMLElement);

      if (!targetElement || !('getBoundingClientRect' in targetElement)) {
        console.warn('No valid target element found for mouse position');
        return { x: 0, y: 0 };
      }

      const rect = targetElement.getBoundingClientRect();
      // Convert screen coordinates to PDF coordinate space by dividing by scale
      const x = (e.clientX - rect.left) / scale;
      const y = (e.clientY - rect.top) / scale;

      return { x, y };
    },
    [containerRef, scale]
  );

  // Check if point is inside shape (coordinates are in PDF space, not screen space)
  const isPointInShape = useCallback(
    (x: number, y: number, shape: Shape) => {
      switch (shape.type) {
        case 'rectangle':
          return (
            x >= shape.x &&
            x <= shape.x + shape.width &&
            y >= shape.y &&
            y <= shape.y + shape.height
          );
        case 'ellipse':
          const centerX = shape.x + shape.width / 2;
          const centerY = shape.y + shape.height / 2;
          const radiusX = shape.width / 2;
          const radiusY = shape.height / 2;
          const dx = (x - centerX) / radiusX;
          const dy = (y - centerY) / radiusY;
          return dx * dx + dy * dy <= 1;
        case 'line':
        case 'arrow':
          // For lines/arrows, check distance from line
          const lineDistance = distanceToLine(
            x,
            y,
            shape.x,
            shape.y,
            shape.x + shape.width,
            shape.y + shape.height
          );
          return lineDistance <= (shape.strokeWidth || 2) + 5 / scale; // Adjust tolerance for scale
        default:
          return false;
      }
    },
    [scale]
  );

  // Calculate distance from point to line
  const distanceToLine = (
    px: number,
    py: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ) => {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;

    if (lenSq === 0) return Math.sqrt(A * A + B * B);

    let param = dot / lenSq;

    if (param < 0) {
      param = 0;
    } else if (param > 1) {
      param = 1;
    }

    const xx = x1 + param * C;
    const yy = y1 + param * D;

    const dx = px - xx;
    const dy = py - yy;

    return Math.sqrt(dx * dx + dy * dy);
  };

  // Handle mouse down for drawing/selection - pure mousedown without click
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!isShapeToolActive()) return;

      // Prevent any default behavior and stop propagation
      e.preventDefault();
      e.stopPropagation();

      const { x, y } = getMousePosition(e);
      const shapeType = getShapeType(activeTool);

      // Check if clicking on a resize handle first (works for any shape tool)
      const target = e.target as SVGElement;
      const handleType = target.getAttribute('data-handle');
      const endpointType = target.getAttribute('data-endpoint');

      if ((handleType || endpointType) && selectedShapeId) {
        // Find the shape this handle belongs to
        const clickedShape = shapes.find(
          (shape) => selectedShapeId === shape.id
        );

        if (clickedShape) {
          if (
            endpointType &&
            (clickedShape.type === 'line' || clickedShape.type === 'arrow')
          ) {
            // Line/arrow endpoint editing
            setDrawingState({
              isDrawing: false,
              startX: x,
              startY: y,
              currentX: x,
              currentY: y,
              editingLineEndpoint: {
                shape: clickedShape,
                endpoint: endpointType as 'start' | 'end',
                startX: x,
                startY: y,
                startShapeX: clickedShape.x,
                startShapeY: clickedShape.y,
                startShapeWidth: clickedShape.width,
                startShapeHeight: clickedShape.height,
              },
            });
            return;
          } else if (handleType) {
            // Regular resize handle
            setDrawingState({
              isDrawing: false,
              startX: x,
              startY: y,
              currentX: x,
              currentY: y,
              resizing: {
                shape: clickedShape,
                handle: handleType as
                  | 'nw'
                  | 'ne'
                  | 'sw'
                  | 'se'
                  | 'n'
                  | 's'
                  | 'e'
                  | 'w',
                startX: x,
                startY: y,
                startShapeX: clickedShape.x,
                startShapeY: clickedShape.y,
                startShapeWidth: clickedShape.width,
                startShapeHeight: clickedShape.height,
              },
            });
            return;
          }
        }
      }

      // Check if clicking on an existing shape for selection/manipulation
      const clickedShape = shapes.find((shape) => isPointInShape(x, y, shape));

      if (clickedShape) {
        setSelectedShapeId(clickedShape.id);

        // Start dragging immediately on mouse down - no need to wait for mouse move
        setDrawingState({
          isDrawing: false,
          startX: x,
          startY: y,
          currentX: x,
          currentY: y,
          draggedShape: clickedShape,
          dragOffset: {
            x: x - clickedShape.x,
            y: y - clickedShape.y,
          },
        });
      } else if (shapeType && activeTool !== 'move') {
        // Start drawing new shape immediately on mousedown
        setDrawingState({
          isDrawing: true,
          startX: x,
          startY: y,
          currentX: x,
          currentY: y,
        });
        setSelectedShapeId(null);
      } else {
        // Clicked on empty area, deselect
        setSelectedShapeId(null);
      }
    },
    [
      isShapeToolActive,
      getMousePosition,
      activeTool,
      shapes,
      isPointInShape,
      selectedShapeId,
    ]
  );

  // Handle mouse move for drawing/dragging/resizing - continuous movement
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isShapeToolActive()) return;

      // Prevent default to ensure smooth movement
      e.preventDefault();

      const { x, y } = getMousePosition(e);

      if (drawingState.isDrawing) {
        // Update current drawing position continuously
        setDrawingState((prev) => ({
          ...prev,
          currentX: x,
          currentY: y,
        }));
      } else if (drawingState.resizing) {
        // Handle resizing with immediate visual feedback
        const {
          shape,
          handle,
          startX,
          startY,
          startShapeX,
          startShapeY,
          startShapeWidth,
          startShapeHeight,
        } = drawingState.resizing;
        const dx = x - startX;
        const dy = y - startY;

        let newX = startShapeX;
        let newY = startShapeY;
        let newWidth = startShapeWidth;
        let newHeight = startShapeHeight;

        switch (handle) {
          case 'nw':
            newX = startShapeX + dx;
            newY = startShapeY + dy;
            newWidth = startShapeWidth - dx;
            newHeight = startShapeHeight - dy;
            break;
          case 'ne':
            newY = startShapeY + dy;
            newWidth = startShapeWidth + dx;
            newHeight = startShapeHeight - dy;
            break;
          case 'sw':
            newX = startShapeX + dx;
            newWidth = startShapeWidth - dx;
            newHeight = startShapeHeight + dy;
            break;
          case 'se':
            newWidth = startShapeWidth + dx;
            newHeight = startShapeHeight + dy;
            break;
          case 'n':
            newY = startShapeY + dy;
            newHeight = startShapeHeight - dy;
            break;
          case 's':
            newHeight = startShapeHeight + dy;
            break;
          case 'w':
            newX = startShapeX + dx;
            newWidth = startShapeWidth - dx;
            break;
          case 'e':
            newWidth = startShapeWidth + dx;
            break;
        }

        // Ensure minimum size (adjust for scale)
        newWidth = Math.max(newWidth, MIN_SHAPE_SIZE / scale);
        newHeight = Math.max(newHeight, MIN_SHAPE_SIZE / scale);

        // Update local shape immediately for smooth visual feedback
        onShapeUpdate?.({
          ...shape,
          x: newX,
          y: newY,
          width: newWidth,
          height: newHeight,
        });

        // Also update via API with debouncing
        debouncedUpdateShape(shape.id, {
          x: newX,
          y: newY,
          width: newWidth,
          height: newHeight,
        });
      } else if (drawingState.editingLineEndpoint) {
        // Handle line/arrow endpoint editing
        const {
          shape,
          endpoint,
          startX,
          startY,
          startShapeX,
          startShapeY,
          startShapeWidth,
          startShapeHeight,
        } = drawingState.editingLineEndpoint;
        const dx = x - startX;
        const dy = y - startY;

        let newX = startShapeX;
        let newY = startShapeY;
        let newWidth = startShapeWidth;
        let newHeight = startShapeHeight;

        if (endpoint === 'start') {
          // Move start point - adjust x, y and compensate width, height
          newX = startShapeX + dx;
          newY = startShapeY + dy;
          newWidth = startShapeWidth - dx;
          newHeight = startShapeHeight - dy;
        } else {
          // Move end point - only adjust width, height
          newWidth = startShapeWidth + dx;
          newHeight = startShapeHeight + dy;
        }

        // Update local shape immediately for smooth visual feedback
        onShapeUpdate?.({
          ...shape,
          x: newX,
          y: newY,
          width: newWidth,
          height: newHeight,
        });

        // Also update via API with debouncing
        debouncedUpdateShape(shape.id, {
          x: newX,
          y: newY,
          width: newWidth,
          height: newHeight,
        });
      } else if (drawingState.draggedShape && drawingState.dragOffset) {
        // Update dragged shape position with immediate visual feedback
        const newX = x - drawingState.dragOffset.x;
        const newY = y - drawingState.dragOffset.y;

        // Update local shape immediately for smooth visual feedback
        onShapeUpdate?.({
          ...drawingState.draggedShape,
          x: newX,
          y: newY,
        });

        // Also update via API with debouncing
        debouncedUpdateShape(drawingState.draggedShape.id, {
          x: newX,
          y: newY,
        });
      }
    },
    [
      isShapeToolActive,
      getMousePosition,
      drawingState,
      debouncedUpdateShape,
      onShapeUpdate,
      scale,
    ]
  );

  // Handle mouse up to finalize drawing/dragging - completes the operation
  const handleMouseUp = useCallback(
    async (e: MouseEvent) => {
      if (!isShapeToolActive()) return;

      // Prevent default behavior
      e.preventDefault();

      if (drawingState.isDrawing) {
        const { x, y } = getMousePosition(e);
        const shapeType = getShapeType(activeTool);

        if (!shapeType) {
          // Reset drawing state if no valid shape type
          setDrawingState({
            isDrawing: false,
            startX: 0,
            startY: 0,
            currentX: 0,
            currentY: 0,
          });
          return;
        }

        // Calculate shape dimensions differently for lines/arrows vs rectangles/circles
        let shapeX, shapeY, shapeWidth, shapeHeight;

        if (shapeType === 'line' || shapeType === 'arrow') {
          // For lines and arrows, preserve direction - no normalization
          shapeX = drawingState.startX;
          shapeY = drawingState.startY;
          shapeWidth = x - drawingState.startX;
          shapeHeight = y - drawingState.startY;

          // Check if this was a drag operation (moved more than 5 pixels in any direction, adjust for scale)
          const wasDragged =
            Math.abs(shapeWidth) > 5 / scale ||
            Math.abs(shapeHeight) > 5 / scale;

          if (!wasDragged) {
            // Single click - create a horizontal line of default size (adjust for scale)
            shapeWidth = DEFAULT_SHAPE_SIZE / scale;
            shapeHeight = 0;
          }
        } else {
          // For rectangles and circles, normalize coordinates
          shapeX = Math.min(drawingState.startX, x);
          shapeY = Math.min(drawingState.startY, y);
          shapeWidth = Math.abs(x - drawingState.startX);
          shapeHeight = Math.abs(y - drawingState.startY);

          // Check if this was a drag operation (moved more than 5 pixels, adjust for scale)
          const wasDragged = shapeWidth > 5 / scale || shapeHeight > 5 / scale;

          if (!wasDragged) {
            // Single click - create default size shape centered at click point (adjust for scale)
            shapeX = drawingState.startX - DEFAULT_SHAPE_SIZE / scale / 2;
            shapeY = drawingState.startY - DEFAULT_SHAPE_SIZE / scale / 2;
            shapeWidth = DEFAULT_SHAPE_SIZE / scale;
            shapeHeight = DEFAULT_SHAPE_SIZE / scale;
          } else {
            // Ensure minimum size for rectangles/circles (adjust for scale)
            shapeWidth = Math.max(shapeWidth, MIN_SHAPE_SIZE / scale);
            shapeHeight = Math.max(shapeHeight, MIN_SHAPE_SIZE / scale);
          }
        }

        // Create the new shape
        const newShape = await createShape({
          pdfId,
          pageNumber,
          userId,
          type: shapeType,
          x: shapeX,
          y: shapeY,
          width: shapeWidth,
          height: shapeHeight,
          color: shapeColor,
          strokeWidth,
          opacity: 1,
        });

        if (newShape) {
          setSelectedShapeId(newShape.id);
        }
      }

      // Always reset drawing state after mouse up
      setDrawingState({
        isDrawing: false,
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0,
        draggedShape: undefined,
        dragOffset: undefined,
        resizing: undefined,
        editingLineEndpoint: undefined,
      });
    },
    [
      isShapeToolActive,
      drawingState,
      getMousePosition,
      activeTool,
      createShape,
      pdfId,
      pageNumber,
      userId,
      shapeColor,
      strokeWidth,
      scale,
    ]
  );

  // Add event listeners with proper capture
  useEffect(() => {
    if (!isShapeToolActive()) return;

    // Use capture: true to ensure we get events first
    document.addEventListener('mousemove', handleMouseMove, { capture: true });
    document.addEventListener('mouseup', handleMouseUp, { capture: true });

    return () => {
      document.removeEventListener('mousemove', handleMouseMove, {
        capture: true,
      });
      document.removeEventListener('mouseup', handleMouseUp, { capture: true });
    };
  }, [isShapeToolActive, handleMouseMove, handleMouseUp]);

  // Handle keyboard events for deletion
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isShapeToolActive() || !selectedShapeId) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteShape(selectedShapeId);
        setSelectedShapeId(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isShapeToolActive, selectedShapeId, deleteShape]);

  // Render current drawing shape preview
  const renderDrawingPreview = () => {
    if (!drawingState.isDrawing) return null;

    const shapeType = getShapeType(activeTool);
    if (!shapeType) return null;

    const x = Math.min(drawingState.startX, drawingState.currentX);
    const y = Math.min(drawingState.startY, drawingState.currentY);
    const width = Math.abs(drawingState.currentX - drawingState.startX);
    const height = Math.abs(drawingState.currentY - drawingState.startY);

    switch (shapeType) {
      case 'rectangle':
        return (
          <rect
            x={x * scale}
            y={y * scale}
            width={width * scale}
            height={height * scale}
            stroke={shapeColor}
            strokeWidth={strokeWidth * scale}
            fill={shapeColor}
            fillOpacity={0.2}
            opacity={0.7}
          />
        );
      case 'ellipse':
        return (
          <ellipse
            cx={(x + width / 2) * scale}
            cy={(y + height / 2) * scale}
            rx={(width / 2) * scale}
            ry={(height / 2) * scale}
            stroke={shapeColor}
            strokeWidth={strokeWidth * scale}
            fill={shapeColor}
            fillOpacity={0.2}
            opacity={0.7}
          />
        );
      case 'line':
        return (
          <line
            x1={drawingState.startX * scale}
            y1={drawingState.startY * scale}
            x2={drawingState.currentX * scale}
            y2={drawingState.currentY * scale}
            stroke={shapeColor}
            strokeWidth={strokeWidth * scale}
            opacity={0.7}
          />
        );
      case 'arrow':
        const dx = drawingState.currentX - drawingState.startX;
        const dy = drawingState.currentY - drawingState.startY;
        const angle = Math.atan2(dy, dx);
        const arrowLength = Math.sqrt(dx * dx + dy * dy);
        const arrowHeadSize = Math.min(15 / scale, arrowLength * 0.15);

        // Calculate arrowhead lines (two lines forming a V shape)
        const arrowHeadX1 =
          (drawingState.currentX -
            arrowHeadSize * Math.cos(angle - Math.PI / 6)) *
          scale;
        const arrowHeadY1 =
          (drawingState.currentY -
            arrowHeadSize * Math.sin(angle - Math.PI / 6)) *
          scale;
        const arrowHeadX2 =
          (drawingState.currentX -
            arrowHeadSize * Math.cos(angle + Math.PI / 6)) *
          scale;
        const arrowHeadY2 =
          (drawingState.currentY -
            arrowHeadSize * Math.sin(angle + Math.PI / 6)) *
          scale;

        return (
          <g opacity={0.7}>
            {/* Main line */}
            <line
              x1={drawingState.startX * scale}
              y1={drawingState.startY * scale}
              x2={drawingState.currentX * scale}
              y2={drawingState.currentY * scale}
              stroke={shapeColor}
              strokeWidth={strokeWidth * scale}
            />
            {/* Arrowhead - two lines forming V shape */}
            <line
              x1={drawingState.currentX * scale}
              y1={drawingState.currentY * scale}
              x2={arrowHeadX1}
              y2={arrowHeadY1}
              stroke={shapeColor}
              strokeWidth={strokeWidth * scale}
            />
            <line
              x1={drawingState.currentX * scale}
              y1={drawingState.currentY * scale}
              x2={arrowHeadX2}
              y2={arrowHeadY2}
              stroke={shapeColor}
              strokeWidth={strokeWidth * scale}
            />
          </g>
        );
      default:
        return null;
    }
  };

  // Render existing shapes
  const renderShapes = () => {
    return shapes
      .filter((shape) => shape.pageNumber === pageNumber)
      .map((shape) => {
        const isSelected = selectedShapeId === shape.id;

        let shapeElement;

        switch (shape.type) {
          case 'rectangle':
            shapeElement = (
              <rect
                x={shape.x * scale}
                y={shape.y * scale}
                width={shape.width * scale}
                height={shape.height * scale}
                stroke={shape.color}
                strokeWidth={(shape.strokeWidth || 2) * scale}
                fill={shape.color}
                fillOpacity={0.2}
                opacity={shape.opacity || 1}
              />
            );
            break;
          case 'ellipse':
            shapeElement = (
              <ellipse
                cx={(shape.x + shape.width / 2) * scale}
                cy={(shape.y + shape.height / 2) * scale}
                rx={(shape.width / 2) * scale}
                ry={(shape.height / 2) * scale}
                stroke={shape.color}
                strokeWidth={(shape.strokeWidth || 2) * scale}
                fill={shape.color}
                fillOpacity={0.2}
                opacity={shape.opacity || 1}
              />
            );
            break;
          case 'line':
            shapeElement = (
              <line
                x1={shape.x * scale}
                y1={shape.y * scale}
                x2={(shape.x + shape.width) * scale}
                y2={(shape.y + shape.height) * scale}
                stroke={shape.color}
                strokeWidth={(shape.strokeWidth || 2) * scale}
                fill={shape.fillColor || 'transparent'}
                opacity={shape.opacity || 1}
              />
            );
            break;
          case 'arrow':
            const dx = shape.width;
            const dy = shape.height;
            const angle = Math.atan2(dy, dx);
            const arrowLength = Math.sqrt(dx * dx + dy * dy);
            const arrowHeadSize = Math.min(15 / scale, arrowLength * 0.15); // Adjust arrowhead size for scale

            const endX = (shape.x + shape.width) * scale;
            const endY = (shape.y + shape.height) * scale;
            const arrowHeadX1 =
              endX - arrowHeadSize * scale * Math.cos(angle - Math.PI / 6);
            const arrowHeadY1 =
              endY - arrowHeadSize * scale * Math.sin(angle - Math.PI / 6);
            const arrowHeadX2 =
              endX - arrowHeadSize * scale * Math.cos(angle + Math.PI / 6);
            const arrowHeadY2 =
              endY - arrowHeadSize * scale * Math.sin(angle + Math.PI / 6);

            shapeElement = (
              <g>
                {/* Main line */}
                <line
                  x1={shape.x * scale}
                  y1={shape.y * scale}
                  x2={endX}
                  y2={endY}
                  stroke={shape.color}
                  strokeWidth={(shape.strokeWidth || 2) * scale}
                  opacity={shape.opacity || 1}
                />
                {/* Arrowhead - two lines forming V shape */}
                <line
                  x1={endX}
                  y1={endY}
                  x2={arrowHeadX1}
                  y2={arrowHeadY1}
                  stroke={shape.color}
                  strokeWidth={(shape.strokeWidth || 2) * scale}
                  opacity={shape.opacity || 1}
                />
                <line
                  x1={endX}
                  y1={endY}
                  x2={arrowHeadX2}
                  y2={arrowHeadY2}
                  stroke={shape.color}
                  strokeWidth={(shape.strokeWidth || 2) * scale}
                  opacity={shape.opacity || 1}
                />
              </g>
            );
            break;
          default:
            return null;
        }

        return (
          <g key={shape.id} style={{ pointerEvents: 'auto', cursor: 'grab' }}>
            {shapeElement}
            {isSelected && (
              <g style={{ pointerEvents: 'auto' }}>
                {/* Selection outline */}
                <rect
                  x={(shape.x - 2 / scale) * scale}
                  y={(shape.y - 2 / scale) * scale}
                  width={(shape.width + 4 / scale) * scale}
                  height={(shape.height + 4 / scale) * scale}
                  stroke='#007AFF'
                  strokeWidth={1 * scale}
                  strokeDasharray={`${4 * scale} ${4 * scale}`}
                  fill='transparent'
                  style={{ pointerEvents: 'auto' }}
                />
                {/* Resize handles for non-line shapes */}
                {shape.type !== 'line' && shape.type !== 'arrow' && (
                  <g style={{ pointerEvents: 'auto' }}>
                    {/* Corner handles */}
                    <rect
                      x={(shape.x - 4 / scale) * scale}
                      y={(shape.y - 4 / scale) * scale}
                      width={8 * scale}
                      height={8 * scale}
                      fill='white'
                      stroke='#007AFF'
                      strokeWidth={1 * scale}
                      style={{ cursor: 'nw-resize', pointerEvents: 'auto' }}
                      data-handle='nw'
                    />
                    <rect
                      x={(shape.x + shape.width - 4 / scale) * scale}
                      y={(shape.y - 4 / scale) * scale}
                      width={8 * scale}
                      height={8 * scale}
                      fill='white'
                      stroke='#007AFF'
                      strokeWidth={1 * scale}
                      style={{ cursor: 'ne-resize', pointerEvents: 'auto' }}
                      data-handle='ne'
                    />
                    <rect
                      x={(shape.x - 4 / scale) * scale}
                      y={(shape.y + shape.height - 4 / scale) * scale}
                      width={8 * scale}
                      height={8 * scale}
                      fill='white'
                      stroke='#007AFF'
                      strokeWidth={1 * scale}
                      style={{ cursor: 'sw-resize', pointerEvents: 'auto' }}
                      data-handle='sw'
                    />
                    <rect
                      x={(shape.x + shape.width - 4 / scale) * scale}
                      y={(shape.y + shape.height - 4 / scale) * scale}
                      width={8 * scale}
                      height={8 * scale}
                      fill='white'
                      stroke='#007AFF'
                      strokeWidth={1 * scale}
                      style={{ cursor: 'se-resize', pointerEvents: 'auto' }}
                      data-handle='se'
                    />
                    {/* Side handles */}
                    <rect
                      x={(shape.x + shape.width / 2 - 4 / scale) * scale}
                      y={(shape.y - 4 / scale) * scale}
                      width={8 * scale}
                      height={8 * scale}
                      fill='white'
                      stroke='#007AFF'
                      strokeWidth={1 * scale}
                      style={{ cursor: 'n-resize', pointerEvents: 'auto' }}
                      data-handle='n'
                    />
                    <rect
                      x={(shape.x + shape.width / 2 - 4 / scale) * scale}
                      y={(shape.y + shape.height - 4 / scale) * scale}
                      width={8 * scale}
                      height={8 * scale}
                      fill='white'
                      stroke='#007AFF'
                      strokeWidth={1 * scale}
                      style={{ cursor: 's-resize', pointerEvents: 'auto' }}
                      data-handle='s'
                    />
                    <rect
                      x={(shape.x - 4 / scale) * scale}
                      y={(shape.y + shape.height / 2 - 4 / scale) * scale}
                      width={8 * scale}
                      height={8 * scale}
                      fill='white'
                      stroke='#007AFF'
                      strokeWidth={1 * scale}
                      style={{ cursor: 'w-resize', pointerEvents: 'auto' }}
                      data-handle='w'
                    />
                    <rect
                      x={(shape.x + shape.width - 4 / scale) * scale}
                      y={(shape.y + shape.height / 2 - 4 / scale) * scale}
                      width={8 * scale}
                      height={8 * scale}
                      fill='white'
                      stroke='#007AFF'
                      strokeWidth={1 * scale}
                      style={{ cursor: 'e-resize', pointerEvents: 'auto' }}
                      data-handle='e'
                    />
                  </g>
                )}
                {/* Line/arrow endpoint handles */}
                {(shape.type === 'line' || shape.type === 'arrow') && (
                  <g style={{ pointerEvents: 'auto' }}>
                    <circle
                      cx={shape.x * scale}
                      cy={shape.y * scale}
                      r={4 * scale}
                      fill='white'
                      stroke='#007AFF'
                      strokeWidth={1 * scale}
                      style={{ cursor: 'move', pointerEvents: 'auto' }}
                      data-endpoint='start'
                    />
                    <circle
                      cx={(shape.x + shape.width) * scale}
                      cy={(shape.y + shape.height) * scale}
                      r={4 * scale}
                      fill='white'
                      stroke='#007AFF'
                      strokeWidth={1 * scale}
                      style={{ cursor: 'move', pointerEvents: 'auto' }}
                      data-endpoint='end'
                    />
                  </g>
                )}
              </g>
            )}
          </g>
        );
      });
  };

  if (!isActive) return null;

  return (
    <div
      ref={overlayRef}
      className='absolute inset-0'
      style={{
        cursor: isDrawingTool() ? 'crosshair' : 'default',
        pointerEvents: 'none', // Always none for div
        zIndex: 20,
      }}
    >
      <svg
        className='absolute inset-0 w-full h-full'
        onMouseDown={handleMouseDown}
        style={{
          zIndex: 21,
          pointerEvents: isDrawingTool() ? 'auto' : 'none',
        }}
      >
        {renderShapes()}
        {renderDrawingPreview()}
      </svg>
    </div>
  );
}
