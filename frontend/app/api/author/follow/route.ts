import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/rbac';
import { DB } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const authorSlug = searchParams.get('authorSlug') || searchParams.get('slug') || '';
    const email = searchParams.get('email') || '';

    if (!authorSlug) {
      return NextResponse.json({ success: false, error: 'authorSlug is required' }, { status: 400 });
    }

    const followers = await DB.getAuthorFollowers(authorSlug);
    const isFollowing = email ? followers.some(e => e.toLowerCase() === email.toLowerCase().trim()) : false;

    return NextResponse.json({
      success: true,
      authorSlug,
      isFollowing,
      followerCount: followers.length
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { authorSlug, authorName, action } = body;

    if (!authorSlug && !authorName) {
      return NextResponse.json({ success: false, error: 'Author identifier is required' }, { status: 400 });
    }

    // Require user authentication
    const authRes = await requireAuth(request);
    let followerEmail = authRes.authorized && authRes.user?.email ? authRes.user.email : body.followerEmail;

    if (!followerEmail) {
      return NextResponse.json({
        success: false,
        error: 'Please sign in to follow this author.',
        requiresLogin: true
      }, { status: 401 });
    }

    const targetKey = authorSlug || authorName;
    const result = await DB.followAuthor(followerEmail, targetKey);

    return NextResponse.json({
      success: true,
      isFollowing: result.isFollowing,
      followerCount: result.count,
      message: result.isFollowing
        ? `You are now following ${authorName || authorSlug}! You will be notified whenever they publish a new article.`
        : `Unfollowed ${authorName || authorSlug}.`
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

