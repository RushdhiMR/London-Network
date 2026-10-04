import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/rbac';
import {
  readArticlesStore,
  upsertArticleStore,
  deleteArticleStore,
  ArticleRecord
} from '@/lib/serverArticlesStore';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function revalidatePublicPages(article?: ArticleRecord) {
  try {
    revalidatePath('/', 'layout');
    revalidatePath('/');
    revalidatePath('/api/articles');
    revalidatePath('/search');
    if (article) {
      const cat = (article.category_slug || article.category || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
      if (cat) {
        revalidatePath(`/${cat}`);
        revalidatePath(`/${cat}/[subcategory]`);
        revalidatePath(`/${cat}/[subcategory]/[article]`);
      }
      if (article.slug) {
        if (cat) {
          revalidatePath(`/${cat}/${article.slug}`);
          revalidatePath(`/${cat}/companies/${article.slug}`);
          revalidatePath(`/${cat}/corporate-news/${article.slug}`);
        }
        revalidatePath(`/news/${article.slug}`);
        revalidatePath(`/news/world/${article.slug}`);
        revalidatePath(`/news/markets/${article.slug}`);
        revalidatePath(`/news/politics/${article.slug}`);
      }
    }
  } catch (err) {
    console.warn('[api/articles] revalidate notice:', err);
  }
}

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
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
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
      revalidatePublicPages();
      return NextResponse.json({
        success: true,
        message: 'Bulk articles updated successfully',
        articles: body.articles
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
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

    const nowIso = new Date().toISOString();
    const articleRecord: ArticleRecord = {
      ...body,
      id: articleId,
      slug,
      status: body.status || 'Pending review',
      seo: body.seo || autoSEO,
      updated_at: nowIso,
      updatedAt: nowIso,
      ...(body.status === 'Published' || !body.status ? {
        published_at: body.published_at || body.publishedAt || nowIso,
        publishedAt: body.published_at || body.publishedAt || nowIso,
        date: body.date || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      } : {})
    };

    const updatedList = await upsertArticleStore(articleRecord);
    revalidatePublicPages(articleRecord);

    return NextResponse.json({
      success: true,
      message: 'Article saved successfully to server store',
      article: articleRecord,
      articles: updatedList
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
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

    const nowIso = new Date().toISOString();
    const targetStatus = status !== undefined ? status : existing?.status || 'Published';
    const updatedRecord: ArticleRecord = {
      ...(existing || {}),
      ...updates,
      id,
      status: targetStatus,
      updated_at: nowIso,
      updatedAt: nowIso,
      ...(targetStatus === 'Published' ? {
        published_at: nowIso,
        publishedAt: nowIso,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      } : {})
    };

    const updatedList = await upsertArticleStore(updatedRecord);
    revalidatePublicPages(updatedRecord);

    return NextResponse.json({
      success: true,
      message: 'Article updated successfully',
      article: updatedRecord,
      articles: updatedList
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
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

    revalidatePublicPages();

    return NextResponse.json({
      success: true,
      message: permanent ? 'Article permanently deleted' : 'Article moved to Trash',
      articles: updatedList
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to delete article' },
      { status: 500 }
    );
  }
}
