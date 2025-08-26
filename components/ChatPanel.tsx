'use client';

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useLayoutEffect,
} from 'react';
import EnhancedMarkdownRenderer from './EnhancedMarkdownRenderer';
import ThinkingAnimation from './ThinkingAnimation';
import MessageActions from './MessageActions';
import { fetchWithCache, cacheKeys, clientCache } from '@/lib/clientCache';
import { useSubscription } from '@/hooks/useSubscription';
import { useLimitHandler } from '@/hooks/useLimitHandler';
import LimitReachedPopup from '@/components/LimitReachedPopup';

interface ChatPanelProps {
  pdfId: string | null;
  selectedText: string;
  selectedImage?: string;
  onTextSubmit: () => void;
  onNavigateToPage?: (pageNumber: number) => void;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  imageData?: string; // Legacy base64 data (for backwards compatibility)
  imageUrl?: string; // S3 URL (preferred)
  timestamp: Date;
  isStreaming?: boolean;
}

export default function ChatPanel({
  pdfId,
  selectedText,
  selectedImage = '',
  onTextSubmit,
  onNavigateToPage,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesRef = useRef<Message[]>([]);
  
  // Subscription and limit handling
  const { subscriptionData, handleApiError: handleSubscriptionError } = useSubscription();
  const currentPlan = subscriptionData?.plan?.name || 'free';
  const {
    isLimitPopupOpen,
    currentLimitType,
    closeLimitPopup,
    handleUpgrade,
    handleQuestion,
    handleApiError: handleLimitError,
  } = useLimitHandler(currentPlan);
  // keep messagesRef synced
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(
    null
  );
  const [showThinking, setShowThinking] = useState(false);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [selectedModel, setSelectedModel] = useState('Claude Sonnet 4');
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [showChatContent, setShowChatContent] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // *** NEW: explicit ref to the scrollable messages container ***
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);

  // track whether user is already scrolled to bottom (so we don't yank them)
  const isUserAtBottomRef = useRef(true);

  // Flag to temporarily disable auto-scroll during scroll-up animation
  const isScrollAnimatingRef = useRef(false);

  // robust scroll function (prefers container.scrollTo)
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'auto') => {
    const el = messagesContainerRef.current;
    if (el) {
      // try modern API (smooth supported)
      try {
        el.scrollTo({ top: el.scrollHeight, behavior });
      } catch {
        // fallback
        el.scrollTop = el.scrollHeight;
      }
    } else {
      // fallback to messagesEndRef (scrolls nearest scrollable ancestor)
      messagesEndRef.current?.scrollIntoView({ behavior, block: 'end' });
    }
  }, []);

  // New function to scroll DOWN 200px with cubic-bezier ease-out animation when user sends message
  const scrollDownForNewMessage = useCallback(() => {
    const el = messagesContainerRef.current;
    if (!el) return;

    const currentScrollTop = el.scrollTop;
    const maxScrollTop = el.scrollHeight - el.clientHeight;
    const targetScrollTop = Math.min(maxScrollTop, currentScrollTop + 800);
    const distance = targetScrollTop - currentScrollTop;

    if (distance <= 0) return; // Already at bottom or no need to scroll

    // Set flag to disable auto-scroll during animation
    isScrollAnimatingRef.current = true;

    // Custom cubic-bezier ease-out animation
    const duration = 600; // 600ms
    const startTime = performance.now();
    const startScrollTop = currentScrollTop;

    // cubic-bezier(0.25, 0.46, 0.45, 0.94) - ease-out
    const easeOutCubic = (t: number) => {
      return 1 - Math.pow(1 - t, 2);
    };

    const animateScroll = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      const easedProgress = easeOutCubic(progress);
      const currentPosition = startScrollTop + distance * easedProgress;

      el.scrollTop = currentPosition;

      if (progress < 1) {
        requestAnimationFrame(animateScroll);
      } else {
        // Animation complete - re-enable auto-scroll
        setTimeout(() => {
          isScrollAnimatingRef.current = false;
        }, 100);
      }
    };

    requestAnimationFrame(animateScroll);
  }, []);

  // monitor user scroll to decide whether to auto-scroll on new messages
  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;

    const onScroll = () => {
      // threshold allows slight offset without considering "not at bottom"
      const threshold = 150;
      const atBottom =
        el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;
      isUserAtBottomRef.current = atBottom;
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    // initialize
    onScroll();

    return () => {
      el.removeEventListener('scroll', onScroll);
    };
  }, []);

  // Scroll after layout changes (this runs synchronously after DOM updates)
  useLayoutEffect(() => {
    if (messages.length === 0) return;

    // Don't auto-scroll during scroll animation
    if (isScrollAnimatingRef.current) {
      return;
    }

    // only auto-scroll if user is at bottom (or it's the initial load) AND not during streaming
    if (!isUserAtBottomRef.current && !isInitialLoad) {
      return;
    }

    // Don't auto-scroll during streaming unless it's initial load
    if (streamingMessageId && !isInitialLoad) {
      return;
    }

    // double RAF gives browser time to finish layout (helps with markdown/images)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scrollToBottom(isInitialLoad ? 'auto' : 'smooth');
        // mark initial load finished after first auto-scroll
        if (isInitialLoad) {
          // we don't call setIsInitialLoad here because other code sets it,
          // but if you want to ensure it's turned off here you can set it.
        }
      });
    });
  }, [messages, isInitialLoad, scrollToBottom, streamingMessageId]);

  // MutationObserver: if content changes (images load, streaming text updates),
  // scroll to bottom if user was at bottom but NOT during streaming.
  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const mo = new MutationObserver(() => {
      // Don't auto-scroll during scroll animation
      if (isScrollAnimatingRef.current) {
        return;
      }

      // Only auto-scroll if user is at bottom AND not streaming (to allow free scrolling during streaming)
      if (isUserAtBottomRef.current && !streamingMessageId) {
        // schedule quick scroll to follow layout change
        requestAnimationFrame(() => scrollToBottom('auto'));
      }
    });

    mo.observe(el, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      mo.disconnect();
    };
  }, [scrollToBottom, streamingMessageId]);

  // Pagination state
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Load more messages function
  const loadMoreMessages = useCallback(async () => {
    if (!nextCursor || !currentChatId || isLoadingMore) return;

    setIsLoadingMore(true);
    try {
      const response = await fetch(
        `/api/chat/recent?pdfId=${pdfId}&cursor=${nextCursor}&limit=30`
      );

      if (!response.ok) throw new Error('Failed to load more messages');

      const data = await response.json();

      if (data.chat && data.chat.messages) {
        const olderMessages = data.chat.messages.map(
          (msg: {
            id: string;
            role: 'user' | 'assistant';
            content: string;
            imageData?: string;
            imageUrl?: string;
            createdAt: string;
          }) => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            imageData: msg.imageData,
            imageUrl: msg.imageUrl,
            timestamp: new Date(msg.createdAt),
          })
        );

        // Prepend older messages to the beginning
        setMessages((prev) => [...olderMessages, ...prev]);
        setHasMoreMessages(data.pagination?.hasMore || false);
        setNextCursor(data.pagination?.nextCursor || null);
      }
    } catch (error) {
      console.error('Failed to load more messages:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [nextCursor, currentChatId, pdfId, isLoadingMore]);

  // Load chat history (optimized with pagination). Scroll handled by the effects above.
  useEffect(() => {
    let mounted = true;
    const loadChatHistory = async () => {
      if (!pdfId) {
        if (!mounted) return;
        setMessages([]);
        setCurrentChatId(null);
        setIsInitialLoad(true);
        setShowChatContent(true);
        setHasMoreMessages(false);
        setNextCursor(null);
        return;
      }

      setIsLoadingHistory(true);
      setIsInitialLoad(true);
      setShowChatContent(false);

      try {
        // Use cache for instant loading - 30 second TTL
        const cacheKey = cacheKeys.chatHistory(pdfId);
        let data;

        try {
          data = await fetchWithCache<{
            chat: {
              id: string;
              messages: Array<{
                id: string;
                role: 'user' | 'assistant';
                content: string;
                imageData?: string;
                imageUrl?: string;
                createdAt: string;
              }>;
            };
            pagination?: { hasMore: boolean; nextCursor: string | null };
          }>(
            `/api/chat/recent?pdfId=${pdfId}&limit=50`,
            cacheKey,
            30 // 30 second cache for chat history
          );
        } catch (error: unknown) {
          if (error instanceof Error && error.message?.includes('404')) {
            console.log(
              `💬 [ChatPanel] No existing chat found for PDF ${pdfId} (this is normal for new PDFs)`
            );
            setMessages([]);
            setCurrentChatId(null);
            setHasMoreMessages(false);
            setNextCursor(null);
            return;
          }
          throw error;
        }

        if (!mounted) return;

        if (data.chat && data.chat.messages) {
          const allMessages = data.chat.messages.map(
            (msg: {
              id: string;
              role: 'user' | 'assistant';
              content: string;
              imageData?: string;
              imageUrl?: string;
              createdAt: string;
            }) => ({
              id: msg.id,
              role: msg.role,
              content: msg.content,
              imageData: msg.imageData,
              imageUrl: msg.imageUrl,
              timestamp: new Date(msg.createdAt),
            })
          );

          setMessages(allMessages);
          setCurrentChatId(data.chat.id);
          setHasMoreMessages(data.pagination?.hasMore || false);
          setNextCursor(data.pagination?.nextCursor || null);

          // mark initial load finished in next tick to allow scroll effects to run first
          requestAnimationFrame(() => {
            setIsInitialLoad(false);
            // Show content with opacity animation after scroll is complete
            setTimeout(() => {
              setShowChatContent(true);
            }, 300);
          });
        } else {
          setMessages([]);
          setCurrentChatId(null);
          setIsInitialLoad(false);
          setShowChatContent(true);
          setHasMoreMessages(false);
          setNextCursor(null);
        }
      } catch (error) {
        console.error('Failed to load chat history:', error);
        setMessages([]);
        setCurrentChatId(null);
        setIsInitialLoad(false);
        setShowChatContent(true);
        setHasMoreMessages(false);
        setNextCursor(null);
      } finally {
        if (mounted) setIsLoadingHistory(false);
      }
    };

    loadChatHistory();

    return () => {
      mounted = false;
    };
  }, [pdfId]);

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(textareaRef.current.scrollHeight, 200);
      const minHeight = 48;
      textareaRef.current.style.height = `${Math.max(newHeight, minHeight)}px`;
    }
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [inputValue, adjustTextareaHeight]);

  // Handle selected text from PDF
  useEffect(() => {
    if (selectedText && selectedText.trim()) {
      setInputValue((prev) => {
        const prefix = prev ? prev + '\n\n' : '';
        return `${prefix}Regarding this text from the PDF:\n"${selectedText}"\n\n`;
      });
      adjustTextareaHeight();

      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(
          textareaRef.current.value.length,
          textareaRef.current.value.length
        );
      }
    }
  }, [selectedText, adjustTextareaHeight]);

  // Handle selected image from PDF
  useEffect(() => {
    if (selectedImage && selectedImage.trim()) {
      setInputValue((prev) => {
        const prefix = prev ? prev + '\n\n' : '';
        return `${prefix}What can you tell me about this image from the PDF?\n\n`;
      });
      adjustTextareaHeight();
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(
          textareaRef.current.value.length,
          textareaRef.current.value.length
        );
      }
    }
  }, [selectedImage, adjustTextareaHeight]);

  // Send message. Use messagesRef to ensure we send latest messages and avoid stale state.
  const sendMessage = useCallback(async () => {
    if (!inputValue.trim() || isLoading) return;

    // Check question limits before sending
    const monthlyQuestionsUsed = subscriptionData?.usage?.monthlyQuestionsUsed || 0;
    const canSendQuestion = handleQuestion(monthlyQuestionsUsed, () => {
      console.log('✅ [ChatPanel] Question limit OK, proceeding with message');
    });

    if (!canSendQuestion) {
      console.log('❌ [ChatPanel] Question blocked by subscription limits');
      return;
    }

    // Invalidate chat cache when sending new message
    if (pdfId) {
      clientCache.delete(cacheKeys.chatHistory(pdfId));
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      imageData: selectedImage || undefined, // Will be uploaded to S3 by API
      timestamp: new Date(),
    };

    // Update UI first using functional setState
    setMessages((prev) => {
      const updated = [...prev, userMessage];
      messagesRef.current = updated;
      return updated;
    });

    setInputValue('');
    setIsLoading(true);
    setShowThinking(true);
    setIsInitialLoad(false);

    const assistantMessageId = (Date.now() + 1).toString();

    // Scroll down 800px to create space after question and show start of answer
    // Only do this if there are existing messages (not the first message)
    if (messages.length > 1) {
      setTimeout(() => {
        scrollDownForNewMessage();
      }, 100);
    }

    try {
      // create the payload from the freshest messages
      const messagesToSend = messagesRef.current.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      // Ensure the last item is the user's message (defensive)
      if (
        messagesToSend.length === 0 ||
        messagesToSend[messagesToSend.length - 1].content !==
          userMessage.content
      ) {
        messagesToSend.push({ role: 'user', content: userMessage.content });
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: messagesToSend,
          pdfId,
          chatId: currentChatId,
          selectedImage: selectedImage || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = '';

      if (reader) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            // split by newlines (SSE style)
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));

                  if (data.chatId) {
                    // always set chat id if provided
                    setCurrentChatId((prev) => prev || data.chatId);
                  }

                  if (data.content) {
                    accumulatedContent += data.content;
                    setShowThinking(false);

                    setMessages((prev) => {
                      // Check if assistant message already exists
                      const existingAssistantMsg = prev.find(
                        (msg) => msg.id === assistantMessageId
                      );

                      if (!existingAssistantMsg) {
                        // Create assistant message for the first time
                        const assistantMessage: Message = {
                          id: assistantMessageId,
                          role: 'assistant',
                          content: accumulatedContent,
                          timestamp: new Date(),
                          isStreaming: true,
                        };
                        setStreamingMessageId(assistantMessageId);
                        const updated = [...prev, assistantMessage];
                        messagesRef.current = updated;
                        return updated;
                      } else {
                        // Update existing assistant message
                        return prev.map((msg) =>
                          msg.id === assistantMessageId
                            ? { ...msg, content: accumulatedContent }
                            : msg
                        );
                      }
                    });
                  }

                  if (data.done) {
                    setMessages((prev) =>
                      prev.map((msg) =>
                        msg.id === assistantMessageId
                          ? { ...msg, isStreaming: false }
                          : msg
                      )
                    );
                    setStreamingMessageId(null);
                  }
                } catch (e) {
                  console.error('Error parsing SSE data:', e);
                }
              }
            }
          }
        } finally {
          reader.releaseLock();
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setShowThinking(false);

      // Check if it's a limit-related error
      const isLimitError = handleLimitError(error) || handleSubscriptionError(error);

      if (!isLimitError) {
        // Only show error message for non-limit errors
        // Create or update assistant message with error
        setMessages((prev) => {
          const existingAssistantMsg = prev.find(
            (msg) => msg.id === assistantMessageId
          );
          const errorMessage =
            'Sorry, I encountered an error while processing your request. Please try again.';

          if (!existingAssistantMsg) {
            // Create assistant message with error
            const assistantMessage: Message = {
              id: assistantMessageId,
              role: 'assistant',
              content: errorMessage,
              timestamp: new Date(),
              isStreaming: false,
            };
            return [...prev, assistantMessage];
          } else {
            // Update existing assistant message with error
            return prev.map((msg) =>
              msg.id === assistantMessageId
                ? {
                    ...msg,
                    content: errorMessage,
                    isStreaming: false,
                  }
                : msg
            );
          }
        });
      } else {
        // For limit errors, remove the user message since it wasn't processed
        setMessages((prev) => prev.filter(msg => msg.id !== userMessage.id));
      }
      setStreamingMessageId(null);
    } finally {
      setIsLoading(false);
      onTextSubmit();
    }
  }, [inputValue, isLoading, pdfId, currentChatId, onTextSubmit, subscriptionData, handleQuestion, handleLimitError, handleSubscriptionError, selectedImage, messages.length, scrollDownForNewMessage]);

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    },
    [sendMessage]
  );

  const clearChat = useCallback(() => {
    setMessages([]);
    messagesRef.current = [];
    setCurrentChatId(null);
    setIsInitialLoad(true);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Skeleton loader component (unchanged)
  const MessageSkeleton = () => (
    <div className='space-y-4'>
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`max-w-[80%] rounded-lg p-3 ${
              i % 2 === 0
                ? 'bg-[#0F0F0E]'
                : 'bg-[var(--card-background)] border border-[var(--border)]'
            }`}
          >
            <div className='space-y-2'>
              <div
                className='h-4 bg-gray-300/20 rounded animate-pulse'
                style={{ width: `${Math.random() * 200 + 100}px` }}
              />
              <div
                className='h-4 bg-gray-300/20 rounded animate-pulse'
                style={{ width: `${Math.random() * 150 + 80}px` }}
              />
            </div>
            <div className='h-3 w-12 bg-gray-300/20 rounded animate-pulse mt-2' />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className='h-full flex flex-col max-h-[calc(100vh-0rem)] overflow-hidden'>
      {/* Header */}
      <div className='p-4 border-b border-[var(--border)] bg-[var(--card-background)] flex-shrink-0'>
        <div className='flex items-center justify-between'>
          <h2 className='text-lg font-semibold text-[var(--text-primary)]'>
            chat with rie!
          </h2>

          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className='text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors'
            >
              Clear Chat
            </button>
          )}
        </div>

        {!pdfId && (
          <p className='text-sm text-[var(--text-muted)] mt-2'>
            Select a PDF to start chatting
          </p>
        )}
      </div>

      {/* Messages */}
      <div
        id='chat-container'
        ref={messagesContainerRef} // <-- attached ref here
        className='flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4 min-h-0'
        style={{ maxHeight: 'calc(100vh - 12rem)' }}
      >
        {isLoadingHistory ? (
          <MessageSkeleton />
        ) : messages.length === 0 ? (
          <div className='text-center py-8'>
            <div className='w-12 h-12 bg-[var(--faded-white)] rounded-full mx-auto mb-3 flex items-center justify-center'>
              <svg
                className='w-6 h-6 text-[var(--text-muted)]'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
              >
                <path d='M21 15v4a2 2 0 0 1-2 2H7l-4-4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' />
                <path d='M17 8h-8' />
                <path d='M17 12h-8' />
                <path d='M17 16h-2' />
              </svg>
            </div>
            <p className='text-sm text-[var(--text-muted)]'>
              {pdfId
                ? 'Start a conversation about the PDF'
                : 'Select a PDF to begin chatting'}
            </p>
          </div>
        ) : (
          <div
            className={`space-y-4 transition-opacity duration-1000 ease-out ${
              isInitialLoad && !showChatContent ? 'opacity-0' : 'opacity-100'
            }`}
          >
            {/* Load More Messages Button */}
            {hasMoreMessages && (
              <div className='flex justify-center py-2'>
                <button
                  onClick={loadMoreMessages}
                  disabled={isLoadingMore}
                  className='px-4 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border)] rounded-lg hover:bg-[var(--faded-white)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
                >
                  {isLoadingMore ? (
                    <div className='flex items-center gap-2'>
                      <div className='w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin' />
                      Loading older messages...
                    </div>
                  ) : (
                    'Load older messages'
                  )}
                </button>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`min-w-0 rounded-lg p-3 break-words overflow-hidden group ${
                    message.role === 'user'
                      ? 'bg-[#0F0F0E] text-white max-w-[80%]'
                      : ''
                  }`}
                >
                  <div
                    className={`text-sm break-words overflow-wrap-break-word ${
                      message.role === 'user'
                        ? 'text-white'
                        : 'text-[var(--text-primary)]'
                    }`}
                    style={{
                      wordBreak: 'break-word',
                      overflowWrap: 'break-word',
                    }}
                  >
                    {message.role === 'assistant' ? (
                      <EnhancedMarkdownRenderer
                        markdownText={message.content}
                        compact={true}
                        className='chat-message'
                        fontSize={15}
                        onNavigateToPage={onNavigateToPage}
                      />
                    ) : (
                      <div className='space-y-2'>
                        {(message.imageUrl || message.imageData) && (
                          <div className='mb-2'>
                            <img
                              src={message.imageUrl || message.imageData}
                              alt='Selected from PDF'
                              className='max-w-full h-32 object-contain rounded border bg-white'
                              onLoad={() => {
                                console.log(
                                  '✅ Image loaded successfully:',
                                  message.imageUrl || message.imageData
                                );
                              }}
                              onError={(e) => {
                                console.error('❌ Image failed to load:', {
                                  imageUrl: message.imageUrl,
                                  imageData: message.imageData
                                    ? 'base64 data present'
                                    : 'no base64',
                                  error: e,
                                  src: message.imageUrl || message.imageData,
                                });
                              }}
                            />
                            {/* Debug info */}
                            {/* <div className="text-xs text-gray-500 mt-1">
                              {message.imageUrl && <div>S3 URL: {message.imageUrl.substring(0, 50)}...</div>}
                              {message.imageData && <div>Base64: {message.imageData.substring(0, 50)}...</div>}
                            </div> */}
                          </div>
                        )}
                        <div className='whitespace-pre-wrap'>
                          {message.content}
                        </div>
                      </div>
                    )}

                    {message.isStreaming && (
                      <span className='inline-block w-2 h-4 bg-current animate-pulse ml-1' />
                    )}
                  </div>

                  <div
                    className={`text-xs mt-2 ${
                      message.role === 'user'
                        ? 'text-white/70'
                        : 'text-[var(--text-muted)]'
                    }`}
                  >
                    {formatTime(message.timestamp)}
                  </div>

                  {/* Message Actions for Assistant Messages Only */}
                  {message.role === 'assistant' && !message.isStreaming && (
                    <MessageActions
                      messageId={message.id}
                      messageContent={message.content}
                      onLike={(id, liked) => {
                        console.log(
                          `Message ${id} ${liked ? 'liked' : 'unliked'}`
                        );
                      }}
                      onDislike={(id, disliked, reason) => {
                        console.log(
                          `Message ${id} ${
                            disliked ? 'disliked' : 'undisliked'
                          }${reason ? ` - ${reason}` : ''}`
                        );
                      }}
                    />
                  )}
                </div>
              </div>
            ))}

            {/* Thinking Animation */}
            {showThinking && (
              <div className='flex justify-start'>
                <div className='max-w-[80%] rounded-lg p-3'>
                  <ThinkingAnimation />
                </div>
              </div>
            )}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input section (unchanged) */}
      <div className='p-4 border-t border-[var(--border)] bg-[var(--card-background)] flex-shrink-0'>
        {/* {selectedText && (
          <div className='mb-3 p-2 bg-[var(--accent)]/10 border border-[var(--accent)]/20 rounded-lg'>
            <div className='text-xs text-[var(--accent)] font-medium mb-1'>
              Selected text:
            </div>
            <div
              className='text-sm text-[var(--text-primary)] italic break-words overflow-hidden'
              style={{ wordBreak: 'break-word' }}
            >
              &quot;
              {selectedText.length > 100
                ? selectedText.substring(0, 100) + '...'
                : selectedText}
              &quot;
            </div>
          </div>
        )} */}
        {selectedImage && (
          <div className='mb-3 p-3 bg-[var(--accent)]/10 border border-[var(--accent)]/20 rounded-lg'>
            <div className='text-xs text-[var(--accent)] font-medium mb-2'>
              Selected image:
            </div>
            <img
              src={selectedImage}
              alt='Selected from PDF'
              className='max-w-full h-20 object-contain rounded border bg-white'
            />
          </div>
        )}

        <div className='relative'>
          <div className='border border-[var(--border)] rounded-xl bg-[var(--input-background)] focus-within:border-[var(--border)]transition-colors'>
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={pdfId ? 'Reply to Readly...' : 'Select a PDF first'}
              disabled={!pdfId || isLoading}
              className='w-full p-4 pb-2 bg-transparent text-[var(--text-primary)] placeholder-[var(--text-muted)] resize-none focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed'
              style={{
                minHeight: '48px',
                maxHeight: '200px',
                wordBreak: 'break-word',
              }}
            />

            <div className='flex items-center justify-between px-4 pb-3'>
              {/* <div className='flex items-center gap-2'>
                <button
                  className='flex items-center justify-center w-8 h-8 rounded-lg hover:bg-[var(--faded-white)] transition-colors'
                  title='Add attachment'
                >
                  <svg
                    className='w-5 h-5 text-[var(--text-muted)]'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='2'
                  >
                    <path d='M12 5v14' />
                    <path d='M5 12h14' />
                  </svg>
                </button>

                <button
                  className='flex items-center justify-center w-8 h-8 rounded-lg hover:bg-[var(--faded-white)] transition-colors'
                  title='Format text'
                >
                  <svg
                    className='w-5 h-5 text-[var(--text-muted)]'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='2'
                  >
                    <path d='M4 7V4h16v3' />
                    <path d='M9 20h6' />
                    <path d='M12 4v16' />
                  </svg>
                </button>
              </div> */}

              {/* <div className='flex items-center gap-2'> */}

              <div className='relative'>
                <button
                  onClick={() => setShowModelDropdown(!showModelDropdown)}
                  className='flex items-center gap-2 px-3 py-1.5 text-sm text-[var(--text-primary)] rounded-lg hover:bg-[var(--faded-white)] transition-colors'
                >
                  <span>{selectedModel}</span>
                  <svg
                    className='w-4 h-4 text-[var(--text-muted)]'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='2'
                  >
                    <path d='M6 9l6 6 6-6' />
                  </svg>
                </button>

                {showModelDropdown && (
                  <div className='absolute left-0 bottom-full mb-2 w-80 bg-[var(--card-background)] border border-[var(--border)] rounded-lg shadow-lg z-50'>
                    <div className='p-3'>
                      <div
                        className='flex items-start gap-3 p-3 rounded-lg hover:bg-[var(--faded-white)] cursor-pointer transition-colors'
                        onClick={() => {
                          setSelectedModel('Claude Opus 4');
                          setShowModelDropdown(false);
                        }}
                      >
                        <div className='flex-1'>
                          <div className='font-medium text-[var(--text-primary)]'>
                            Claude Opus 4
                          </div>
                          <div className='text-sm text-[var(--text-muted)]'>
                            Powerful, large model for complex challenges
                          </div>
                        </div>
                      </div>

                      <div
                        className='flex items-start gap-3 p-3 rounded-lg hover:bg-[var(--faded-white)] cursor-pointer transition-colors'
                        onClick={() => {
                          setSelectedModel('Claude Sonnet 4');
                          setShowModelDropdown(false);
                        }}
                      >
                        <div className='flex-1'>
                          <div className='font-medium text-[var(--text-primary)] flex items-center gap-2'>
                            Claude Sonnet 4
                            {selectedModel === 'Claude Sonnet 4' && (
                              <svg
                                className='w-4 h-4 text-blue-500'
                                viewBox='0 0 24 24'
                                fill='none'
                                stroke='currentColor'
                                strokeWidth='2'
                              >
                                <path d='M20 6L9 17l-5-5' />
                              </svg>
                            )}
                          </div>
                          <div className='text-sm text-[var(--text-muted)]'>
                            Smart, efficient model for everyday use
                          </div>
                        </div>
                      </div>

                      <div className='flex items-center gap-2 p-3 text-[var(--text-muted)] hover:bg-[var(--faded-white)] cursor-pointer transition-colors rounded-lg'>
                        <span className='text-sm'>More models</span>
                        <svg
                          className='w-4 h-4'
                          viewBox='0 0 24 24'
                          fill='none'
                          stroke='currentColor'
                          strokeWidth='2'
                        >
                          <path d='M9 18l6-6-6-6' />
                        </svg>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={sendMessage}
                disabled={!inputValue.trim() || !pdfId || isLoading}
                className='flex items-center justify-center w-8 h-8 bg-[var(--accent)] text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed'
              >
                {isLoading ? (
                  <div className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin' />
                ) : (
                  <svg
                    className='w-4 h-4'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='2'
                  >
                    <path d='M22 2L11 13' />
                    <path d='M22 2l-7 20-4-9-9-4z' />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {showModelDropdown && (
            <div
              className='fixed inset-0 z-40'
              onClick={() => setShowModelDropdown(false)}
            />
          )}
        </div>
      </div>

      {/* Limit Reached Popup */}
      <LimitReachedPopup
        isOpen={isLimitPopupOpen}
        onClose={closeLimitPopup}
        currentPlan={currentPlan}
        limitType={currentLimitType || 'questions'}
        onUpgrade={handleUpgrade}
      />
    </div>
  );
}
