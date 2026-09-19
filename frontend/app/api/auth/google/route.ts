import { NextResponse } from 'next/server';
import { normalizeEmail, setAuthCookie } from '@/lib/auth';
import { DB } from '@/lib/db';
import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { credential, accessToken } = body;

    if (!credential && !accessToken) {
      return NextResponse.json(
        { error: 'Google credential ID token or access token is required' },
        { status: 400 }
      );
    }

    const clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

    let payload: any = null;

    // 1. Verify Google ID Token if present
    if (credential) {
      try {
        const ticket = await client.verifyIdToken({
          idToken: credential,
          audience: clientId || undefined,
        });
        payload = ticket.getPayload();
      } catch (verifyError: any) {
        console.warn('Google client verifyIdToken notice:', verifyError?.message);
        try {
          const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
          if (res.ok) {
            payload = await res.json();
          }
        } catch (tokenInfoErr) {
          console.warn('Tokeninfo fallback failed:', tokenInfoErr);
        }
      }
    }

    // 2. Verify Google Access Token via Google userinfo API endpoint if ID token verification didn't produce payload
    if ((!payload || !payload.email) && accessToken) {
      try {
        const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (res.ok) {
          payload = await res.json();
        }
      } catch (userinfoErr) {
        console.warn('Google userinfo verification failed:', userinfoErr);
      }
    }

    if (!payload || !payload.email) {
      return NextResponse.json(
        { error: 'Invalid or unverified Google account token.' },
        { status: 401 }
      );
    }

    const verifiedEmail = payload.email;
    const verifiedName = payload.name || payload.given_name || verifiedEmail.split('@')[0];
    const googleId = payload.sub || payload.id;
    const avatar = payload.picture || null;

    const normalized = normalizeEmail(verifiedEmail);
    const userName = (verifiedName || normalized.split('@')[0]).trim();

    // Query existing user in DB
    const existingUser = await DB.getUserByEmail(normalized);
    let userPayload;

    if (existingUser) {
      // Preserve existing DB role strictly!
      const updatedProvider = existingUser.provider === 'local' ? 'google+local' : (existingUser.provider || 'google');
      await DB.updateUser(existingUser.id, {
        google_id: googleId || existingUser.google_id,
        provider: updatedProvider,
        avatar: existingUser.avatar || avatar,
        email_verified: 1,
      });

      userPayload = {
        id: existingUser.id,
        name: existingUser.name,
        email: existingUser.email,
        role: existingUser.role, // Kept from DB
        provider: updatedProvider,
        avatar: existingUser.avatar || avatar,
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
        avatar: avatar,
      });

      userPayload = {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        provider: newUser.provider,
        avatar: newUser.avatar,
      };
    }

    await setAuthCookie(userPayload);

    return NextResponse.json({
      success: true,
      message: 'Google authentication successful',
      user: userPayload,
    });
  } catch (error: any) {
    console.error('[Google Auth] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
