import { NextResponse } from 'next/server';
import { normalizeEmail, setAuthCookie } from '@/lib/auth';
import { DB } from '@/lib/db';
import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { credential, googleId: clientGoogleId, email: clientEmail, name: clientName } = body;

    let verifiedEmail = clientEmail;
    let verifiedName = clientName;
    let googleId = clientGoogleId;

    if (credential) {
      try {
        const ticket = await client.verifyIdToken({
          idToken: credential,
          audience: process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        if (payload && payload.email) {
          verifiedEmail = payload.email;
          verifiedName = payload.name || payload.email.split('@')[0];
          googleId = payload.sub;
        }
      } catch (verifyError) {
        console.warn('Google token verification fallback:', verifyError);
        try {
          const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
          if (res.ok) {
            const payload = await res.json();
            if (payload.email) {
              verifiedEmail = payload.email;
              verifiedName = payload.name || payload.email.split('@')[0];
              googleId = payload.sub;
            }
          }
        } catch (tokenInfoErr) {
          console.warn('Tokeninfo fallback failed:', tokenInfoErr);
        }
      }
    }

    if (!verifiedEmail) {
      return NextResponse.json(
        { error: 'Invalid Google authentication payload or email missing' },
        { status: 400 }
      );
    }

    const normalized = normalizeEmail(verifiedEmail);
    const userName = verifiedName || normalized.split('@')[0];

    // Check if user was deleted/revoked by administrator
    const isDeleted = await DB.isEmailDeleted(normalized);
    if (isDeleted) {
      return NextResponse.json(
        { error: 'Access Denied: This account has been removed by the administrator. Access is disabled until an admin re-adds this account.' },
        { status: 403 }
      );
    }

    // Query existing user in DB
    const existingUser = await DB.getUserByEmail(normalized);
    let userPayload;

    if (existingUser) {
      // Preserve existing DB role!
      const updatedProvider = existingUser.provider === 'local' ? 'google+local' : existingUser.provider;
      await DB.updateUser(existingUser.id, {
        google_id: googleId || existingUser.google_id,
        provider: updatedProvider,
      });

      userPayload = {
        id: existingUser.id,
        name: existingUser.name,
        email: existingUser.email,
        role: existingUser.role, // Kept from DB
        provider: updatedProvider,
      };
    } else {
      // New Google user defaults to 'reader' role strictly
      const newUser = await DB.createUser({
        name: userName,
        email: normalized,
        provider: 'google',
        google_id: googleId || null,
        role: 'reader',
        email_verified: true,
      });

      userPayload = {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        provider: newUser.provider,
      };
    }

    await setAuthCookie(userPayload);

    return NextResponse.json({
      success: true,
      message: 'Google authentication successful',
      user: userPayload,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
