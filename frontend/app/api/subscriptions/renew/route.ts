import { NextResponse } from 'next/server';
import { DB, SubscriptionPlanId } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, plan = 'digital' } = body;

    const session = await getAuthSession();
    const activeEmail = (email || session?.email || '').trim().toLowerCase();

    if (!activeEmail || !activeEmail.includes('@')) {
      return NextResponse.json(
        { error: 'A valid email address is required for renewal.' },
        { status: 400 }
      );
    }

    const validPlans: SubscriptionPlanId[] = ['digital', 'bundle'];
    const selectedPlan: SubscriptionPlanId = validPlans.includes(plan) ? plan : 'digital';

    const renewalResult = await DB.renewSiteSubscription(activeEmail, selectedPlan);

    return NextResponse.json({
      success: true,
      subscription: renewalResult.subscription,
      message: renewalResult.message
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to process renewal request.' },
      { status: 500 }
    );
  }
}
