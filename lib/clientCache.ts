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
  isStale(key: string): boolean {
    if (!this.storage) return true;

    try {
      const item = this.storage.getItem(this.getKey(key));
      if (!item) return true;

      const entry: CacheEntry<unknown> = JSON.parse(item);
      
      // Consider stale if older than 15 seconds
      return (Date.now() - entry.timestamp) > 15000;
    } catch {
      return true;
    }
  }
}

export const clientCache = new ClientCache();

// Cache key generators for consistency
export const cacheKeys = {
  pdfList: (userId: string) => `pdf_list_${userId}`,
  chatHistory: (pdfId: string) => `chat_history_${pdfId}`,
  chatMessages: (pdfId: string, cursor?: string) => 
    `chat_messages_${pdfId}${cursor ? `_${cursor}` : ''}`,
};

// Utility function for fetch with cache
export async function fetchWithCache<T>(
  url: string,
  cacheKey: string,
  ttlSeconds: number = 300,
  options?: RequestInit
): Promise<T> {
  // Try cache first
  const cached = clientCache.get<T>(cacheKey);
  if (cached && !clientCache.isStale(cacheKey)) {
    return cached;
  }

  // Fetch from API
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();

  // Cache the result
  clientCache.set(cacheKey, data, ttlSeconds);

  return data;
}