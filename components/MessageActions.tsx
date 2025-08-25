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

interface MessageActionsProps {
  messageId: string;
  messageContent: string;
  initialLiked?: boolean;
  initialDisliked?: boolean;
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
    const baseClasses = 'absolute z-50 px-2 py-1 text-xs text-white bg-black rounded shadow-lg whitespace-nowrap pointer-events-none transition-opacity duration-200';
    
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

  const { baseClasses, positionClass, arrowPositionClass } = getPositionClasses();

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
          What's wrong with this response?
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

  // Audio state
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(messageContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy text:', error);
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
      console.error('Failed to save like feedback:', error);
      // Revert the state if API call failed
      setLiked(!newLikedState);
      if (newLikedState && disliked) {
        setDisliked(true);
      }
    }

    onLike?.(messageId, newLikedState);
  };

  const handleDislike = async (e: React.MouseEvent) => {
    if (disliked) {
      // Toggle off dislike
      setDisliked(false);

      try {
        // Remove dislike from API
        await fetch(`/api/message-feedback?messageId=${messageId}`, {
          method: 'DELETE',
        });
      } catch (error) {
        console.error('Failed to remove dislike feedback:', error);
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
      console.error('Failed to save dislike feedback:', error);
      // Revert the state if API call failed
      setDisliked(false);
      if (liked) {
        setLiked(true);
      }
    }

    onDislike?.(messageId, true, reason);
  };

  const handleSpeak = async () => {
    if (isPlaying && audioRef.current) {
      // Stop current playback
      audioRef.current.pause();
      audioRef.current = null;
      setIsPlaying(false);
      return;
    }

    setIsLoadingTTS(true);

    try {
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
        throw new Error('Failed to generate speech');
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      audioRef.current = new Audio(audioUrl);
      audioRef.current.onended = () => {
        setIsPlaying(false);
        if (audioRef.current) {
          URL.revokeObjectURL(audioRef.current.src);
          audioRef.current = null;
        }
      };

      await audioRef.current.play();
      setIsPlaying(true);
    } catch (error) {
      console.error('Failed to play speech:', error);
    } finally {
      setIsLoadingTTS(false);
    }
  };

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
      }
    };
  }, []);

  return (
    <>
      <div className='flex items-center gap-2 mt-2'>
        {/* Copy Button */}
        <div className='relative'>
          <button
            onClick={handleCopy}
            onMouseEnter={() => setCopyTooltip(true)}
            onMouseLeave={() => setCopyTooltip(false)}
            className='p-1.5 rounded hover:bg-[var(--faded-white)] transition-colors group'
            title=''
          >
            {copied ? (
              <div className='w-4 h-4 text-green-500 animate-pulse'>✓</div>
            ) : (
              <Copy className='w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors' />
            )}
          </button>
          <CustomTooltip
            text={copied ? 'Copied!' : 'Copy message'}
            isVisible={copyTooltip || copied}
            alignment="left"
          />
        </div>

        {/* Like Button */}
        <div className='relative'>
          <button
            onClick={handleLike}
            onMouseEnter={() => setLikeTooltip(true)}
            onMouseLeave={() => setLikeTooltip(false)}
            className='p-1.5 rounded hover:bg-[var(--faded-white)] transition-colors group'
            title=''
          >
            <ThumbsUp
              className={`w-4 h-4 transition-colors ${
                liked
                  ? 'text-[var(--accent)] fill-current'
                  : 'text-[var(--text-muted)] group-hover:text-[var(--text-primary)]'
              }`}
            />
          </button>
          <CustomTooltip
            text={liked ? 'Remove like' : 'Like message'}
            isVisible={likeTooltip}
          />
        </div>

        {/* Dislike Button */}
        <div className='relative'>
          <button
            ref={dislikeButtonRef}
            onClick={handleDislike}
            onMouseEnter={() => setDislikeTooltip(true)}
            onMouseLeave={() => setDislikeTooltip(false)}
            className='p-1.5 rounded hover:bg-[var(--faded-white)] transition-colors group'
            title=''
          >
            <ThumbsDown
              className={`w-4 h-4 transition-colors ${
                disliked
                  ? 'text-[var(--accent)] fill-current'
                  : 'text-[var(--text-muted)] group-hover:text-[var(--text-primary)]'
              }`}
            />
          </button>
          <CustomTooltip
            text={disliked ? 'Remove dislike' : 'Dislike message'}
            isVisible={dislikeTooltip}
          />
        </div>

        {/* Speak Button */}
        <div className='relative'>
          <button
            onClick={handleSpeak}
            onMouseEnter={() => setSpeakTooltip(true)}
            onMouseLeave={() => setSpeakTooltip(false)}
            className='p-1.5 rounded hover:bg-[var(--faded-white)] transition-colors group'
            disabled={isLoadingTTS}
            title=''
          >
            {isLoadingTTS ? (
              <Loader2 className='w-4 h-4 text-[var(--text-muted)] animate-spin' />
            ) : isPlaying ? (
              <Square className='w-4 h-4 text-[var(--accent)]' />
            ) : (
              <Volume2 className='w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors' />
            )}
          </button>
          <CustomTooltip
            text={
              isLoadingTTS
                ? 'Loading...'
                : isPlaying
                ? 'Stop reading'
                : 'Read aloud'
            }
            isVisible={speakTooltip}
          />
        </div>
      </div>

      {/* Dislike Feedback Popup */}
      <DislikeFeedbackPopup
        isVisible={showDislikePopup}
        onClose={() => setShowDislikePopup(false)}
        onSubmit={handleDislikeFeedback}
        position={popupPosition}
      />
    </>
  );
}
