'use client';

import { useState } from 'react';

interface Comment {
  id: string;
  x: number;
  y: number;
  content: string;
  pageNumber: number;
}

interface PDFCommentModalProps {
  comment: Comment | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (commentId: string, newContent: string) => void;
  onDelete?: (commentId: string) => void;
}

export default function PDFCommentModal({
  comment,
  isOpen,
  onClose,
  onEdit,
  onDelete,
}: PDFCommentModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');

  if (!isOpen || !comment) return null;

  const handleEdit = () => {
    setEditContent(comment.content);
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (onEdit && editContent.trim() !== comment.content) {
      onEdit(comment.id, editContent.trim());
    }
    setIsEditing(false);
    onClose();
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent('');
  };

  const handleDelete = () => {
    if (onDelete && confirm('Are you sure you want to delete this comment?')) {
      onDelete(comment.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Comment</h2>
              <p className="text-sm text-gray-500">Page {comment.pageNumber}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {isEditing ? (
            <div className="space-y-4">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full h-32 p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your comment..."
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={handleCancelEdit}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={!editContent.trim()}
                  className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="prose prose-sm max-w-none">
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {comment.content}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        {!isEditing && (onEdit || onDelete) && (
          <div className="flex justify-between items-center p-6 border-t border-gray-200 bg-gray-50">
            <div className="text-xs text-gray-500">
              Position: ({Math.round(comment.x)}, {Math.round(comment.y)})
            </div>
            <div className="flex gap-2">
              {onEdit && (
                <button
                  onClick={handleEdit}
                  className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
                >
                  Edit
                </button>
              )}
              {onDelete && (
                <button
                  onClick={handleDelete}
                  className="px-3 py-1 text-sm text-red-600 hover:text-red-800 font-medium transition-colors"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}