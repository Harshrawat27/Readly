'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Copy,
  ThumbsUp,
  ThumbsDown,
  Volume2,
  Square,
  Loader2,
} from 'lucide-react';
import Toast from './Toast';

interface MessageActionsProps {
  messageId: string;
  messageContent: string;
  initialLiked?: boolean;
  initialDisliked?: boolean;
  feedbackData?: {
    success: boolean;
    feedback?: { feedbackType: string } | null;
  } | null;
  onLike?: (messageId: string, liked: boolean) => void;
  onDislike?: (messageId: string, disliked: boolean, reason?: string) => void;
}

interface CustomTooltipProps {
  text: string;
  isVisible: boolean;
  position?: 'top' | 'bottom';
  alignment?: 'center' | 'left' | 'right';
}

const CustomTooltip = ({
  text,
  isVisible,
  position = 'top',
  alignment = 'center',
}: CustomTooltipProps) => {
  if (!isVisible) return null;

  const getPositionClasses = () => {
    const baseClasses =
      'absolute z-50 px-2 py-1 text-xs text-white bg-black rounded shadow-lg whitespace-nowrap pointer-events-none transition-opacity duration-200';

    let positionClass = '';
    let arrowPositionClass = '';

    if (position === 'top') {
      positionClass = '-top-8';
    } else {
      positionClass = 'top-8';
    }

    if (alignment === 'center') {
      positionClass += ' left-1/2 transform -translate-x-1/2';
      arrowPositionClass = 'left-1/2 transform -translate-x-1/2';
    } else if (alignment === 'left') {
      positionClass += ' left-0';
      arrowPositionClass = 'left-4';
    } else if (alignment === 'right') {
      positionClass += ' right-0';
      arrowPositionClass = 'right-4';
    }

    return { baseClasses, positionClass, arrowPositionClass };
  };

  const { baseClasses, positionClass, arrowPositionClass } =
    getPositionClasses();

  return (
    <div className={`${baseClasses} ${positionClass}`}>
      {text}
      <div
        className={`absolute ${arrowPositionClass} w-2 h-2 bg-black rotate-45 ${
          position === 'top' ? 'top-full -mt-1' : 'bottom-full -mb-1'
        }`}
      />
    </div>
  );
};

interface DislikeFeedbackPopupProps {
  isVisible: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
  position: { x: number; y: number };
}

const DislikeFeedbackPopup = ({
  isVisible,
  onClose,
  onSubmit,
  position,
}: DislikeFeedbackPopupProps) => {
  const [selectedReason, setSelectedReason] = useState<string>('');

  const feedbackOptions = [
    'Answer is too long',
    'Wrong citations',
    'Answer is too short',
    'Making no sense',
    'Inaccurate information',
    'Off-topic response',
  ];

  if (!isVisible) return null;

  const handleSubmit = () => {
    if (selectedReason) {
      onSubmit(selectedReason);
      setSelectedReason('');
      onClose();
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div className='fixed inset-0 z-40 bg-black/20' onClick={onClose} />

      {/* Popup */}
      <div
        className='fixed z-50 bg-[var(--card-background)] border border-[var(--border)] rounded-lg shadow-lg p-4 w-64'
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          transform: 'translateY(-100%)', // Position above the button
        }}
      >
        <div className='text-sm font-medium text-[var(--text-primary)] mb-3'>
          What&apos;s wrong with this response?
        </div>

        <div className='space-y-2 mb-4'>
          {feedbackOptions.map((option) => (
            <label
              key={option}
              className='flex items-center space-x-2 cursor-pointer hover:bg-[var(--faded-white)] rounded p-1'
            >
              <input
                type='radio'
                name='feedback'
                value={option}
                checked={selectedReason === option}
                onChange={(e) => setSelectedReason(e.target.value)}
                className='text-[var(--accent)]'
              />
              <span className='text-sm text-[var(--text-primary)]'>
                {option}
              </span>
            </label>
          ))}
        </div>

        <div className='flex justify-end space-x-2'>
          <button
            onClick={onClose}
            className='px-3 py-1 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors'
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedReason}
            className='px-3 py-1 text-sm bg-[var(--accent)] text-white rounded hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity'
          >
            Submit
          </button>
        </div>
      </div>
    </>
  );
};

export default function MessageActions({
  messageId,
  messageContent,
  initialLiked = false,
  initialDisliked = false,
  feedbackData = null,
  onLike,
  onDislike,
}: MessageActionsProps) {
  const [liked, setLiked] = useState(initialLiked);
  const [disliked, setDisliked] = useState(initialDisliked);
  const [copied, setCopied] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingTTS, setIsLoadingTTS] = useState(false);

  // Tooltip states
  const [copyTooltip, setCopyTooltip] = useState(false);
  const [likeTooltip, setLikeTooltip] = useState(false);
  const [dislikeTooltip, setDislikeTooltip] = useState(false);
  const [speakTooltip, setSpeakTooltip] = useState(false);

  // Dislike popup state
  const [showDislikePopup, setShowDislikePopup] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const dislikeButtonRef = useRef<HTMLButtonElement>(null);

  // Toast state
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);

  // Audio state
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(messageContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      // console.error('Failed to copy text:', error);
    }
  };

  const handleLike = async () => {
    const newLikedState = !liked;
    setLiked(newLikedState);

    // If liking, remove dislike
    if (newLikedState && disliked) {
      setDisliked(false);
    }

    try {
      if (newLikedState) {
        // Send like to API
        await fetch('/api/message-feedback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messageId,
            feedbackType: 'like',
          }),
        });
      } else {
        // Remove like from API
        await fetch(`/api/message-feedback?messageId=${messageId}`, {
          method: 'DELETE',
        });
      }
    } catch (error) {
      // console.error('Failed to save like feedback:', error);
      // Revert the state if API call failed
      setLiked(!newLikedState);
      if (newLikedState && disliked) {
        setDisliked(true);
      }
    }

    onLike?.(messageId, newLikedState);
  };

  const handleDislike = async () => {
    if (disliked) {
      // Toggle off dislike
      setDisliked(false);

      try {
        // Remove dislike from API
        await fetch(`/api/message-feedback?messageId=${messageId}`, {
          method: 'DELETE',
        });
      } catch (error) {
        // console.error('Failed to remove dislike feedback:', error);
        // Revert the state if API call failed
        setDisliked(true);
      }

      onDislike?.(messageId, false);
      return;
    }

    // Show feedback popup
    const rect = dislikeButtonRef.current?.getBoundingClientRect();
    if (rect) {
      setPopupPosition({
        x: rect.left,
        y: rect.top - 10, // Show popup above the button
      });
      setShowDislikePopup(true);
    }
  };

  const handleDislikeFeedback = async (reason: string) => {
    setDisliked(true);

    // If disliking, remove like
    if (liked) {
      setLiked(false);
    }

    try {
      // Send dislike to API
      await fetch('/api/message-feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messageId,
          feedbackType: 'dislike',
          dislikeReason: reason,
        }),
      });
    } catch (error) {
      // console.error('Failed to save dislike feedback:', error);
      // Revert the state if API call failed
      setDisliked(false);
      if (liked) {
        setLiked(true);
      }
    }

    onDislike?.(messageId, true, reason);
  };

  const handleSpeak = async () => {
    // Prevent multiple clicks while loading or playing
    if (isLoadingTTS) {
      // console.log('🚫 Already loading TTS, ignoring click');
      return;
    }

    if (isPlaying && audioRef.current) {
      // Stop current playback
      // console.log('🛑 Stopping current playback');
      audioRef.current.pause();
      audioRef.current = null;
      setIsPlaying(false);
      return;
    }

    setIsLoadingTTS(true);
    setIsPlaying(false);

    try {
      // console.log('🎵 Starting MediaSource streaming...');

      // Create MediaSource for progressive loading
      const mediaSource = new MediaSource();
      const audioUrl = URL.createObjectURL(mediaSource);
      audioRef.current = new Audio(audioUrl);

      let sourceBuffer: SourceBuffer | null = null;
      const chunks: Uint8Array[] = [];
      let streamStarted = false;

      // MediaSource event handlers
      mediaSource.onsourceopen = async () => {
        // console.log('📺 MediaSource opened, setting up SourceBuffer');

        try {
          sourceBuffer = mediaSource.addSourceBuffer('audio/mpeg');

          sourceBuffer.onupdateend = () => {
            // console.log('📦 SourceBuffer updated, duration:', mediaSource.duration);

            // Start playing once we have some content and audio is ready
            if (
              !streamStarted &&
              audioRef.current &&
              audioRef.current.readyState >= 2
            ) {
              streamStarted = true;
              // console.log('▶️ Starting playback');
              setIsLoadingTTS(false);
              setIsPlaying(true);
              audioRef.current.play().catch(console.error);
            }
          };

          sourceBuffer.onerror = (e) => {
            // console.error('❌ SourceBuffer error:', e);
            setIsLoadingTTS(false);
            setIsPlaying(false);
          };

          // Start streaming from TTS API
          await startTTSStream();
        } catch (error) {
          // console.error('❌ MediaSource setup error:', error);
          setIsLoadingTTS(false);
          setIsPlaying(false);
        }
      };

      mediaSource.onsourceclose = () => {
        // console.log('📺 MediaSource closed');
      };

      mediaSource.addEventListener('error', (e) => {
        // console.error('❌ MediaSource error:', e);
        setIsLoadingTTS(false);
        setIsPlaying(false);
      });

      // Audio element event handlers
      audioRef.current.oncanplay = () => {
        // console.log('✅ Audio ready to play');
        if (!streamStarted && sourceBuffer && chunks.length > 0) {
          streamStarted = true;
          setIsLoadingTTS(false);
          setIsPlaying(true);
          audioRef.current!.play().catch(console.error);
        }
      };

      audioRef.current.onended = () => {
        // console.log('🏁 Audio ended');
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
      };

      audioRef.current.onerror = (event) => {
        // console.error('❌ Audio error:', event);
        setIsPlaying(false);
        setIsLoadingTTS(false);
      };

      // Function to start TTS streaming
      const startTTSStream = async () => {
        const response = await fetch('/api/tts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: messageContent,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            `TTS API failed: ${errorData.error || 'Unknown error'}`
          );
        }

        if (!response.body) {
          throw new Error('No response body for streaming');
        }

        const reader = response.body.getReader();
        const appendQueue: Uint8Array[] = [];
        let isAppending = false;

        const appendToBuffer = async () => {
          if (isAppending || appendQueue.length === 0 || !sourceBuffer) {
            return;
          }

          isAppending = true;

          while (
            appendQueue.length > 0 &&
            sourceBuffer &&
            !sourceBuffer.updating
          ) {
            const chunk = appendQueue.shift()!;

            try {
              sourceBuffer.appendBuffer(chunk);
              // console.log(`📦 Appended chunk (${chunk.length} bytes), queue: ${appendQueue.length}`);

              // Wait for append to complete
              await new Promise<void>((resolve, reject) => {
                const onUpdateEnd = () => {
                  sourceBuffer!.removeEventListener('updateend', onUpdateEnd);
                  sourceBuffer!.removeEventListener('error', onError);
                  resolve();
                };

                const onError = (e: Event) => {
                  sourceBuffer!.removeEventListener('updateend', onUpdateEnd);
                  sourceBuffer!.removeEventListener('error', onError);
                  reject(e);
                };

                sourceBuffer!.addEventListener('updateend', onUpdateEnd);
                sourceBuffer!.addEventListener('error', onError);
              });
            } catch (error) {
              // console.error('❌ Failed to append chunk:', error);
              break;
            }
          }

          isAppending = false;
        };

        // Read stream chunks
        try {
          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              // console.log(`✅ Stream complete, finalizing MediaSource`);

              // Append any remaining chunks
              await appendToBuffer();

              // End the stream
              if (mediaSource.readyState === 'open') {
                mediaSource.endOfStream();
              }

              break;
            }

            if (value && sourceBuffer) {
              chunks.push(value);
              appendQueue.push(value);

              // Start appending chunks immediately
              appendToBuffer();
            }
          }
        } catch (streamError) {
          // console.error('❌ Stream reading error:', streamError);
          throw streamError;
        }
      };
    } catch (error) {
      // console.error('Failed to play speech:', error);
      setIsLoadingTTS(false);
      setIsPlaying(false);

      setToastMessage(
        `TTS Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      setShowToast(true);
    }
  };

  // Initialize feedback state from props or fallback to initial values
  useEffect(() => {
    if (feedbackData && feedbackData.success && feedbackData.feedback) {
      setLiked(feedbackData.feedback.feedbackType === 'like');
      setDisliked(feedbackData.feedback.feedbackType === 'dislike');
    } else {
      // Use initial props if no feedback data provided
      setLiked(initialLiked);
      setDisliked(initialDisliked);
    }
  }, [feedbackData, initialLiked, initialDisliked]);

  // Cleanup audio when component unmounts
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
        audioRef.current = null;
      }
    };
  }, []);

  return (
    <div className='flex items-center space-x-1 mt-2'>
      {/* Copy Button */}
      <div className='relative'>
        <button
          onClick={handleCopy}
          onMouseEnter={() => setCopyTooltip(true)}
          onMouseLeave={() => setCopyTooltip(false)}
          className='p-2 rounded-md hover:bg-[var(--faded-white)] transition-colors duration-200 text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          aria-label='Copy message'
        >
          <Copy size={16} />
        </button>
        <CustomTooltip
          text={copied ? 'Copied!' : 'Copy'}
          isVisible={copyTooltip}
          position='top'
          alignment='center'
        />
      </div>

      {/* Like Button */}
      <div className='relative'>
        <button
          onClick={handleLike}
          onMouseEnter={() => setLikeTooltip(true)}
          onMouseLeave={() => setLikeTooltip(false)}
          className={`p-2 rounded-md transition-colors duration-200 ${
            liked
              ? 'text-green-600 bg-green-100/20'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--faded-white)]'
          }`}
          aria-label='Like message'
        >
          <ThumbsUp size={16} />
        </button>
        <CustomTooltip
          text={liked ? 'Remove like' : 'Like'}
          isVisible={likeTooltip}
          position='top'
          alignment='center'
        />
      </div>

      {/* Dislike Button */}
      <div className='relative'>
        <button
          ref={dislikeButtonRef}
          onClick={handleDislike}
          onMouseEnter={() => setDislikeTooltip(true)}
          onMouseLeave={() => setDislikeTooltip(false)}
          className={`p-2 rounded-md transition-colors duration-200 ${
            disliked
              ? 'text-red-600 bg-red-100/20'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--faded-white)]'
          }`}
          aria-label='Dislike message'
        >
          <ThumbsDown size={16} />
        </button>
        <CustomTooltip
          text={disliked ? 'Remove dislike' : 'Dislike'}
          isVisible={dislikeTooltip}
          position='top'
          alignment='center'
        />
      </div>

      {/* Speak Button */}
      <div className='relative'>
        <button
          onClick={handleSpeak}
          onMouseEnter={() => setSpeakTooltip(true)}
          onMouseLeave={() => setSpeakTooltip(false)}
          disabled={isLoadingTTS}
          className='p-2 rounded-md hover:bg-[var(--faded-white)] transition-colors duration-200 text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-50'
          aria-label={isPlaying ? 'Stop speaking' : 'Read aloud'}
        >
          {isLoadingTTS ? (
            <Loader2 size={16} className='animate-spin' />
          ) : isPlaying ? (
            <Square size={16} />
          ) : (
            <Volume2 size={16} />
          )}
        </button>
        <CustomTooltip
          text={isLoadingTTS ? 'Loading...' : isPlaying ? 'Stop' : 'Read aloud'}
          isVisible={speakTooltip}
          position='top'
          alignment='center'
        />
      </div>

      {/* Dislike Feedback Popup */}
      <DislikeFeedbackPopup
        isVisible={showDislikePopup}
        onClose={() => setShowDislikePopup(false)}
        onSubmit={handleDislikeFeedback}
        position={popupPosition}
      />

      {/* Toast */}
      <Toast
        isOpen={showToast}
        onClose={() => setShowToast(false)}
        message={toastMessage}
        type='error'
      />
    </div>
  );
}
