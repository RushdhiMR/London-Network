import { getDbPool } from '@/lib/db';
import fs from 'fs';
import path from 'path';

const DB_JSON_PATH = path.join(process.cwd(), 'data', 'digital_journal_db.json');

function readJsonArticles(): ArticleRecord[] {
  try {
    if (fs.existsSync(DB_JSON_PATH)) {
      const raw = fs.readFileSync(DB_JSON_PATH, 'utf-8');
      if (raw && raw.trim()) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.articles)) {
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
  try {
    let fullDb: any = {};
    if (fs.existsSync(DB_JSON_PATH)) {
      const raw = fs.readFileSync(DB_JSON_PATH, 'utf-8');
      if (raw && raw.trim()) {
        fullDb = JSON.parse(raw);
      }
    }
    fullDb.articles = articles;
    const dir = path.dirname(DB_JSON_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_JSON_PATH, JSON.stringify(fullDb, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[serverArticlesStore] JSON fallback write warning:', err);
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
          seo: parsedSeo
        };
      });

      // Seamlessly merge with JSON store so articles are never lost if saved during DB state changes
      const jsonArticles = readJsonArticles();
      if (jsonArticles.length > 0) {
        const cleanT = (t: any) => String(t || '').toLowerCase().replace(/[\u2018\u2019\u201A\u201B']/g, "'").replace(/[\u201C\u201D\u201E\u201F"]/g, '"').replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ').trim();
        const mergedMap = new Map<string, any>();
        sqlArticles.forEach((a: any) => {
          mergedMap.set(String(a.id), a);
          const tk = cleanT(a.title);
          if (tk) mergedMap.set(`t_${tk}`, a);
        });

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
        return finalCombined;
      }

      return sqlArticles;
    }
  } catch (err) {
    console.warn('[serverArticlesStore] MySQL read notice, checking JSON fallback:', err);
  }

  // Fallback to JSON Database
  return readJsonArticles();
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
    rejectionReason: isPendingOrPublished ? undefined : article.rejectionReason,
    rejection_reason: isPendingOrPublished ? undefined : article.rejection_reason,
    rejectedAt: isPendingOrPublished ? undefined : article.rejectedAt,
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
        const merged = { ...a, ...sanitizedArticle, id: a.id || sanitizedArticle.id };
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
    const seoJson = Object.keys(finalSeo).length > 0 ? JSON.stringify(finalSeo) : (sanitizedArticle.seo ? JSON.stringify(sanitizedArticle.seo) : null);

    const authorName = sanitizedArticle.authorName || sanitizedArticle.author || 'Staff Journalist';
    const authorAvatar = sanitizedArticle.authorAvatar || '/author_bluesuit.jpg';
    const authorBio = sanitizedArticle.authorBio || `${authorName} is a journalist for Digital Journal.`;
    const authorEmail = sanitizedArticle.authorEmail || sanitizedArticle.author_email || 'writer@digitaljournal.com';
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
      const normTitle = cleanTitle.replace(/[\u2018\u2019\u201A\u201B']/g, "'").replace(/[\u201C\u201D\u201E\u201F"]/g, '"');
      const [chkTitle]: any = await db.query(
        'SELECT id FROM articles WHERE LOWER(TRIM(title)) = LOWER(TRIM(?)) OR LOWER(TRIM(title)) = LOWER(TRIM(?)) LIMIT 1',
        [cleanTitle, normTitle]
      );
      if (chkTitle && chkTitle.length > 0) {
        isExisting = true;
        targetId = chkTitle[0].id;
      }
    }
    if (!isExisting && (sanitizedArticle.original_title || sanitizedArticle.previousTitle)) {
      const origT = String(sanitizedArticle.original_title || sanitizedArticle.previousTitle).trim();
      const normOrigT = origT.replace(/[\u2018\u2019\u201A\u201B']/g, "'").replace(/[\u201C\u201D\u201E\u201F"]/g, '"');
      const [chkOrig]: any = await db.query(
        'SELECT id FROM articles WHERE LOWER(TRIM(title)) = LOWER(TRIM(?)) OR LOWER(TRIM(title)) = LOWER(TRIM(?)) LIMIT 1',
        [origT, normOrigT]
      );
      if (chkOrig && chkOrig.length > 0) {
        isExisting = true;
        targetId = chkOrig[0].id;
      }
    }

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
          published_at = IF(? = 'Published', NOW(), published_at),
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
        status,
        targetId
      ]);
    } else {
      await db.query(`
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
    }
  } catch (err) {
    console.warn('[serverArticlesStore] MySQL upsert notice:', err);
  }

  return readArticlesStore();
}

export async function updateArticleStatusStore(id: string | number, status: string): Promise<ArticleRecord[]> {
  try {
    const jsonArticles = readJsonArticles();
    const updatedJson = jsonArticles.map((a: any) => {
      if (String(a.id) === String(id) || String(a.slug) === String(id)) {
        const up: any = { ...a, status, updated_at: new Date().toISOString() };
        if (status === "Pending review" || status === "Published") {
          delete up.rejectionReason;
          delete up.rejection_reason;
          delete up.rejectedAt;
        }
        return up;
      }
      return a;
    });
    writeJsonArticles(updatedJson);
  } catch (e) {}

  try {
    const db = getDbPool();
    if (status.toLowerCase() === 'published') {
      await db.query('UPDATE articles SET status = ?, published_at = NOW(), updated_at = NOW() WHERE id = ? OR slug = ?', [status, id, String(id)]);
    } else {
      await db.query('UPDATE articles SET status = ?, updated_at = NOW() WHERE id = ? OR slug = ?', [status, id, String(id)]);
    }
  } catch (err) {
    console.warn('[serverArticlesStore] MySQL update status notice:', err);
  }
  return readArticlesStore();
}

export async function deleteArticleStore(id: string | number): Promise<ArticleRecord[]> {
  try {
    const jsonArticles = readJsonArticles();
    const filtered = jsonArticles.filter(a => String(a.id) !== String(id) && String(a.slug) !== String(id));
    writeJsonArticles(filtered);
  } catch (e) {}

  try {
    const db = getDbPool();
    await db.query('DELETE FROM articles WHERE id = ? OR slug = ?', [id, String(id)]);
  } catch (err) {
    console.warn('[serverArticlesStore] MySQL delete notice:', err);
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
