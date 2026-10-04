import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/rbac';
import { sendArticleDistributionEmail } from '@/lib/email';
import { DB } from '@/lib/db';

// POST /api/admin/articles/send-distribution
// Sends the published article email to each targeted recipient individually.
export async function POST(request: Request) {
  // Allow if admin portal key header is present OR user has verified admin session
  const adminKey = request.headers.get('x-admin-key') || request.headers.get('x-admin-portal');
  const hasAdminPortalKey = adminKey === 'dj_admin_portal_authenticated_2026';

  if (!hasAdminPortalKey) {
    const rbac = await requireRole(request, 'admin');
    if (!rbac.authorized) {
      return rbac.response;
    }
  }

  try {
    const body = await request.json();
    const { recipients, article, broadcastToSubscribers, baseUrl: bodyBaseUrl } = body as {
      recipients: string[];
      article: {
        title: string;
        summary: string;
        category: string;
        authorName: string;
        slug: string;
        imageUrl?: string;
        readTime?: string;
      };
      broadcastToSubscribers?: boolean;
      baseUrl?: string;
    };

    if (!article?.title || !article?.slug) {
      return NextResponse.json({ error: 'Article title and slug are required' }, { status: 400 });
    }

    // Determine public base URL: prefer body (window.location.origin), then origin header, then env
    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const reqOrigin = request.headers.get('origin') || `${protocol}://${host}`;
    const baseUrl = (bodyBaseUrl && bodyBaseUrl.startsWith('http')) ? bodyBaseUrl
      : (reqOrigin && !reqOrigin.includes('localhost') ? reqOrigin : null)
      || process.env.NEXT_PUBLIC_APP_URL
      || process.env.FRONTEND_URL
      || reqOrigin;

    // Collect unique, valid emails
    const targetSet = new Set<string>();
    if (Array.isArray(recipients)) {
      recipients.forEach((em) => {
        if (typeof em === 'string') {
          const clean = em.trim().toLowerCase();
          if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
            targetSet.add(clean);
          }
        }
      });
    }

    // If broadcast requested, append newsletter subscribers
    if (broadcastToSubscribers) {
      try {
        const subs = await DB.getAllSubscribers();
        const catNorm = (article.category || '').toUpperCase();
        subs.forEach((s: any) => {
          if (!s?.email) return;
          const clean = s.email.trim().toLowerCase();
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) return;

          const topics = Array.isArray(s.topics) ? s.topics.map((t: string) => t.toUpperCase()) : [];
          if (topics.length === 0 || topics.includes('ALL NEWS') || topics.includes(catNorm)) {
            targetSet.add(clean);
          }
        });
      } catch (subErr) {
        console.warn('[Distribution] Newsletter subscribers fetch notice:', subErr);
      }
    }

    const targetList = Array.from(targetSet);
    if (targetList.length === 0) {
      return NextResponse.json({
        success: true,
        sent: 0,
        total: 0,
        message: 'No recipient email addresses configured.',
      });
    }

    // Send to each recipient individually to protect recipient privacy (no shared recipients list)
    const results: { email: string; success: boolean; error?: string }[] = [];
    for (const email of targetList) {
      const res = await sendArticleDistributionEmail(email, article, baseUrl);
      results.push({ email, success: res.success, error: res.error });
    }

    const successCount = results.filter((r) => r.success).length;
    const failedResults = results.filter((r) => !r.success);

    console.log(
      `[Distribution] Article "${article.title}" — delivered to ${successCount}/${targetList.length} recipients.`
    );
    if (failedResults.length > 0) {
      failedResults.forEach(f => console.error(`[Distribution] FAILED for ${f.email}: ${f.error}`));
    }

    return NextResponse.json({
      success: successCount > 0,
      sent: successCount,
      total: targetList.length,
      failed: failedResults.length,
      results,
      error: failedResults.length > 0 ? failedResults[0].error : undefined,
    });
  } catch (err: any) {
    console.error('[Distribution API] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
