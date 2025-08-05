/* eslint-disable @typescript-eslint/no-explicit-any */
import { Webhook } from "standardwebhooks";
import { headers } from "next/headers";
import { dodopayments } from "@/lib/dodopayments";
import { updateUserSubscription } from "@/lib/subscription-utils";
import { NextResponse } from "next/server";

const webhook = new Webhook(process.env.DODO_PAYMENTS_WEBHOOK_KEY || 'dGVzdC1rZXktZm9yLWJ1aWxk'); // base64 encoded 'test-key-for-build'

export async function POST(request: Request) {
  const headersList = await headers();

  try {
    const rawBody = await request.text();
    const webhookHeaders = {
      "webhook-id": headersList.get("webhook-id") || "",
      "webhook-signature": headersList.get("webhook-signature") || "",
      "webhook-timestamp": headersList.get("webhook-timestamp") || "",
    };
    
    await webhook.verify(rawBody, webhookHeaders);
    const payload = JSON.parse(rawBody);

    console.log("Webhook received:", payload.type);

    if (payload.data.payload_type === "Subscription") {
      const subscriptionId = payload.data.subscription_id;
      
      switch (payload.type) {
        case "subscription.active":
          await handleSubscriptionActive(subscriptionId);
          break;
        case "subscription.failed":
          await handleSubscriptionFailed(subscriptionId);
          break;
        case "subscription.cancelled":
          await handleSubscriptionCancelled(subscriptionId);
          break;
        case "subscription.renewed":
          await handleSubscriptionRenewed(subscriptionId);
          break;
        case "subscription.on_hold":
          await handleSubscriptionOnHold(subscriptionId);
          break;
        default:
          console.log("Unhandled subscription event:", payload.type);
          break;
      }
    } else if (payload.data.payload_type === "Payment") {
      switch (payload.type) {
        case "payment.succeeded":
          await handlePaymentSucceeded(payload.data.payment_id);
          break;
        default:
          console.log("Unhandled payment event:", payload.type);
          break;
      }
    }

    return NextResponse.json(
      { message: "Webhook processed successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Webhook verification failed:", error);
    return NextResponse.json(
      { message: "Webhook verification failed" },
      { status: 400 }
    );
  }
}

async function handleSubscriptionActive(subscriptionId: string) {
  try {
    const subscription = await dodopayments.subscriptions.retrieve(subscriptionId);
    console.log("Subscription activated:", subscription);

    const userId = subscription.metadata?.userId;
    const planName = subscription.metadata?.planName || 'pro';

    if (userId) {
      await updateUserSubscription(userId, {
        subscriptionId: subscriptionId,
        customerId: (subscription as any).customer || (subscription as any).customer_id || '',
        plan: planName,
        status: 'active',
        currentPeriodStart: (subscription as any).current_period_start ? new Date((subscription as any).current_period_start * 1000) : new Date(),
        currentPeriodEnd: (subscription as any).current_period_end ? new Date((subscription as any).current_period_end * 1000) : new Date(),
        productId: (subscription as any).product_id || '',
      });
    }
  } catch (error) {
    console.error("Error handling subscription active:", error);
  }
}

async function handleSubscriptionFailed(subscriptionId: string) {
  try {
    const subscription = await dodopayments.subscriptions.retrieve(subscriptionId);
    const userId = subscription.metadata?.userId;

    if (userId) {
      await updateUserSubscription(userId, {
        subscriptionId: subscriptionId,
        plan: 'free', // Downgrade to free
        status: 'failed',
      });
    }
  } catch (error) {
    console.error("Error handling subscription failed:", error);
  }
}

async function handleSubscriptionCancelled(subscriptionId: string) {
  try {
    const subscription = await dodopayments.subscriptions.retrieve(subscriptionId);
    const userId = subscription.metadata?.userId;

    if (userId) {
      await updateUserSubscription(userId, {
        subscriptionId: subscriptionId,
        plan: 'free', // Downgrade to free
        status: 'cancelled',
      });
    }
  } catch (error) {
    console.error("Error handling subscription cancelled:", error);
  }
}

async function handleSubscriptionRenewed(subscriptionId: string) {
  try {
    const subscription = await dodopayments.subscriptions.retrieve(subscriptionId);
    const userId = subscription.metadata?.userId;
    const planName = subscription.metadata?.planName || 'pro';

    if (userId) {
      await updateUserSubscription(userId, {
        subscriptionId: subscriptionId,
        plan: planName,
        status: 'active',
        currentPeriodStart: (subscription as any).current_period_start ? new Date((subscription as any).current_period_start * 1000) : new Date(),
        currentPeriodEnd: (subscription as any).current_period_end ? new Date((subscription as any).current_period_end * 1000) : new Date(),
      });
    }
  } catch (error) {
    console.error("Error handling subscription renewed:", error);
  }
}

async function handleSubscriptionOnHold(subscriptionId: string) {
  try {
    const subscription = await dodopayments.subscriptions.retrieve(subscriptionId);
    const userId = subscription.metadata?.userId;

    if (userId) {
      await updateUserSubscription(userId, {
        subscriptionId: subscriptionId,
        plan: 'free', // Downgrade to free temporarily
        status: 'on_hold',
      });
    }
  } catch (error) {
    console.error("Error handling subscription on hold:", error);
  }
}

async function handlePaymentSucceeded(paymentId: string) {
  try {
    const payment = await dodopayments.payments.retrieve(paymentId);
    console.log("Payment succeeded:", payment);
    // Additional payment processing logic if needed
  } catch (error) {
    console.error("Error handling payment succeeded:", error);
  }
}