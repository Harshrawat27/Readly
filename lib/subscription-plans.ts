export interface SubscriptionPlan {
  id: string;
  name: 'free' | 'pro' | 'ultimate';
  displayName: string;
  price: number;
  currency: string;
  interval: string;
  maxPdfs: number; // -1 for unlimited
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
    maxPdfs: 3,
    maxFileSize: 10, // 10MB
    maxQuestionsPerMonth: 50,
    maxPagesPerPdf: 50,
    features: [
      '3 PDF uploads',
      'Up to 10MB file size',
      '50 questions per month',
      'Up to 50 pages per PDF'
    ]
  },
  pro: {
    id: 'pro',
    name: 'pro',
    displayName: 'Pro',
    price: 10,
    currency: 'USD',
    interval: 'month',
    maxPdfs: 10,
    maxFileSize: 50, // 50MB
    maxQuestionsPerMonth: 1000,
    maxPagesPerPdf: 200,
    features: [
      '10 PDF uploads',
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
    price: 20,
    currency: 'USD',
    interval: 'month',
    maxPdfs: -1, // unlimited
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
    maxPdfs: plan.maxPdfs,
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

export function canUploadPdf(
  currentPdfCount: number, 
  fileSize: number, 
  pageCount: number, 
  planName: string
): { allowed: boolean; reason?: string } {
  const limits = getPlanLimits(planName);
  
  if (limits.maxPdfs !== -1 && currentPdfCount >= limits.maxPdfs) {
    return { 
      allowed: false, 
      reason: `You have reached your PDF limit of ${limits.maxPdfs}. Upgrade to upload more PDFs.` 
    };
  }
  
  if (fileSize > limits.maxFileSize * 1024 * 1024) {
    return { 
      allowed: false, 
      reason: `File size exceeds ${limits.maxFileSize}MB limit. Upgrade your plan for larger files.` 
    };
  }
  
  if (limits.maxPagesPerPdf !== -1 && pageCount > limits.maxPagesPerPdf) {
    return { 
      allowed: false, 
      reason: `PDF has ${pageCount} pages but your plan allows maximum ${limits.maxPagesPerPdf} pages.` 
    };
  }
  
  return { allowed: true };
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