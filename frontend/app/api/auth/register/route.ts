import { NextResponse } from 'next/server';
import { normalizeEmail, hashPassword, setAuthCookie } from '@/lib/auth';
import { DB } from '@/lib/db';
import { sendWelcomeEmail } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password } = body;

    // 1. Validation
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Full name is required' },
        { status: 400 }
      );
    }

    if (!email || !email.trim()) {
      return NextResponse.json(
        { error: 'Email address is required' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const normalized = normalizeEmail(email);

    if (!emailRegex.test(normalized)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    const userName = name.trim();
    // Public registration MUST default to 'reader' role strictly.
    const userRole: 'reader' = 'reader';

    // Hash password with bcrypt
    const passwordHash = await hashPassword(password);

    try {
      const newUser = await DB.createUser({
        name: userName,
        email: normalized,
        password_hash: passwordHash,
        role: userRole,
        provider: 'local',
        email_verified: false,
      });

      const userPayload = {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        provider: newUser.provider,
      };

      // Set HTTP-Only session cookie
      await setAuthCookie(userPayload);

      // Send welcome email if configured
      try {
        await sendWelcomeEmail(normalized, userName);
      } catch (e) {
        console.warn('Welcome email notification skipped:', e);
      }

      return NextResponse.json({
        success: true,
        message: 'Account created successfully',
        user: userPayload,
      });
    } catch (dbError: any) {
      if (dbError.code === 'ER_DUP_ENTRY' || dbError.message?.includes('already exists')) {
        return NextResponse.json(
          { error: 'An account with this email address already exists. Please log in instead.' },
          { status: 409 }
        );
      }
      throw dbError;
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
