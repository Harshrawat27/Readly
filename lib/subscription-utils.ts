import prisma from './prisma';
import { SUBSCRIPTION_PLANS, getCurrentMonthlyPdfCount } from './subscription-plans';

export async function getUserSubscription(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      subscriptions: {
        where: { status: 'active' },
        orderBy: { createdAt: 'desc' },
        take: 1
      }
    }
  });

  if (!user) return null;

  const activeSubscription = user.subscriptions[0];
  const plan = SUBSCRIPTION_PLANS[user.subscriptionPlan] || SUBSCRIPTION_PLANS.free;

  return {
    user,
    subscription: activeSubscription,
    plan,
    limits: {
      maxPdfsPerMonth: plan.maxPdfsPerMonth,
      maxFileSize: plan.maxFileSize,
      maxQuestionsPerMonth: plan.maxQuestionsPerMonth,
      maxPagesPerPdf: plan.maxPagesPerPdf
    },
    usage: {
      totalPdfsUploaded: user.totalPdfsUploaded,
      monthlyQuestionsUsed: user.monthlyQuestionsUsed,
      monthlyQuestionsResetDate: user.monthlyQuestionsResetDate
    }
  };
}

export async function updateUserSubscription(
  userId: string,
  subscriptionData: {
    subscriptionId?: string;
    customerId?: string;
    plan: string;
    status: string;
    currentPeriodStart?: Date;
    currentPeriodEnd?: Date;
    productId?: string;
  }
) {
  const { plan, status } = subscriptionData;

  // Update user subscription plan
  await prisma.user.update({
    where: { id: userId },
    data: {
      subscriptionPlan: plan,
      subscriptionStatus: status,
      subscriptionId: subscriptionData.subscriptionId,
      customerId: subscriptionData.customerId,
      subscriptionStartDate: subscriptionData.currentPeriodStart,
      subscriptionEndDate: subscriptionData.currentPeriodEnd,
    }
  });

  // Create or update subscription record
  if (subscriptionData.subscriptionId) {
    await prisma.subscription.upsert({
      where: { subscriptionId: subscriptionData.subscriptionId },
      update: {
        status,
        plan,
        currentPeriodStart: subscriptionData.currentPeriodStart || new Date(),
        currentPeriodEnd: subscriptionData.currentPeriodEnd || new Date(),
        updatedAt: new Date(),
      },
      create: {
        userId,
        subscriptionId: subscriptionData.subscriptionId,
        customerId: subscriptionData.customerId || '',
        productId: subscriptionData.productId || '',
        plan,
        status,
        currentPeriodStart: subscriptionData.currentPeriodStart || new Date(),
        currentPeriodEnd: subscriptionData.currentPeriodEnd || new Date(),
      }
    });
  }
}

export async function incrementQuestionUsage(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { 
      monthlyQuestionsUsed: true, 
      monthlyQuestionsResetDate: true,
      subscriptionPlan: true 
    }
  });

  if (!user) return false;

  const now = new Date();
  const resetDate = new Date(user.monthlyQuestionsResetDate);
  
  // Check if we need to reset monthly usage
  const shouldReset = now > resetDate;
  
  if (shouldReset) {
    // Reset to next month
    const nextResetDate = new Date(now);
    nextResetDate.setMonth(nextResetDate.getMonth() + 1);
    nextResetDate.setDate(1);
    nextResetDate.setHours(0, 0, 0, 0);

    await prisma.user.update({
      where: { id: userId },
      data: {
        monthlyQuestionsUsed: 1,
        monthlyQuestionsResetDate: nextResetDate
      }
    });
  } else {
    await prisma.user.update({
      where: { id: userId },
      data: {
        monthlyQuestionsUsed: { increment: 1 }
      }
    });
  }

  return true;
}

export async function incrementPdfUpload(userId: string, shouldReset?: boolean) {
  if (shouldReset) {
    // Reset monthly counter and set current date
    await prisma.user.update({
      where: { id: userId },
      data: {
        totalPdfsUploaded: { increment: 1 },
        monthlyPdfsUploaded: 1,
        monthlyPdfsResetDate: new Date(),
      }
    });
  } else {
    // Just increment both counters
    await prisma.user.update({
      where: { id: userId },
      data: {
        totalPdfsUploaded: { increment: 1 },
        monthlyPdfsUploaded: { increment: 1 },
      }
    });
  }
}

export async function canUserPerformAction(
  userId: string,
  action: 'upload_pdf' | 'ask_question',
  metadata?: { fileSize?: number; pageCount?: number }
) {
  const userSub = await getUserSubscription(userId);
  if (!userSub) return { allowed: false, reason: 'User not found' };

  const { user, limits } = userSub;

  switch (action) {
    case 'upload_pdf':
      // Use monthly PDF tracking with auto-reset
      const currentMonthlyCount = getCurrentMonthlyPdfCount(user.monthlyPdfsUploaded, user.monthlyPdfsResetDate);
      
      if (limits.maxPdfsPerMonth !== -1 && currentMonthlyCount >= limits.maxPdfsPerMonth) {
        return {
          allowed: false,
          reason: `You have reached your monthly PDF limit of ${limits.maxPdfsPerMonth}. Your limit will reset next month.`,
          requiresUpgrade: true
        };
      }
      
      if (metadata?.fileSize && metadata.fileSize > limits.maxFileSize * 1024 * 1024) {
        return {
          allowed: false,
          reason: `File size exceeds ${limits.maxFileSize}MB limit. Upgrade your plan for larger files.`,
          requiresUpgrade: true
        };
      }
      
      if (metadata?.pageCount && limits.maxPagesPerPdf !== -1 && metadata.pageCount > limits.maxPagesPerPdf) {
        return {
          allowed: false,
          reason: `PDF has ${metadata.pageCount} pages but your plan allows maximum ${limits.maxPagesPerPdf} pages.`,
          requiresUpgrade: true
        };
      }
      break;

    case 'ask_question':
      if (limits.maxQuestionsPerMonth !== -1 && user.monthlyQuestionsUsed >= limits.maxQuestionsPerMonth) {
        return {
          allowed: false,
          reason: `You have used all ${limits.maxQuestionsPerMonth} questions for this month. Upgrade to get more questions.`,
          requiresUpgrade: true
        };
      }
      break;
  }

  return { allowed: true };
}