'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { canUploadPdf, canAskQuestion } from '@/lib/subscription-plans';

export type LimitType = 'pdfs' | 'fileSize' | 'questions' | 'pages';

interface LimitHandlerState {
  isLimitPopupOpen: boolean;
  currentLimitType: LimitType | null;
}

interface LimitCheckParams {
  currentPdfCount?: number;
  fileSize?: number;
  pageCount?: number;
  monthlyQuestionsUsed?: number;
}

export const useLimitHandler = (currentPlan: 'free' | 'pro' | 'ultimate') => {
  const router = useRouter();
  const [limitState, setLimitState] = useState<LimitHandlerState>({
    isLimitPopupOpen: false,
    currentLimitType: null,
  });

  const showLimitPopup = useCallback((limitType: LimitType) => {
    setLimitState({
      isLimitPopupOpen: true,
      currentLimitType: limitType,
    });
  }, []);

  const closeLimitPopup = useCallback(() => {
    setLimitState({
      isLimitPopupOpen: false,
      currentLimitType: null,
    });
  }, []);

  const checkPdfUploadLimit = useCallback(
    (params: LimitCheckParams): { allowed: boolean; limitType?: LimitType } => {
      const { currentPdfCount = 0, fileSize = 0, pageCount = 0 } = params;
      
      const uploadCheck = canUploadPdf(currentPdfCount, fileSize, pageCount, currentPlan);
      
      if (!uploadCheck.allowed) {
        let limitType: LimitType = 'pdfs';
        
        if (uploadCheck.reason?.includes('File size exceeds')) {
          limitType = 'fileSize';
        } else if (uploadCheck.reason?.includes('pages')) {
          limitType = 'pages';
        }
        
        return { allowed: false, limitType };
      }
      
      return { allowed: true };
    },
    [currentPlan]
  );

  const checkQuestionLimit = useCallback(
    (monthlyQuestionsUsed: number): { allowed: boolean; limitType?: LimitType } => {
      const questionCheck = canAskQuestion(monthlyQuestionsUsed, currentPlan);
      
      if (!questionCheck.allowed) {
        return { allowed: false, limitType: 'questions' };
      }
      
      return { allowed: true };
    },
    [currentPlan]
  );

  const handlePdfUpload = useCallback(
    (params: LimitCheckParams, onSuccess: () => void) => {
      const check = checkPdfUploadLimit(params);
      
      if (!check.allowed && check.limitType) {
        showLimitPopup(check.limitType);
        return false;
      }
      
      onSuccess();
      return true;
    },
    [checkPdfUploadLimit, showLimitPopup]
  );

  const handleQuestion = useCallback(
    (monthlyQuestionsUsed: number, onSuccess: () => void) => {
      const check = checkQuestionLimit(monthlyQuestionsUsed);
      
      if (!check.allowed && check.limitType) {
        showLimitPopup(check.limitType);
        return false;
      }
      
      onSuccess();
      return true;
    },
    [checkQuestionLimit, showLimitPopup]
  );

  const handleUpgrade = useCallback((planName: 'pro' | 'ultimate') => {
    // Navigate to subscription page with selected plan
    router.push(`/subscription?plan=${planName}&upgrade=true`);
    closeLimitPopup();
  }, [router, closeLimitPopup]);

  // Helper function to handle API errors that might contain limit information
  const handleApiError = useCallback((error: any) => {
    if (error?.message) {
      const errorMessage = error.message.toLowerCase();
      
      if (errorMessage.includes('pdf limit') || errorMessage.includes('upload limit')) {
        showLimitPopup('pdfs');
        return true;
      }
      
      if (errorMessage.includes('file size') || errorMessage.includes('too large')) {
        showLimitPopup('fileSize');
        return true;
      }
      
      if (errorMessage.includes('question') || errorMessage.includes('monthly limit')) {
        showLimitPopup('questions');
        return true;
      }
      
      if (errorMessage.includes('pages') || errorMessage.includes('page limit')) {
        showLimitPopup('pages');
        return true;
      }
    }
    
    return false; // Not a limit error
  }, [showLimitPopup]);

  return {
    // State
    isLimitPopupOpen: limitState.isLimitPopupOpen,
    currentLimitType: limitState.currentLimitType,
    
    // Actions
    showLimitPopup,
    closeLimitPopup,
    handleUpgrade,
    
    // Checkers
    checkPdfUploadLimit,
    checkQuestionLimit,
    
    // Handlers
    handlePdfUpload,
    handleQuestion,
    handleApiError,
  };
};