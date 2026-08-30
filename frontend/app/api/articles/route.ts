import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/rbac';
import {
  readArticlesStore,
  upsertArticleStore,
  deleteArticleStore,
  ArticleRecord
} from '@/lib/serverArticlesStore';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const status = searchParams.get('status');

    let articles = await readArticlesStore();

    if (category) {
      const normCat = category.toLowerCase().trim();
      articles = articles.filter(
        (a) => (a.category || '').toLowerCase().includes(normCat) || (a.category_slug || '').toLowerCase() === normCat
      );
    }

    if (status) {
      articles = articles.filter((a) => (a.status || '').toLowerCase() === status.toLowerCase());
    } else {
      articles = articles.filter((a) => (a.status || '').toLowerCase() !== 'trash');
    }

    return NextResponse.json({
      success: true,
      count: articles.length,
      articles,
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

    // If body contains full array sync
    if (Array.isArray(body.articles)) {
      const { writeArticlesStore } = await import('@/lib/serverArticlesStore');
      await writeArticlesStore(body.articles);
      return NextResponse.json({
        success: true,
        message: 'Bulk articles updated successfully',
        articles: body.articles
      });
    }

    const { generateAutoSEO } = await import('@/lib/seo');

    const autoSEO = generateAutoSEO({
      title: body.title || '',
      subheading: body.subheading || body.description || body.summary || '',
      content: body.content || '',
      category: body.category || 'news',
      subcategory: body.subcategory || 'world',
      authorName: body.authorName || body.author || 'London BigBen Writer',
      imageUrl: body.imageUrl || body.image,
      metaTitle: body.metaTitle,
      metaDescription: body.metaDescription,
      keywords: body.keywords,
      focusKeyword: body.focusKeyword,
      canonicalUrl: body.canonicalUrl,
      ogImage: body.ogImage
    });

    const slug = body.slug || (body.title ? body.title.toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-') : `article-${Date.now()}`);
    const articleId = body.id || `art_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

    const articleRecord: ArticleRecord = {
      ...body,
      id: articleId,
      slug,
      status: body.status || 'Pending review',
      seo: body.seo || autoSEO
    };

    const updatedList = await upsertArticleStore(articleRecord);

    return NextResponse.json({
      success: true,
      message: 'Article saved successfully to server store',
      article: articleRecord,
      articles: updatedList
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to save article' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, status, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Article ID is required' }, { status: 400 });
    }

    const currentArticles = await readArticlesStore();
    const existing = currentArticles.find((a) => String(a.id) === String(id));

    if (!existing && !updates.title) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    const updatedRecord: ArticleRecord = {
      ...(existing || {}),
      ...updates,
      id,
      status: status !== undefined ? status : existing?.status || 'Published'
    };

    const updatedList = await upsertArticleStore(updatedRecord);

    return NextResponse.json({
      success: true,
      message: 'Article updated successfully',
      article: updatedRecord,
      articles: updatedList
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update article' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const permanent = searchParams.get('permanent') === 'true';

    if (!id) {
      return NextResponse.json({ error: 'Article ID is required' }, { status: 400 });
    }

    let updatedList;
    if (permanent) {
      updatedList = await deleteArticleStore(id);
    } else {
      const { updateArticleStatusStore } = await import('@/lib/serverArticlesStore');
      updatedList = await updateArticleStatusStore(id, 'Trash');
    }

    return NextResponse.json({
      success: true,
      message: permanent ? 'Article permanently deleted' : 'Article moved to Trash',
      articles: updatedList
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to delete article' },
      { status: 500 }
    );
  }
}
