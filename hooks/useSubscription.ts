'use client';

import { useState, useEffect } from 'react';

interface SubscriptionData {
  plan: any;
  subscription: any;
  limits: any;
  usage: any;
  user: any;
}

export function useSubscription() {
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState('');

  useEffect(() => {
    fetchSubscriptionData();
  }, []);

  const fetchSubscriptionData = async () => {
    try {
      // Check cache first to prevent duplicate calls
      const cacheKey = 'subscription_status';
      const cached = sessionStorage.getItem(cacheKey);
      const cacheTime = sessionStorage.getItem(`${cacheKey}_time`);
      
      // Use 2-minute cache for subscription data
      if (cached && cacheTime && (Date.now() - parseInt(cacheTime)) < 2 * 60 * 1000) {
        setSubscriptionData(JSON.parse(cached));
        setIsLoading(false);
        return;
      }

      const response = await fetch('/api/subscription/status');
      if (response.ok) {
        const data = await response.json();
        setSubscriptionData(data);
        
        // Cache the result
        sessionStorage.setItem(cacheKey, JSON.stringify(data));
        sessionStorage.setItem(`${cacheKey}_time`, Date.now().toString());
      }
    } catch (error) {
      console.error('Failed to fetch subscription data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkLimits = async (action: 'upload' | 'question', metadata?: any) => {
    if (!subscriptionData) return true;

    // This is a client-side pre-check, the actual enforcement happens on the server
    const { limits, usage } = subscriptionData;

    if (action === 'upload') {
      if (limits.maxPdfs !== -1 && usage.totalPdfsUploaded >= limits.maxPdfs) {
        setUpgradeReason(`You have reached your PDF limit of ${limits.maxPdfs}. Upgrade to upload more PDFs.`);
        setShowUpgradeDialog(true);
        return false;
      }
      
      if (metadata?.fileSize && metadata.fileSize > limits.maxFileSize * 1024 * 1024) {
        setUpgradeReason(`File size exceeds ${limits.maxFileSize}MB limit. Upgrade your plan for larger files.`);
        setShowUpgradeDialog(true);
        return false;
      }
      
      if (metadata?.pageCount && limits.maxPagesPerPdf !== -1 && metadata.pageCount > limits.maxPagesPerPdf) {
        setUpgradeReason(`PDF has ${metadata.pageCount} pages but your plan allows maximum ${limits.maxPagesPerPdf} pages.`);
        setShowUpgradeDialog(true);
        return false;
      }
    }

    if (action === 'question') {
      if (limits.maxQuestionsPerMonth !== -1 && usage.monthlyQuestionsUsed >= limits.maxQuestionsPerMonth) {
        setUpgradeReason(`You have used all ${limits.maxQuestionsPerMonth} questions for this month. Upgrade to get more questions.`);
        setShowUpgradeDialog(true);
        return false;
      }
    }

    return true;
  };

  const handleApiError = (error: any) => {
    if (error.requiresUpgrade) {
      setUpgradeReason(error.message || 'Upgrade required to continue');
      setShowUpgradeDialog(true);
      return true;
    }
    return false;
  };

  return {
    subscriptionData,
    isLoading,
    showUpgradeDialog,
    upgradeReason,
    setShowUpgradeDialog,
    checkLimits,
    handleApiError,
    refetch: fetchSubscriptionData,
  };
}