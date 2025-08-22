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
  onMoveComplete?: (id: string, x: number, y: number) => void;
  onResolve?: (id: string) => void;
  onReply?: (commentId: string, content: string) => void;
  onDelete?: (id: string) => void;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
  isDraggable?: boolean;
  currentUser?: {
    id: string;
    name: string;
    image?: string;
  };
  scale?: number; // PDF zoom scale factor
}

export default function CommentPin({
  comment,
  onMove,
  onMoveComplete,
  onResolve,
  onReply,
  onDelete,
  onSelect,
  isDraggable = true,
  currentUser,
  scale = 1,
}: CommentPinProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [replyText, setReplyText] = useState('');
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [dragStartTime, setDragStartTime] = useState(0);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
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
    event.stopPropagation();
    setIsDragging(true);
    setDragStartTime(Date.now());
    setDragStartPos({ x: event.clientX, y: event.clientY });

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
    if (!isDragging || !onMove) return;

    const handleMouseMove = (event: MouseEvent) => {
      if (!pinRef.current) return;

      // Find the PDF page container more reliably
      const pdfPage =
        pinRef.current.closest('.pdf-page') ||
        pinRef.current.closest('[data-page-number]') ||
        pinRef.current.closest('.mb-4');

      if (!pdfPage) {
        console.warn('PDF page container not found');
        return;
      }

      const containerRect = pdfPage.getBoundingClientRect();

      // Calculate new position relative to the page, adjusted for scale
      const newX =
        ((event.clientX - dragOffset.x - containerRect.left) /
          scale /
          (containerRect.width / scale)) *
        100;
      const newY =
        ((event.clientY - dragOffset.y - containerRect.top) /
          scale /
          (containerRect.height / scale)) *
        100;

      // Constrain to container bounds with some padding
      const clampedX = Math.max(1, Math.min(99, newX));
      const clampedY = Math.max(1, Math.min(99, newY));

      // Call the move handler with debounced DB update
      onMove(comment.id, clampedX, clampedY);
    };

    const handleMouseUp = (event: MouseEvent) => {
      setIsDragging(false);

      // Check if this was a drag or just a click
      const dragTime = Date.now() - dragStartTime;
      const dragDistance = Math.sqrt(
        Math.pow(event.clientX - dragStartPos.x, 2) +
          Math.pow(event.clientY - dragStartPos.y, 2)
      );

      if (dragTime < 200 && dragDistance < 5) {
        // Quick click - open the comment
        setTimeout(() => {
          setIsOpen((prev) => !prev);
          setIsHovered(false);
        }, 10);
      } else if (dragDistance > 5 && onMoveComplete) {
        // This was a drag - call onMoveComplete with final position
        const pdfPage =
          (event.target as HTMLElement)?.closest('.pdf-page') ||
          (event.target as HTMLElement)?.closest('[data-page-number]') ||
          (event.target as HTMLElement)?.closest('.mb-4');

        if (pdfPage) {
          const containerRect = pdfPage.getBoundingClientRect();
          const newX =
            ((event.clientX - dragOffset.x - containerRect.left) /
              scale /
              (containerRect.width / scale)) *
            100;
          const newY =
            ((event.clientY - dragOffset.y - containerRect.top) /
              scale /
              (containerRect.height / scale)) *
            100;

          const clampedX = Math.max(1, Math.min(99, newX));
          const clampedY = Math.max(1, Math.min(99, newY));

          onMoveComplete(comment.id, clampedX, clampedY);
        }
      }
    };

    // Prevent text selection during drag but no cursor change
    document.body.style.userSelect = 'none';

    document.addEventListener('mousemove', handleMouseMove, { capture: true });
    document.addEventListener('mouseup', handleMouseUp, { capture: true });

    return () => {
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', handleMouseMove, {
        capture: true,
      });
      document.removeEventListener('mouseup', handleMouseUp, { capture: true });
    };
  }, [isDragging, dragOffset, comment.id, onMove, onMoveComplete, scale]);

  const handlePinClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    // Click handling is now done in handleMouseUp to distinguish from drag
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
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const renderAvatar = (
    user: { name: string; image?: string },
    size: 'small' | 'medium' = 'medium'
  ) => {
    const sizeClasses = size === 'small' ? 'w-5 h-5' : 'w-8 h-8';
    const textSize = size === 'small' ? 'text-xs' : 'text-sm';

    if (user.image) {
      return (
        <img
          src={user.image}
          alt={user.name}
          className={`${sizeClasses} rounded-full flex-shrink-0`}
        />
      );
    } else {
      return (
        <div
          className={`${sizeClasses} rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0`}
        >
          <span className={`text-white ${textSize} font-semibold`}>
            {getInitials(user.name)}
          </span>
        </div>
      );
    }
  };

  return (
    <>
      {/* Comment Pin */}
      <div
        ref={pinRef}
        className={`absolute z-20 ${
          isDraggable
            ? isDragging
              ? 'cursor-grabbing'
              : 'cursor-grab'
            : 'cursor-pointer'
        } ${
          isDragging ? 'opacity-80 scale-110' : ''
        } transition-all duration-150`}
        style={{
          left: `${comment.x}%`,
          top: `${comment.y}%`,
          transform: 'translate(-50%, -50%)',
        }}
        onMouseDown={handleMouseDown}
        onClick={handlePinClick}
      >
        <div
          className={`relative transition-all duration-200 rounded-full ${
            isOpen ? 'scale-110 shadow-lg' : 'hover:scale-105'
          }`}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {comment.resolved ? (
            <div className='w-8 h-8 rounded-full bg-green-500 border-2 border-green-600 flex items-center justify-center'>
              <svg
                className='w-4 h-4 text-white'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
              >
                <path d='M20 6L9 17l-5-5' />
              </svg>
            </div>
          ) : comment.user.image ? (
            <img
              src={comment.user.image}
              alt={comment.user.name}
              className='max-w-8 max-h-8 min-w-8 min-h-8 rounded-full border-2 border-[var(--border)] shadow-md'
            />
          ) : (
            <div className='w-8 h-8 rounded-full bg-orange-500 border-2 border-[var(--border)] shadow-md flex items-center justify-center'>
              <span className='text-white text-xs font-semibold'>
                {getInitials(comment.user.name)}
              </span>
            </div>
          )}
        </div>

        {/* Connector line to dialog */}
        {isOpen && (
          <div className='absolute top-full left-1/2 w-0.5 h-4 bg-[var(--border)] transform -translate-x-1/2' />
        )}
      </div>

      {/* Hover Tooltip */}
      {isHovered && !isOpen && (
        <div
          className='absolute z-40 w-72 bg-[var(--background)] text-white rounded-xl shadow-xl p-3'
          style={{
            left: `${comment.x}%`,
            top: `${comment.y}%`,
            transform: 'translate(0%, calc(-100% - 1rem))',
          }}
        >
          <div className='flex items-center gap-2 mb-1'>
            {renderAvatar(comment.user, 'small')}
            <span className='text-sm font-medium text-white'>
              {comment.user.name}
            </span>
            <span className='text-xs text-gray-400'>
              {formatDate(comment.createdAt)}
            </span>
          </div>
          <p className='text-sm text-gray-200 leading-relaxed mb-1'>
            {comment.content.length > 60
              ? `${comment.content.substring(0, 60)}...`
              : comment.content}
          </p>
          {comment.replies && comment.replies.length > 0 && (
            <div className='text-xs text-gray-400'>
              {comment.replies.length}{' '}
              {comment.replies.length === 1 ? 'reply' : 'replies'}
            </div>
          )}
        </div>
      )}

      {/* Comment Dialog */}
      {isOpen && (
        <div
          ref={dialogRef}
          className='absolute z-1000 w-96 bg-[var(--sidebar-bg)] text-white rounded-xl shadow-2xl'
          style={{
            left: `${comment.x}%`,
            top: `${comment.y}%`,
            transform: 'translate(0%, calc(-100% - 2rem))',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className='flex items-center justify-between px-4 py-3 border-b border-[var(--border)]'>
            <div className='flex items-center gap-2'>
              <span className='text-white font-semibold text-sm'>Comment</span>
            </div>

            <div className='flex items-center gap-2'>
              {onDelete && (
                <button
                  onClick={() => onDelete(comment.id)}
                  className='p-1 rounded-full hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors'
                  title='Delete'
                >
                  <svg
                    className='w-4 h-4'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='2'
                  >
                    <path d='m3 6 3 0' />
                    <path d='M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2' />
                    <path d='m19 6-1 0' />
                    <path d='m10 11 0 6' />
                    <path d='m14 11 0 6' />
                    <path d='M5 6l1 14c0 1 1 2 2 2h8c1 0 2-1 2-2l1-14' />
                  </svg>
                </button>
              )}
              {!comment.resolved && onResolve && (
                <button
                  onClick={() => onResolve(comment.id)}
                  className='p-1 rounded-full hover:bg-green-500/20 text-gray-400 hover:text-green-400 transition-colors'
                  title='Resolve'
                >
                  <svg
                    className='w-4 h-4'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='2'
                  >
                    <path d='M20 6L9 17l-5-5' />
                  </svg>
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className='text-gray-400 hover:text-white'
              >
                <svg
                  className='w-4 h-4'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2'
                >
                  <path d='M18 6L6 18M6 6l12 12' />
                </svg>
              </button>
            </div>
          </div>
          <div className='p-4'>
            {/* Main Comment */}
            <div className='mb-4'>
              <div className='flex items-start gap-3 mb-3'>
                {renderAvatar(comment.user)}
                <div className='flex-1'>
                  <div className='flex items-center gap-2 mb-1'>
                    <span className='text-white font-medium text-sm'>
                      {comment.user.name}
                    </span>
                    <span className='text-gray-400 text-xs'>
                      {formatDate(comment.createdAt)}
                    </span>
                  </div>
                  <p className='text-gray-200 text-sm leading-relaxed'>
                    {comment.content}
                  </p>
                </div>
              </div>
            </div>

            {/* Replies */}
            {comment.replies && comment.replies.length > 0 && (
              <div className='mb-4 flex flex-col gap-4'>
                {comment.replies.map((reply) => (
                  <div key={reply.id} className='flex items-start gap-3'>
                    {renderAvatar(reply.user)}
                    <div className='flex-1'>
                      <div className='flex items-center gap-2 mb-1'>
                        <span className='text-white font-medium text-sm'>
                          {reply.user.name}
                        </span>
                        <span className='text-gray-400 text-xs'>
                          {formatDate(reply.createdAt)}
                        </span>
                      </div>
                      <p className='text-gray-200 text-sm leading-relaxed'>
                        {reply.content}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Reply Input - Always show if not resolved */}
            {showReplyInput ? (
              <div className=''>
                <div className='flex items-start gap-3'>
                  {currentUser ? (
                    renderAvatar(currentUser)
                  ) : (
                    <div className='w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0'>
                      <span className='text-white text-sm font-semibold'>
                        ?
                      </span>
                    </div>
                  )}
                  <div className='flex-1'>
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder='Add a reply...'
                      className='w-full px-3 py-2 text-sm bg-[var(--border)] border border-[var(--border)] rounded-lg text-gray-200 placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-transparent focus:border-transparent'
                      rows={2}
                      autoFocus
                    />
                    <div className='flex items-center justify-end gap-2 mt-2'>
                      <button
                        onClick={() => {
                          setShowReplyInput(false);
                          setReplyText('');
                        }}
                        className='px-3 py-1 text-sm text-gray-400 hover:text-gray-200'
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleReply}
                        disabled={!replyText.trim()}
                        className='px-3 py-1 text-sm bg-[var(--accent)] text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-80'
                      >
                        Reply
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              onReply &&
              !comment.resolved && (
                <div className=''>
                  <button
                    onClick={() => setShowReplyInput(true)}
                    className='flex items-center gap-3 w-full text-left hover:bg-[var(--border)] rounded-lg p-2 transition-colors'
                  >
                    {currentUser ? (
                      renderAvatar(currentUser)
                    ) : (
                      <div className='w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0'>
                        <span className='text-white text-sm font-semibold'>
                          ?
                        </span>
                      </div>
                    )}
                    <span className='text-gray-400 text-sm'>
                      Add a reply...
                    </span>
                  </button>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </>
  );
}
