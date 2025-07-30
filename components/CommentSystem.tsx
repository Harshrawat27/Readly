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
  pdfId: string;
  pageNumber: number;
  isCommentMode: boolean;
  currentUser: {
    id: string;
    name: string;
    image?: string;
  };
  onCommentCreate?: (comment: Omit<Comment, 'id' | 'createdAt' | 'user' | 'replies'>) => void;
  onCommentUpdate?: (id: string, updates: Partial<Comment>) => void;
  onCommentDelete?: (id: string) => void;
  onReplyCreate?: (commentId: string, content: string) => void;
}

export default function CommentSystem({
  pdfId,
  pageNumber,
  isCommentMode,
  currentUser,
  onCommentCreate,
  onCommentUpdate,
  onCommentDelete,
  onReplyCreate,
}: CommentSystemProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [selectedCommentId, setSelectedCommentId] = useState<string | null>(null);
  
  // Debug logging
  console.log('CommentSystem render:', { pdfId, pageNumber, isCommentMode });
  const [newCommentDialog, setNewCommentDialog] = useState<NewCommentDialog>({
    x: 0,
    y: 0,
    pageNumber: 0,
    visible: false,
  });
  const [newCommentText, setNewCommentText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load comments for current PDF
  useEffect(() => {
    if (pdfId) {
      loadComments();
    }
  }, [pdfId]);

  const loadComments = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/comments?pdfId=${pdfId}`);
      if (response.ok) {
        const data = await response.json();
        setComments(data);
      }
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePageClick = useCallback((event: React.MouseEvent) => {
    if (!isCommentMode) {
      console.log('Not in comment mode');
      return;
    }

    console.log('Click detected in comment mode');
    const target = event.target as HTMLElement;
    const pdfPage = target.closest('.pdf-page') || containerRef.current?.closest('.mb-4');
    
    if (!pdfPage) {
      console.log('No PDF page found');
      return;
    }

    // Don't create comment if clicking on existing comment or dialog
    if (target.closest('[data-comment-pin]') || target.closest('[data-comment-dialog]')) {
      console.log('Clicked on existing comment, ignoring');
      return;
    }

    const rect = pdfPage.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    console.log('Creating comment dialog at:', x, y);
    setNewCommentDialog({
      x,
      y,
      pageNumber,
      visible: true,
    });
    setSelectedCommentId(null);
  }, [isCommentMode, pageNumber]);

  const handleCreateComment = async () => {
    if (!newCommentText.trim()) return;

    const commentData = {
      content: newCommentText.trim(),
      x: newCommentDialog.x,
      y: newCommentDialog.y,
      pageNumber: newCommentDialog.pageNumber,
      resolved: false,
    };

    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...commentData,
          pdfId,
        }),
      });

      if (response.ok) {
        const newComment = await response.json();
        setComments(prev => [...prev, newComment]);
        onCommentCreate?.(commentData);
      }
    } catch (error) {
      console.error('Error creating comment:', error);
    }

    setNewCommentDialog({ x: 0, y: 0, pageNumber: 0, visible: false });
    setNewCommentText('');
  };

  const handleCommentMove = async (id: string, x: number, y: number) => {
    // Update local state immediately for smooth dragging
    setComments(prev =>
      prev.map(comment =>
        comment.id === id ? { ...comment, x, y } : comment
      )
    );

    // Debounced API call with timeout to prevent spam
    const timeoutId = setTimeout(async () => {
      try {
        await fetch(`/api/comments/${id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ x, y }),
        });
      } catch (error) {
        console.error('Error updating comment position:', error);
        // Revert on error
        loadComments();
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  };

  const handleCommentResolve = async (id: string) => {
    try {
      const response = await fetch(`/api/comments/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ resolved: true }),
      });

      if (response.ok) {
        setComments(prev =>
          prev.map(comment =>
            comment.id === id ? { ...comment, resolved: true } : comment
          )
        );
        onCommentUpdate?.(id, { resolved: true });
      }
    } catch (error) {
      console.error('Error resolving comment:', error);
    }
  };

  const handleCommentDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/comments/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setComments(prev => prev.filter(comment => comment.id !== id));
        onCommentDelete?.(id);
        setSelectedCommentId(null);
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  const handleReplyCreate = async (commentId: string, content: string) => {
    try {
      const response = await fetch(`/api/comments/${commentId}/replies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      });

      if (response.ok) {
        const newReply = await response.json();
        setComments(prev =>
          prev.map(comment =>
            comment.id === commentId
              ? {
                  ...comment,
                  replies: [...(comment.replies || []), newReply],
                }
              : comment
          )
        );
        onReplyCreate?.(commentId, content);
      }
    } catch (error) {
      console.error('Error creating reply:', error);
    }
  };

  // Filter comments for current page
  const pageComments = comments.filter(comment => comment.pageNumber === pageNumber);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: isCommentMode ? 10 : 5 }}
    >
      {/* Page Click Handler */}
      {isCommentMode && (
        <div
          className="absolute inset-0 pointer-events-auto cursor-crosshair bg-transparent"
          onClick={handlePageClick}
          style={{ 
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1
          }}
        />
      )}

      {/* Existing Comments */}
      {pageComments.map((comment) => (
        <div key={comment.id} className="pointer-events-auto" data-comment-pin style={{ zIndex: 10 }}>
          <CommentPin
            comment={comment}
            onMove={handleCommentMove}
            onResolve={handleCommentResolve}
            onReply={handleReplyCreate}
            onDelete={handleCommentDelete}
            isSelected={selectedCommentId === comment.id}
            onSelect={setSelectedCommentId}
            isDraggable={isCommentMode}
          />
        </div>
      ))}

      {/* New Comment Dialog */}
      {newCommentDialog.visible && (
        <div
          className="absolute w-80 bg-[var(--card-background)] border border-[var(--border)] rounded-lg shadow-xl pointer-events-auto"
          style={{
            left: `${newCommentDialog.x}%`,
            top: `${newCommentDialog.y}%`,
            transform: 'translate(-50%, -100%)',
            zIndex: 50
          }}
          data-comment-dialog
        >
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              {currentUser.image ? (
                <img
                  src={currentUser.image}
                  alt={currentUser.name}
                  className="w-6 h-6 rounded-full"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-[var(--accent)] text-white text-xs flex items-center justify-center">
                  {currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)}
                </div>
              )}
              <span className="text-sm font-medium text-[var(--text-primary)]">
                {currentUser.name}
              </span>
            </div>
            
            <textarea
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              placeholder="Add a comment..."
              className="w-full px-3 py-2 text-sm bg-[var(--faded-white)] border border-[var(--border)] rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
              rows={3}
              autoFocus
            />
            
            <div className="flex items-center justify-end gap-2 mt-3">
              <button
                onClick={() => {
                  setNewCommentDialog({ x: 0, y: 0, pageNumber: 0, visible: false });
                  setNewCommentText('');
                }}
                className="px-3 py-1 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateComment}
                disabled={!newCommentText.trim()}
                className="px-3 py-1 text-sm bg-[var(--accent)] text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
              >
                Comment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comment Mode Indicator */}
      {isCommentMode && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none">
          <div className="bg-[var(--accent)] text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg">
            Click anywhere to add a comment
          </div>
        </div>
      )}
    </div>
  );
}