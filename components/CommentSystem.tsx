'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import CommentPin from './CommentPin';

interface Comment {
  id: string;
  content: string;
  x: number;
  y: number;
  pageNumber: number;
  resolved: boolean;
  createdAt: string;
  user: {
    name: string;
    image?: string;
  };
  replies?: CommentReply[];
}

interface CommentReply {
  id: string;
  content: string;
  createdAt: string;
  user: {
    name: string;
    image?: string;
  };
}

interface NewCommentDialog {
  x: number;
  y: number;
  pageNumber: number;
  visible: boolean;
}

interface CommentSystemProps {
  pageNumber: number;
  isCommentMode: boolean;
  isMoveMode: boolean;
  currentUser: {
    id: string;
    name: string;
    image?: string;
  };
  comments: Comment[]; // Pre-loaded comments for this page
  onCommentCreate?: (
    comment: Omit<Comment, 'id' | 'createdAt' | 'user' | 'replies'>
  ) => void;
  onCommentUpdate?: (id: string, updates: Partial<Comment>) => void;
  onCommentDelete?: (id: string) => void;
  onReplyCreate?: (commentId: string, content: string) => void;
}

interface Toast {
  id: string;
  message: string;
  type: 'error' | 'success';
}

export default function CommentSystem({
  pageNumber,
  isCommentMode,
  isMoveMode,
  currentUser,
  comments: pageComments,
  onCommentCreate,
  onCommentUpdate,
  onCommentDelete,
  onReplyCreate,
}: CommentSystemProps) {
  const [selectedCommentId, setSelectedCommentId] = useState<string | null>(
    null
  );
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [tempPositions, setTempPositions] = useState<
    Record<string, { x: number; y: number }>
  >({});
  const moveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [newCommentDialog, setNewCommentDialog] = useState<NewCommentDialog>({
    x: 0,
    y: 0,
    pageNumber: 0,
    visible: false,
  });
  const [newCommentText, setNewCommentText] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Toast management
  const addToast = (message: string, type: 'error' | 'success' = 'error') => {
    const id = Date.now().toString();
    const toast = { id, message, type };
    setToasts((prev) => [...prev, toast]);

    // Auto remove after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (moveTimeoutRef.current) {
        clearTimeout(moveTimeoutRef.current);
      }
    };
  }, []);

  const handlePageClick = useCallback(
    (event: React.MouseEvent) => {
      if (!isCommentMode) {
        // console.log('Not in comment mode');
        return;
      }

      // console.log('Click detected in comment mode');
      const target = event.target as HTMLElement;
      const pdfPage =
        target.closest('.pdf-page') || containerRef.current?.closest('.mb-4');

      if (!pdfPage) {
        // console.log('No PDF page found');
        return;
      }

      // Don't create comment if clicking on existing comment or dialog
      if (
        target.closest('[data-comment-pin]') ||
        target.closest('[data-comment-dialog]')
      ) {
        // console.log('Clicked on existing comment, ignoring');
        return;
      }

      const rect = pdfPage.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 100;
      const y = ((event.clientY - rect.top) / rect.height) * 100;

      // console.log('Creating comment dialog at:', x, y);
      setNewCommentDialog({
        x,
        y,
        pageNumber,
        visible: true,
      });
      setSelectedCommentId(null);
    },
    [isCommentMode, pageNumber]
  );

  const handleCreateComment = async () => {
    if (!newCommentText.trim()) return;

    const commentData = {
      content: newCommentText.trim(),
      x: newCommentDialog.x,
      y: newCommentDialog.y,
      pageNumber: newCommentDialog.pageNumber,
      resolved: false,
    };

    setNewCommentDialog({ x: 0, y: 0, pageNumber: 0, visible: false });
    setNewCommentText('');

    try {
      await onCommentCreate?.(commentData);
      addToast('Comment created successfully!', 'success');
    } catch (error) {
      // console.error('Error creating comment:', error);
      addToast('Failed to create comment. Please try again.');
    }
  };

  const handleCommentMove = (id: string, x: number, y: number) => {
    // Only update temp position for smooth visual feedback (like shapes - pure local updates)
    setTempPositions((prev) => ({
      ...prev,
      [id]: { x, y },
    }));
    
    // No API calls during drag - keep it pure like shapes
  };

  const handleCommentMoveComplete = (id: string, x: number, y: number) => {
    // Now make the API call like shapes do on completion
    onCommentUpdate?.(id, { x, y });
    
    // Clear temp position after API call
    setTempPositions((prev) => {
      const newPositions = { ...prev };
      delete newPositions[id];
      return newPositions;
    });
  };

  const handleCommentResolve = (id: string) => {
    const comment = pageComments.find((c) => c.id === id);
    if (!comment) return;
    onCommentUpdate?.(id, { resolved: !comment.resolved });
  };

  const handleCommentDelete = (id: string) => {
    onCommentDelete?.(id);
    setSelectedCommentId(null);
  };

  const handleReplyCreate = (commentId: string, content: string) => {
    onReplyCreate?.(commentId, content);
  };

  // Comments are already filtered by page from parent component

  return (
    <div
      ref={containerRef}
      className='absolute inset-0 pointer-events-none'
      style={{ zIndex: isCommentMode || isMoveMode ? 50 : 45 }}
    >
      {/* Page Click Handler */}
      {isCommentMode && (
        <div
          className='absolute inset-0 pointer-events-auto cursor-crosshair bg-transparent'
          onClick={handlePageClick}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1,
          }}
        />
      )}

      {/* Existing Comments */}
      {pageComments.map((comment) => {
        // Use temp position if available, otherwise use stored position
        const tempPos = tempPositions[comment.id];
        const displayComment = tempPos
          ? { ...comment, x: tempPos.x, y: tempPos.y }
          : comment;

        return (
          <div
            key={comment.id}
            className='pointer-events-auto'
            data-comment-pin
            style={{ zIndex: 52 }}
          >
            <CommentPin
              comment={displayComment}
              onMove={handleCommentMove}
              onMoveComplete={handleCommentMoveComplete}
              onResolve={handleCommentResolve}
              onReply={handleReplyCreate}
              onDelete={handleCommentDelete}
              isSelected={selectedCommentId === comment.id}
              onSelect={setSelectedCommentId}
              isDraggable={isCommentMode || isMoveMode}
              currentUser={currentUser}
            />
          </div>
        );
      })}

      {/* New Comment Dialog */}
      {newCommentDialog.visible && (
        <div
          className='absolute w-80 bg-[var(--card-background)] border border-[var(--border)] rounded-lg shadow-xl pointer-events-auto'
          style={{
            left: `${newCommentDialog.x}%`,
            top: `${newCommentDialog.y}%`,
            transform: 'translate(0%, -100%)',
            zIndex: 50,
          }}
          data-comment-dialog
        >
          <div className='p-4'>
            <div className='flex items-center gap-2 mb-3'>
              {currentUser.image ? (
                <img
                  src={currentUser.image}
                  alt={currentUser.name}
                  className='w-6 h-6 rounded-full'
                />
              ) : (
                <div className='w-6 h-6 rounded-full bg-[var(--accent)] text-white text-xs flex items-center justify-center'>
                  {currentUser.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .substring(0, 2)}
                </div>
              )}
              <span className='text-sm font-medium text-[var(--text-primary)]'>
                {currentUser.name}
              </span>
            </div>

            <textarea
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              placeholder='Add a comment...'
              className='w-full px-3 py-2 text-sm bg-[var(--faded-white)] border border-[var(--border)] rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent'
              rows={3}
              autoFocus
            />

            <div className='flex items-center justify-end gap-2 mt-3'>
              <button
                onClick={() => {
                  setNewCommentDialog({
                    x: 0,
                    y: 0,
                    pageNumber: 0,
                    visible: false,
                  });
                  setNewCommentText('');
                }}
                className='px-3 py-1 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              >
                Cancel
              </button>
              <button
                onClick={handleCreateComment}
                disabled={!newCommentText.trim()}
                className='px-3 py-1 text-sm bg-[var(--accent)] text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90'
              >
                Comment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comment Mode Indicator */}
      {isCommentMode && (
        <div className='fixed top-4 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none'>
          <div className='bg-[var(--accent)] text-white px-4 py-2 rounded-full text-sm font-medium'>
            Click anywhere to add a comment
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <div className='fixed bottom-4 right-4 z-50 pointer-events-none'>
        <div className='space-y-2'>
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium transition-all duration-300 ${
                toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'
              }`}
            >
              <div className='flex items-center gap-2'>
                {toast.type === 'error' ? (
                  <svg
                    className='w-4 h-4'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='2'
                  >
                    <circle cx='12' cy='12' r='10' />
                    <path d='M15 9l-6 6' />
                    <path d='M9 9l6 6' />
                  </svg>
                ) : (
                  <svg
                    className='w-4 h-4'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='2'
                  >
                    <path d='M20 6L9 17l-5-5' />
                  </svg>
                )}
                <span>{toast.message}</span>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className='ml-2 text-white/70 hover:text-white'
              >
                <svg
                  className='w-4 h-4'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2'
                >
                  <path d='M18 6L6 18' />
                  <path d='M6 6l12 12' />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
