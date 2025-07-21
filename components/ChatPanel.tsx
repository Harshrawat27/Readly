'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import MarkdownRenderer from './MarkdownRenderer';

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

export default function ChatPanel({ pdfId, selectedText, onTextSubmit }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(textareaRef.current.scrollHeight, 120); // Max 120px
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [inputValue, adjustTextareaHeight]);

  // Handle selected text from PDF
  useEffect(() => {
    if (selectedText && selectedText.trim()) {
      setInputValue(prev => {
        const prefix = prev ? prev + '\n\n' : '';
        return `${prefix}Regarding this text from the PDF:\n"${selectedText}"\n\n`;
      });
      adjustTextareaHeight();
      
      // Focus the textarea
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(textareaRef.current.value.length, textareaRef.current.value.length);
      }
    }
  }, [selectedText, adjustTextareaHeight]);

  const sendMessage = useCallback(async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputValue.trim(); // Store to avoid stale closure
    setInputValue('');
    setIsLoading(true);

    // Create assistant message for streaming
    const assistantMessageId = (Date.now() + 1).toString();
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    };

    setMessages(prev => [...prev, assistantMessage]);
    setStreamingMessageId(assistantMessageId);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(msg => ({
            role: msg.role,
            content: msg.content,
          })),
          pdfId,
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

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));
                  if (data.content) {
                    accumulatedContent += data.content;
                    
                    // Update the streaming message
                    setMessages(prev => prev.map(msg => 
                      msg.id === assistantMessageId 
                        ? { ...msg, content: accumulatedContent }
                        : msg
                    ));
                  }
                  
                  if (data.done) {
                    // Finalize the message
                    setMessages(prev => prev.map(msg => 
                      msg.id === assistantMessageId 
                        ? { ...msg, isStreaming: false }
                        : msg
                    ));
                    setStreamingMessageId(null);
                  }
                } catch (e) {
                  console.error('Error parsing SSE data:', e);
                }
              }
            }
          }
        } finally {
          // Ensure reader is properly closed
          reader.releaseLock();
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Update with error message
      setMessages(prev => prev.map(msg => 
        msg.id === assistantMessageId 
          ? { 
              ...msg, 
              content: 'Sorry, I encountered an error while processing your request. Please try again.',
              isStreaming: false 
            }
          : msg
      ));
      setStreamingMessageId(null);
    } finally {
      setIsLoading(false);
      onTextSubmit(); // Clear selected text
    }
  }, [inputValue, isLoading, messages, pdfId, onTextSubmit]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setStreamingMessageId(null);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="h-full flex flex-col max-h-[calc(100vh-4rem)] overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-[var(--border)] bg-[var(--card-background)] flex-shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            Chat with PDF
          </h2>
          
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              Clear Chat
            </button>
          )}
        </div>
        
        {!pdfId && (
          <p className="text-sm text-[var(--text-muted)] mt-2">
            Select a PDF to start chatting
          </p>
        )}
      </div>

      {/* Messages */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4 min-h-0"
        style={{ maxHeight: 'calc(100vh - 12rem)' }}
      >
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-[var(--faded-white)] rounded-full mx-auto mb-3 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-[var(--text-muted)]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H7l-4-4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                <path d="M17 8h-8" />
                <path d="M17 12h-8" />
                <path d="M17 16h-2" />
              </svg>
            </div>
            <p className="text-sm text-[var(--text-muted)]">
              {pdfId 
                ? 'Start a conversation about the PDF' 
                : 'Select a PDF to begin chatting'
              }
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] min-w-0 rounded-lg p-3 break-words overflow-hidden ${
                  message.role === 'user'
                    ? 'bg-[var(--accent)] text-white'
                    : 'bg-[var(--card-background)] border border-[var(--border)]'
                }`}
              >
                <div className={`text-sm break-words overflow-wrap-break-word ${
                  message.role === 'user' ? 'text-white' : 'text-[var(--text-primary)]'
                }`} style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                  {message.role === 'assistant' ? (
                    <MarkdownRenderer content={message.content} compact={true} />
                  ) : (
                    <div className="whitespace-pre-wrap">{message.content}</div>
                  )}
                  
                  {message.isStreaming && (
                    <span className="inline-block w-2 h-4 bg-current animate-pulse ml-1" />
                  )}
                </div>
                
                <div className={`text-xs mt-2 ${
                  message.role === 'user' ? 'text-white/70' : 'text-[var(--text-muted)]'
                }`}>
                  {formatTime(message.timestamp)}
                </div>
              </div>
            </div>
          ))
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-[var(--border)] bg-[var(--card-background)] flex-shrink-0">
        {selectedText && (
          <div className="mb-3 p-2 bg-[var(--accent)]/10 border border-[var(--accent)]/20 rounded-lg">
            <div className="text-xs text-[var(--accent)] font-medium mb-1">
              Selected text:
            </div>
            <div className="text-sm text-[var(--text-primary)] italic break-words overflow-hidden" style={{ wordBreak: 'break-word' }}>
              "{selectedText.length > 100 ? selectedText.substring(0, 100) + '...' : selectedText}"
            </div>
          </div>
        )}
        
        <div className="flex gap-2">
          <div className="flex-1 relative min-w-0">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={pdfId ? "Ask a question about the PDF..." : "Select a PDF first"}
              disabled={!pdfId || isLoading}
              className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--input-background)] text-[var(--text-primary)] placeholder-[var(--text-muted)] resize-none focus:outline-none focus:border-[var(--accent)] disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ minHeight: '40px', maxHeight: '120px', wordBreak: 'break-word' }}
            />
          </div>
          
          <button
            onClick={sendMessage}
            disabled={!inputValue.trim() || !pdfId || isLoading}
            className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[44px] flex-shrink-0"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 2L11 13" />
                <path d="M22 2l-7 20-4-9-9-4z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}