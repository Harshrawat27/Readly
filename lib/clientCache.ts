// lib/clientCache.ts
'use client';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

class ClientCache {
  private storage: Storage | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.storage = window.sessionStorage;
    }
  }

  private getKey(key: string): string {
    return `readly_cache_${key}`;
  }

  set<T>(key: string, data: T, ttlSeconds: number = 300): boolean {
    if (!this.storage) return false;

    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        expiry: Date.now() + (ttlSeconds * 1000),
      };

      this.storage.setItem(this.getKey(key), JSON.stringify(entry));
      return true;
    } catch (error) {
      console.warn('ClientCache: Failed to set cache:', error);
      return false;
    }
  }

  get<T>(key: string): T | null {
    if (!this.storage) return null;

    try {
      const item = this.storage.getItem(this.getKey(key));
      if (!item) return null;

      const entry: CacheEntry<T> = JSON.parse(item);

      // Check if expired
      if (Date.now() > entry.expiry) {
        this.delete(key);
        return null;
      }

      return entry.data;
    } catch (error) {
      console.warn('ClientCache: Failed to get cache:', error);
      this.delete(key); // Clean up corrupted entry
      return null;
    }
  }

  delete(key: string): void {
    if (!this.storage) return;
    this.storage.removeItem(this.getKey(key));
  }

  clear(): void {
    if (!this.storage) return;

    // Only clear our cache keys
    const keysToDelete: string[] = [];
    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (key && key.startsWith('readly_cache_')) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.storage?.removeItem(key));
  }

  // Check if data is stale (beyond TTL but not expired due to stale-while-revalidate)
  isStale(key: string, staleTtlSeconds: number = 300): boolean {
    if (!this.storage) return true;

    try {
      const item = this.storage.getItem(this.getKey(key));
      if (!item) return true;

      const entry: CacheEntry<unknown> = JSON.parse(item);
      
      // Consider stale based on the provided staleTtlSeconds (default 5 minutes)
      return (Date.now() - entry.timestamp) > (staleTtlSeconds * 1000);
    } catch {
      return true;
    }
  }
}

export const clientCache = new ClientCache();

// Request deduplication - prevent multiple simultaneous requests for the same resource
const inflightRequests = new Map<string, Promise<unknown>>();

// Cache key generators for consistency
export const cacheKeys = {
  pdfList: (userId: string) => `pdf_list_${userId}`,
  chatHistory: (pdfId: string) => `chat_history_${pdfId}`,
  chatMessages: (pdfId: string, cursor?: string) => 
    `chat_messages_${pdfId}${cursor ? `_${cursor}` : ''}`,
  messageFeedback: (messageId: string) => `message_feedback_${messageId}`,
  messageFeedbackBatch: (messageIds: string[]) => `message_feedback_batch_${messageIds.sort().join(',')}`,
  pdfHighlights: (pdfId: string) => `pdf_highlights_${pdfId}`,
  pdfComments: (pdfId: string) => `pdf_comments_${pdfId}`,
  pdfTexts: (pdfId: string) => `pdf_texts_${pdfId}`,
  pdfShapes: (pdfId: string) => `pdf_shapes_${pdfId}`,
  pdfPenDrawings: (pdfId: string) => `pdf_pen_drawings_${pdfId}`,
};

// Utility function for fetch with cache and request deduplication
export async function fetchWithCache<T>(
  url: string,
  cacheKey: string,
  ttlSeconds: number = 300,
  options?: RequestInit
): Promise<T> {
  // Try cache first
  const cached = clientCache.get<T>(cacheKey);
  if (cached && !clientCache.isStale(cacheKey, ttlSeconds * 0.8)) {
    return cached;
  }

  // Check if there's already a request in flight for this resource
  const requestKey = `${url}_${JSON.stringify(options || {})}`;
  if (inflightRequests.has(requestKey)) {
    return inflightRequests.get(requestKey) as Promise<T>;
  }

  // Create and cache the request promise
  const requestPromise = (async () => {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Cache the result
      clientCache.set(cacheKey, data, ttlSeconds);

      return data;
    } finally {
      // Remove from inflight requests when done (success or failure)
      inflightRequests.delete(requestKey);
    }
  })();

  // Store the promise to prevent duplicate requests
  inflightRequests.set(requestKey, requestPromise);

  return requestPromise;
}

// Batch load message feedback for multiple messages
export async function batchLoadMessageFeedback(messageIds: string[]): Promise<Record<string, { success: boolean; feedback?: { feedbackType: string } | null }>> {
  if (messageIds.length === 0) {
    return {};
  }

  // Check if we have all individual cached feedback first
  const cachedFeedback: Record<string, { success: boolean; feedback?: { feedbackType: string } | null }> = {};
  const uncachedIds: string[] = [];

  for (const messageId of messageIds) {
    const cached = clientCache.get<{ success: boolean; feedback?: { feedbackType: string } | null }>(cacheKeys.messageFeedback(messageId));
    if (cached && !clientCache.isStale(cacheKeys.messageFeedback(messageId), 300 * 0.8)) {
      cachedFeedback[messageId] = cached;
    } else {
      uncachedIds.push(messageId);
    }
  }

  // If all are cached, return cached data
  if (uncachedIds.length === 0) {
    return cachedFeedback;
  }

  // Load uncached ones via batch API
  try {
    const batchData = await fetchWithCache<{
      success: boolean;
      feedback: Record<string, { feedbackType: string; dislikeReason?: string | null }>;
    }>(
      `/api/message-feedback/batch?messageIds=${uncachedIds.join(',')}`,
      cacheKeys.messageFeedbackBatch(uncachedIds),
      300 // Cache for 5 minutes
    );

    if (batchData.success) {
      // Cache individual feedback items from batch response
      Object.entries(batchData.feedback).forEach(([messageId, feedback]) => {
        if (feedback) {
          const feedbackData = { success: true, feedback: { feedbackType: feedback.feedbackType } };
          clientCache.set(cacheKeys.messageFeedback(messageId), feedbackData, 300);
          cachedFeedback[messageId] = feedbackData;
        } else {
          // Cache null responses too to avoid re-fetching
          const nullFeedback = { success: true, feedback: null };
          clientCache.set(cacheKeys.messageFeedback(messageId), nullFeedback, 300);
          cachedFeedback[messageId] = nullFeedback;
        }
      });

      // Also cache null responses for messageIds not in the batch response
      uncachedIds.forEach(messageId => {
        if (!batchData.feedback[messageId]) {
          const nullFeedback = { success: true, feedback: null };
          clientCache.set(cacheKeys.messageFeedback(messageId), nullFeedback, 300);
          cachedFeedback[messageId] = nullFeedback;
        }
      });
    }

    return cachedFeedback;
  } catch (error) {
    console.error('Batch message feedback error:', error);
    // Return cached data even if batch fails
    return cachedFeedback;
  }
}