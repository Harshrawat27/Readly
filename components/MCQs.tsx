'use client';

import React, { useState, useCallback } from 'react';

interface MCQOption {
  text: string;
  isCorrect: boolean;
}

interface MCQ {
  id: string;
  question: string;
  options: MCQOption[];
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

interface MCQsProps {
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

interface UserAnswer {
  questionId: string;
  selectedOption: number;
  isCorrect: boolean;
}

const MCQs: React.FC<MCQsProps> = ({ pdfId, onClose }) => {
  const [mcqs, setMcqs] = useState<MCQ[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showQuantityModal, setShowQuantityModal] = useState(true);
  const [requestedQuantity, setRequestedQuantity] = useState(10);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<number>>(new Set());

  // Generate MCQs from PDF content using AI
  const generateMCQs = useCallback(
    async (quantity: number) => {
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
          throw new Error(
            'No content found in PDF. Please ensure the PDF has been processed.'
          );
        }

        // Combine all content
        const allContent = chunks
          .map((chunk) => chunk.content)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();

        // Generate MCQs using AI
        const aiResponse = await fetch('/api/mcqs/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: allContent,
            quantity: quantity,
          }),
        });

        if (!aiResponse.ok) {
          const errorData = await aiResponse.json();
          throw new Error(errorData.error || 'Failed to generate MCQs');
        }

        const result = await aiResponse.json();
        const questions = result.mcqs;

        if (!questions || questions.length === 0) {
          throw new Error(
            'Could not generate MCQs from this content. Please try with a different PDF.'
          );
        }

        setMcqs(questions);
        setCurrentQuestionIndex(0);
        setSelectedOption(null);
        setShowResult(false);
        setUserAnswers([]);
        setQuizCompleted(false);
        setAnsweredQuestions(new Set());
        setIsLoading(false);
      } catch (err) {
        console.error('Error generating MCQs:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to generate MCQs'
        );
        setIsLoading(false);
      }
    },
    [pdfId]
  );

  const handleOptionSelect = (optionIndex: number) => {
    if (answeredQuestions.has(currentQuestionIndex)) return;
    setSelectedOption(optionIndex);
  };

  const handleSubmitAnswer = () => {
    if (selectedOption === null || answeredQuestions.has(currentQuestionIndex)) return;

    const currentMCQ = mcqs[currentQuestionIndex];
    const isCorrect = currentMCQ.options[selectedOption].isCorrect;
    
    const userAnswer: UserAnswer = {
      questionId: currentMCQ.id,
      selectedOption,
      isCorrect,
    };

    setUserAnswers([...userAnswers, userAnswer]);
    setAnsweredQuestions(new Set([...answeredQuestions, currentQuestionIndex]));
    setShowResult(true);
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < mcqs.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedOption(null);
      setShowResult(false);
    } else {
      setQuizCompleted(true);
    }
  };

  const prevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      const prevAnswer = userAnswers.find(a => a.questionId === mcqs[currentQuestionIndex - 1].id);
      setSelectedOption(prevAnswer ? prevAnswer.selectedOption : null);
      setShowResult(answeredQuestions.has(currentQuestionIndex - 1));
    }
  };

  const restartQuiz = () => {
    setCurrentQuestionIndex(0);
    setSelectedOption(null);
    setShowResult(false);
    setUserAnswers([]);
    setQuizCompleted(false);
    setAnsweredQuestions(new Set());
  };

  const currentMCQ = mcqs[currentQuestionIndex];
  const currentAnswer = userAnswers.find(a => a.questionId === currentMCQ?.id);
  const score = userAnswers.filter(a => a.isCorrect).length;

  // Quantity selection modal
  if (showQuantityModal) {
    return (
      <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
        <div className='bg-[var(--card-background)] p-8 rounded-xl shadow-2xl max-w-md w-full mx-4 border border-[var(--border)]'>
          <div className='text-center'>
            <div className='w-16 h-16 bg-[var(--accent)] rounded-full mx-auto mb-4 flex items-center justify-center'>
              <svg
                className='w-8 h-8 text-[var(--button-primary-text)]'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
              >
                <circle cx='12' cy='12' r='10' />
                <path d='9,9h6v6h-6z' />
                <path d='m9,1 l6,0' />
              </svg>
            </div>

            <h3 className='text-xl font-bold text-[var(--text-primary)] mb-2'>
              Create MCQ Quiz
            </h3>

            <p className='text-[var(--text-muted)] mb-6'>
              How many multiple choice questions would you like to generate from this PDF?
            </p>

            <div className='mb-6'>
              <label className='block text-sm font-medium text-[var(--text-secondary)] mb-3'>
                Number of Questions
              </label>
              <div className='flex items-center justify-center gap-4'>
                <button
                  onClick={() =>
                    setRequestedQuantity(Math.max(5, requestedQuantity - 5))
                  }
                  className='w-10 h-10 rounded-full bg-[var(--faded-white)] hover:bg-[var(--border)] flex items-center justify-center transition-colors'
                >
                  <svg
                    className='w-4 h-4'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='2'
                  >
                    <line x1='5' y1='12' x2='19' y2='12' />
                  </svg>
                </button>

                <div className='text-2xl font-bold text-[var(--accent)] min-w-[60px] text-center'>
                  {requestedQuantity}
                </div>

                <button
                  onClick={() =>
                    setRequestedQuantity(Math.min(50, requestedQuantity + 5))
                  }
                  className='w-10 h-10 rounded-full bg-[var(--faded-white)] hover:bg-[var(--border)] flex items-center justify-center transition-colors'
                >
                  <svg
                    className='w-4 h-4'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='2'
                  >
                    <line x1='12' y1='5' x2='12' y2='19' />
                    <line x1='5' y1='12' x2='19' y2='12' />
                  </svg>
                </button>
              </div>

              <div className='flex justify-center gap-2 mt-4'>
                {[5, 10, 15, 20].map((num) => (
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

            <div className='flex justify-center gap-3'>
              <button
                onClick={onClose}
                className='px-6 py-2 bg-[var(--faded-white)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--border)] transition-colors'
              >
                Cancel
              </button>
              <button
                onClick={() => generateMCQs(requestedQuantity)}
                className='px-6 py-2 bg-[var(--accent)] text-[var(--button-primary-text)] rounded-lg hover:opacity-90 transition-opacity'
              >
                Generate Quiz
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
      <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
        <div className='bg-[var(--card-background)] p-8 rounded-xl shadow-xl border border-[var(--border)]'>
          <div className='flex items-center space-x-4'>
            <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)]'></div>
            <span className='text-[var(--text-primary)]'>
              Generating {requestedQuantity} MCQ questions...
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
        <div className='bg-[var(--card-background)] p-8 rounded-xl shadow-xl max-w-md border border-[var(--border)]'>
          <h3 className='text-lg font-semibold text-[var(--text-primary)] mb-4'>
            Error
          </h3>
          <p className='text-[var(--text-muted)] mb-6'>{error}</p>
          <div className='flex justify-end space-x-3'>
            <button
              onClick={() => setShowQuantityModal(true)}
              className='px-4 py-2 bg-[var(--accent)] text-[var(--button-primary-text)] rounded hover:opacity-90 transition-opacity'
            >
              Try Again
            </button>
            <button
              onClick={onClose}
              className='px-4 py-2 bg-[var(--faded-white)] text-[var(--text-primary)] rounded hover:bg-[var(--border)] transition-colors'
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Quiz completed state
  if (quizCompleted) {
    const percentage = Math.round((score / mcqs.length) * 100);
    return (
      <div className='fixed inset-0 bg-[var(--background)] z-50 overflow-auto'>
        <div className='min-h-full flex flex-col'>
          {/* Header */}
          <div className='flex items-center justify-between p-6 border-b border-[var(--border)] bg-[var(--card-background)]'>
            <h2 className='text-xl font-bold text-[var(--text-primary)]'>
              Quiz Results
            </h2>
            <button
              onClick={onClose}
              className='p-2 rounded-lg hover:bg-[var(--faded-white)] transition-colors'
            >
              <svg
                className='w-5 h-5 text-[var(--text-muted)]'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
              >
                <line x1='18' y1='6' x2='6' y2='18'></line>
                <line x1='6' y1='6' x2='18' y2='18'></line>
              </svg>
            </button>
          </div>

          <div className='flex-1 flex items-center justify-center p-8'>
            <div className='max-w-2xl w-full text-center'>
              {/* Score Display */}
              <div className='mb-8'>
                <div className='text-6xl font-bold text-[var(--accent)] mb-4'>
                  {percentage}%
                </div>
                <div className='text-xl text-[var(--text-primary)] mb-2'>
                  You scored {score} out of {mcqs.length} questions correctly
                </div>
                <div className='text-[var(--text-muted)]'>
                  {percentage >= 80 ? 'Excellent work!' : 
                   percentage >= 60 ? 'Good job!' : 
                   percentage >= 40 ? 'Not bad, keep practicing!' : 'Keep studying!'}
                </div>
              </div>

              {/* Action buttons */}
              <div className='flex justify-center gap-4 mb-8'>
                <button
                  onClick={restartQuiz}
                  className='px-6 py-3 bg-[var(--accent)] text-[var(--button-primary-text)] rounded-lg hover:opacity-90 transition-opacity'
                >
                  Retake Quiz
                </button>
                <button
                  onClick={() => setShowQuantityModal(true)}
                  className='px-6 py-3 bg-[var(--card-background)] border border-[var(--border)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--faded-white)] transition-colors'
                >
                  New Quiz
                </button>
              </div>

              {/* Detailed Results */}
              <div className='bg-[var(--card-background)] rounded-lg p-6 border border-[var(--border)]'>
                <h3 className='text-lg font-semibold text-[var(--text-primary)] mb-4'>
                  Question Review
                </h3>
                <div className='space-y-4'>
                  {mcqs.map((mcq, index) => {
                    const userAnswer = userAnswers.find(a => a.questionId === mcq.id);
                    const isCorrect = userAnswer?.isCorrect || false;
                    
                    return (
                      <div key={mcq.id} className='text-left p-4 bg-[var(--faded-white)] rounded-lg'>
                        <div className='flex items-start gap-3'>
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                            isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {isCorrect ? '✓' : '✗'}
                          </div>
                          <div className='flex-1'>
                            <div className='font-medium text-[var(--text-primary)] mb-2'>
                              {index + 1}. {mcq.question}
                            </div>
                            {userAnswer && (
                              <div className='text-sm text-[var(--text-muted)]'>
                                Your answer: {mcq.options[userAnswer.selectedOption].text}
                                {!isCorrect && (
                                  <div className='mt-1'>
                                    Correct answer: {mcq.options.find(opt => opt.isCorrect)?.text}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main MCQ interface
  return (
    <div className='fixed inset-0 bg-[var(--background)] z-50 overflow-auto'>
      <div className='min-h-full flex flex-col'>
        {/* Header */}
        <div className='flex items-center justify-between p-6 border-b border-[var(--border)] bg-[var(--card-background)]'>
          <div className='flex items-center gap-4'>
            <h2 className='text-xl font-bold text-[var(--text-primary)]'>
              MCQ Quiz
            </h2>
            <span className='text-sm text-[var(--text-muted)]'>
              Question {currentQuestionIndex + 1} of {mcqs.length}
            </span>
            <span className='text-sm text-[var(--text-secondary)]'>
              Score: {score}/{userAnswers.length}
            </span>
          </div>

          <button
            onClick={onClose}
            className='p-2 rounded-lg hover:bg-[var(--faded-white)] transition-colors'
          >
            <svg
              className='w-5 h-5 text-[var(--text-muted)]'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
            >
              <line x1='18' y1='6' x2='6' y2='18'></line>
              <line x1='6' y1='6' x2='18' y2='18'></line>
            </svg>
          </button>
        </div>

        {/* Progress bar */}
        <div className='w-full bg-[var(--faded-white)] h-1'>
          <div
            className='h-full bg-[var(--accent)] transition-all duration-300'
            style={{
              width: `${((currentQuestionIndex + 1) / mcqs.length) * 100}%`,
            }}
          />
        </div>

        {/* Main question area */}
        <div className='flex-1 flex items-start justify-center p-8'>
          <div className='max-w-3xl w-full'>
            {/* Question */}
            <div className='bg-[var(--card-background)] border border-[var(--border)] rounded-2xl p-8 mb-8'>
              <div className='flex items-start justify-between mb-6'>
                <div className='text-sm font-medium text-[var(--accent)] uppercase tracking-wide'>
                  Question {currentQuestionIndex + 1}
                </div>
                {currentMCQ?.difficulty && (
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      currentMCQ.difficulty === 'easy'
                        ? 'bg-green-100 text-green-700'
                        : currentMCQ.difficulty === 'medium'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {currentMCQ.difficulty}
                  </span>
                )}
              </div>
              
              <h3 className='text-xl font-semibold text-[var(--text-primary)] leading-relaxed mb-6'>
                {currentMCQ?.question}
              </h3>

              {/* Options */}
              <div className='space-y-3'>
                {currentMCQ?.options.map((option, index) => {
                  const isSelected = selectedOption === index;
                  const isAnswered = answeredQuestions.has(currentQuestionIndex);
                  const isCorrect = option.isCorrect;
                  const showCorrect = isAnswered && isCorrect;
                  const showIncorrect = isAnswered && isSelected && !isCorrect;
                  
                  return (
                    <button
                      key={index}
                      onClick={() => handleOptionSelect(index)}
                      disabled={isAnswered}
                      className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                        showCorrect
                          ? 'border-green-500 bg-green-50 text-black'
                          : showIncorrect
                          ? 'border-red-500 bg-red-50 text-black'
                          : isSelected
                          ? 'border-[var(--accent)] bg-[var(--accent)]/10'
                          : 'border-[var(--border)] bg-[var(--card-background)] hover:border-[var(--accent)]/50 hover:bg-[var(--faded-white)]'
                      } ${isAnswered ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <div className='flex items-center gap-3'>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          showCorrect
                            ? 'border-green-500 bg-green-500'
                            : showIncorrect
                            ? 'border-red-500 bg-red-500'
                            : isSelected
                            ? 'border-[var(--accent)] bg-[var(--accent)]'
                            : 'border-[var(--border)]'
                        }`}>
                          <span className='text-xs font-bold text-white'>
                            {String.fromCharCode(65 + index)}
                          </span>
                        </div>
                        <span className={`${
                          showCorrect || showIncorrect
                            ? 'font-medium'
                            : ''
                        }`}>
                          {option.text}
                        </span>
                        {showCorrect && (
                          <svg className='w-5 h-5 text-green-500 ml-auto' fill='currentColor' viewBox='0 0 20 20'>
                            <path fillRule='evenodd' d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z' clipRule='evenodd' />
                          </svg>
                        )}
                        {showIncorrect && (
                          <svg className='w-5 h-5 text-red-500 ml-auto' fill='currentColor' viewBox='0 0 20 20'>
                            <path fillRule='evenodd' d='M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z' clipRule='evenodd' />
                          </svg>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Submit/Continue Button */}
              <div className='mt-6'>
                {!answeredQuestions.has(currentQuestionIndex) ? (
                  <button
                    onClick={handleSubmitAnswer}
                    disabled={selectedOption === null}
                    className='w-full py-3 bg-[var(--accent)] text-[var(--button-primary-text)] rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed'
                  >
                    Submit Answer
                  </button>
                ) : (
                  <button
                    onClick={nextQuestion}
                    className='w-full py-3 bg-[var(--accent)] text-[var(--button-primary-text)] rounded-lg font-medium hover:opacity-90 transition-opacity'
                  >
                    {currentQuestionIndex === mcqs.length - 1 ? 'View Results' : 'Next Question'}
                  </button>
                )}
              </div>

              {/* Explanation */}
              {showResult && currentMCQ?.explanation && (
                <div className='mt-6 p-4 bg-[var(--faded-white)] rounded-lg border-l-4 border-[var(--accent)]'>
                  <h4 className='font-medium text-[var(--text-primary)] mb-2'>Explanation:</h4>
                  <p className='text-[var(--text-secondary)]'>{currentMCQ.explanation}</p>
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className='flex items-center justify-between'>
              <button
                onClick={prevQuestion}
                disabled={currentQuestionIndex === 0}
                className='flex items-center gap-2 px-6 py-3 bg-[var(--card-background)] border border-[var(--border)] rounded-lg hover:bg-[var(--faded-white)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
              >
                <svg
                  className='w-4 h-4'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2'
                >
                  <polyline points='15,18 9,12 15,6' />
                </svg>
                Previous
              </button>

              <div className='text-sm text-[var(--text-muted)]'>
                {answeredQuestions.size} of {mcqs.length} answered
              </div>

              <button
                onClick={nextQuestion}
                disabled={currentQuestionIndex === mcqs.length - 1 && !answeredQuestions.has(currentQuestionIndex)}
                className='flex items-center gap-2 px-6 py-3 bg-[var(--card-background)] border border-[var(--border)] rounded-lg hover:bg-[var(--faded-white)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
              >
                {currentQuestionIndex === mcqs.length - 1 ? 'Finish' : 'Next'}
                <svg
                  className='w-4 h-4'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2'
                >
                  <polyline points='9,18 15,12 9,6' />
                </svg>
              </button>
            </div>

            {/* Question indicators */}
            <div className='flex justify-center mt-6'>
              <div className='flex gap-2'>
                {mcqs.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setCurrentQuestionIndex(index);
                      const prevAnswer = userAnswers.find(a => a.questionId === mcqs[index].id);
                      setSelectedOption(prevAnswer ? prevAnswer.selectedOption : null);
                      setShowResult(answeredQuestions.has(index));
                    }}
                    className={`w-3 h-3 rounded-full transition-colors ${
                      answeredQuestions.has(index)
                        ? userAnswers.find(a => a.questionId === mcqs[index].id)?.isCorrect
                          ? 'bg-green-500'
                          : 'bg-red-500'
                        : index === currentQuestionIndex
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

export default MCQs;