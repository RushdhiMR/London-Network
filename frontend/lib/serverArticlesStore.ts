import { getDbPool, isMysqlAvailable, recordMysqlFailure } from '@/lib/db';
import fs from 'fs';
import path from 'path';
import { getB2Client, isB2Configured } from '@/lib/backblaze';
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

const DB_JSON_PATH = path.join(process.cwd(), 'data', 'digital_journal_db.json');
const TMP_JSON_PATH = path.join('/tmp', 'digital_journal_db.json');
const B2_STATE_KEY = 'database/articles_overrides.json';

interface ArticlesB2State {
  updatedAt: string;
  overrides: Record<string, Partial<ArticleRecord>>;
  deletedIds: string[];
  customArticles: ArticleRecord[];
}

const globalForArticlesStore = globalThis as unknown as {
  __serverArticlesCache?: ArticleRecord[];
  __articlesB2StateCache?: ArticlesB2State | null;
  __articlesB2StateCacheTime?: number;
  __articlesB2StateInFlight?: Promise<ArticlesB2State | null> | null;
};

const B2_CACHE_TTL_MS = 2500; // 2.5 seconds in-memory cache for cloud overrides

async function getArticlesB2State(forceFresh = false): Promise<ArticlesB2State | null> {
  if (!isB2Configured()) return null;

  const now = Date.now();
  if (!forceFresh && globalForArticlesStore.__articlesB2StateCache && (now - (globalForArticlesStore.__articlesB2StateCacheTime || 0) < B2_CACHE_TTL_MS)) {
    return globalForArticlesStore.__articlesB2StateCache;
  }

  if (globalForArticlesStore.__articlesB2StateInFlight && !forceFresh) {
    return globalForArticlesStore.__articlesB2StateInFlight;
  }

  const fetchPromise = (async () => {
    try {
      const client = getB2Client();
      const bucket = (process.env.B2_BUCKET_NAME || '').trim();
      if (!client || !bucket) return null;

      const res = await client.send(new GetObjectCommand({
        Bucket: bucket,
        Key: B2_STATE_KEY
      }));

      const bodyStr = await res.Body?.transformToString();
      if (!bodyStr || !bodyStr.trim()) return null;

      const parsed: ArticlesB2State = JSON.parse(bodyStr);
      globalForArticlesStore.__articlesB2StateCache = parsed;
      globalForArticlesStore.__articlesB2StateCacheTime = Date.now();
      return parsed;
    } catch (err: any) {
      if (err?.name === 'NoSuchKey' || err?.Code === 'NoSuchKey') {
        const emptyState: ArticlesB2State = {
          updatedAt: new Date().toISOString(),
          overrides: {},
          deletedIds: [],
          customArticles: []
        };
        globalForArticlesStore.__articlesB2StateCache = emptyState;
        globalForArticlesStore.__articlesB2StateCacheTime = Date.now();
        return emptyState;
      }
      return globalForArticlesStore.__articlesB2StateCache || null;
    } finally {
      globalForArticlesStore.__articlesB2StateInFlight = null;
    }
  })();

  globalForArticlesStore.__articlesB2StateInFlight = fetchPromise;
  return fetchPromise;
}

async function saveArticlesB2State(state: ArticlesB2State): Promise<boolean> {
  if (!isB2Configured()) return false;
  try {
    const client = getB2Client();
    const bucket = (process.env.B2_BUCKET_NAME || '').trim();
    if (!client || !bucket) return false;

    state.updatedAt = new Date().toISOString();
    globalForArticlesStore.__articlesB2StateCache = state;
    globalForArticlesStore.__articlesB2StateCacheTime = Date.now();

    const jsonStr = JSON.stringify(state, null, 2);
    await client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: B2_STATE_KEY,
      Body: Buffer.from(jsonStr, 'utf-8'),
      ContentType: 'application/json'
    }));

    return true;
  } catch (err) {
    console.warn('[serverArticlesStore] B2 state save warning:', err);
    return false;
  }
}

function applyB2StateToArticles(baseArticles: ArticleRecord[], b2State: ArticlesB2State | null): ArticleRecord[] {
  if (!b2State) return baseArticles;

  const cleanT = (t: any) =>
    String(t || "")
      .toLowerCase()
      .replace(/[\u2018\u2019\u201A\u201B']/g, "'")
      .replace(/[\u201C\u201D\u201E\u201F"]/g, '"')
      .replace(/[\u2013\u2014]/g, "-")
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, " ")
      .trim();

  const deletedSet = new Set((b2State.deletedIds || []).map(d => String(d).trim().toLowerCase()));

  const result: ArticleRecord[] = [];
  const seenIds = new Set<string>();
  const seenTitles = new Set<string>();

  const processArticle = (art: ArticleRecord) => {
    const idKey = String(art.id || '').trim().toLowerCase();
    const slugKey = String(art.slug || '').trim().toLowerCase();
    const titleKey = cleanT(art.title);

    // If deleted, skip
    if (
      (idKey && deletedSet.has(idKey)) ||
      (slugKey && deletedSet.has(slugKey)) ||
      (titleKey && deletedSet.has(titleKey))
    ) {
      return;
    }

    const override =
      (idKey && b2State.overrides[idKey]) ||
      (idKey && b2State.overrides[String(art.id)]) ||
      (slugKey && b2State.overrides[slugKey]) ||
      (titleKey && b2State.overrides[`t_${titleKey}`]) ||
      (titleKey && b2State.overrides[titleKey]);

    const finalArt: ArticleRecord = override ? { ...art, ...override } : art;

    const dedupId = String(finalArt.id || '');
    const dedupTitle = cleanT(finalArt.title);
    if ((dedupId && seenIds.has(dedupId)) || (dedupTitle && seenTitles.has(dedupTitle))) {
      return;
    }
    if (dedupId) seenIds.add(dedupId);
    if (dedupTitle) seenTitles.add(dedupTitle);
    result.push(finalArt);
  };

  if (Array.isArray(b2State.customArticles)) {
    b2State.customArticles.forEach(processArticle);
  }

  baseArticles.forEach(processArticle);

  return result;
}

function readJsonArticles(): ArticleRecord[] {
  // Check in-memory store for active lambda container
  if (Array.isArray(globalForArticlesStore.__serverArticlesCache) && globalForArticlesStore.__serverArticlesCache.length > 0) {
    return globalForArticlesStore.__serverArticlesCache;
  }

  // Check /tmp first (written during runtime on serverless like Vercel)
  try {
    if (fs.existsSync(TMP_JSON_PATH)) {
      const raw = fs.readFileSync(TMP_JSON_PATH, 'utf-8');
      if (raw && raw.trim()) {
        let parsed: any = null;
        try {
          parsed = JSON.parse(raw);
        } catch {
          parsed = null;
        }
        if (parsed && Array.isArray(parsed.articles) && parsed.articles.length > 0) {
          globalForArticlesStore.__serverArticlesCache = parsed.articles;
          return parsed.articles;
        }
      }
    }
  } catch (err) {}

  try {
    if (fs.existsSync(DB_JSON_PATH)) {
      const raw = fs.readFileSync(DB_JSON_PATH, 'utf-8');
      if (raw && raw.trim()) {
        let parsed: any = null;
        try {
          parsed = JSON.parse(raw);
        } catch {
          parsed = null;
        }
        if (parsed && Array.isArray(parsed.articles)) {
          globalForArticlesStore.__serverArticlesCache = parsed.articles;
          return parsed.articles;
        }
      }
    }
  } catch (err) {
    console.warn('[serverArticlesStore] JSON fallback read warning:', err);
  }
  return [];
}

function writeJsonArticles(articles: ArticleRecord[]) {
  globalForArticlesStore.__serverArticlesCache = articles;

  // Try writing to primary DB path
  let writeSuccess = false;
  try {
    let fullDb: any = {};
    if (fs.existsSync(DB_JSON_PATH)) {
      const raw = fs.readFileSync(DB_JSON_PATH, 'utf-8');
      if (raw && raw.trim()) {
        try {
          fullDb = JSON.parse(raw);
        } catch {
          fullDb = {};
        }
      }
    }
    fullDb.articles = articles;
    const dir = path.dirname(DB_JSON_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const tmpFile = `${DB_JSON_PATH}.tmp.${Date.now()}`;
    fs.writeFileSync(tmpFile, JSON.stringify(fullDb, null, 2), 'utf-8');
    try {
      fs.renameSync(tmpFile, DB_JSON_PATH);
    } catch {
      fs.writeFileSync(DB_JSON_PATH, JSON.stringify(fullDb, null, 2), 'utf-8');
      if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
    }
    writeSuccess = true;
  } catch (err) {
    // Expected on Vercel production: process.cwd() is read-only
  }

  // Also write to /tmp on serverless so subsequent lambda requests can read updated articles
  try {
    let tmpDb: any = {};
    if (fs.existsSync(TMP_JSON_PATH)) {
      const raw = fs.readFileSync(TMP_JSON_PATH, 'utf-8');
      if (raw && raw.trim()) {
        try {
          tmpDb = JSON.parse(raw);
        } catch {
          tmpDb = {};
        }
      }
    }
    tmpDb.articles = articles;
    const tmpDir = path.dirname(TMP_JSON_PATH);
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
    fs.writeFileSync(TMP_JSON_PATH, JSON.stringify(tmpDb, null, 2), 'utf-8');
  } catch (tmpErr) {
    if (!writeSuccess) {
      console.warn('[serverArticlesStore] /tmp fallback write warning:', tmpErr);
    }
  }
}

export interface ArticleRecord {
  id: string | number;
  title: string;
  subheading?: string;
  summary?: string;
  description?: string;
  content?: string;
  category?: string;
  category_name?: string;
  category_slug?: string;
  subcategories?: string[];
  tags?: string[];
  imageUrl?: string;
  image?: string;
  image_url?: string;
  caption?: string;
  image_caption?: string;
  status: string; // "Published" | "Pending review" | "Draft" | "Trash" | "Rejected"
  date?: string;
  published_at?: string;
  reads?: number;
  readDuration?: string;
  placement?: string;
  authorEmail?: string;
  authorName?: string;
  authorAvatar?: string;
  authorBio?: string;
  author?: string;
  seo?: any;
  slug?: string;
  is_featured?: boolean;
  is_editors_pick?: boolean;
  [key: string]: any;
}

export async function readArticlesStore(): Promise<ArticleRecord[]> {
  if (isMysqlAvailable()) {
    try {
      const db = getDbPool();
      const [rows]: any = await db.query(`
      SELECT 
        a.*,
        c.name AS category_name,
        c.slug AS category_slug,
        sc.name AS subcategory_name,
        sc.slug AS subcategory_slug,
        au.name AS author_rel_name,
        au.avatar AS author_rel_avatar,
        au.bio AS author_rel_bio
      FROM articles a
      LEFT JOIN categories c ON a.category_id = c.id
      LEFT JOIN subcategories sc ON a.subcategory_id = sc.id
      LEFT JOIN authors au ON a.author_id = au.id
      ORDER BY a.published_at DESC, a.id DESC
    `);

    if (Array.isArray(rows) && rows.length > 0) {
      const sqlArticles: ArticleRecord[] = rows.map((r: any) => {
        let parsedSubcategories: string[] = [];
        if (r.subcategories) {
          try {
            parsedSubcategories = typeof r.subcategories === 'string' ? JSON.parse(r.subcategories) : r.subcategories;
          } catch (e) {
            parsedSubcategories = typeof r.subcategories === 'string' ? r.subcategories.split(',').map((s: string) => s.trim()) : [];
          }
        }
        if (parsedSubcategories.length === 0 && r.subcategory_name) {
          parsedSubcategories = [r.subcategory_name];
        }

        let parsedTags: string[] = [];
        if (r.tags) {
          try {
            parsedTags = typeof r.tags === 'string' ? JSON.parse(r.tags) : r.tags;
          } catch (e) {
            parsedTags = typeof r.tags === 'string' ? r.tags.split(',').map((s: string) => s.trim()) : [];
          }
        }

        let parsedSeo: any = null;
        if (r.seo) {
          try {
            parsedSeo = typeof r.seo === 'string' ? JSON.parse(r.seo) : r.seo;
          } catch (e) {}
        }

        const rawAuthor = (r.author_name || r.author || r.author_rel_name || '').trim();
        const authorName = (rawAuthor && rawAuthor.toLowerCase() !== 'system administrator' && rawAuthor.toLowerCase() !== 'administrator' && rawAuthor.toLowerCase() !== 'admin')
          ? rawAuthor
          : (r.author_rel_name || 'Rushdhi MR');
        const authorAvatar = r.author_avatar || r.author_rel_avatar || '/author_bluesuit.jpg';
        const authorBio = r.author_bio || r.author_rel_bio || `${authorName} is a journalist for Digital Journal.`;
        const cat = r.category_name || (r.category_id ? String(r.category_id) : 'News');

        const pubDate = r.published_at ? new Date(r.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Jul 2026';

        let rawImg = (r.image_url || '').trim();
        if (rawImg.includes('f005.backblazeb2.com/file/LondonNetwork/')) {
          rawImg = rawImg.replace(/https?:\/\/f005\.backblazeb2\.com\/file\/LondonNetwork\//g, 'https://LondonNetwork.s3.us-east-005.backblazeb2.com/');
        }
        const safeImg = rawImg || '/ai_hero.png';

        return {
          id: r.id,
          title: r.title,
          slug: r.slug,
          summary: r.summary || r.description || '',
          description: r.description || r.summary || '',
          subheading: r.summary || r.description || '',
          content: r.content || '',
          category: cat,
          category_name: cat,
          category_slug: r.category_slug || (cat ? cat.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'news'),
          subcategories: parsedSubcategories,
          tags: parsedTags,
          imageUrl: safeImg,
          image: safeImg,
          image_url: safeImg,
          caption: r.image_caption || `${r.title}.`,
          image_caption: r.image_caption || `${r.title}.`,
          is_featured: Boolean(r.is_featured),
          is_editors_pick: Boolean(r.is_editors_pick),
          status: r.status || 'Published',
          rejectionReason: r.rejection_reason || r.rejectionReason || parsedSeo?.rejectionReason || undefined,
          rejectedAt: r.rejected_at || r.rejectedAt || parsedSeo?.rejectedAt || undefined,
          date: pubDate,
          published_at: r.published_at,
          publishedAt: r.published_at,
          updated_at: r.updated_at,
          updatedAt: r.updated_at,
          created_at: r.created_at,
          createdAt: r.created_at,
          readDuration: r.read_duration || '4 MIN READ',
          reads: Number(r.reads_count || 0),
          views: Number(r.reads_count || 0),
          reads_count: Number(r.reads_count || 0),
          placement: r.placement || 'Standard Post',
          authorName,
          author: authorName,
          authorEmail: r.author_email || 'writer@digitaljournal.com',
          authorAvatar,
          authorBio,
          seo: parsedSeo,
          targetedRecipients: (() => {
            if ((r as any).targeted_recipients) {
              try {
                const parsed = typeof (r as any).targeted_recipients === 'string' ? JSON.parse((r as any).targeted_recipients) : (r as any).targeted_recipients;
                if (Array.isArray(parsed)) return parsed;
              } catch (e) {}
            }
            if (parsedSeo?.targetedRecipients && Array.isArray(parsedSeo.targetedRecipients)) {
              return parsedSeo.targetedRecipients;
            }
            return [];
          })(),
        };
      });

      // Seamlessly merge with JSON store so articles that only exist in JSON are not lost
      const jsonArticles = readJsonArticles();
      if (jsonArticles.length > 0) {
        const cleanT = (t: any) => String(t || '').toLowerCase().replace(/[\u2018\u2019\u201A\u201B']/g, "'").replace(/[\u201C\u201D\u201E\u201F"]/g, '"').replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ').trim();
        const mergedMap = new Map<string, any>();
        sqlArticles.forEach((a: any) => {
          mergedMap.set(String(a.id), a);
          const tk = cleanT(a.title);
          if (tk) mergedMap.set(`t_${tk}`, a);
        });

        // Only add JSON articles if they don't already exist in MySQL.
        // MySQL records are the authoritative live state and must never be overwritten by stale JSON entries.
        jsonArticles.forEach((ja: any) => {
          const tk = cleanT(ja.title);
          const match = (tk && mergedMap.get(`t_${tk}`)) || mergedMap.get(String(ja.id));
          if (!match) {
            mergedMap.set(String(ja.id), ja);
            if (tk) mergedMap.set(`t_${tk}`, ja);
          }
        });

        const seen = new Set<string>();
        const finalCombined: ArticleRecord[] = [];
        Array.from(mergedMap.values()).forEach((item: any) => {
          const idKey = String(item.id);
          const tk = cleanT(item.title);
          if (!seen.has(idKey) && (!tk || !seen.has(`t_${tk}`))) {
            seen.add(idKey);
            if (tk) seen.add(`t_${tk}`);
            finalCombined.push(item);
          }
        });
        globalForArticlesStore.__serverArticlesCache = finalCombined;
        return finalCombined;
      }

      globalForArticlesStore.__serverArticlesCache = sqlArticles;
      return sqlArticles;
    }
  } catch (err) {
    recordMysqlFailure();
    console.warn('[serverArticlesStore] MySQL read notice, checking JSON fallback:', err);
  }
  }

  // Fallback to JSON Database
  const baseArticles = readJsonArticles();

  // Overlay Backblaze B2 cloud state if configured (critical for persistence on Vercel)
  if (isB2Configured()) {
    try {
      const b2State = await getArticlesB2State();
      if (b2State) {
        const merged = applyB2StateToArticles(baseArticles, b2State);
        globalForArticlesStore.__serverArticlesCache = merged;
        return merged;
      }
    } catch (e) {
      console.warn('[serverArticlesStore] B2 state apply warning:', e);
    }
  }

  return baseArticles;
}

export async function writeArticlesStore(articles: ArticleRecord[]): Promise<void> {
  writeJsonArticles(articles);
  for (const article of articles) {
    try {
      await upsertArticleStore(article);
    } catch (e) {}
  }
}

export async function upsertArticleStore(article: ArticleRecord): Promise<ArticleRecord[]> {
  const isPendingOrPublished = article.status === "Pending review" || article.status === "Published";
  const sanitizedArticle: ArticleRecord = {
    ...article,
    rejectionReason: isPendingOrPublished ? undefined : (article.rejectionReason || (article as any).rejection_reason),
    rejection_reason: isPendingOrPublished ? undefined : ((article as any).rejection_reason || article.rejectionReason),
    rejectedAt: isPendingOrPublished ? undefined : (article.rejectedAt || (article as any).rejected_at),
  };

  // Sync to JSON DB first for robust local persistence
  try {
    const jsonArticles = readJsonArticles();
    const cleanT = (t: any) => String(t || '').trim().toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
    const targetTitleKey = cleanT(sanitizedArticle.title);
    const origTitleKey = cleanT(sanitizedArticle.original_title || sanitizedArticle.previousTitle);
    const targetIdKey = String(sanitizedArticle.id || '');

    let foundInJson = false;
    const updatedJsonList = jsonArticles.map((a: any) => {
      const aTitleKey = cleanT(a.title);
      const aIdKey = String(a.id || '');
      if (
        (targetIdKey && aIdKey === targetIdKey) ||
        (targetTitleKey && aTitleKey === targetTitleKey) ||
        (origTitleKey && aTitleKey === origTitleKey)
      ) {
        foundInJson = true;
        const merged = { 
          ...a, 
          ...sanitizedArticle, 
          id: a.id || sanitizedArticle.id,
          authorEmail: sanitizedArticle.authorEmail || sanitizedArticle.author_email || a.authorEmail || a.author_email,
          authorName: sanitizedArticle.authorName || sanitizedArticle.author_name || sanitizedArticle.author || a.authorName || a.author_name || a.author
        };
        if (isPendingOrPublished) {
          delete merged.rejectionReason;
          delete merged.rejection_reason;
          delete merged.rejectedAt;
        }
        return merged;
      }
      return a;
    });

    if (!foundInJson) {
      updatedJsonList.unshift(sanitizedArticle);
    }
    writeJsonArticles(updatedJsonList);
  } catch (jErr) {
    console.warn('[serverArticlesStore] JSON upsert warning:', jErr);
  }

  try {
    const db = getDbPool();
    const slug = sanitizedArticle.slug || (sanitizedArticle.title ? sanitizedArticle.title.toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-') : `article-${Date.now()}`);
    
    // Find category ID if category name provided; auto-create if missing
    let categoryId = sanitizedArticle.category_id || null;
    if (!categoryId && (sanitizedArticle.category || sanitizedArticle.category_name)) {
      const catName = (sanitizedArticle.category || sanitizedArticle.category_name || '').trim();
      const catSlug = catName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      const [cats]: any = await db.query('SELECT id FROM categories WHERE LOWER(name) = LOWER(?) OR LOWER(slug) = LOWER(?) LIMIT 1', [catName, catSlug]);
      if (cats && cats.length > 0) {
        categoryId = cats[0].id;
      } else if (catName) {
        try {
          const [ins]: any = await db.query(
            'INSERT IGNORE INTO categories (name, slug) VALUES (?, ?)',
            [catName, catSlug]
          );
          if (ins && ins.insertId) {
            categoryId = ins.insertId;
          } else {
            const [recats]: any = await db.query('SELECT id FROM categories WHERE LOWER(name) = LOWER(?) LIMIT 1', [catName]);
            if (recats && recats.length > 0) categoryId = recats[0].id;
          }
        } catch (insErr) {
          console.warn('[serverArticlesStore] Could not auto-create category:', insErr);
        }
      }
    }

    const subcategoriesJson = JSON.stringify(Array.isArray(sanitizedArticle.subcategories) ? sanitizedArticle.subcategories : (Array.isArray(sanitizedArticle.subCategories) ? sanitizedArticle.subCategories : []));
    const tagsJson = JSON.stringify(Array.isArray(sanitizedArticle.tags) ? sanitizedArticle.tags : []);
    
    let finalSeo = sanitizedArticle.seo || {};
    if (typeof finalSeo === 'string') {
      try { finalSeo = JSON.parse(finalSeo); } catch (e) { finalSeo = {}; }
    }
    if (sanitizedArticle.rejectionReason && !isPendingOrPublished) {
      finalSeo = { ...finalSeo, rejectionReason: sanitizedArticle.rejectionReason };
    } else {
      delete finalSeo.rejectionReason;
    }
    if (sanitizedArticle.rejectedAt && !isPendingOrPublished) {
      finalSeo = { ...finalSeo, rejectedAt: sanitizedArticle.rejectedAt };
    } else if (isPendingOrPublished) {
      delete finalSeo.rejectedAt;
    }
    if (sanitizedArticle.targetedRecipients || sanitizedArticle.targeted_recipients) {
      finalSeo.targetedRecipients = sanitizedArticle.targetedRecipients || sanitizedArticle.targeted_recipients;
    }
    const seoJson = Object.keys(finalSeo).length > 0 ? JSON.stringify(finalSeo) : (sanitizedArticle.seo ? JSON.stringify(sanitizedArticle.seo) : null);

    let authorName = sanitizedArticle.authorName || sanitizedArticle.author;
    let authorAvatar = sanitizedArticle.authorAvatar || '/author_bluesuit.jpg';
    let authorBio = sanitizedArticle.authorBio;
    let authorEmail = sanitizedArticle.authorEmail || sanitizedArticle.author_email;
    let rawUpsertImg = (sanitizedArticle.imageUrl || sanitizedArticle.image || sanitizedArticle.image_url || '/ai_hero.png').trim();
    if (rawUpsertImg.includes('f005.backblazeb2.com/file/LondonNetwork/')) {
      rawUpsertImg = rawUpsertImg.replace(/https?:\/\/f005\.backblazeb2\.com\/file\/LondonNetwork\//g, 'https://LondonNetwork.s3.us-east-005.backblazeb2.com/');
    }
    const imageUrl = rawUpsertImg;
    const description = sanitizedArticle.summary || sanitizedArticle.description || sanitizedArticle.subheading || '';
    const content = sanitizedArticle.content || '';
    const status = sanitizedArticle.status || 'Published';
    const placement = sanitizedArticle.placement || 'Standard Post';
    const readDuration = sanitizedArticle.readDuration || '4 MIN READ';
    const isFeatured = sanitizedArticle.is_featured ? 1 : 0;
    const isEditorsPick = sanitizedArticle.is_editors_pick ? 1 : 0;

    // Check if article with this id, slug, or title already exists in MySQL
    let isExisting = false;
    let targetId = sanitizedArticle.id;
    if (targetId && !isNaN(Number(targetId))) {
      const [chk]: any = await db.query('SELECT id FROM articles WHERE id = ? LIMIT 1', [Number(targetId)]);
      if (chk && chk.length > 0) isExisting = true;
    }
    if (!isExisting && slug) {
      const [chkSlug]: any = await db.query('SELECT id FROM articles WHERE slug = ? LIMIT 1', [slug]);
      if (chkSlug && chkSlug.length > 0) {
        isExisting = true;
        targetId = chkSlug[0].id;
      }
    }
    if (!isExisting && sanitizedArticle.title) {
      const cleanTitle = sanitizedArticle.title.trim();
      const straightTitle = cleanTitle.replace(/[\u2018\u2019\u201A\u201B']/g, "'").replace(/[\u201C\u201D\u201E\u201F"]/g, '"');
      const curlyTitle = cleanTitle.replace(/[\u2018\u2019\u201A\u201B']/g, "’").replace(/[\u201C\u201D\u201E\u201F"]/g, '”');
      const [chkTitle]: any = await db.query(
        'SELECT id FROM articles WHERE LOWER(TRIM(title)) = LOWER(TRIM(?)) OR LOWER(TRIM(title)) = LOWER(TRIM(?)) OR LOWER(TRIM(title)) = LOWER(TRIM(?)) LIMIT 1',
        [cleanTitle, straightTitle, curlyTitle]
      );
      if (chkTitle && chkTitle.length > 0) {
        isExisting = true;
        targetId = chkTitle[0].id;
      } else {
        const cleanAlpha = (t: string) => (t || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const targetAlpha = cleanAlpha(cleanTitle);
        if (targetAlpha) {
          const [allRows]: any = await db.query('SELECT id, title, slug FROM articles ORDER BY id DESC LIMIT 200');
          if (Array.isArray(allRows)) {
            const matchedRow = allRows.find((r: any) => cleanAlpha(r.title) === targetAlpha);
            if (matchedRow) {
              isExisting = true;
              targetId = matchedRow.id;
            }
          }
        }
      }
    }
    if (!isExisting && (sanitizedArticle.original_title || sanitizedArticle.previousTitle)) {
      const origT = String(sanitizedArticle.original_title || sanitizedArticle.previousTitle).trim();
      const straightOrigT = origT.replace(/[\u2018\u2019\u201A\u201B']/g, "'").replace(/[\u201C\u201D\u201E\u201F"]/g, '"');
      const curlyOrigT = origT.replace(/[\u2018\u2019\u201A\u201B']/g, "’").replace(/[\u201C\u201D\u201E\u201F"]/g, '”');
      const [chkOrig]: any = await db.query(
        'SELECT id FROM articles WHERE LOWER(TRIM(title)) = LOWER(TRIM(?)) OR LOWER(TRIM(title)) = LOWER(TRIM(?)) OR LOWER(TRIM(title)) = LOWER(TRIM(?)) LIMIT 1',
        [origT, straightOrigT, curlyOrigT]
      );
      if (chkOrig && chkOrig.length > 0) {
        isExisting = true;
        targetId = chkOrig[0].id;
      }
    }

    if (isExisting) {
      try {
        const [existingRow]: any = await db.query('SELECT author_name, author_email, author_avatar, author_bio FROM articles WHERE id = ? LIMIT 1', [targetId]);
        if (existingRow && existingRow[0]) {
          if (!authorEmail || authorEmail === 'writer@digitaljournal.com') {
            if (existingRow[0].author_email) authorEmail = existingRow[0].author_email;
          }
          if (!authorName || authorName === 'Staff Journalist') {
            if (existingRow[0].author_name) authorName = existingRow[0].author_name;
          }
          if (!authorBio && existingRow[0].author_bio) authorBio = existingRow[0].author_bio;
          if ((!authorAvatar || authorAvatar === '/author_bluesuit.jpg') && existingRow[0].author_avatar) authorAvatar = existingRow[0].author_avatar;
        }
      } catch (e) {}
    }
    if (!authorName) authorName = 'Staff Journalist';
    if (!authorEmail) authorEmail = 'writer@digitaljournal.com';
    if (!authorBio) authorBio = `${authorName} is a journalist for Digital Journal.`;

    if (isExisting) {
      await db.query(`
        UPDATE articles SET
          category_id = COALESCE(?, category_id),
          title = ?,
          slug = ?,
          description = ?,
          summary = ?,
          content = ?,
          image_url = ?,
          status = ?,
          placement = ?,
          subcategories = ?,
          tags = ?,
          read_duration = ?,
          author_name = ?,
          author_email = ?,
          author_avatar = ?,
          author_bio = ?,
          seo = ?,
          is_featured = ?,
          is_editors_pick = ?,
          published_at = COALESCE(?, IF(? = 'Published', COALESCE(published_at, NOW()), published_at)),
          updated_at = NOW()
        WHERE id = ?
      `, [
        categoryId,
        sanitizedArticle.title,
        slug,
        description,
        description,
        content,
        imageUrl,
        status,
        placement,
        subcategoriesJson,
        tagsJson,
        readDuration,
        authorName,
        authorEmail,
        authorAvatar,
        authorBio,
        seoJson,
        isFeatured,
        isEditorsPick,
        sanitizedArticle.published_at || sanitizedArticle.publishedAt || null,
        status,
        targetId
      ]);
    } else {
      const [insertRes]: any = await db.query(`
        INSERT INTO articles (
          category_id,
          title,
          slug,
          description,
          summary,
          content,
          image_url,
          image_caption,
          status,
          placement,
          subcategories,
          tags,
          read_duration,
          author_name,
          author_email,
          author_avatar,
          author_bio,
          seo,
          is_featured,
          is_editors_pick,
          published_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `, [
        categoryId,
        sanitizedArticle.title,
        slug,
        description,
        description,
        content,
        imageUrl,
        sanitizedArticle.caption || `${sanitizedArticle.title}.`,
        status,
        placement,
        subcategoriesJson,
        tagsJson,
        readDuration,
        authorName,
        authorEmail,
        authorAvatar,
        authorBio,
        seoJson,
        isFeatured,
        isEditorsPick
      ]);
      if (insertRes && insertRes.insertId) {
        sanitizedArticle.id = insertRes.insertId;
      }
    }
  } catch (err) {
    console.warn('[serverArticlesStore] MySQL upsert notice:', err);
  }

  // Persist to Backblaze B2 cloud state (critical on Vercel)
  if (isB2Configured()) {
    try {
      const b2State = (await getArticlesB2State(true)) || {
        updatedAt: new Date().toISOString(),
        overrides: {},
        deletedIds: [],
        customArticles: []
      };

      const idKey = String(sanitizedArticle.id || '');
      const cleanT = (t: any) => String(t || '').trim().toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
      const titleKey = cleanT(sanitizedArticle.title);

      // Un-delete if previously marked deleted
      b2State.deletedIds = (b2State.deletedIds || []).filter(d =>
        String(d) !== idKey && cleanT(d) !== titleKey
      );

      // Set override
      if (idKey) b2State.overrides[idKey] = sanitizedArticle;
      if (titleKey) b2State.overrides[`t_${titleKey}`] = sanitizedArticle;

      if (Array.isArray(b2State.customArticles)) {
        const cIdx = b2State.customArticles.findIndex(ca =>
          (idKey && String(ca.id) === idKey) || (titleKey && cleanT(ca.title) === titleKey)
        );
        if (cIdx >= 0) {
          b2State.customArticles[cIdx] = sanitizedArticle;
        } else {
          b2State.customArticles.unshift(sanitizedArticle);
        }
      } else {
        b2State.customArticles = [sanitizedArticle];
      }

      await saveArticlesB2State(b2State);
    } catch (b2Err) {
      console.warn('[serverArticlesStore] B2 upsert notice:', b2Err);
    }
  }

  return readArticlesStore();
}

export async function updateArticleStatusStore(
  id: string | number,
  status: string,
  title?: string,
  rejectionReason?: string,
  rejectedAt?: string
): Promise<ArticleRecord[]> {
  const cleanT = (t: any) =>
    String(t || "")
      .toLowerCase()
      .replace(/[\u2018\u2019\u201A\u201B']/g, "'")
      .replace(/[\u201C\u201D\u201E\u201F"]/g, '"')
      .replace(/[\u2013\u2014]/g, "-")
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, " ")
      .trim();

  const nowIso = new Date().toISOString();
  const overrideUpdate: Partial<ArticleRecord> = {
    status,
    updated_at: nowIso,
    updatedAt: nowIso,
    ...(status === "Rejected" ? {
      rejectionReason: rejectionReason || undefined,
      rejection_reason: rejectionReason || undefined,
      rejectedAt: rejectedAt || nowIso,
      rejected_at: rejectedAt || nowIso,
    } : {}),
    ...(status === "Published" ? {
      published_at: nowIso,
      publishedAt: nowIso,
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    } : {})
  };

  if (status === "Pending review" || status === "Published" || status === "Trash") {
    delete (overrideUpdate as any).rejectionReason;
    delete (overrideUpdate as any).rejection_reason;
    delete (overrideUpdate as any).rejectedAt;
    delete (overrideUpdate as any).rejected_at;
  }

  try {
    const jsonArticles = readJsonArticles();
    const targetTitle = title ? cleanT(title) : '';
    const updatedJson = jsonArticles.map((a: any) => {
      const aTitle = cleanT(a.title);
      if (
        String(a.id) === String(id) ||
        String(a.slug) === String(id) ||
        (targetTitle && aTitle === targetTitle)
      ) {
        return { ...a, ...overrideUpdate };
      }
      return a;
    });
    writeJsonArticles(updatedJson);
  } catch (e) {}

  try {
    if (isMysqlAvailable()) {
      const db = getDbPool();
      if (status.toLowerCase() === 'published') {
        await db.query('UPDATE articles SET status = ?, published_at = NOW(), updated_at = NOW() WHERE id = ? OR slug = ?', [status, id, String(id)]);
      } else {
        await db.query('UPDATE articles SET status = ?, updated_at = NOW() WHERE id = ? OR slug = ?', [status, id, String(id)]);
      }
    }
  } catch (err) {
    console.warn('[serverArticlesStore] MySQL update status notice:', err);
  }

  // Persist to Backblaze B2 cloud state (critical for Vercel persistence)
  if (isB2Configured()) {
    try {
      const b2State = (await getArticlesB2State(true)) || {
        updatedAt: nowIso,
        overrides: {},
        deletedIds: [],
        customArticles: []
      };

      const idKey = String(id || '');
      if (idKey) {
        b2State.overrides[idKey] = {
          ...(b2State.overrides[idKey] || {}),
          ...overrideUpdate
        };
      }
      if (title && title.trim()) {
        const tKey = `t_${cleanT(title)}`;
        b2State.overrides[tKey] = {
          ...(b2State.overrides[tKey] || {}),
          ...overrideUpdate
        };
      }

      if (Array.isArray(b2State.customArticles)) {
        b2State.customArticles = b2State.customArticles.map(ca => {
          if (String(ca.id) === idKey || (title && cleanT(ca.title) === cleanT(title))) {
            return { ...ca, ...overrideUpdate };
          }
          return ca;
        });
      }

      b2State.deletedIds = (b2State.deletedIds || []).filter(d =>
        String(d) !== idKey && (!title || cleanT(d) !== cleanT(title))
      );

      await saveArticlesB2State(b2State);
    } catch (b2Err) {
      console.warn('[serverArticlesStore] B2 save status notice:', b2Err);
    }
  }

  return readArticlesStore();
}

export async function deleteArticleStore(id: string | number, title?: string, slug?: string): Promise<ArticleRecord[]> {
  const cleanT = (t: any) =>
    String(t || "")
      .toLowerCase()
      .replace(/[\u2018\u2019\u201A\u201B']/g, "'")
      .replace(/[\u201C\u201D\u201E\u201F"]/g, '"')
      .replace(/[\u2013\u2014]/g, "-")
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, " ")
      .trim();

  try {
    const jsonArticles = readJsonArticles();
    const targetTitle = title ? cleanT(title) : '';
    const filtered = jsonArticles.filter(a => 
      String(a.id) !== String(id) && 
      String(a.slug) !== String(id) &&
      (!slug || String(a.slug) !== String(slug)) &&
      (!targetTitle || cleanT(a.title) !== targetTitle)
    );
    writeJsonArticles(filtered);
  } catch (e) {}

  try {
    if (isMysqlAvailable()) {
      const db = getDbPool();
      if (title && title.trim()) {
        await db.query('DELETE FROM articles WHERE id = ? OR slug = ? OR LOWER(TRIM(title)) = LOWER(TRIM(?))', [id, String(id), title.trim()]);
      } else {
        await db.query('DELETE FROM articles WHERE id = ? OR slug = ?', [id, String(id)]);
      }
    }
  } catch (err) {
    console.warn('[serverArticlesStore] MySQL delete notice:', err);
  }

  // Persist permanent deletion to Backblaze B2 cloud state
  if (isB2Configured()) {
    try {
      const b2State = (await getArticlesB2State(true)) || {
        updatedAt: new Date().toISOString(),
        overrides: {},
        deletedIds: [],
        customArticles: []
      };

      const keysToAdd = [String(id)];
      if (slug) keysToAdd.push(String(slug));
      if (title) keysToAdd.push(cleanT(title));

      keysToAdd.forEach(k => {
        if (!b2State.deletedIds.includes(k)) b2State.deletedIds.push(k);
        delete b2State.overrides[k];
        delete b2State.overrides[`t_${k}`];
      });

      if (Array.isArray(b2State.customArticles)) {
        b2State.customArticles = b2State.customArticles.filter(ca =>
          String(ca.id) !== String(id) &&
          (!slug || String(ca.slug) !== String(slug)) &&
          (!title || cleanT(ca.title) !== cleanT(title))
        );
      }

      await saveArticlesB2State(b2State);
    } catch (b2Err) {
      console.warn('[serverArticlesStore] B2 delete notice:', b2Err);
    }
  }

  return readArticlesStore();
}

export async function recordArticleViewStore(
  articleIdOrSlug: string | number,
  userIdentifier?: string | null,
  extraMeta?: { articleId?: string | number; slug?: string; title?: string }
): Promise<{ success: boolean; reads: number; incremented: boolean }> {
  try {
    const db = getDbPool();

    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS article_views (
          id INT AUTO_INCREMENT PRIMARY KEY,
          article_id BIGINT NOT NULL,
          user_identifier VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY uniq_user_article (article_id, user_identifier)
        )
      `);
    } catch (e) {}

    const searchTarget = String(articleIdOrSlug || "").trim();
    let numId = !isNaN(Number(searchTarget)) && Number(searchTarget) > 0 ? Number(searchTarget) : -1;
    if (numId <= 0 && extraMeta?.articleId && !isNaN(Number(extraMeta.articleId)) && Number(extraMeta.articleId) > 0) {
      numId = Number(extraMeta.articleId);
    }
    const candidateSlug = String(extraMeta?.slug || searchTarget || "").trim();
    const candidateTitle = String(extraMeta?.title || searchTarget || "").trim();

    let [rows]: any = await db.query(
      'SELECT id, reads_count FROM articles WHERE id = ? OR slug = ? OR title = ? OR LOWER(slug) = LOWER(?) OR LOWER(title) = LOWER(?) LIMIT 1',
      [numId, candidateSlug, candidateTitle, candidateSlug, candidateTitle]
    );

    if (!rows || rows.length === 0) {
      // Fuzzy search by clean alphanumeric title
      const cleanSearch = candidateTitle.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (cleanSearch.length > 5) {
        const [allArticles]: any = await db.query('SELECT id, title, slug, reads_count FROM articles');
        if (Array.isArray(allArticles)) {
          const match = allArticles.find((a: any) => {
            const aTitle = (a.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            const aSlug = (a.slug || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            return (aTitle && aTitle === cleanSearch) || (aSlug && aSlug === cleanSearch);
          });
          if (match) rows = [match];
        }
      }
    }

    if (Array.isArray(rows) && rows.length > 0) {
      const art = rows[0];
      const realId = art.id;
      let currentReads = Number(art.reads_count || 0);

      const cleanUser = userIdentifier && typeof userIdentifier === "string" ? userIdentifier.trim().toLowerCase() : null;
      const isRegisteredAccount = Boolean(
        cleanUser &&
        cleanUser !== "guest" &&
        cleanUser !== "null" &&
        cleanUser !== "undefined" &&
        cleanUser !== "none" &&
        cleanUser.includes("@")
      );

      if (isRegisteredAccount && cleanUser) {
        // Registered User: Exactly 1 view per registered account for this article
        try {
          const [ins]: any = await db.query(
            'INSERT IGNORE INTO article_views (article_id, user_identifier) VALUES (?, ?)',
            [realId, cleanUser]
          );

          if (ins && ins.affectedRows > 0) {
            currentReads += 1;
            await db.query('UPDATE articles SET reads_count = reads_count + 1, updated_at = updated_at WHERE id = ?', [realId]);
            return { success: true, reads: currentReads, incremented: true };
          } else {
            // Already viewed by this registered account -> do not increment
            return { success: true, reads: currentReads, incremented: false };
          }
        } catch (e) {
          console.warn('[recordArticleViewStore] Registered user tracking error:', e);
        }
      } else {
        // Unregistered Visitor (Guest): Every visit increments the view count by 1
        currentReads += 1;
        await db.query('UPDATE articles SET reads_count = reads_count + 1, updated_at = updated_at WHERE id = ?', [realId]);
        return { success: true, reads: currentReads, incremented: true };
      }
    }
  } catch (err) {
    console.error('[serverArticlesStore] recordArticleViewStore error:', err);
  }

  return { success: false, reads: 0, incremented: false };
}
