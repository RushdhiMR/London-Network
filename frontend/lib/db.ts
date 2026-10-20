import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

export interface UserRow {
  id: number;
  name: string;
  email: string;
  password_hash?: string | null;
  provider: string;
  google_id?: string | null;
  role: 'reader' | 'writer' | 'admin';
  avatar?: string | null;
  bio?: string | null;
  linkedin?: string | null;
  email_verified: boolean | number;
  is_default_admin?: boolean | number;
  reset_token?: string | null;
  reset_token_expires?: string | Date | null;
  created_at?: string | Date;
  updated_at?: string | Date;
}

let pool: mysql.Pool | null = null;

const DB_JSON_PATH = path.join(process.cwd(), 'data', 'digital_journal_db.json');

export interface SubscriberRow {
  id: number | string;
  email: string;
  topics: string[];
  date: string;
  status: string;
  created_at?: string;
}

export interface ContactSubmissionRow {
  id: string | number;
  date: string;
  name: string;
  company?: string;
  email: string;
  phone?: string;
  whatsapp?: string;
  type: "Editorial" | "Advertising" | "General Inquiry" | "Feedback" | "Press Release";
  message: string;
  status: "New" | "In Review" | "Resolved" | "Archived";
  created_at?: string;
}

export interface AdvertiseLeadRow {
  id: string | number;
  date: string;
  submitterName: string;
  company: string;
  email: string;
  phone?: string;
  whatsapp?: string;
  serviceOption: string;
  requirements: string;
  budget?: string;
  status: "New" | "In Discussion" | "Qualified" | "Closed";
  created_at?: string;
}

export type SubscriptionPlanId = 'digital' | 'bundle';
export type SubscriptionStatus = 'Free Trial' | 'Active Paid' | 'Expired' | 'Cancelled' | 'Payment Pending';

export interface SiteSubscriptionRow {
  id: string | number;
  userId?: number | string | null;
  name: string;
  email: string;
  phone?: string | null;
  plan: SubscriptionPlanId;
  planName: string;
  price: string;
  startDate: string;
  trialExpiryDate: string;
  status: SubscriptionStatus;
  paymentStatus: 'Free Trial' | 'Paid' | 'Pending' | 'None';
  paymentAmount: string;
  renewalDate: string;
  created_at?: string;
  updated_at?: string;
}

const DEFAULT_ADVERTISE_LEADS: AdvertiseLeadRow[] = [
  {
    id: "lead-5001",
    date: "Aug 11, 11:30 AM",
    submitterName: "Rachel Vance",
    company: "NVIDIA Enterprise",
    email: "rvance@nvidia.com",
    phone: "P: +1 (408) 486-2000",
    whatsapp: "W: +1 (408) 486-2000",
    serviceOption: "Banner Ads",
    requirements: "Requesting Header Top Leaderboard placement for Q4 Enterprise AI launch campaign...",
    budget: "$25,000 / mo",
    status: "In Discussion"
  },
  {
    id: "lead-5002",
    date: "Aug 09, 03:45 PM",
    submitterName: "David Miller",
    company: "Palantir Tech",
    email: "dmiller@palantir.com",
    phone: "P: +1 (650) 841-4000",
    whatsapp: "W: N/A",
    serviceOption: "Sponsored Articles",
    requirements: "Sponsorship slot for multi-part editorial series on Foundry data infrastructure.",
    budget: "$15,000 / mo",
    status: "Qualified"
  },
  {
    id: "lead-5003",
    date: "Aug 07, 09:20 AM",
    submitterName: "Marcus Vance",
    company: "AWS Cloud Solutions",
    email: "mvance@amazon.com",
    phone: "P: +1 (206) 266-1000",
    whatsapp: "W: +1 (206) 266-1000",
    serviceOption: "Newsletter Takeover",
    requirements: "Exclusive newsletter banner placement for re:Invent conference announcements.",
    budget: "$18,500 / mo",
    status: "New"
  },
  {
    id: "lead-5004",
    date: "Aug 04, 01:10 PM",
    submitterName: "Elena Rostova",
    company: "Bloomberg Media",
    email: "erostova@bloomberg.net",
    phone: "P: +1 (212) 318-2000",
    whatsapp: "W: +1 (212) 318-2000",
    serviceOption: "Brand Partnership",
    requirements: "Joint content syndication and co-branded webinar sponsorship package.",
    budget: "$30,000 / mo",
    status: "Closed"
  }
];

const DEFAULT_CONTACT_SUBMISSIONS: ContactSubmissionRow[] = [
  {
    id: "cs-101",
    date: "Jul 27, 09:07 PM",
    name: "SORORIA",
    company: "N/A",
    email: "rij102008sororia@outlook.com",
    phone: "P: 000 000 0000",
    whatsapp: "W: 000 000 0000",
    type: "Editorial",
    message: "Policy and structure Although our publication standards require verified sources, we would like to inquire about publishing syndication arrangements...",
    status: "New"
  },
  {
    id: "cs-102",
    date: "Aug 11, 10:14 AM",
    name: "Robert Taylor",
    company: "Apex Media Partners",
    email: "rtaylor@apex.io",
    phone: "P: +1 (555) 234-5678",
    whatsapp: "W: +1 (555) 234-5678",
    type: "Advertising",
    message: "We are interested in booking the Header Top Leaderboard slot for Q4 enterprise campaign targeting AI startups.",
    status: "In Review"
  },
  {
    id: "cs-103",
    date: "Aug 10, 04:30 PM",
    name: "Dr. Aris Thorne",
    company: "MIT Media Lab",
    email: "athorne@mit.edu",
    phone: "P: +1 (617) 253-1000",
    whatsapp: "W: N/A",
    type: "Editorial",
    message: "Submitting a research breakthrough paper on quantum semiconductor nodes for review by your technology editorial desk.",
    status: "New"
  },
  {
    id: "cs-104",
    date: "Aug 08, 02:15 PM",
    name: "Sarah Jenkins",
    company: "Global Tech Foundation",
    email: "sjenkins@globaltech.org",
    phone: "P: +44 20 7946 0912",
    whatsapp: "W: +44 20 7946 0912",
    type: "General Inquiry",
    message: "Inquiry regarding press accreditation for the upcoming International Digital Journalism Conference in London.",
    status: "Resolved"
  }
];

interface DeletedUserProfile {
  email: string;
  name?: string;
  avatar?: string | null;
  bio?: string | null;
  linkedin?: string | null;
  role?: string;
  deleted_at: string;
}

let inMemoryJsonDbCache: any = null;
let inMemoryJsonDbCacheTime = 0;
const JSON_CACHE_TTL_MS = 10000; // 10 seconds in-memory cache

function readJsonDb(): { users: UserRow[]; articles: any[]; deleted_emails: string[]; deleted_user_profiles: Record<string, DeletedUserProfile>; subscribers: SubscriberRow[]; contact_submissions: ContactSubmissionRow[]; advertise_leads: AdvertiseLeadRow[]; site_subscriptions: SiteSubscriptionRow[] } {
  if (inMemoryJsonDbCache && (Date.now() - inMemoryJsonDbCacheTime < JSON_CACHE_TTL_MS)) {
    return inMemoryJsonDbCache;
  }
  try {
    if (fs.existsSync(DB_JSON_PATH)) {
      const raw = fs.readFileSync(DB_JSON_PATH, 'utf-8');
      if (raw && raw.trim()) {
        let parsed: any = null;
        try {
          parsed = JSON.parse(raw);
        } catch (parseErr) {
          parsed = null;
        }
        if (parsed && typeof parsed === 'object') {
          const result = {
            users: Array.isArray(parsed.users) ? parsed.users : [],
            articles: Array.isArray(parsed.articles) ? parsed.articles : [],
            deleted_emails: Array.isArray(parsed.deleted_emails) ? parsed.deleted_emails : [],
            deleted_user_profiles: (parsed.deleted_user_profiles && typeof parsed.deleted_user_profiles === 'object' && !Array.isArray(parsed.deleted_user_profiles)) ? parsed.deleted_user_profiles : {},
            subscribers: Array.isArray(parsed.subscribers) ? parsed.subscribers : [],
            contact_submissions: Array.isArray(parsed.contact_submissions) && parsed.contact_submissions.length > 0 
              ? parsed.contact_submissions 
              : DEFAULT_CONTACT_SUBMISSIONS,
            advertise_leads: Array.isArray(parsed.advertise_leads) && parsed.advertise_leads.length > 0
              ? parsed.advertise_leads
              : DEFAULT_ADVERTISE_LEADS,
            site_subscriptions: Array.isArray(parsed.site_subscriptions) ? parsed.site_subscriptions : []
          };
          inMemoryJsonDbCache = result;
          inMemoryJsonDbCacheTime = Date.now();
          return result;
        }
      }
    }
  } catch (err) {
    console.warn('[DB] JSON fallback read warning:', err);
  }
  return { users: [], articles: [], deleted_emails: [], deleted_user_profiles: {}, subscribers: [], contact_submissions: DEFAULT_CONTACT_SUBMISSIONS, advertise_leads: DEFAULT_ADVERTISE_LEADS, site_subscriptions: [] };
}

function writeJsonDb(data: { users: UserRow[]; articles: any[]; deleted_emails?: string[]; deleted_user_profiles?: Record<string, DeletedUserProfile>; subscribers?: SubscriberRow[]; contact_submissions?: ContactSubmissionRow[]; advertise_leads?: AdvertiseLeadRow[]; site_subscriptions?: SiteSubscriptionRow[] }) {
  inMemoryJsonDbCache = data;
  inMemoryJsonDbCacheTime = Date.now();
  try {
    const dir = path.dirname(DB_JSON_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const tmpFile = `${DB_JSON_PATH}.tmp.${Date.now()}`;
    fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), 'utf-8');
    try {
      fs.renameSync(tmpFile, DB_JSON_PATH);
    } catch {
      fs.writeFileSync(DB_JSON_PATH, JSON.stringify(data, null, 2), 'utf-8');
      if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
    }
  } catch (err) {
    console.warn('[DB] JSON fallback write warning:', err);
  }
}

let tableInitialized = false;

async function ensureMysqlTable(db: mysql.Pool) {
  if (tableInitialized) return;
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NULL,
        provider VARCHAR(50) DEFAULT 'local',
        google_id VARCHAR(255) NULL,
        role ENUM('reader', 'writer', 'admin') DEFAULT 'reader',
        is_default_admin TINYINT(1) DEFAULT 0,
        email_verified TINYINT(1) DEFAULT 1,
        reset_token VARCHAR(255) NULL,
        reset_token_expires DATETIME NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS deleted_users (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS deleted_user_profiles (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        name VARCHAR(255) NULL,
        avatar VARCHAR(1000) NULL,
        bio TEXT NULL,
        linkedin VARCHAR(500) NULL,
        role VARCHAR(50) NULL,
        deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS site_subscriptions (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT NULL,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        plan VARCHAR(50) NOT NULL,
        plan_name VARCHAR(255) NOT NULL,
        price VARCHAR(50) NOT NULL,
        start_date DATETIME NOT NULL,
        trial_expiry_date DATETIME NOT NULL,
        status VARCHAR(50) DEFAULT 'Free Trial',
        payment_status VARCHAR(50) DEFAULT 'Free Trial',
        payment_amount VARCHAR(50) DEFAULT '$0.00',
        renewal_date DATETIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_sub_email (email)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    tableInitialized = true;
  } catch (err) {
    // If MySQL connection not available, fallback is active
  }
}

let lastMysqlFailureTime = 0;
const MYSQL_COOLDOWN_MS = 15000;

export function shouldAttemptMysql(): boolean {
  const isVercel = Boolean(process.env.VERCEL || process.env.NEXT_PUBLIC_VERCEL_ENV);
  const host = (process.env.DB_HOST || '127.0.0.1').toLowerCase();
  // On Vercel serverless, localhost MySQL is unreachable.
  if (isVercel && (host === 'localhost' || host === '127.0.0.1')) {
    return false;
  }
  return true;
}

export function isMysqlAvailable(): boolean {
  if (!shouldAttemptMysql()) return false;
  if (lastMysqlFailureTime > 0 && Date.now() - lastMysqlFailureTime < MYSQL_COOLDOWN_MS) {
    return false;
  }
  return true;
}

export function recordMysqlFailure(): void {
  lastMysqlFailureTime = Date.now();
}

const globalForDb = globalThis as unknown as { mysqlPool: mysql.Pool | undefined };

export function getDbPool(): mysql.Pool {
  if (!globalForDb.mysqlPool) {
    globalForDb.mysqlPool = mysql.createPool({
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'digital_journal_db',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      connectTimeout: 1500,
    });
    if (isMysqlAvailable()) {
      ensureMysqlTable(globalForDb.mysqlPool).catch(() => recordMysqlFailure());
    }
  }
  return globalForDb.mysqlPool;
}

export const DB = {
  async getUserByEmail(email: string): Promise<UserRow | null> {
    const norm = (email || '').trim().toLowerCase();
    if (!norm) return null;

    // 1. Try MySQL Database
    if (isMysqlAvailable()) {
      try {
        const db = getDbPool();
        await ensureMysqlTable(db);
        const [rows]: any = await db.query(
          'SELECT * FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1',
          [norm]
        );
        if (Array.isArray(rows) && rows.length > 0) {
          return rows[0] as UserRow;
        }
      } catch (e) {
        recordMysqlFailure();
      }
    }

    // 2. Persistent Storage Lookup
    const jsonDb = readJsonDb();
    const found = jsonDb.users.find(u => (u.email || '').trim().toLowerCase() === norm);
    return found || null;
  },

  async getUserById(id: number | string): Promise<UserRow | null> {
    if (!id) return null;
    const numId = Number(id);

    // 1. Try MySQL Database
    if (!isNaN(numId) && isMysqlAvailable()) {
      try {
        const db = getDbPool();
        const [rows]: any = await db.query(
          'SELECT * FROM users WHERE id = ? LIMIT 1',
          [numId]
        );
        if (Array.isArray(rows) && rows.length > 0) {
          return rows[0] as UserRow;
        }
      } catch (e) {
        recordMysqlFailure();
      }
    }

    // 2. Persistent Storage Lookup
    const jsonDb = readJsonDb();
    const found = jsonDb.users.find(u => 
      String(u.id) === String(id) || 
      (!isNaN(numId) && u.id === numId) ||
      (typeof id === 'string' && (u.email || '').toLowerCase() === id.toLowerCase())
    );
    return found || null;
  },

  async getAllUsers(): Promise<UserRow[]> {
    const jsonDb = readJsonDb();
    let mysqlUsers: any[] = [];

    // 1. Try MySQL Database
    if (isMysqlAvailable()) {
      try {
        const db = getDbPool();
        const [rows]: any = await db.query(
          'SELECT id, name, email, role, provider, email_verified, is_default_admin, created_at, updated_at FROM users ORDER BY id ASC'
        );
        if (Array.isArray(rows)) {
          mysqlUsers = rows;
        }
      } catch (e) {
        recordMysqlFailure();
      }
    }

    // 2. Bidirectional Merge: MySQL + JSON Database
    const mergedMap = new Map<string, UserRow>();

    // First add from JSON DB
    if (Array.isArray(jsonDb.users)) {
      for (const u of jsonDb.users) {
        if (u && u.email) {
          mergedMap.set(u.email.toLowerCase().trim(), u);
        }
      }
    }

    // Then merge with MySQL (MySQL takes precedence for id/updated_at, but preserves any new users in JSON)
    for (const m of mysqlUsers) {
      if (m && m.email) {
        const key = m.email.toLowerCase().trim();
        const existing = mergedMap.get(key);
        mergedMap.set(key, {
          ...(existing || {}),
          ...m,
          role: (m.role || existing?.role || 'reader').toLowerCase(),
        });
      }
    }

    const merged = Array.from(mergedMap.values());

    // Sync any missing JSON users back into MySQL if MySQL pool is active
    if (mysqlUsers.length > 0) {
      try {
        const db = getDbPool();
        const mysqlEmailSet = new Set(mysqlUsers.map(m => (m.email || '').toLowerCase().trim()));
        for (const u of merged) {
          if (u.email && !mysqlEmailSet.has(u.email.toLowerCase().trim())) {
            await db.query(
              `INSERT IGNORE INTO users (name, email, password_hash, role, provider, email_verified) VALUES (?, ?, ?, ?, ?, ?)`,
              [u.name || u.email.split('@')[0], u.email.toLowerCase().trim(), u.password_hash || null, (u.role || 'reader').toLowerCase(), u.provider || 'local', 1]
            );
          }
        }
      } catch (e) {}
    }

    writeJsonDb({ ...jsonDb, users: merged });
    return merged;
  },

  async createUser(userData: {
    name: string;
    email: string;
    password_hash?: string | null;
    role?: 'reader' | 'writer' | 'admin';
    provider?: string;
    google_id?: string | null;
    email_verified?: boolean | number;
    avatar?: string | null;
  }): Promise<UserRow> {
    const norm = (userData.email || '').trim().toLowerCase();
    const role = userData.role || 'reader';
    const provider = userData.provider || 'local';
    const verified = userData.email_verified ? 1 : 0;
    const now = new Date().toISOString();

    // Check for a previously saved profile for this email (from a prior deletion)
    const savedProfile = await this.getDeletedUserProfile(norm);

    // Merge saved profile data: restore avatar, bio, linkedin if the new account has none
    const restoredAvatar = userData.avatar || savedProfile?.avatar || null;
    const restoredRole = (userData.role && userData.role !== 'reader') ? userData.role : ((savedProfile?.role as any) || role);

    let newId = Date.now();

    // 1. Insert into MySQL if available
    try {
      const db = getDbPool();
      const [result]: any = await db.query(
        `INSERT INTO users (name, email, password_hash, role, provider, google_id, email_verified, avatar)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userData.name.trim(),
          norm,
          userData.password_hash || null,
          restoredRole,
          provider,
          userData.google_id || null,
          verified,
          restoredAvatar || null,
        ]
      );
      if (result && result.insertId) {
        newId = result.insertId;
      }
    } catch (e) {
      console.warn('[DB.createUser] MySQL sync notice:', e);
    }

    const newUser: UserRow = {
      id: newId,
      name: userData.name.trim(),
      email: norm,
      password_hash: userData.password_hash || null,
      role: restoredRole as any,
      provider,
      google_id: userData.google_id || null,
      email_verified: verified,
      avatar: restoredAvatar,
      // Restore additional profile fields if saved
      ...(savedProfile?.bio ? { bio: savedProfile.bio } : {}),
      ...(savedProfile?.linkedin ? { linkedin: savedProfile.linkedin } : {}),
      created_at: now,
      updated_at: now,
    };

    // 2. Un-blacklist email if it was previously deleted/revoked
    await this.unblacklistEmail(norm);

    // 3. Persist to Database JSON storage
    const jsonDb = readJsonDb();
    const existingIndex = jsonDb.users.findIndex(u => u.email.toLowerCase() === norm);
    if (existingIndex >= 0) {
      jsonDb.users[existingIndex] = { ...jsonDb.users[existingIndex], ...newUser };
    } else {
      jsonDb.users.push(newUser);
    }
    writeJsonDb(jsonDb);

    // 4. Also update MySQL with restored profile fields if available
    if (savedProfile?.bio || savedProfile?.linkedin) {
      try {
        const db = getDbPool();
        const extraFields: string[] = [];
        const extraVals: any[] = [];
        if (savedProfile.bio) { extraFields.push('bio = ?'); extraVals.push(savedProfile.bio); }
        if (savedProfile.linkedin) { extraFields.push('linkedin = ?'); extraVals.push(savedProfile.linkedin); }
        if (extraFields.length > 0) {
          extraVals.push(norm);
          await db.query(`UPDATE users SET ${extraFields.join(', ')} WHERE LOWER(email) = LOWER(?)`, extraVals);
        }
      } catch (e) {}
    }

    return newUser;
  },

  async isEmailDeleted(email: string): Promise<boolean> {
    const norm = (email || '').trim().toLowerCase();
    if (!norm) return false;

    // 1. Check MySQL deleted_users table
    try {
      const db = getDbPool();
      const [rows]: any = await db.query(
        'SELECT email FROM deleted_users WHERE LOWER(email) = LOWER(?) LIMIT 1',
        [norm]
      );
      if (Array.isArray(rows) && rows.length > 0) {
        return true;
      }
    } catch (e) {}

    // 2. Check JSON database
    const jsonDb = readJsonDb();
    if (Array.isArray(jsonDb.deleted_emails)) {
      return jsonDb.deleted_emails.some(e => (e || '').toLowerCase().trim() === norm);
    }

    return false;
  },

  async blacklistDeletedEmail(email: string): Promise<void> {
    const norm = (email || '').trim().toLowerCase();
    if (!norm) return;

    // 1. Insert into MySQL
    try {
      const db = getDbPool();
      await db.query(
        'INSERT IGNORE INTO deleted_users (email) VALUES (?)',
        [norm]
      );
    } catch (e) {}

    // 2. Insert into JSON storage
    const jsonDb = readJsonDb();
    const currentList = Array.isArray(jsonDb.deleted_emails) ? jsonDb.deleted_emails : [];
    if (!currentList.some(e => (e || '').toLowerCase().trim() === norm)) {
      currentList.push(norm);
      jsonDb.deleted_emails = currentList;
      writeJsonDb(jsonDb);
    }
  },

  async unblacklistEmail(email: string): Promise<void> {
    const norm = (email || '').trim().toLowerCase();
    if (!norm) return;

    // 1. Remove from MySQL
    try {
      const db = getDbPool();
      await db.query(
        'DELETE FROM deleted_users WHERE LOWER(email) = LOWER(?)',
        [norm]
      );
    } catch (e) {}

    // 2. Remove from JSON storage
    const jsonDb = readJsonDb();
    if (Array.isArray(jsonDb.deleted_emails)) {
      jsonDb.deleted_emails = jsonDb.deleted_emails.filter(e => (e || '').toLowerCase().trim() !== norm);
      writeJsonDb(jsonDb);
    }
  },

  async updateUser(id: number | string, updates: Partial<UserRow>, optionalEmail?: string): Promise<UserRow | null> {
    const numId = Number(id);
    const now = new Date().toISOString();
    const cleanEmail = (optionalEmail || (updates.email as string) || '').trim().toLowerCase();

    // 1. Update MySQL
    let targetNumId = !isNaN(numId) ? numId : null;
    try {
      const db = getDbPool();
      if (!targetNumId && cleanEmail) {
        const [rows]: any = await db.query('SELECT id FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1', [cleanEmail]);
        if (Array.isArray(rows) && rows.length > 0) {
          targetNumId = rows[0].id;
        }
      }

      if (targetNumId) {
        const fields: string[] = [];
        const values: any[] = [];

        if (updates.name !== undefined) {
          fields.push('name = ?');
          values.push(updates.name);
        }
        if (updates.email !== undefined) {
          fields.push('email = ?');
          values.push(updates.email.trim().toLowerCase());
        }
        if (updates.password_hash !== undefined) {
          fields.push('password_hash = ?');
          values.push(updates.password_hash);
        }
        if (updates.role !== undefined) {
          fields.push('role = ?');
          values.push(updates.role);
        }
        if (updates.provider !== undefined) {
          fields.push('provider = ?');
          values.push(updates.provider);
        }
        if (updates.google_id !== undefined) {
          fields.push('google_id = ?');
          values.push(updates.google_id);
        }
        if (updates.avatar !== undefined) {
          fields.push('avatar = ?');
          values.push(updates.avatar);
        }
        if (updates.email_verified !== undefined) {
          fields.push('email_verified = ?');
          values.push(updates.email_verified ? 1 : 0);
        }
        if (updates.reset_token !== undefined) {
          fields.push('reset_token = ?');
          values.push(updates.reset_token);
        }
        if (updates.reset_token_expires !== undefined) {
          fields.push('reset_token_expires = ?');
          values.push(updates.reset_token_expires);
        }

        if (fields.length > 0) {
          values.push(targetNumId);
          await db.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
        }
      }
    } catch (e) {
      console.warn('[DB.updateUser] MySQL sync notice:', e);
    }

    // 2. Update persistent JSON storage
    const jsonDb = readJsonDb();
    const index = jsonDb.users.findIndex(u => 
      (targetNumId !== null && u.id === targetNumId) ||
      String(u.id) === String(id) || 
      (!isNaN(numId) && u.id === numId) ||
      (cleanEmail && (u.email || '').trim().toLowerCase() === cleanEmail)
    );

    let updatedResult: UserRow;
    if (index >= 0) {
      jsonDb.users[index] = {
        ...jsonDb.users[index],
        ...updates,
        updated_at: now,
      };
      updatedResult = jsonDb.users[index];
    } else {
      const newUser: UserRow = {
        id: targetNumId || (!isNaN(numId) ? numId : Date.now()),
        name: updates.name || 'User',
        email: (updates.email || cleanEmail).toLowerCase().trim(),
        role: updates.role || 'reader',
        provider: updates.provider || 'local',
        email_verified: 1,
        ...updates,
        created_at: now,
        updated_at: now,
      };
      jsonDb.users.push(newUser);
      updatedResult = newUser;
    }

    // 3. Keep author's articles in sync if name or email changed
    if (cleanEmail && (updates.name || updates.email)) {
      if (Array.isArray(jsonDb.articles)) {
        for (const art of jsonDb.articles) {
          const artEmail = (art.author_email || art.authorEmail || '').trim().toLowerCase();
          if (artEmail === cleanEmail) {
            if (updates.name) {
              art.author_name = updates.name;
              art.authorName = updates.name;
            }
            if (updates.email) {
              art.author_email = updates.email.trim().toLowerCase();
              art.authorEmail = updates.email.trim().toLowerCase();
            }
          }
        }
      }

      try {
        const db = getDbPool();
        const artFields: string[] = [];
        const artVals: any[] = [];
        if (updates.name) {
          artFields.push('author_name = ?');
          artVals.push(updates.name);
        }
        if (updates.email) {
          artFields.push('author_email = ?');
          artVals.push(updates.email.trim().toLowerCase());
        }
        if (artFields.length > 0) {
          artVals.push(cleanEmail);
          await db.query(`UPDATE articles SET ${artFields.join(', ')} WHERE LOWER(author_email) = LOWER(?)`, artVals);
        }
      } catch (e) {}
    }

    writeJsonDb(jsonDb);
    return updatedResult;
  },

  async deleteUser(id: number | string, optionalEmail?: string): Promise<boolean> {
    const numId = Number(id);
    let affected = false;

    // Resolve email of target user
    let targetEmail = (optionalEmail || '').trim().toLowerCase();
    let userToDelete: UserRow | null = null;
    if (!targetEmail || true) {
      userToDelete = await this.getUserById(id);
      if (!userToDelete && targetEmail) {
        userToDelete = await this.getUserByEmail(targetEmail);
      }
      if (userToDelete?.email) {
        targetEmail = userToDelete.email.trim().toLowerCase();
      }
    }

    // Save the user's profile data BEFORE deleting, so it can be restored on re-registration
    if (targetEmail && userToDelete) {
      await this.saveDeletedUserProfile({
        email: targetEmail,
        name: userToDelete.name,
        avatar: (userToDelete as any).avatar || null,
        bio: (userToDelete as any).bio || null,
        linkedin: (userToDelete as any).linkedin || null,
        role: userToDelete.role,
      });
    }

    // 1. Delete from MySQL
    try {
      const db = getDbPool();
      let result: any;
      if (!isNaN(numId)) {
        [result] = await db.query('DELETE FROM users WHERE id = ?', [numId]);
      } else {
        [result] = await db.query('DELETE FROM users WHERE LOWER(email) = LOWER(?)', [String(id).toLowerCase()]);
      }
      if (result && result.affectedRows > 0) {
        affected = true;
      }
    } catch (e) {
      console.warn('[DB.deleteUser] MySQL sync notice:', e);
    }

    // 2. Delete from persistent JSON storage
    const jsonDb = readJsonDb();
    const initialLen = jsonDb.users.length;
    jsonDb.users = jsonDb.users.filter(u => 
      String(u.id) !== String(id) && 
      (isNaN(numId) || u.id !== numId) &&
      (u.email || '').toLowerCase() !== String(id).toLowerCase()
    );

    if (jsonDb.users.length < initialLen) {
      affected = true;
    }

    // NOTE: We do NOT blacklist the email — deletion preserves profile data
    // so the user can re-register and have their previous data restored.

    writeJsonDb(jsonDb);
    return affected;
  },

  async saveDeletedUserProfile(profile: { email: string; name?: string; avatar?: string | null; bio?: string | null; linkedin?: string | null; role?: string }): Promise<void> {
    const norm = (profile.email || '').trim().toLowerCase();
    if (!norm) return;
    const now = new Date().toISOString();

    // Save to MySQL
    try {
      const db = getDbPool();
      await db.query(
        `INSERT INTO deleted_user_profiles (email, name, avatar, bio, linkedin, role, deleted_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE
           name = VALUES(name),
           avatar = VALUES(avatar),
           bio = VALUES(bio),
           linkedin = VALUES(linkedin),
           role = VALUES(role),
           deleted_at = NOW()`,
        [norm, profile.name || null, profile.avatar || null, profile.bio || null, profile.linkedin || null, profile.role || null]
      );
    } catch (e) {}

    // Save to JSON
    const jsonDb = readJsonDb();
    if (!jsonDb.deleted_user_profiles) jsonDb.deleted_user_profiles = {};
    jsonDb.deleted_user_profiles[norm] = {
      email: norm,
      name: profile.name,
      avatar: profile.avatar,
      bio: profile.bio,
      linkedin: profile.linkedin,
      role: profile.role,
      deleted_at: now,
    };
    writeJsonDb(jsonDb);
  },

  async getDeletedUserProfile(email: string): Promise<DeletedUserProfile | null> {
    const norm = (email || '').trim().toLowerCase();
    if (!norm) return null;

    // Check MySQL first
    try {
      const db = getDbPool();
      const [rows]: any = await db.query(
        'SELECT * FROM deleted_user_profiles WHERE LOWER(email) = LOWER(?) LIMIT 1',
        [norm]
      );
      if (Array.isArray(rows) && rows.length > 0) {
        return rows[0] as DeletedUserProfile;
      }
    } catch (e) {}

    // Check JSON
    const jsonDb = readJsonDb();
    const profiles = jsonDb.deleted_user_profiles || {};
    return profiles[norm] || null;
  },

  async getAllSubscribers(): Promise<SubscriberRow[]> {
    const jsonDb = readJsonDb();
    const jsonSubs = Array.isArray(jsonDb.subscribers) ? jsonDb.subscribers : [];
    return jsonSubs;
  },

  async addSubscriber(email: string, topics: string[] = ["ALL NEWS"]): Promise<SubscriberRow> {
    const cleanEmail = email.trim().toLowerCase();
    const jsonDb = readJsonDb();
    if (!Array.isArray(jsonDb.subscribers)) jsonDb.subscribers = [];

    const existingIdx = jsonDb.subscribers.findIndex(s => s.email.toLowerCase() === cleanEmail);
    const dateFormatted = new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
    const formattedTopics = Array.isArray(topics) && topics.length > 0
      ? topics.filter(t => t && String(t).trim().length > 0).map(t => String(t).toUpperCase())
      : ["ALL NEWS"];

    if (existingIdx >= 0) {
      jsonDb.subscribers[existingIdx] = {
        ...jsonDb.subscribers[existingIdx],
        topics: formattedTopics,
        date: dateFormatted,
        status: "Active"
      };
      writeJsonDb(jsonDb);
      return jsonDb.subscribers[existingIdx];
    } else {
      const newSub: SubscriberRow = {
        id: Date.now(),
        email: cleanEmail,
        topics: formattedTopics,
        date: dateFormatted,
        status: "Active",
        created_at: new Date().toISOString()
      };
      jsonDb.subscribers.unshift(newSub);
      writeJsonDb(jsonDb);
      return newSub;
    }
  },

  async removeSubscriber(idOrEmail: string | number): Promise<boolean> {
    const jsonDb = readJsonDb();
    if (!Array.isArray(jsonDb.subscribers)) return false;
    const initialLen = jsonDb.subscribers.length;
    const strVal = String(idOrEmail).toLowerCase();
    jsonDb.subscribers = jsonDb.subscribers.filter(s => String(s.id).toLowerCase() !== strVal && s.email.toLowerCase() !== strVal);
    writeJsonDb(jsonDb);
    return jsonDb.subscribers.length < initialLen;
  },

  async updateUserProfile(data: {
    email: string;
    name?: string;
    avatar?: string;
    bio?: string;
    role?: string;
    linkedin?: string;
  }): Promise<any> {
    const cleanEmail = (data.email || '').trim().toLowerCase();
    if (!cleanEmail) return null;

    const jsonDb = readJsonDb();
    if (!Array.isArray(jsonDb.users)) jsonDb.users = [];

    const existingIdx = jsonDb.users.findIndex(u => (u.email || '').toLowerCase().trim() === cleanEmail);
    let updatedUser: any;

    if (existingIdx >= 0) {
      jsonDb.users[existingIdx] = {
        ...jsonDb.users[existingIdx],
        ...(data.name ? { name: data.name } : {}),
        ...(data.avatar ? { avatar: data.avatar } : {}),
        ...(data.bio ? { bio: data.bio } : {}),
        ...(data.role ? { role: data.role as any } : {}),
        ...(data.linkedin ? { linkedin: data.linkedin } : {}),
        updated_at: new Date().toISOString()
      };
      updatedUser = jsonDb.users[existingIdx];
    } else {
      updatedUser = {
        id: Date.now(),
        name: data.name || cleanEmail.split('@')[0],
        email: cleanEmail,
        avatar: data.avatar,
        bio: data.bio,
        role: data.role || 'writer',
        provider: 'local',
        email_verified: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      jsonDb.users.push(updatedUser);
    }
    writeJsonDb(jsonDb);

    // Also update in MySQL if pool is available
    try {
      const db = getDbPool();
      const sqlUpdates: string[] = [];
      const sqlValues: any[] = [];
      if (data.name) {
        sqlUpdates.push('name = ?');
        sqlValues.push(data.name);
      }
      if (data.avatar) {
        sqlUpdates.push('avatar = ?');
        sqlValues.push(data.avatar);
      }
      if (data.role) {
        sqlUpdates.push('role = ?');
        sqlValues.push(data.role);
      }
      if (sqlUpdates.length > 0) {
        sqlValues.push(cleanEmail);
        await db.query(`UPDATE users SET ${sqlUpdates.join(', ')} WHERE LOWER(email) = LOWER(?)`, sqlValues);
      }
    } catch (e) {}

    return updatedUser;
  },

  async getAllContactSubmissions(): Promise<ContactSubmissionRow[]> {
    const jsonDb = readJsonDb();
    return Array.isArray(jsonDb.contact_submissions) ? jsonDb.contact_submissions : DEFAULT_CONTACT_SUBMISSIONS;
  },

  async addContactSubmission(data: {
    name: string;
    company?: string;
    email: string;
    phone?: string;
    whatsapp?: string;
    type?: "Editorial" | "Advertising" | "General Inquiry" | "Feedback" | "Press Release";
    message: string;
  }): Promise<ContactSubmissionRow> {
    const jsonDb = readJsonDb();
    if (!Array.isArray(jsonDb.contact_submissions)) {
      jsonDb.contact_submissions = [...DEFAULT_CONTACT_SUBMISSIONS];
    }

    const now = new Date();
    const formattedDate = now.toLocaleDateString("en-US", { month: "short", day: "2-digit" }) + 
      ", " + now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });

    const newSubmission: ContactSubmissionRow = {
      id: `cs-${Date.now()}`,
      date: formattedDate,
      name: (data.name || "").trim(),
      company: (data.company || "N/A").trim(),
      email: (data.email || "").trim(),
      phone: data.phone ? (data.phone.startsWith("P:") ? data.phone : `P: ${data.phone.trim()}`) : "P: 000 000 0000",
      whatsapp: data.whatsapp ? (data.whatsapp.startsWith("W:") ? data.whatsapp : `W: ${data.whatsapp.trim()}`) : "W: N/A",
      type: data.type || "General Inquiry",
      message: (data.message || "").trim(),
      status: "New",
      created_at: now.toISOString()
    };

    jsonDb.contact_submissions.unshift(newSubmission);
    writeJsonDb(jsonDb);
    return newSubmission;
  },

  async updateContactSubmissionStatus(id: string | number, status: "New" | "In Review" | "Resolved" | "Archived"): Promise<boolean> {
    const jsonDb = readJsonDb();
    if (!Array.isArray(jsonDb.contact_submissions)) return false;
    const strId = String(id);
    const idx = jsonDb.contact_submissions.findIndex(c => String(c.id) === strId);
    if (idx >= 0) {
      jsonDb.contact_submissions[idx].status = status;
      writeJsonDb(jsonDb);
      return true;
    }
    return false;
  },

  async deleteContactSubmission(id: string | number): Promise<boolean> {
    const jsonDb = readJsonDb();
    if (!Array.isArray(jsonDb.contact_submissions)) return false;
    const initialLen = jsonDb.contact_submissions.length;
    const strId = String(id);
    jsonDb.contact_submissions = jsonDb.contact_submissions.filter(c => String(c.id) !== strId);
    writeJsonDb(jsonDb);
    return jsonDb.contact_submissions.length < initialLen;
  },

  async getAllAdvertiseLeads(): Promise<AdvertiseLeadRow[]> {
    const jsonDb = readJsonDb();
    return Array.isArray(jsonDb.advertise_leads) ? jsonDb.advertise_leads : DEFAULT_ADVERTISE_LEADS;
  },

  async addAdvertiseLead(data: {
    submitterName: string;
    company: string;
    email: string;
    phone?: string;
    whatsapp?: string;
    serviceOption?: string;
    requirements: string;
    budget?: string;
  }): Promise<AdvertiseLeadRow> {
    const jsonDb = readJsonDb();
    if (!Array.isArray(jsonDb.advertise_leads)) {
      jsonDb.advertise_leads = [...DEFAULT_ADVERTISE_LEADS];
    }

    const now = new Date();
    const formattedDate = now.toLocaleDateString("en-US", { month: "short", day: "2-digit" }) + 
      ", " + now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });

    const newLead: AdvertiseLeadRow = {
      id: `lead-${Date.now()}`,
      date: formattedDate,
      submitterName: (data.submitterName || "").trim(),
      company: (data.company || "N/A").trim(),
      email: (data.email || "").trim(),
      phone: data.phone ? (data.phone.startsWith("P:") ? data.phone : `P: ${data.phone.trim()}`) : "P: 000 000 0000",
      whatsapp: data.whatsapp ? (data.whatsapp.startsWith("W:") ? data.whatsapp : `W: ${data.whatsapp.trim()}`) : "W: N/A",
      serviceOption: data.serviceOption || "Publish Company Article",
      requirements: (data.requirements || "").trim(),
      budget: data.budget || "Standard",
      status: "New",
      created_at: now.toISOString()
    };

    jsonDb.advertise_leads.unshift(newLead);
    writeJsonDb(jsonDb);
    return newLead;
  },

  async updateAdvertiseLeadStatus(id: string | number, status: "New" | "In Discussion" | "Qualified" | "Closed"): Promise<boolean> {
    const jsonDb = readJsonDb();
    if (!Array.isArray(jsonDb.advertise_leads)) return false;
    const strId = String(id);
    const idx = jsonDb.advertise_leads.findIndex(l => String(l.id) === strId);
    if (idx >= 0) {
      jsonDb.advertise_leads[idx].status = status;
      writeJsonDb(jsonDb);
      return true;
    }
    return false;
  },

  async deleteAdvertiseLead(id: string | number): Promise<boolean> {
    const jsonDb = readJsonDb();
    if (!Array.isArray(jsonDb.advertise_leads)) return false;
    const initialLen = jsonDb.advertise_leads.length;
    const strId = String(id);
    jsonDb.advertise_leads = jsonDb.advertise_leads.filter(l => String(l.id) !== strId);
    writeJsonDb(jsonDb);
    return jsonDb.advertise_leads.length < initialLen;
  },

  // --------------------------------------------------------------------------
  // SITE SUBSCRIPTIONS (One-Year Free Trial & Paid Access)
  // --------------------------------------------------------------------------
  async getAllSiteSubscriptions(): Promise<SiteSubscriptionRow[]> {
    const jsonDb = readJsonDb();
    let subs: SiteSubscriptionRow[] = Array.isArray(jsonDb.site_subscriptions) ? jsonDb.site_subscriptions : [];

    // Automatically check and update expired free trials
    const now = new Date();
    let changed = false;
    subs = subs.map(sub => {
      if (sub.status === 'Free Trial' && new Date(sub.trialExpiryDate).getTime() <= now.getTime()) {
        changed = true;
        return {
          ...sub,
          status: 'Expired' as SubscriptionStatus,
          updated_at: now.toISOString()
        };
      }
      return sub;
    });

    if (changed) {
      jsonDb.site_subscriptions = subs;
      writeJsonDb(jsonDb);
    }

    return subs;
  },

  async getSiteSubscriptionByEmail(email: string): Promise<SiteSubscriptionRow | null> {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail) return null;
    const all = await this.getAllSiteSubscriptions();
    const sub = all.find(s => (s.email || '').toLowerCase().trim() === cleanEmail);
    return sub || null;
  },

  async checkTrialEligibility(email: string, userId?: string | number): Promise<{
    eligible: boolean;
    reason?: string;
    existingSubscription: SiteSubscriptionRow | null;
  }> {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail) {
      return { eligible: false, reason: 'A valid email address is required.', existingSubscription: null };
    }

    const all = await this.getAllSiteSubscriptions();
    const existing = all.find(s => 
      (s.email || '').toLowerCase().trim() === cleanEmail || 
      (userId && s.userId && String(s.userId) === String(userId))
    );

    if (!existing) {
      return { eligible: true, existingSubscription: null };
    }

    if (existing.status === 'Free Trial') {
      const isExpired = new Date(existing.trialExpiryDate).getTime() <= Date.now();
      if (isExpired) {
        return {
          eligible: false,
          reason: 'Your 1-year free trial has ended. Subscribe to continue.',
          existingSubscription: existing
        };
      }
      return {
        eligible: false,
        reason: 'You already have an active 1-year free trial.',
        existingSubscription: existing
      };
    }

    if (existing.status === 'Expired') {
      return {
        eligible: false,
        reason: 'Your free trial has already ended. Please renew to continue.',
        existingSubscription: existing
      };
    }

    if (existing.status === 'Active Paid') {
      return {
        eligible: false,
        reason: 'You already have an active subscription.',
        existingSubscription: existing
      };
    }

    return {
      eligible: false,
      reason: 'Free trial already claimed for this account.',
      existingSubscription: existing
    };
  },

  async createSiteSubscription(data: {
    userId?: number | string | null;
    name: string;
    email: string;
    phone?: string | null;
    plan: SubscriptionPlanId;
  }): Promise<{ success: boolean; subscription?: SiteSubscriptionRow; error?: string }> {
    const cleanEmail = (data.email || '').trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, error: 'A valid email address is required.' };
    }

    const eligibility = await this.checkTrialEligibility(cleanEmail, data.userId || undefined);
    if (!eligibility.eligible) {
      return { success: false, error: eligibility.reason || 'Not eligible for another free trial.' };
    }

    const now = new Date();
    const startDate = now.toISOString();
    // 1-Year Free Access: exactly 1 year from now
    const expDate = new Date(now);
    expDate.setFullYear(expDate.getFullYear() + 1);
    const trialExpiryDate = expDate.toISOString();

    const planName = data.plan === 'bundle' ? 'London BigBen Digital Bundle' : 'London BigBen Digital';
    const price = data.plan === 'bundle' ? '$5 USD/month' : '$3 USD/month';

    const newSub: SiteSubscriptionRow = {
      id: `sub-${Date.now()}`,
      userId: data.userId || null,
      name: (data.name || cleanEmail.split('@')[0]).trim(),
      email: cleanEmail,
      phone: data.phone || null,
      plan: data.plan,
      planName,
      price,
      startDate,
      trialExpiryDate,
      status: 'Free Trial',
      paymentStatus: 'Free Trial',
      paymentAmount: '$0.00',
      renewalDate: trialExpiryDate,
      created_at: startDate,
      updated_at: startDate
    };

    const jsonDb = readJsonDb();
    if (!Array.isArray(jsonDb.site_subscriptions)) {
      jsonDb.site_subscriptions = [];
    }
    jsonDb.site_subscriptions.unshift(newSub);
    writeJsonDb(jsonDb);

    // Save to MySQL if available
    try {
      const db = getDbPool();
      await db.query(`
        INSERT INTO site_subscriptions (
          user_id, name, email, plan, plan_name, price, start_date, trial_expiry_date, status, payment_status, payment_amount, renewal_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        data.userId || null,
        newSub.name,
        newSub.email,
        newSub.plan,
        newSub.planName,
        newSub.price,
        new Date(startDate),
        new Date(trialExpiryDate),
        newSub.status,
        newSub.paymentStatus,
        newSub.paymentAmount,
        new Date(trialExpiryDate)
      ]);
    } catch (e) {
      console.warn('[DB.createSiteSubscription] MySQL sync warning:', e);
    }

    return { success: true, subscription: newSub };
  },

  async updateSiteSubscription(id: string | number, updates: Partial<SiteSubscriptionRow>): Promise<boolean> {
    const jsonDb = readJsonDb();
    if (!Array.isArray(jsonDb.site_subscriptions)) return false;
    const strId = String(id);
    const idx = jsonDb.site_subscriptions.findIndex(s => String(s.id) === strId);
    if (idx >= 0) {
      jsonDb.site_subscriptions[idx] = {
        ...jsonDb.site_subscriptions[idx],
        ...updates,
        updated_at: new Date().toISOString()
      };
      writeJsonDb(jsonDb);

      try {
        const db = getDbPool();
        const setClauses: string[] = [];
        const vals: any[] = [];
        if (updates.status) { setClauses.push('status = ?'); vals.push(updates.status); }
        if (updates.paymentStatus) { setClauses.push('payment_status = ?'); vals.push(updates.paymentStatus); }
        if (updates.paymentAmount) { setClauses.push('payment_amount = ?'); vals.push(updates.paymentAmount); }
        if (updates.plan) { setClauses.push('plan = ?'); vals.push(updates.plan); }
        if (updates.planName) { setClauses.push('plan_name = ?'); vals.push(updates.planName); }
        if (setClauses.length > 0) {
          vals.push(strId);
          await db.query(`UPDATE site_subscriptions SET ${setClauses.join(', ')} WHERE id = ?`, vals);
        }
      } catch (e) {}

      return true;
    }
    return false;
  },

  async deleteSiteSubscription(id: string | number): Promise<boolean> {
    const jsonDb = readJsonDb();
    if (!Array.isArray(jsonDb.site_subscriptions)) return false;
    const strId = String(id);
    const prevLen = jsonDb.site_subscriptions.length;
    jsonDb.site_subscriptions = jsonDb.site_subscriptions.filter(s => String(s.id) !== strId);
    writeJsonDb(jsonDb);

    try {
      const db = getDbPool();
      await db.query('DELETE FROM site_subscriptions WHERE id = ?', [strId]);
    } catch (e) {}

    return jsonDb.site_subscriptions.length < prevLen;
  },

  async renewSiteSubscription(email: string, plan: SubscriptionPlanId): Promise<{
    success: boolean;
    subscription?: SiteSubscriptionRow;
    message: string;
  }> {
    const cleanEmail = (email || '').trim().toLowerCase();
    const all = await this.getAllSiteSubscriptions();
    const existing = all.find(s => (s.email || '').toLowerCase().trim() === cleanEmail);
    const planName = plan === 'bundle' ? 'London BigBen Digital Bundle' : 'London BigBen Digital';
    const price = plan === 'bundle' ? '$5 USD/month' : '$3 USD/month';

    if (existing) {
      const updatedSub: SiteSubscriptionRow = {
        ...existing,
        plan,
        planName,
        price,
        status: 'Payment Pending',
        paymentStatus: 'Pending',
        paymentAmount: plan === 'bundle' ? '$5.00' : '$3.00',
        updated_at: new Date().toISOString()
      };
      await this.updateSiteSubscription(existing.id, updatedSub);
      return {
        success: true,
        subscription: updatedSub,
        message: `Your renewal request for ${planName} has been registered as Payment Pending. Access will be confirmed once payment processing completes.`
      };
    } else {
      const now = new Date();
      const newSub: SiteSubscriptionRow = {
        id: `sub-${Date.now()}`,
        name: cleanEmail.split('@')[0],
        email: cleanEmail,
        plan,
        planName,
        price,
        startDate: now.toISOString(),
        trialExpiryDate: now.toISOString(),
        status: 'Payment Pending',
        paymentStatus: 'Pending',
        paymentAmount: plan === 'bundle' ? '$5.00' : '$3.00',
        renewalDate: now.toISOString(),
        created_at: now.toISOString(),
        updated_at: now.toISOString()
      };
      const jsonDb = readJsonDb();
      if (!Array.isArray(jsonDb.site_subscriptions)) jsonDb.site_subscriptions = [];
      jsonDb.site_subscriptions.unshift(newSub);
      writeJsonDb(jsonDb);
      return {
        success: true,
        subscription: newSub,
        message: `Your subscription renewal has been registered as Payment Pending.`
      };
    }
  }
};

export default getDbPool;
