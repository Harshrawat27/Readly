'use client';

import React, { useState, useCallback, useEffect } from 'react';

interface FlashCard {
  id: string;
  question: string;
  answer: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

interface FlashCardsProps {
  pdfId: string;
  onClose: () => void;
}

interface PDFChunk {
  id: string;
  content: string;
  pageNumber: number;
  startIndex: number;
  endIndex: number;
}

const FlashCards: React.FC<FlashCardsProps> = ({ pdfId, onClose }) => {
  const [flashCards, setFlashCards] = useState<FlashCard[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showQuantityModal, setShowQuantityModal] = useState(true);
  const [requestedQuantity, setRequestedQuantity] = useState(10);

  // Generate flashcards from PDF content using AI
  const generateFlashCards = useCallback(async (quantity: number) => {
    try {
      setIsLoading(true);
      setError(null);
      setShowQuantityModal(false);

      // Fetch PDF chunks/content
      const response = await fetch(`/api/pdf/${pdfId}/extract`);
      if (!response.ok) {
        throw new Error('Failed to fetch PDF content');
      }

      const data = await response.json();
      const chunks: PDFChunk[] = data.chunks || [];

      if (chunks.length === 0) {
        throw new Error('No content found in PDF. Please ensure the PDF has been processed.');
      }

      // Combine all content
      const allContent = chunks
        .map(chunk => chunk.content)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();

      // Generate flashcards using AI
      const aiResponse = await fetch('/api/flashcards/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: allContent,
          quantity: quantity
        }),
      });

      if (!aiResponse.ok) {
        const errorData = await aiResponse.json();
        throw new Error(errorData.error || 'Failed to generate flashcards');
      }

      const result = await aiResponse.json();
      const cards = result.flashcards;
      
      if (!cards || cards.length === 0) {
        throw new Error('Could not generate flashcards from this content. Please try with a different PDF.');
      }

      setFlashCards(cards);
      setCurrentCardIndex(0);
      setIsFlipped(false);
      setIsLoading(false);
    } catch (err) {
      console.error('Error generating flashcards:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate flashcards');
      setIsLoading(false);
    }
  }, [pdfId]);


  const nextCard = () => {
    if (currentCardIndex < flashCards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
      setIsFlipped(false);
    }
  };

  const prevCard = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(currentCardIndex - 1);
      setIsFlipped(false);
    }
  };

  const toggleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const currentCard = flashCards[currentCardIndex];

  // Quantity selection modal
  if (showQuantityModal) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-[var(--card-background)] p-8 rounded-xl shadow-2xl max-w-md w-full mx-4 border border-[var(--border)]">
          <div className="text-center">
            <div className="w-16 h-16 bg-[var(--accent)] rounded-full mx-auto mb-4 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-[var(--button-primary-text)]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                <line x1="8" y1="21" x2="16" y2="21"/>
                <line x1="12" y1="17" x2="12" y2="21"/>
              </svg>
            </div>
            
            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">
              Create Flash Cards
            </h3>
            
            <p className="text-[var(--text-muted)] mb-6">
              How many flash cards would you like to generate from this PDF?
            </p>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-3">
                Number of Cards
              </label>
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => setRequestedQuantity(Math.max(5, requestedQuantity - 5))}
                  className="w-10 h-10 rounded-full bg-[var(--faded-white)] hover:bg-[var(--border)] flex items-center justify-center transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                </button>
                
                <div className="text-2xl font-bold text-[var(--accent)] min-w-[60px] text-center">
                  {requestedQuantity}
                </div>
                
                <button
                  onClick={() => setRequestedQuantity(Math.min(50, requestedQuantity + 5))}
                  className="w-10 h-10 rounded-full bg-[var(--faded-white)] hover:bg-[var(--border)] flex items-center justify-center transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                </button>
              </div>
              
              <div className="flex justify-center gap-2 mt-4">
                {[5, 10, 15, 20].map(num => (
                  <button
                    key={num}
                    onClick={() => setRequestedQuantity(num)}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      requestedQuantity === num
                        ? 'bg-[var(--accent)] text-[var(--button-primary-text)]'
                        : 'bg-[var(--faded-white)] text-[var(--text-secondary)] hover:bg-[var(--border)]'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex justify-center gap-3">
              <button
                onClick={onClose}
                className="px-6 py-2 bg-[var(--faded-white)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--border)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => generateFlashCards(requestedQuantity)}
                className="px-6 py-2 bg-[var(--accent)] text-[var(--button-primary-text)] rounded-lg hover:opacity-90 transition-opacity"
              >
                Generate Cards
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-[var(--card-background)] p-8 rounded-xl shadow-xl border border-[var(--border)]">
          <div className="flex items-center space-x-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)]"></div>
            <span className="text-[var(--text-primary)]">Generating {requestedQuantity} flash cards...</span>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-[var(--card-background)] p-8 rounded-xl shadow-xl max-w-md border border-[var(--border)]">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Error</h3>
          <p className="text-[var(--text-muted)] mb-6">{error}</p>
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setShowQuantityModal(true)}
              className="px-4 py-2 bg-[var(--accent)] text-[var(--button-primary-text)] rounded hover:opacity-90 transition-opacity"
            >
              Try Again
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[var(--faded-white)] text-[var(--text-primary)] rounded hover:bg-[var(--border)] transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main flashcard interface
  return (
    <div className="fixed inset-0 bg-[var(--background)] z-50">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--border)] bg-[var(--card-background)]">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-[var(--text-primary)]">Flash Cards</h2>
            <span className="text-sm text-[var(--text-muted)]">
              {currentCardIndex + 1} of {flashCards.length}
            </span>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[var(--faded-white)] transition-colors"
            title="Close Flash Cards"
          >
            <svg
              className="w-5 h-5 text-[var(--text-muted)]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-[var(--faded-white)] h-1">
          <div
            className="h-full bg-[var(--accent)] transition-all duration-300"
            style={{ width: `${((currentCardIndex + 1) / flashCards.length) * 100}%` }}
          />
        </div>

        {/* Main card area */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-2xl w-full">
            {/* Card */}
            <div
              className="relative w-full h-80 cursor-pointer"
              onClick={toggleFlip}
              style={{ perspective: '1000px' }}
            >
              <div
                className={`absolute inset-0 w-full h-full transition-transform duration-600 transform-style-preserve-3d ${
                  isFlipped ? 'rotate-y-180' : ''
                }`}
                style={{
                  transformStyle: 'preserve-3d',
                  transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                }}
              >
                {/* Front of card (Question) */}
                <div
                  className="absolute inset-0 w-full h-full bg-[var(--card-background)] border-2 border-[var(--border)] rounded-2xl p-8 flex flex-col justify-center items-center shadow-xl backface-hidden"
                  style={{ backfaceVisibility: 'hidden' }}
                >
                  <div className="text-sm font-medium text-[var(--accent)] mb-4 uppercase tracking-wide">
                    Question {currentCardIndex + 1}
                  </div>
                  <div className="text-lg text-[var(--text-primary)] text-center leading-relaxed">
                    {currentCard?.question}
                  </div>
                  <div className="mt-6 text-sm text-[var(--text-muted)] flex items-center gap-2">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 12l2 2 4-4"/>
                      <circle cx="12" cy="12" r="10"/>
                    </svg>
                    Click to reveal answer
                  </div>
                  {currentCard?.difficulty && (
                    <div className="absolute top-4 right-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        currentCard.difficulty === 'easy'
                          ? 'bg-green-100 text-green-700'
                          : currentCard.difficulty === 'medium'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {currentCard.difficulty}
                      </span>
                    </div>
                  )}
                </div>

                {/* Back of card (Answer) */}
                <div
                  className="absolute inset-0 w-full h-full bg-[var(--accent)] text-[var(--button-primary-text)] rounded-2xl p-8 flex flex-col justify-center items-center shadow-xl backface-hidden"
                  style={{
                    backfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                  }}
                >
                  <div className="text-sm font-medium mb-4 uppercase tracking-wide opacity-90">
                    Answer
                  </div>
                  <div className="text-lg text-center leading-relaxed">
                    {currentCard?.answer}
                  </div>
                  <div className="mt-6 text-sm opacity-75 flex items-center gap-2">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 12l2 2 4-4"/>
                      <circle cx="12" cy="12" r="10"/>
                    </svg>
                    Click to see question
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between mt-8">
              <button
                onClick={prevCard}
                disabled={currentCardIndex === 0}
                className="flex items-center gap-2 px-6 py-3 bg-[var(--card-background)] border border-[var(--border)] rounded-lg hover:bg-[var(--faded-white)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="15,18 9,12 15,6"/>
                </svg>
                Previous
              </button>

              <div className="flex items-center gap-3">
                <button
                  onClick={toggleFlip}
                  className="px-4 py-2 bg-[var(--accent)] text-[var(--button-primary-text)] rounded-lg hover:opacity-90 transition-opacity"
                >
                  {isFlipped ? 'Show Question' : 'Show Answer'}
                </button>
              </div>

              <button
                onClick={nextCard}
                disabled={currentCardIndex === flashCards.length - 1}
                className="flex items-center gap-2 px-6 py-3 bg-[var(--card-background)] border border-[var(--border)] rounded-lg hover:bg-[var(--faded-white)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9,18 15,12 9,6"/>
                </svg>
              </button>
            </div>

            {/* Card indicators */}
            <div className="flex justify-center mt-6">
              <div className="flex gap-2">
                {flashCards.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setCurrentCardIndex(index);
                      setIsFlipped(false);
                    }}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      index === currentCardIndex
                        ? 'bg-[var(--accent)]'
                        : 'bg-[var(--faded-white)] hover:bg-[var(--border)]'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlashCards;