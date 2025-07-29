'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import * as fabric from 'fabric';
import { AnnotationTool, HighlightColor } from './PDFAnnotationToolbar';

interface Comment {
  id: string;
  x: number;
  y: number;
  content: string;
  pageNumber: number;
}

interface PDFAnnotationLayerProps {
  activeTool: AnnotationTool;
  highlightColor: HighlightColor;
  pageNumber: number;
  pageWidth: number;
  pageHeight: number;
  scale: number;
  onCommentAdd: (comment: Omit<Comment, 'id'>) => void;
  comments: Comment[];
}

export default function PDFAnnotationLayer({
  activeTool,
  highlightColor,
  pageNumber,
  pageWidth,
  pageHeight,
  scale,
  onCommentAdd,
  comments,
}: PDFAnnotationLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [showCommentDialog, setShowCommentDialog] = useState(false);
  const [commentPosition, setCommentPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [commentText, setCommentText] = useState('');

  // Initialize Fabric.js canvas
  useEffect(() => {
    if (!canvasRef.current) return;
    
    console.log('Initializing canvas for page', pageNumber, 'with dimensions:', pageWidth * scale, 'x', pageHeight * scale, 'tool:', activeTool);

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: pageWidth * scale,
      height: pageHeight * scale,
      selection: activeTool === 'select',
      interactive: activeTool !== 'highlight',
      preserveObjectStacking: true,
      backgroundColor: 'transparent',
    } as any);

    fabricCanvasRef.current = canvas;

    // Handle tool-specific interactions
    canvas.on('mouse:down', (e) => {
      console.log('Canvas mouse down event:', activeTool, e);
      const pointer = canvas.getPointer(e.e);
      
      if (activeTool === 'arrow') {
        console.log('Starting arrow drawing');
        setIsDrawing(true);
        setStartPoint(pointer);
      } else if (activeTool === 'text') {
        console.log('Adding text annotation');
        addTextAnnotation(pointer.x, pointer.y);
      } else if (activeTool === 'comment') {
        console.log('Opening comment dialog');
        setCommentPosition(pointer);
        setShowCommentDialog(true);
      }
    });

    canvas.on('mouse:move', (e) => {
      if (!isDrawing || !startPoint || activeTool !== 'arrow') return;
      
      const pointer = canvas.getPointer(e.e);
      drawArrowPreview(startPoint, pointer);
    });

    canvas.on('mouse:up', (e) => {
      if (isDrawing && startPoint && activeTool === 'arrow') {
        const pointer = canvas.getPointer(e.e);
        addArrowAnnotation(startPoint, pointer);
        setIsDrawing(false);
        setStartPoint(null);
      }
    });

    return () => {
      canvas.dispose();
      fabricCanvasRef.current = null;
    };
  }, [pageWidth, pageHeight, scale, activeTool]);

  // Update canvas selection mode based on active tool
  useEffect(() => {
    console.log('Active tool changed to:', activeTool, 'for page', pageNumber);
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.selection = activeTool === 'select';
      fabricCanvasRef.current.interactive = activeTool !== 'highlight';
      fabricCanvasRef.current.forEachObject((obj) => {
        obj.selectable = activeTool === 'select';
        obj.evented = activeTool === 'select';
      });
      fabricCanvasRef.current.renderAll();
    }
  }, [activeTool, pageNumber]);

  // Add text annotation
  const addTextAnnotation = useCallback((x: number, y: number) => {
    if (!fabricCanvasRef.current) return;

    const text = new fabric.IText('Click to edit', {
      left: x,
      top: y,
      fontSize: 16,
      fill: '#000000',
      fontFamily: 'Arial',
      selectable: true,
      editable: true,
    } as any);

    fabricCanvasRef.current.add(text);
    fabricCanvasRef.current.setActiveObject(text);
    text.enterEditing();
  }, []);

  // Add arrow annotation
  const addArrowAnnotation = useCallback((start: { x: number; y: number }, end: { x: number; y: number }) => {
    if (!fabricCanvasRef.current) return;
    
    console.log('Creating arrow from', start, 'to', end);

    // Calculate arrow properties
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const angle = Math.atan2(dy, dx);
    const length = Math.sqrt(dx * dx + dy * dy);
    
    console.log('Arrow properties:', { dx, dy, angle, length });

    // Create arrow line
    const line = new fabric.Line([start.x, start.y, end.x, end.y], {
      stroke: '#ff4444',
      strokeWidth: 3,
      selectable: true,
    } as any);

    // Create arrowhead
    const arrowHead = new fabric.Triangle({
      left: end.x,
      top: end.y,
      width: 15,
      height: 15,
      fill: '#ff4444',
      angle: (angle * 180) / Math.PI + 90,
      originX: 'center',
      originY: 'center',
      selectable: true,
    } as any);

    // Group arrow parts
    const arrow = new fabric.Group([line, arrowHead], {
      selectable: true,
    } as any);

    fabricCanvasRef.current.add(arrow);
    fabricCanvasRef.current.renderAll();
    console.log('Arrow added to canvas');
  }, []);

  // Draw arrow preview while dragging
  const drawArrowPreview = useCallback((start: { x: number; y: number }, end: { x: number; y: number }) => {
    if (!fabricCanvasRef.current) return;

    // Remove previous preview
    const objects = fabricCanvasRef.current.getObjects();
    const existingPreview = objects.find((obj) => (obj as any).name === 'arrow-preview');
    if (existingPreview) {
      fabricCanvasRef.current.remove(existingPreview);
    }

    // Draw new preview
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const angle = Math.atan2(dy, dx);

    const line = new fabric.Line([start.x, start.y, end.x, end.y], {
      stroke: '#ff4444',
      strokeWidth: 2,
      selectable: false,
      evented: false,
      strokeDashArray: [5, 5],
    } as any);

    const arrowHead = new fabric.Triangle({
      left: end.x,
      top: end.y,
      width: 10,
      height: 10,
      fill: '#ff4444',
      angle: (angle * 180) / Math.PI + 90,
      originX: 'center',
      originY: 'center',
      selectable: false,
      evented: false,
    } as any);

    const preview = new fabric.Group([line, arrowHead], {
      selectable: false,
      evented: false,
    } as any);
    (preview as any).name = 'arrow-preview';

    fabricCanvasRef.current.add(preview);
    fabricCanvasRef.current.renderAll();
  }, []);

  // Handle comment submission
  const handleCommentSubmit = useCallback(() => {
    if (!commentText.trim()) return;

    onCommentAdd({
      x: commentPosition.x,
      y: commentPosition.y,
      content: commentText,
      pageNumber,
    });

    setCommentText('');
    setShowCommentDialog(false);
  }, [commentText, commentPosition, pageNumber, onCommentAdd]);

  // Add comment icons for existing comments
  useEffect(() => {
    if (!fabricCanvasRef.current) return;

    const pageComments = comments.filter((comment) => comment.pageNumber === pageNumber);
    
    pageComments.forEach((comment) => {
      const commentIcon = new fabric.Circle({
        left: comment.x,
        top: comment.y,
        radius: 8,
        fill: '#2196f3',
        stroke: '#ffffff',
        strokeWidth: 2,
        selectable: true,
        hoverCursor: 'pointer',
      } as any);
      (commentIcon as any).data = { type: 'comment', commentId: comment.id };

      // Add comment text
      const commentNumber = new fabric.Text('💬', {
        left: comment.x,
        top: comment.y,
        fontSize: 12,
        fill: '#ffffff',
        originX: 'center',
        originY: 'center',
        selectable: false,
        evented: false,
      } as any);

      const commentGroup = new fabric.Group([commentIcon, commentNumber], {
        left: comment.x,
        top: comment.y,
        selectable: true,
        hoverCursor: 'pointer',
      } as any);
      (commentGroup as any).data = { type: 'comment', commentId: comment.id, content: comment.content };

      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.add(commentGroup);
      }
    });

    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.renderAll();
    }
  }, [comments, pageNumber]);

  return (
    <div className="absolute inset-0 z-10">
      <canvas
        ref={canvasRef}
        className={`absolute top-0 left-0 ${
          activeTool === 'arrow' || activeTool === 'text' || activeTool === 'comment' 
            ? 'pointer-events-auto cursor-crosshair' 
            : 'pointer-events-none'
        }`}
        style={{
          width: pageWidth * scale,
          height: pageHeight * scale,
          border: (activeTool === 'arrow' || activeTool === 'text' || activeTool === 'comment') ? '1px solid rgba(255,0,0,0.2)' : 'none', // Debug border
        }}
      />

      {/* Comment Dialog */}
      {showCommentDialog && (
        <div
          className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-4 w-80"
          style={{
            left: Math.min(commentPosition.x, window.innerWidth - 320),
            top: Math.max(commentPosition.y - 100, 20),
          }}
        >
          <div className="space-y-3">
            <h3 className="font-medium text-gray-900">Add Comment</h3>
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Enter your comment..."
              className="w-full h-20 p-2 border border-gray-300 rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowCommentDialog(false);
                  setCommentText('');
                }}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleCommentSubmit}
                disabled={!commentText.trim()}
                className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}