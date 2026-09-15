import { NextResponse } from 'next/server';
import { sendSignInNotificationEmail } from '@/lib/email';
import { setAuthCookie } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Admin email and passcode are required' },
        { status: 400 }
      );
    }

    const normalized = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    // Query user directly from DB
    const { DB } = await import('@/lib/db');
    const { comparePassword } = await import('@/lib/auth');
    let user = await DB.getUserByEmail(normalized);

    if (user && user.role === 'admin' && user.password_hash) {
      const isValid = await comparePassword(cleanPassword, user.password_hash);
      if (isValid) {
        const adminName = user.name || 'Administrator';
        
        try {
          await sendSignInNotificationEmail(user.email, adminName);
        } catch (e) {
          console.warn('Admin notification email skipped:', e);
        }

        const userPayload = {
          id: user.id,
          name: adminName,
          email: user.email,
          role: 'admin' as const,
          provider: user.provider || 'local',
        };

        await setAuthCookie(userPayload);

        return NextResponse.json({
          success: true,
          message: 'Admin authentication successful',
          user: userPayload,
        });
      }
    }

    return NextResponse.json(
      { error: 'Invalid admin credentials' },
      { status: 401 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

