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

  // Update text
  const updateText = useCallback(async (textId: string, updates: Partial<TextElement>) => {
    if (!pdfId) return;

    // Optimistic update
    setTexts(prev => prev.map(t => 
      t.id === textId ? { ...t, ...updates } : t
    ));

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
    } catch (err) {
      // Rollback on error
      loadData(true);
      throw err;
    }
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
    addText,
    updateText,
    deleteText,
    refreshData: () => loadData(true)
  };
}