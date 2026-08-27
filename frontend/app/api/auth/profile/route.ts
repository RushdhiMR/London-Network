import { NextResponse } from 'next/server';
import { DB } from '@/lib/db';
import { readArticlesStore, writeArticlesStore } from '@/lib/serverArticlesStore';

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
      return NextResponse.json({
        success: true,
        user: matchedUser
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

    const updated = await DB.updateUserProfile({
      email,
      name,
      avatar,
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
            ...(avatar ? { authorAvatar: avatar } : {}),
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

    return NextResponse.json({
      success: true,
      user: updated,
      message: 'Profile updated in database successfully'
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
