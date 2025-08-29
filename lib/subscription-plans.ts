export interface SubscriptionPlan {
  id: string;
  name: 'free' | 'pro' | 'ultimate';
  displayName: string;
  price: number;
  currency: string;
  interval: string;
  maxPdfsPerMonth: number; // -1 for unlimited
  maxFileSize: number; // in MB
  maxQuestionsPerMonth: number; // -1 for unlimited
  maxPagesPerPdf: number; // -1 for unlimited
  features: string[];
}

export const SUBSCRIPTION_PLANS: Record<string, SubscriptionPlan> = {
  free: {
    id: 'free',
    name: 'free',
    displayName: 'Free',
    price: 0,
    currency: 'USD',
    interval: 'month',
    maxPdfsPerMonth: 3,
    maxFileSize: 10, // 10MB
    maxQuestionsPerMonth: 50,
    maxPagesPerPdf: 50,
    features: [
      '3 PDF uploads per month',
      'Up to 10MB file size',
      '50 questions per month',
      'Up to 50 pages per PDF'
    ]
  },
  pro_monthly: {
    id: 'pro_monthly',
    name: 'pro',
    displayName: 'Pro Monthly',
    price: 10,
    currency: 'USD',
    interval: 'month',
    maxPdfsPerMonth: 10,
    maxFileSize: 50, // 50MB
    maxQuestionsPerMonth: 1000,
    maxPagesPerPdf: 200,
    features: [
      '10 PDF uploads per month',
      'Up to 50MB file size',
      '1,000 questions per month',
      'Up to 200 pages per PDF',
      'Priority support'
    ]
  },
  pro_yearly: {
    id: 'pro_yearly',
    name: 'pro',
    displayName: 'Pro Yearly',
    price: 100,
    currency: 'USD',
    interval: 'year',
    maxPdfsPerMonth: 10,
    maxFileSize: 50, // 50MB
    maxQuestionsPerMonth: 1000,
    maxPagesPerPdf: 200,
    features: [
      '10 PDF uploads per month',
      'Up to 50MB file size',
      '1,000 questions per month',
      'Up to 200 pages per PDF',
      'Priority support',
      'Save 2 months (16% off)'
    ]
  },
  ultimate_monthly: {
    id: 'ultimate_monthly',
    name: 'ultimate',
    displayName: 'Ultimate Monthly',
    price: 15,
    currency: 'USD',
    interval: 'month',
    maxPdfsPerMonth: -1, // unlimited
    maxFileSize: 50, // 50MB
    maxQuestionsPerMonth: -1, // unlimited
    maxPagesPerPdf: 2000,
    features: [
      'Unlimited PDF uploads',
      'Up to 50MB file size',
      'Unlimited questions',
      'Up to 2000 pages per PDF',
      'Priority support',
      'Advanced analytics'
    ]
  },
  ultimate_yearly: {
    id: 'ultimate_yearly',
    name: 'ultimate',
    displayName: 'Ultimate Yearly',
    price: 150,
    currency: 'USD',
    interval: 'year',
    maxPdfsPerMonth: -1, // unlimited
    maxFileSize: 50, // 50MB
    maxQuestionsPerMonth: -1, // unlimited
    maxPagesPerPdf: 2000,
    features: [
      'Unlimited PDF uploads',
      'Up to 50MB file size',
      'Unlimited questions',
      'Up to 2000 pages per PDF',
      'Priority support',
      'Advanced analytics',
      'Save 2 months (16% off)'
    ]
  },
  // Keep legacy plans for backward compatibility
  pro: {
    id: 'pro',
    name: 'pro',
    displayName: 'Pro',
    price: 10,
    currency: 'USD',
    interval: 'month',
    maxPdfsPerMonth: 10,
    maxFileSize: 50, // 50MB
    maxQuestionsPerMonth: 1000,
    maxPagesPerPdf: 200,
    features: [
      '10 PDF uploads per month',
      'Up to 50MB file size',
      '1,000 questions per month',
      'Up to 200 pages per PDF',
      'Priority support'
    ]
  },
  ultimate: {
    id: 'ultimate',
    name: 'ultimate',
    displayName: 'Ultimate',
    price: 15,
    currency: 'USD',
    interval: 'month',
    maxPdfsPerMonth: -1, // unlimited
    maxFileSize: 50, // 50MB
    maxQuestionsPerMonth: -1, // unlimited
    maxPagesPerPdf: 2000,
    features: [
      'Unlimited PDF uploads',
      'Up to 50MB file size',
      'Unlimited questions',
      'Up to 2000 pages per PDF',
      'Priority support',
      'Advanced analytics'
    ]
  }
};

export function getPlanLimits(planName: string) {
  const plan = SUBSCRIPTION_PLANS[planName] || SUBSCRIPTION_PLANS.free;
  return {
    maxPdfsPerMonth: plan.maxPdfsPerMonth,
    maxFileSize: plan.maxFileSize,
    maxQuestionsPerMonth: plan.maxQuestionsPerMonth,
    maxPagesPerPdf: plan.maxPagesPerPdf
  };
}

export function isPlanUpgrade(currentPlan: string, newPlan: string): boolean {
  const planHierarchy = { free: 0, pro: 1, ultimate: 2 };
  return (planHierarchy[newPlan as keyof typeof planHierarchy] || 0) > 
         (planHierarchy[currentPlan as keyof typeof planHierarchy] || 0);
}

// Helper function to check if monthly counter should be reset
export function shouldResetMonthlyCounter(lastResetDate: Date): boolean {
  const now = new Date();
  const lastReset = new Date(lastResetDate);
  
  // Reset if it's a different month or year
  return now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear();
}

// Function to get current monthly PDF count (with auto-reset logic)
export function getCurrentMonthlyPdfCount(
  monthlyPdfsUploaded: number,
  monthlyPdfsResetDate: Date
): number {
  if (shouldResetMonthlyCounter(monthlyPdfsResetDate)) {
    return 0; // Reset to 0 if it's a new month
  }
  return monthlyPdfsUploaded;
}

export function canUploadPdf(
  monthlyPdfsUploaded: number,
  monthlyPdfsResetDate: Date,
  fileSize: number, 
  pageCount: number, 
  planName: string
): { allowed: boolean; reason?: string; shouldReset?: boolean } {
  const limits = getPlanLimits(planName);
  
  // Check if we need to reset monthly counter
  const shouldReset = shouldResetMonthlyCounter(monthlyPdfsResetDate);
  const currentMonthlyCount = shouldReset ? 0 : monthlyPdfsUploaded;
  
  // Check monthly PDF limit
  if (limits.maxPdfsPerMonth !== -1 && currentMonthlyCount >= limits.maxPdfsPerMonth) {
    return { 
      allowed: false, 
      reason: `You have reached your monthly PDF limit of ${limits.maxPdfsPerMonth}. Your limit will reset next month.`,
      shouldReset
    };
  }
  
  // Check file size limit
  if (fileSize > limits.maxFileSize * 1024 * 1024) {
    return { 
      allowed: false, 
      reason: `File size exceeds ${limits.maxFileSize}MB limit. Upgrade your plan for larger files.`,
      shouldReset
    };
  }
  
  // Check page count limit
  if (limits.maxPagesPerPdf !== -1 && pageCount > limits.maxPagesPerPdf) {
    return { 
      allowed: false, 
      reason: `PDF has ${pageCount} pages but your plan allows maximum ${limits.maxPagesPerPdf} pages.`,
      shouldReset
    };
  }
  
  return { allowed: true, shouldReset };
}

export function canAskQuestion(
  monthlyQuestionsUsed: number, 
  planName: string
): { allowed: boolean; reason?: string } {
  const limits = getPlanLimits(planName);
  
  if (limits.maxQuestionsPerMonth !== -1 && monthlyQuestionsUsed >= limits.maxQuestionsPerMonth) {
    return { 
      allowed: false, 
      reason: `You have used all ${limits.maxQuestionsPerMonth} questions for this month. Upgrade to get more questions.` 
    };
  }
  
  return { allowed: true };
}