'use client';

import { useState, useEffect, useCallback } from 'react';

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

interface TextElement {
  id: string;
  content: string;
  x: number;
  y: number;
  pageNumber: number;
  width: number;
  fontSize: number;
  color: string;
  textAlign: 'left' | 'center' | 'right';
  createdAt: string;
}

interface PDFDataCache {
  [pdfId: string]: {
    comments: Comment[];
    texts: TextElement[];
    loadedAt: number;
  };
}

// Global cache to prevent duplicate API calls
const dataCache: PDFDataCache = {};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Global debounce timers for text updates
const debounceTimers: { [key: string]: NodeJS.Timeout } = {};

export function usePDFData(pdfId: string | null) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [texts, setTexts] = useState<TextElement[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load data from cache or fetch from API
  const loadData = useCallback(async (forceRefresh = false) => {
    if (!pdfId) return;

    // Check cache first
    const cached = dataCache[pdfId];
    const now = Date.now();
    
    if (!forceRefresh && cached && (now - cached.loadedAt) < CACHE_DURATION) {
      setComments(cached.comments);
      setTexts(cached.texts);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Load both comments and texts in parallel
      const [commentsResponse, textsResponse] = await Promise.all([
        fetch(`/api/comments?pdfId=${pdfId}`),
        fetch(`/api/texts?pdfId=${pdfId}`)
      ]);

      if (!commentsResponse.ok || !textsResponse.ok) {
        throw new Error('Failed to load PDF data');
      }

      const [commentsData, textsData] = await Promise.all([
        commentsResponse.json(),
        textsResponse.json()
      ]);

      // Update cache
      dataCache[pdfId] = {
        comments: commentsData,
        texts: textsData,
        loadedAt: now
      };

      setComments(commentsData);
      setTexts(textsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
      console.error('Error loading PDF data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [pdfId]);

  // Load data when pdfId changes
  useEffect(() => {
    if (pdfId) {
      loadData();
    } else {
      setComments([]);
      setTexts([]);
    }
  }, [pdfId, loadData]);

  // Filter data by page
  const getCommentsForPage = useCallback((pageNumber: number) => {
    return comments.filter(comment => comment.pageNumber === pageNumber);
  }, [comments]);

  const getTextsForPage = useCallback((pageNumber: number) => {
    return texts.filter(text => text.pageNumber === pageNumber);
  }, [texts]);

  // Add new comment (optimistic update + cache invalidation)
  const addComment = useCallback(async (newComment: Omit<Comment, 'id' | 'createdAt' | 'user' | 'replies'>) => {
    if (!pdfId) return;

    const tempComment: Comment = {
      ...newComment,
      id: `temp-${Date.now()}`,
      createdAt: new Date().toISOString(),
      user: { name: 'You' }, // Will be replaced by server response
      replies: []
    };

    // Optimistic update
    setComments(prev => [...prev, tempComment]);

    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newComment, pdfId })
      });

      if (!response.ok) throw new Error('Failed to create comment');

      const createdComment = await response.json();
      
      // Replace temp comment with real one
      setComments(prev => prev.map(c => 
        c.id === tempComment.id ? createdComment : c
      ));

      // Update cache
      if (dataCache[pdfId]) {
        dataCache[pdfId].comments = comments.map(c => 
          c.id === tempComment.id ? createdComment : c
        );
      }
    } catch (err) {
      // Rollback optimistic update
      setComments(prev => prev.filter(c => c.id !== tempComment.id));
      throw err;
    }
  }, [pdfId, comments]);

  // Update comment
  const updateComment = useCallback(async (commentId: string, updates: Partial<Comment>) => {
    if (!pdfId) return;

    // Optimistic update
    setComments(prev => prev.map(c => 
      c.id === commentId ? { ...c, ...updates } : c
    ));

    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (!response.ok) throw new Error('Failed to update comment');

      // Update cache
      if (dataCache[pdfId]) {
        dataCache[pdfId].comments = dataCache[pdfId].comments.map(c => 
          c.id === commentId ? { ...c, ...updates } : c
        );
      }
    } catch (err) {
      // Rollback on error
      loadData(true);
      throw err;
    }
  }, [pdfId, loadData]);

  // Delete comment
  const deleteComment = useCallback(async (commentId: string) => {
    if (!pdfId) return;

    const originalComments = comments;
    setComments(prev => prev.filter(c => c.id !== commentId));

    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete comment');

      // Update cache
      if (dataCache[pdfId]) {
        dataCache[pdfId].comments = dataCache[pdfId].comments.filter(c => c.id !== commentId);
      }
    } catch (err) {
      // Rollback on error
      setComments(originalComments);
      throw err;
    }
  }, [pdfId, comments]);

  // Add reply to comment
  const addReply = useCallback(async (commentId: string, content: string) => {
    if (!pdfId) return;

    const tempReply: CommentReply = {
      id: `temp-reply-${Date.now()}`,
      content,
      createdAt: new Date().toISOString(),
      user: { name: 'You' }
    };

    // Optimistic update
    setComments(prev => prev.map(c => 
      c.id === commentId 
        ? { ...c, replies: [...(c.replies || []), tempReply] }
        : c
    ));

    try {
      const response = await fetch(`/api/comments/${commentId}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });

      if (!response.ok) throw new Error('Failed to create reply');

      const createdReply = await response.json();
      
      // Replace temp reply with real one
      setComments(prev => prev.map(c => 
        c.id === commentId 
          ? { 
              ...c, 
              replies: (c.replies || []).map(r => 
                r.id === tempReply.id ? createdReply : r
              ) 
            }
          : c
      ));

      // Update cache
      if (dataCache[pdfId]) {
        dataCache[pdfId].comments = dataCache[pdfId].comments.map(c => 
          c.id === commentId 
            ? { 
                ...c, 
                replies: (c.replies || []).map(r => 
                  r.id === tempReply.id ? createdReply : r
                ) 
              }
            : c
        );
      }
    } catch (err) {
      // Rollback optimistic update
      setComments(prev => prev.map(c => 
        c.id === commentId 
          ? { 
              ...c, 
              replies: (c.replies || []).filter(r => r.id !== tempReply.id) 
            }
          : c
      ));
      throw err;
    }
  }, [pdfId]);

  // Add new text (optimistic update + cache invalidation)
  const addText = useCallback(async (newText: Omit<TextElement, 'id' | 'createdAt'>) => {
    if (!pdfId) return;

    const tempText: TextElement = {
      ...newText,
      id: `temp-${Date.now()}`,
      createdAt: new Date().toISOString()
    };

    // Optimistic update
    setTexts(prev => [...prev, tempText]);

    try {
      const response = await fetch('/api/texts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newText, pdfId })
      });

      if (!response.ok) throw new Error('Failed to create text');

      const createdText = await response.json();
      
      // Replace temp text with real one
      setTexts(prev => prev.map(t => 
        t.id === tempText.id ? createdText : t
      ));

      // Update cache
      if (dataCache[pdfId]) {
        dataCache[pdfId].texts = texts.map(t => 
          t.id === tempText.id ? createdText : t
        );
      }

      return createdText.id;
    } catch (err) {
      // Rollback optimistic update
      setTexts(prev => prev.filter(t => t.id !== tempText.id));
      throw err;
    }
  }, [pdfId, texts]);

  // Update text with comprehensive debouncing for ALL changes
  const updateText = useCallback(async (textId: string, updates: Partial<TextElement>) => {
    if (!pdfId) return;

    // Optimistic update - always immediate for UI responsiveness
    setTexts(prev => prev.map(t => 
      t.id === textId ? { ...t, ...updates } : t
    ));

    // Determine debounce delay based on update type
    let delay = 800; // Default 800ms for most operations
    
    if ('content' in updates) {
      delay = 1000; // 1s for typing content
    } else if ('fontSize' in updates || 'color' in updates || 'textAlign' in updates) {
      delay = 600; // 600ms for formatting changes
    } else if ('x' in updates || 'y' in updates || 'width' in updates) {
      delay = 500; // 500ms for position/size changes
    }

    const debounceKey = `${pdfId}-${textId}`;
    
    // Clear existing timer for this text element
    if (debounceTimers[debounceKey]) {
      clearTimeout(debounceTimers[debounceKey]);
    }

    // Set up new debounced API call
    debounceTimers[debounceKey] = setTimeout(async () => {
      try {
        const response = await fetch(`/api/texts/${textId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates)
        });

        if (!response.ok) throw new Error('Failed to update text');

        // Update cache
        if (dataCache[pdfId]) {
          dataCache[pdfId].texts = dataCache[pdfId].texts.map(t => 
            t.id === textId ? { ...t, ...updates } : t
          );
        }

        // Clean up timer
        delete debounceTimers[debounceKey];
      } catch (err) {
        console.error('Error updating text:', err);
        // Rollback on error
        loadData(true);
        // Clean up timer
        delete debounceTimers[debounceKey];
      }
    }, delay);
  }, [pdfId, loadData]);

  // Delete text
  const deleteText = useCallback(async (textId: string) => {
    if (!pdfId) return;

    // Optimistic update
    const originalTexts = texts;
    setTexts(prev => prev.filter(t => t.id !== textId));

    try {
      const response = await fetch(`/api/texts/${textId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete text');

      // Update cache
      if (dataCache[pdfId]) {
        dataCache[pdfId].texts = dataCache[pdfId].texts.filter(t => t.id !== textId);
      }
    } catch (err) {
      // Rollback on error
      setTexts(originalTexts);
      throw err;
    }
  }, [pdfId, texts]);

  return {
    comments,
    texts,
    isLoading,
    error,
    getCommentsForPage,
    getTextsForPage,
    addComment,
    updateComment,
    deleteComment,
    addReply,
    addText,
    updateText,
    deleteText,
    refreshData: () => loadData(true)
  };
}