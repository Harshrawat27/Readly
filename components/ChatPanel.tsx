'use client';

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useLayoutEffect,
} from 'react';
import EnhancedMarkdownRenderer from './EnhancedMarkdownRenderer';

interface ChatPanelProps {
  pdfId: string | null;
  selectedText: string;
  onTextSubmit: () => void;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

export default function ChatPanel({
  pdfId,
  selectedText,
  onTextSubmit,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesRef = useRef<Message[]>([]);
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

  // Load chat history (optimized single call). Scroll handled by the effects above.
  useEffect(() => {
    let mounted = true;
    const loadChatHistory = async () => {
      if (!pdfId) {
        if (!mounted) return;
        setMessages([]);
        setCurrentChatId(null);
        setIsInitialLoad(true);
        setShowChatContent(true);
        return;
      }

      setIsLoadingHistory(true);
      setIsInitialLoad(true);
      setShowChatContent(false);

      try {
        // backend returns last N messages
        const response = await fetch(`/api/chat/recent?pdfId=${pdfId}`);

        if (!mounted) return;

        if (!response.ok) {
          if (response.status === 404) {
            setMessages([]);
            setCurrentChatId(null);
            return;
          }
          throw new Error(`API failed: ${response.status}`);
        }

        const data = await response.json();

        if (data.chat && data.chat.messages) {
          const allMessages = data.chat.messages.map(
            (msg: {
              id: string;
              role: 'user' | 'assistant';
              content: string;
              createdAt: string;
            }) => ({
              id: msg.id,
              role: msg.role,
              content: msg.content,
              timestamp: new Date(msg.createdAt),
            })
          );

          setMessages(allMessages);
          setCurrentChatId(data.chat.id);

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
        }
      } catch (error) {
        console.error('Failed to load chat history:', error);
        setMessages([]);
        setCurrentChatId(null);
        setIsInitialLoad(false);
        setShowChatContent(true);
      } finally {
        if (mounted) setIsLoadingHistory(false);
      }
    };

    loadChatHistory();

    return () => {
      mounted = false;
    };
  }, [pdfId]);

  // rest of your existing logic (sendMessage, handlers, etc.) -- unchanged
  // I kept your original sendMessage implementation intact below.

  // Send message. Use messagesRef to ensure we send latest messages and avoid stale state.
  const sendMessage = useCallback(async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
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
    setIsInitialLoad(false);

    const assistantMessageId = (Date.now() + 1).toString();
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    };

    setMessages((prev) => {
      const updated = [...prev, assistantMessage];
      messagesRef.current = updated;
      return updated;
    });
    setStreamingMessageId(assistantMessageId);

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
                    setMessages((prev) =>
                      prev.map((msg) =>
                        msg.id === assistantMessageId
                          ? { ...msg, content: accumulatedContent }
                          : msg
                      )
                    );
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
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? {
                ...msg,
                content:
                  'Sorry, I encountered an error while processing your request. Please try again.',
                isStreaming: false,
              }
            : msg
        )
      );
      setStreamingMessageId(null);
    } finally {
      setIsLoading(false);
      onTextSubmit();
    }
  }, [inputValue, isLoading, pdfId, currentChatId, onTextSubmit]);

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
            No need to cheat
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
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[80%] min-w-0 rounded-lg p-3 break-words overflow-hidden ${
                    message.role === 'user'
                      ? 'bg-[#0F0F0E] text-white'
                      : 'bg-[var(--card-background)] border border-[var(--border)]'
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
                      />
                    ) : (
                      <div className='whitespace-pre-wrap'>
                        {message.content}
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
                </div>
              </div>
            ))}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input section (unchanged) */}
      <div className='p-4 border-t border-[var(--border)] bg-[var(--card-background)] flex-shrink-0'>
        {selectedText && (
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
        )}

        <div className='relative'>
          <div className='border border-[var(--border)] rounded-xl bg-[var(--input-background)] focus-within:border-[var(--accent)] transition-colors'>
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
              <div className='flex items-center gap-2'>
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
              </div>

              <div className='flex items-center gap-2'>
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
                    <div className='absolute right-0 bottom-full mb-2 w-80 bg-[var(--card-background)] border border-[var(--border)] rounded-lg shadow-lg z-50'>
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
          </div>

          {showModelDropdown && (
            <div
              className='fixed inset-0 z-40'
              onClick={() => setShowModelDropdown(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
