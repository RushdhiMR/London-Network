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
    const includeTrash = searchParams.get('includeTrash') === 'true' || searchParams.get('include_trash') === 'true';

    let articles = await readArticlesStore();

    if (category) {
      const normCat = category.toLowerCase().trim();
      articles = articles.filter(
        (a) => (a.category || '').toLowerCase().includes(normCat) || (a.category_slug || '').toLowerCase() === normCat
      );
    }

    if (status) {
      articles = articles.filter((a) => (a.status || '').toLowerCase() === status.toLowerCase());
    } else if (!includeTrash) {
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
    let body: any = {};
    try {
      const text = await request.text();
      body = text && text.trim() ? JSON.parse(text) : {};
    } catch {
      body = {};
    }

    // If body contains full array sync
    if (Array.isArray(body.articles)) {
      const rbac = await requireRole(request, 'admin');
      if (!rbac.authorized) return rbac.response;
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

    const rbac = await requireRole(request, 'writer', 'admin');
    if (!rbac.authorized) return rbac.response;

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

    const isAdmin = (rbac.user?.role || '').toLowerCase() === 'admin';
    let targetStatus = body.status || 'Pending review';
    // Security: Non-admin writers can only submit for review or save drafts; only admins can publish live
    if (!isAdmin && targetStatus === 'Published') {
      targetStatus = 'Pending review';
    }

    const nowIso = new Date().toISOString();
    const articleRecord: ArticleRecord = {
      ...body,
      id: articleId,
      slug,
      status: targetStatus,
      seo: body.seo || autoSEO,
      updated_at: nowIso,
      updatedAt: nowIso,
      ...(targetStatus === 'Published' ? {
        published_at: body.published_at || body.publishedAt || nowIso,
        publishedAt: body.published_at || body.publishedAt || nowIso,
        approved_at: body.approved_at || body.approvedAt || body.published_at || nowIso,
        approvedAt: body.approvedAt || body.approved_at || body.publishedAt || nowIso,
        admin_published_at: body.admin_published_at || body.adminPublishedAt || body.published_at || nowIso,
        adminPublishedAt: body.adminPublishedAt || body.admin_published_at || body.publishedAt || nowIso,
        date: body.date || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      } : {})
    };

    const updatedList = await upsertArticleStore(articleRecord);
    revalidatePublicPages(articleRecord);

    // Notify author followers automatically whenever an article is published live
    if (articleRecord.status === 'Published') {
      (async () => {
        try {
          const authorName = (articleRecord.authorName || (articleRecord as any).author || '').trim();
          const authorSlug = (articleRecord as any).authorSlug || (articleRecord as any).author_slug || (authorName ? authorName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') : '');
          const { DB } = await import('@/lib/db');
          const followersByName = authorName ? await DB.getAuthorFollowers(authorName) : [];
          const followersBySlug = authorSlug ? await DB.getAuthorFollowers(authorSlug) : [];
          const allFollowers = Array.from(new Set([...followersByName, ...followersBySlug]));

          if (allFollowers.length > 0) {
            const { sendArticleDistributionEmail } = await import('@/lib/email');
            await Promise.allSettled(
              allFollowers.map((recipient) =>
                sendArticleDistributionEmail(recipient, {
                  title: articleRecord.title,
                  summary: articleRecord.summary || articleRecord.description || '',
                  category: articleRecord.category || 'News',
                  authorName: authorName || 'London BigBen Journalist',
                  slug: articleRecord.slug || '',
                  imageUrl: articleRecord.imageUrl || (articleRecord as any).image,
                  readTime: articleRecord.readTime || (articleRecord as any).readDuration
                })
              )
            );
            console.log(`[Follower Notification] Sent article notification to ${allFollowers.length} follower(s) of ${authorName}.`);
          }
        } catch (notifyErr) {
          console.warn('[api/articles] Follower notification notice:', notifyErr);
        }
      })();
    }

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
    const rbac = await requireRole(request, 'writer', 'admin');
    if (!rbac.authorized) return rbac.response;
    let body: any = {};
    try {
      const text = await request.text();
      body = text && text.trim() ? JSON.parse(text) : {};
    } catch {
      body = {};
    }
    const { id, status, ...updates } = body;

    if (!id && !updates.title && !updates.slug) {
      return NextResponse.json({ error: 'Article ID or Title is required' }, { status: 400 });
    }

    const currentArticles = await readArticlesStore();
    const cleanT = (t: any) => String(t || '').trim().toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
    const targetTitle = updates.title ? cleanT(updates.title) : '';
    const existing = currentArticles.find((a) =>
      (id && String(a.id) === String(id)) ||
      (id && a.slug === id) ||
      (updates.slug && a.slug === updates.slug) ||
      (targetTitle && cleanT(a.title) === targetTitle)
    );

    if (!existing && !updates.title) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    const nowIso = new Date().toISOString();
    const targetStatus = status !== undefined ? status : existing?.status || 'Published';
    const targetApprovedAt = updates.approved_at || updates.approvedAt || (targetStatus === 'Published' ? (existing?.status !== 'Published' ? nowIso : existing?.approved_at || existing?.approvedAt || nowIso) : existing?.approved_at || existing?.approvedAt);
    const targetAdminPublishedAt = updates.admin_published_at || updates.adminPublishedAt || (targetStatus === 'Published' ? (existing?.status !== 'Published' ? nowIso : existing?.admin_published_at || existing?.adminPublishedAt || nowIso) : existing?.admin_published_at || existing?.adminPublishedAt);
    const targetPublishedAt = updates.published_at || updates.publishedAt || (targetStatus === 'Published' ? (existing?.status !== 'Published' ? nowIso : existing?.published_at || existing?.publishedAt || nowIso) : existing?.published_at || existing?.publishedAt);
    const targetDate = updates.date || (targetStatus === 'Published' && existing?.status !== 'Published' ? new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : existing?.date || (targetStatus === 'Published' ? new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : undefined));
    const updatedRecord: ArticleRecord = {
      ...(existing || {}),
      ...updates,
      id: existing?.id || id || `art_${Date.now()}`,
      status: targetStatus,
      updated_at: nowIso,
      updatedAt: nowIso,
      ...(targetStatus === 'Rejected' ? {
        rejectionReason: updates.rejectionReason || updates.rejection_reason || existing?.rejectionReason,
        rejection_reason: updates.rejectionReason || updates.rejection_reason || existing?.rejectionReason,
        rejectedAt: updates.rejectedAt || updates.rejected_at || existing?.rejectedAt || nowIso,
        rejected_at: updates.rejectedAt || updates.rejected_at || existing?.rejectedAt || nowIso,
      } : {}),
      ...(targetPublishedAt ? {
        published_at: targetPublishedAt,
        publishedAt: targetPublishedAt,
        approved_at: targetApprovedAt || targetPublishedAt,
        approvedAt: targetApprovedAt || targetPublishedAt,
        admin_published_at: targetAdminPublishedAt || targetPublishedAt,
        adminPublishedAt: targetAdminPublishedAt || targetPublishedAt,
        date: targetDate
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
    const rbac = await requireRole(request, 'writer', 'admin');
    if (!rbac.authorized) return rbac.response;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const title = searchParams.get('title');
    const slug = searchParams.get('slug');
    const permanent = searchParams.get('permanent') === 'true';

    if (!id && !title && !slug) {
      return NextResponse.json({ error: 'Article ID or Title is required' }, { status: 400 });
    }

    const targetId = id || slug || title || '';
    const isAdmin = (rbac.user?.role || '').toLowerCase() === 'admin';

    // Security: Writers can only delete their own articles; admins can manage any article
    if (!isAdmin) {
      const allArticles = await readArticlesStore();
      const existing = allArticles.find(
        (a) =>
          String(a.id) === String(targetId) ||
          (slug && a.slug === slug) ||
          (title && a.title === title)
      );
      if (existing) {
        const writerEmail = (rbac.user?.email || '').toLowerCase().trim();
        const writerName = (rbac.user?.name || '').toLowerCase().trim();
        const authorEmail = ((existing as any).author_email || (existing as any).authorEmail || '').toLowerCase().trim();
        const authorName = (existing.authorName || (existing as any).author || '').toLowerCase().trim();

        const isOwner =
          (authorEmail && authorEmail === writerEmail) ||
          (authorName && authorName === writerName);

        if (!isOwner) {
          return NextResponse.json(
            { error: 'Forbidden: You do not have permission to delete articles authored by other writers.' },
            { status: 403 }
          );
        }
      }
    }

    let updatedList;
    if (permanent) {
      updatedList = await deleteArticleStore(targetId, title || undefined, slug || undefined);
    } else {
      const { updateArticleStatusStore } = await import('@/lib/serverArticlesStore');
      updatedList = await updateArticleStatusStore(targetId, 'Trash', title || undefined);
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
