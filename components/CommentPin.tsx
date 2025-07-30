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
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [replyText, setReplyText] = useState('');
  const [showReplyInput, setShowReplyInput] = useState(false);
  const pinRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
      setIsHovered(false);
      onSelect?.(comment.id);
    }
  };

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      if (!isOpen) {
        setIsHovered(true);
      }
    }, 500);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setIsHovered(false);
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
              : 'bg-orange-500 border-2 border-gray-800 shadow-md'
          } ${
            isOpen ? 'scale-110 shadow-lg' : 'hover:scale-105'
          }`}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {comment.resolved ? (
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 6L9 17l-5-5"/>
            </svg>
          ) : (
            <span className="text-white text-xs font-semibold">
              {getInitials(comment.user.name)}
            </span>
          )}
        </div>
        
        {/* Connector line to dialog */}
        {isOpen && (
          <div className="absolute top-full left-1/2 w-0.5 h-4 bg-[var(--border)] transform -translate-x-1/2" />
        )}
      </div>

      {/* Hover Tooltip */}
      {isHovered && !isOpen && (
        <div
          className="absolute z-40 w-72 bg-gray-800 text-white rounded-xl shadow-xl p-3"
          style={{
            left: `${comment.x}%`,
            top: `${comment.y}%`,
            transform: 'translate(-50%, calc(-100% - 1rem))',
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center">
              <span className="text-white text-xs font-semibold">
                {getInitials(comment.user.name)}
              </span>
            </div>
            <span className="text-sm font-medium text-white">
              {comment.user.name}
            </span>
            <span className="text-xs text-gray-400">
              {formatDate(comment.createdAt)}
            </span>
          </div>
          <p className="text-sm text-gray-200 leading-relaxed mb-1">
            {comment.content.length > 60 ? `${comment.content.substring(0, 60)}...` : comment.content}
          </p>
          {comment.replies && comment.replies.length > 0 && (
            <div className="text-xs text-gray-400">
              {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
            </div>
          )}
        </div>
      )}

      {/* Comment Dialog */}
      {isOpen && (
        <div
          ref={dialogRef}
          className="absolute z-30 w-96 bg-gray-800 text-white rounded-xl shadow-2xl"
          style={{
            left: `${comment.x}%`,
            top: `${comment.y}%`,
            transform: 'translate(-50%, calc(-100% - 2rem))',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
            <div className="flex items-center gap-2">
              <span className="text-white font-semibold text-sm">Comment</span>
            </div>
            
            <div className="flex items-center gap-2">
              <button className="text-gray-400 hover:text-white">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="1"/>
                  <circle cx="19" cy="12" r="1"/>
                  <circle cx="5" cy="12" r="1"/>
                </svg>
              </button>
              {!comment.resolved && onResolve && (
                <button
                  onClick={() => onResolve(comment.id)}
                  className="p-1 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 text-white"
                  title="Mark as resolved"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Main Comment */}
          <div className="p-4">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm font-semibold">
                  {getInitials(comment.user.name)}
                </span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-white font-medium text-sm">
                    {comment.user.name}
                  </span>
                  <span className="text-gray-400 text-xs">
                    {formatDate(comment.createdAt)}
                  </span>
                  {onDelete && (
                    <button
                      onClick={() => onDelete(comment.id)}
                      className="ml-auto text-gray-400 hover:text-white opacity-0 group-hover:opacity-100"
                      title="Delete comment"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="1"/>
                        <circle cx="19" cy="12" r="1"/>
                        <circle cx="5" cy="12" r="1"/>
                      </svg>
                    </button>
                  )}
                </div>
                <p className="text-gray-200 text-sm leading-relaxed">
                  {comment.content}
                </p>
              </div>
            </div>
          </div>

          {/* Replies */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="border-t border-gray-700">
              {comment.replies.map((reply) => (
                <div key={reply.id} className="px-4 py-3 border-b border-gray-700 last:border-b-0">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-sm font-semibold">
                        {getInitials(reply.user.name)}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-white font-medium text-sm">
                          {reply.user.name}
                        </span>
                        <span className="text-gray-400 text-xs">
                          {formatDate(reply.createdAt)}
                        </span>
                      </div>
                      <p className="text-gray-200 text-sm leading-relaxed">
                        {reply.content}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Reply Input */}
          {showReplyInput ? (
            <div className="px-4 py-3 border-t border-gray-700">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm font-semibold">
                    {getInitials('Current User')}
                  </span>
                </div>
                <div className="flex-1">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Reply"
                    className="w-full px-0 py-0 text-sm bg-transparent border-none text-gray-200 placeholder-gray-500 resize-none focus:outline-none"
                    rows={1}
                    autoFocus
                  />
                </div>
                <button
                  onClick={handleReply}
                  disabled={!replyText.trim()}
                  className="p-2 rounded-full bg-gray-600 hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M7 11l5-5 5 5M7 11l5 5 5-5"/>
                  </svg>
                </button>
              </div>
            </div>
          ) : (
            onReply && !comment.resolved && (
              <div className="px-4 py-3 border-t border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-sm font-semibold">
                      {getInitials('Current User')}
                    </span>
                  </div>
                  <button
                    onClick={() => setShowReplyInput(true)}
                    className="flex-1 text-left text-sm text-gray-500 hover:text-gray-300"
                  >
                    Reply
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </>
  );
}