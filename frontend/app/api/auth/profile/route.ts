import { requireAuth } from "@/lib/rbac";
import { NextResponse } from 'next/server';
import { DB } from '@/lib/db';
import { readArticlesStore, writeArticlesStore } from '@/lib/serverArticlesStore';
import { isB2Configured, uploadToB2 } from '@/lib/backblaze';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const name = searchParams.get('name');
    const list = searchParams.get('list');

    const allUsers = await DB.getAllUsers();

    if (list === 'writers') {
      const articles = await readArticlesStore().catch(() => []);
      const publishedArticles = Array.isArray(articles)
        ? articles.filter((a: any) => !a.status || a.status.toLowerCase() === 'published' || a.status.toLowerCase() === 'approved')
        : [];

      const registeredWriters = allUsers.filter((u: any) => {
        const r = (u.role || '').toLowerCase();
        return r === 'writer';
      });

      const writers = registeredWriters.map((u: any) => {
        const uName = (u.name || '').trim();
        const uEmail = (u.email || '').toLowerCase().trim();
        const uSlug = uName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || `writer-${u.id}`;

        const matchedArts = publishedArticles.filter((a: any) => {
          const aEmail = (a.authorEmail || a.author_email || '').toLowerCase().trim();
          const aName = (a.authorName || a.author_name || a.author || '').toLowerCase().trim();
          return (uEmail && aEmail === uEmail) || (uName && aName === uName.toLowerCase());
        });

        const articleAvatar = matchedArts.find(
          (a: any) => (a.authorAvatar || a.author_avatar) && String(a.authorAvatar || a.author_avatar).length > 5
        );
        const resolvedAvatar =
          (u.avatar && String(u.avatar).length > 5 && !String(u.avatar).includes('cart') ? u.avatar : null) ||
          articleAvatar?.authorAvatar ||
          articleAvatar?.author_avatar ||
          '/author_bluesuit.jpg';

        return {
          name: uName || 'Journalist',
          slug: uSlug,
          email: u.email,
          role: 'Staff Journalist',
          avatar: resolvedAvatar,
          bio: u.bio || '',
          articlesCount: matchedArts.length,
        };
      });

      return NextResponse.json({
        success: true,
        writers,
      });
    }
    
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
    const authRes = await requireAuth(request);
    if (!authRes.authorized || !authRes.user) {
      return authRes.response || NextResponse.json({ error: 'Unauthorized. Please sign in to update your profile.' }, { status: 401 });
    }

    const body = await request.json();
    const {
      email,
      name,
      avatar,
      bio,
      role: requestedRole,
      linkedin,
      yearsOfExperience,
      years_of_experience,
      coverageAreas,
      coverage_areas,
      aboutTheJournalist,
      about_the_journalist,
      journalisticApproach,
      journalistic_approach,
      city,
      country,
      location,
      expertise,
      expertiseSlots,
      expertiseRatings,
      expertise_ratings,
    } = body;

    if (!email) {
      return NextResponse.json({ success: false, error: 'Email is required' }, { status: 400 });
    }

    const currentUser = authRes.user;
    const targetEmail = email.toLowerCase().trim();
    const isSelf = currentUser.email.toLowerCase().trim() === targetEmail;
    const isAdmin = (currentUser.role || '').toLowerCase() === 'admin';

    if (!isSelf && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden: You can only update your own profile.' }, { status: 403 });
    }

    const targetRole = isAdmin && requestedRole ? requestedRole : currentUser.role;

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

    const rawAreas = coverageAreas ?? coverage_areas;
    const parsedAreas: string[] | undefined = Array.isArray(rawAreas)
      ? rawAreas.map((s: any) => String(s || '').trim()).filter(Boolean)
      : typeof rawAreas === 'string'
        ? rawAreas.split(',').map((s: string) => s.trim()).filter(Boolean)
        : undefined;

    const clampWords = (str: any, maxWords: number): string | undefined => {
      if (typeof str !== 'string') return undefined;
      const trimmed = str.trim();
      if (!trimmed) return '';
      const words = trimmed.split(/\s+/);
      return words.length > maxWords ? words.slice(0, maxWords).join(' ') : trimmed;
    };

    const rawAboutJ = aboutTheJournalist !== undefined ? aboutTheJournalist : about_the_journalist;
    const rawApproachJ = journalisticApproach !== undefined ? journalisticApproach : journalistic_approach;

    const rawExp = expertise ?? expertiseSlots;
    const parsedExpertise: string[] | undefined = Array.isArray(rawExp)
      ? rawExp.map((s: any) => (typeof s === 'object' && s?.topic ? String(s.topic) : String(s || '')).trim()).filter(Boolean).slice(0, 6)
      : typeof rawExp === 'string' && rawExp.trim()
        ? rawExp.split(',').map((s: string) => s.trim()).filter(Boolean).slice(0, 6)
        : undefined;

    // Admin-only expertise ratings enforcement
    const rawRatings = expertiseRatings ?? expertise_ratings;
    const allowedRatings = isAdmin && rawRatings && typeof rawRatings === 'object' ? rawRatings : undefined;

    const updated = await DB.updateUserProfile({
      email,
      name,
      avatar: finalAvatar,
      bio,
      role: targetRole,
      linkedin,
      yearsOfExperience: yearsOfExperience !== undefined ? yearsOfExperience : years_of_experience,
      coverageAreas: parsedAreas,
      aboutTheJournalist: clampWords(rawAboutJ, 200),
      journalisticApproach: clampWords(rawApproachJ, 50),
      city: city !== undefined ? (city ? String(city).trim() : null) : undefined,
      country: country !== undefined ? (country ? String(country).trim() : null) : undefined,
      location: location !== undefined ? (location ? String(location).trim() : null) : undefined,
      expertise: parsedExpertise,
      ...(allowedRatings ? { expertiseRatings: allowedRatings } : {}),
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
