'use client';

import { useState, useRef, useEffect } from 'react';

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

interface CommentPinProps {
  comment: Comment;
  onMove?: (id: string, x: number, y: number) => void;
  onResolve?: (id: string) => void;
  onReply?: (commentId: string, content: string) => void;
  onDelete?: (id: string) => void;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
  isDraggable?: boolean;
}

export default function CommentPin({
  comment,
  onMove,
  onResolve,
  onReply,
  onDelete,
  isSelected = false,
  onSelect,
  isDraggable = true,
}: CommentPinProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [replyText, setReplyText] = useState('');
  const [showReplyInput, setShowReplyInput] = useState(false);
  const pinRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dialogRef.current &&
        !dialogRef.current.contains(event.target as Node) &&
        pinRef.current &&
        !pinRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setShowReplyInput(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleMouseDown = (event: React.MouseEvent) => {
    if (!isDraggable) return;
    
    event.preventDefault();
    setIsDragging(true);
    
    const rect = pinRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      });
    }
    
    onSelect?.(comment.id);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (event: MouseEvent) => {
      if (!pinRef.current || !onMove) return;

      const pdfContainer = pinRef.current.closest('.pdf-page');
      if (!pdfContainer) return;

      const containerRect = pdfContainer.getBoundingClientRect();
      const newX = ((event.clientX - dragOffset.x - containerRect.left) / containerRect.width) * 100;
      const newY = ((event.clientY - dragOffset.y - containerRect.top) / containerRect.height) * 100;

      // Constrain to container bounds
      const clampedX = Math.max(0, Math.min(100, newX));
      const clampedY = Math.max(0, Math.min(100, newY));

      onMove(comment.id, clampedX, clampedY);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset, comment.id, onMove]);

  const handlePinClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (!isDragging) {
      setIsOpen(!isOpen);
      onSelect?.(comment.id);
    }
  };

  const handleReply = () => {
    if (replyText.trim() && onReply) {
      onReply(comment.id, replyText.trim());
      setReplyText('');
      setShowReplyInput(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <>
      {/* Comment Pin */}
      <div
        ref={pinRef}
        className={`absolute cursor-pointer z-20 ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        } ${isSelected ? 'ring-2 ring-[var(--accent)]' : ''}`}
        style={{
          left: `${comment.x}%`,
          top: `${comment.y}%`,
          transform: 'translate(-50%, -50%)',
        }}
        onMouseDown={handleMouseDown}
        onClick={handlePinClick}
      >
        <div
          className={`relative w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${
            comment.resolved
              ? 'bg-green-500 border-2 border-green-600'
              : 'bg-[var(--accent)] border-2 border-[var(--accent-hover)]'
          } ${
            isOpen ? 'scale-110 shadow-lg' : 'shadow-md hover:scale-105'
          }`}
        >
          {comment.resolved ? (
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 6L9 17l-5-5"/>
            </svg>
          ) : (
            <span className="text-white text-xs font-medium">
              {comment.replies?.length ? comment.replies.length : '•'}
            </span>
          )}
        </div>
        
        {/* Connector line to dialog */}
        {isOpen && (
          <div className="absolute top-full left-1/2 w-0.5 h-4 bg-[var(--border)] transform -translate-x-1/2" />
        )}
      </div>

      {/* Comment Dialog */}
      {isOpen && (
        <div
          ref={dialogRef}
          className="absolute z-30 w-80 bg-[var(--card-background)] border border-[var(--border)] rounded-lg shadow-xl"
          style={{
            left: `${comment.x}%`,
            top: `${comment.y}%`,
            transform: 'translate(-50%, calc(-100% - 2rem))',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-[var(--border)]">
            <div className="flex items-center gap-2">
              {comment.user.image ? (
                <img
                  src={comment.user.image}
                  alt={comment.user.name}
                  className="w-6 h-6 rounded-full"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-[var(--accent)] text-white text-xs flex items-center justify-center">
                  {getInitials(comment.user.name)}
                </div>
              )}
              <span className="text-sm font-medium text-[var(--text-primary)]">
                {comment.user.name}
              </span>
              <span className="text-xs text-[var(--text-muted)]">
                {formatDate(comment.createdAt)}
              </span>
            </div>
            
            <div className="flex items-center gap-1">
              {!comment.resolved && onResolve && (
                <button
                  onClick={() => onResolve(comment.id)}
                  className="p-1 rounded hover:bg-[var(--faded-white)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  title="Mark as resolved"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                </button>
              )}
              
              {onDelete && (
                <button
                  onClick={() => onDelete(comment.id)}
                  className="p-1 rounded hover:bg-[var(--faded-white)] text-[var(--text-muted)] hover:text-red-500"
                  title="Delete comment"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Comment Content */}
          <div className="p-3">
            <p className="text-sm text-[var(--text-primary)] leading-relaxed">
              {comment.content}
            </p>
          </div>

          {/* Replies */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="border-t border-[var(--border)]">
              {comment.replies.map((reply) => (
                <div key={reply.id} className="p-3 border-b border-[var(--faded-white)] last:border-b-0">
                  <div className="flex items-center gap-2 mb-2">
                    {reply.user.image ? (
                      <img
                        src={reply.user.image}
                        alt={reply.user.name}
                        className="w-5 h-5 rounded-full"
                      />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-[var(--faded-white)] text-[var(--text-muted)] text-xs flex items-center justify-center">
                        {getInitials(reply.user.name)}
                      </div>
                    )}
                    <span className="text-xs font-medium text-[var(--text-primary)]">
                      {reply.user.name}
                    </span>
                    <span className="text-xs text-[var(--text-muted)]">
                      {formatDate(reply.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--text-primary)] leading-relaxed">
                    {reply.content}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Reply Input */}
          {showReplyInput ? (
            <div className="p-3 border-t border-[var(--border)]">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Write a reply..."
                className="w-full px-3 py-2 text-sm bg-[var(--faded-white)] border border-[var(--border)] rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                rows={3}
                autoFocus
              />
              <div className="flex items-center justify-end gap-2 mt-2">
                <button
                  onClick={() => setShowReplyInput(false)}
                  className="px-3 py-1 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReply}
                  disabled={!replyText.trim()}
                  className="px-3 py-1 text-sm bg-[var(--accent)] text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
                >
                  Reply
                </button>
              </div>
            </div>
          ) : (
            onReply && !comment.resolved && (
              <div className="p-3 border-t border-[var(--border)]">
                <button
                  onClick={() => setShowReplyInput(true)}
                  className="text-sm text-[var(--accent)] hover:text-[var(--accent-hover)] font-medium"
                >
                  Reply
                </button>
              </div>
            )
          )}
        </div>
      )}
    </>
  );
}