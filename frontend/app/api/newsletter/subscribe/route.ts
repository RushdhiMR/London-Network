import { NextResponse } from 'next/server';
import { DB } from '@/lib/db';

export async function GET() {
  try {
    const subscribers = await DB.getAllSubscribers();
    return NextResponse.json({
      success: true,
      subscribers
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, topics } = body;

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email address is required' },
        { status: 400 }
      );
    }

    const newSub = await DB.addSubscriber(email, Array.isArray(topics) ? topics : ["ALL NEWS"]);

    return NextResponse.json({
      success: true,
      message: 'Subscribed to London BigBen newsletters successfully!',
      subscriber: newSub
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const email = searchParams.get('email');

    const target = id || email;
    if (!target) {
      return NextResponse.json(
        { error: 'Subscriber ID or email is required' },
        { status: 400 }
      );
    }

    const removed = await DB.removeSubscriber(target);
    return NextResponse.json({
      success: true,
      removed
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

