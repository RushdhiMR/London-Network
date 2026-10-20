import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/rbac';
import { readArticlesStore, upsertArticleStore } from '@/lib/serverArticlesStore';

// GET all articles for admin management (Admin only)
export async function GET() {
  const rbac = await requireRole('admin');
  if (!rbac.authorized) {
    return rbac.response;
  }

  try {
    const articles = await readArticlesStore();
    return NextResponse.json({ success: true, articles });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST create new article (Admin only)
export async function POST(request: Request) {
  const rbac = await requireRole('admin');
  if (!rbac.authorized) {
    return rbac.response;
  }

  try {
    let body: any = {};
    try {
      const text = await request.text();
      body = text && text.trim() ? JSON.parse(text) : {};
    } catch {
      body = {};
    }
    const { title, description, is_featured, is_editors_pick, category_name } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');

    const newArt = {
      id: Date.now(),
      title,
      slug,
      subheading: description,
      summary: description,
      description,
      category_name: category_name || 'Technology',
      category: category_name || 'Technology',
      authorName: rbac.user?.name || 'Admin',
      author_name: rbac.user?.name || 'Admin',
      is_featured: !!is_featured,
      is_editors_pick: !!is_editors_pick,
      status: 'Published',
      published_at: new Date().toISOString()
    };

    const updated = await upsertArticleStore(newArt);

    return NextResponse.json({
      success: true,
      message: 'Article created successfully',
      article: newArt,
      articles: updated
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
