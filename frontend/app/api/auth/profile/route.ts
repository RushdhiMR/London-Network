import { NextResponse } from 'next/server';
import { DB } from '@/lib/db';
import { readArticlesStore, writeArticlesStore } from '@/lib/serverArticlesStore';
import { isB2Configured, uploadToB2 } from '@/lib/backblaze';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const name = searchParams.get('name');

    const allUsers = await DB.getAllUsers();
    
    let matchedUser = null;
    if (email) {
      const cleanEmail = email.toLowerCase().trim();
      matchedUser = allUsers.find((u: any) => (u.email || '').toLowerCase().trim() === cleanEmail);
    } else if (name) {
      const cleanName = name.toLowerCase().trim();
      matchedUser = allUsers.find((u: any) => (u.name || '').toLowerCase().trim() === cleanName || (u.name || '').toLowerCase().includes(cleanName));
    }

    if (matchedUser) {
      const { password_hash, password, ...safeUser } = matchedUser as any;
      return NextResponse.json({
        success: true,
        user: safeUser
      });
    }

    return NextResponse.json({
      success: false,
      message: 'User not found'
    }, { status: 404 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, name, avatar, bio, role, linkedin } = body;

    if (!email) {
      return NextResponse.json({ success: false, error: 'Email is required' }, { status: 400 });
    }

    let finalAvatar = avatar;

    // If avatar is base64 data URL, upload directly to Backblaze B2 in "avatars" folder
    if (avatar && typeof avatar === 'string' && (avatar.startsWith('data:image/') || (!avatar.startsWith('http') && avatar.length > 100))) {
      if (isB2Configured()) {
        try {
          const matches = avatar.match(/^data:([^;]+);base64,(.+)$/);
          let mimeType = 'image/webp';
          let buffer: Buffer | null = null;
          if (matches) {
            mimeType = matches[1] || 'image/webp';
            buffer = Buffer.from(matches[2], 'base64');
          } else {
            buffer = Buffer.from(avatar, 'base64');
          }

          if (buffer) {
            const ext = mimeType.includes('png') ? '.png' : mimeType.includes('jpeg') || mimeType.includes('jpg') ? '.jpg' : '.webp';
            const cleanUser = (name || email.split('@')[0] || 'user')
              .toLowerCase()
              .replace(/[^a-z0-9]/g, '-')
              .substring(0, 30);
            const fileName = `avatar-${cleanUser}-${Date.now()}${ext}`;
            const b2Res = await uploadToB2(buffer, fileName, mimeType, 'avatars');
            if (b2Res.success && b2Res.url) {
              finalAvatar = b2Res.url;
              console.log('[Backblaze] Successfully uploaded profile avatar to B2:', b2Res.url);
            }
          }
        } catch (uploadErr) {
          console.warn('[Backblaze] Avatar upload to B2 warning:', uploadErr);
        }
      }
    }

    const updated = await DB.updateUserProfile({
      email,
      name,
      avatar: finalAvatar,
      bio,
      role,
      linkedin
    });

    // Also update server articles store so all published articles by this writer reflect the new name & avatar in real-time
    try {
      const articles = await readArticlesStore();
      let updatedArticles = false;
      const cleanEmail = email.toLowerCase().trim();
      const cleanName = (name || '').toLowerCase().trim();

      const newArticles = articles.map(art => {
        const artEmail = (art.authorEmail || '').toLowerCase().trim();
        const artName = (art.authorName || art.author || '').toLowerCase().trim();

        const matches = (artEmail && artEmail === cleanEmail) ||
          (cleanName && (artName === cleanName || (cleanName.includes('rushdhi') && artName.includes('rushdhi'))));

        if (matches) {
          updatedArticles = true;
          return {
            ...art,
            ...(name ? { authorName: name, author: name } : {}),
            ...(finalAvatar ? { authorAvatar: finalAvatar } : {}),
            ...(bio ? { authorBio: bio } : {})
          };
        }
        return art;
      });

      if (updatedArticles) {
        await writeArticlesStore(newArticles);
      }
    } catch (e) {
      console.warn('Failed to sync articles with updated profile:', e);
    }

    const { password_hash, password: _p, ...safeUpdated } = (updated || {}) as any;
    return NextResponse.json({
      success: true,
      user: safeUpdated,
      message: 'Profile updated in database successfully'
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
