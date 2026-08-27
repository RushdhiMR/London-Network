import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

export interface UserRow {
  id: number;
  name: string;
  email: string;
  password?: string | null;
  password_hash?: string | null;
  provider: string;
  google_id?: string | null;
  role: 'reader' | 'writer' | 'admin';
  email_verified: boolean | number;
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

function readJsonDb(): { users: UserRow[]; articles: any[]; deleted_emails: string[]; subscribers: SubscriberRow[] } {
  try {
    if (fs.existsSync(DB_JSON_PATH)) {
      const raw = fs.readFileSync(DB_JSON_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      return {
        users: Array.isArray(parsed.users) ? parsed.users : [],
        articles: Array.isArray(parsed.articles) ? parsed.articles : [],
        deleted_emails: Array.isArray(parsed.deleted_emails) ? parsed.deleted_emails : [],
        subscribers: Array.isArray(parsed.subscribers) ? parsed.subscribers : []
      };
    }
  } catch (err) {
    console.warn('[DB] JSON fallback read warning:', err);
  }
  return { users: [], articles: [], deleted_emails: [], subscribers: [] };
}

function writeJsonDb(data: { users: UserRow[]; articles: any[]; deleted_emails?: string[]; subscribers?: SubscriberRow[] }) {
  try {
    const dir = path.dirname(DB_JSON_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_JSON_PATH, JSON.stringify(data, null, 2), 'utf-8');
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
        password VARCHAR(255) NULL,
        password_hash VARCHAR(255) NULL,
        provider VARCHAR(50) DEFAULT 'local',
        google_id VARCHAR(255) NULL,
        role ENUM('reader', 'writer', 'admin') DEFAULT 'reader',
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

    tableInitialized = true;
  } catch (err) {
    // If MySQL connection not available, fallback is active
  }
}

export function getDbPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'digital_journal_db',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      connectTimeout: 2000,
    });
    ensureMysqlTable(pool);
  }
  return pool;
}

export const DB = {
  async getUserByEmail(email: string): Promise<UserRow | null> {
    const norm = (email || '').trim().toLowerCase();
    if (!norm) return null;

    // 1. Try MySQL Database
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
      // MySQL unavailable or offline - continue to persistent storage fallback
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
    if (!isNaN(numId)) {
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
        // MySQL unavailable or offline
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
    try {
      const db = getDbPool();
      const [rows]: any = await db.query(
        'SELECT id, name, email, role, provider, email_verified, created_at, updated_at FROM users ORDER BY id ASC'
      );
      if (Array.isArray(rows)) {
        mysqlUsers = rows;
      }
    } catch (e) {
      // MySQL unavailable or offline
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
  }): Promise<UserRow> {
    const norm = (userData.email || '').trim().toLowerCase();
    const role = userData.role || 'reader';
    const provider = userData.provider || 'local';
    const verified = userData.email_verified ? 1 : 0;
    const now = new Date().toISOString();

    let newId = Date.now();

    // 1. Insert into MySQL if available
    try {
      const db = getDbPool();
      const [result]: any = await db.query(
        `INSERT INTO users (name, email, password_hash, role, provider, google_id, email_verified)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          userData.name.trim(),
          norm,
          userData.password_hash || null,
          role,
          provider,
          userData.google_id || null,
          verified,
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
      role: role as any,
      provider,
      google_id: userData.google_id || null,
      email_verified: verified,
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

  async updateUser(id: number | string, updates: Partial<UserRow>): Promise<UserRow | null> {
    const numId = Number(id);
    const now = new Date().toISOString();

    // 1. Update MySQL
    if (!isNaN(numId)) {
      try {
        const db = getDbPool();
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
        if (updates.email_verified !== undefined) {
          fields.push('email_verified = ?');
          values.push(updates.email_verified ? 1 : 0);
        }

        if (fields.length > 0) {
          values.push(numId);
          await db.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
        }
      } catch (e) {
        console.warn('[DB.updateUser] MySQL sync notice:', e);
      }
    }

    // 2. Update persistent JSON storage
    const jsonDb = readJsonDb();
    const index = jsonDb.users.findIndex(u => String(u.id) === String(id) || (!isNaN(numId) && u.id === numId));
    if (index >= 0) {
      jsonDb.users[index] = {
        ...jsonDb.users[index],
        ...updates,
        updated_at: now,
      };
      writeJsonDb(jsonDb);
      return jsonDb.users[index];
    }

    return await this.getUserById(id);
  },

  async deleteUser(id: number | string, optionalEmail?: string): Promise<boolean> {
    const numId = Number(id);
    let affected = false;

    // Resolve email of target user to blacklist
    let targetEmail = (optionalEmail || '').trim().toLowerCase();
    if (!targetEmail) {
      const userObj = await this.getUserById(id);
      if (userObj?.email) {
        targetEmail = userObj.email.trim().toLowerCase();
      }
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

    // 3. Blacklist email so they cannot log in again
    if (targetEmail) {
      const currentList = Array.isArray(jsonDb.deleted_emails) ? jsonDb.deleted_emails : [];
      if (!currentList.some(e => e.toLowerCase() === targetEmail)) {
        currentList.push(targetEmail);
      }
      jsonDb.deleted_emails = currentList;
      await this.blacklistDeletedEmail(targetEmail);
    }

    writeJsonDb(jsonDb);
    return affected;
  },

  async getAllSubscribers(): Promise<SubscriberRow[]> {
    const defaultSubs: SubscriberRow[] = [
      { id: 1001, email: "reader@digitaljournal.com", topics: ["TECHNOLOGY", "BUSINESS", "MARKETS"], date: "Aug 01, 2026", status: "Active" },
      { id: 1002, email: "sarah.j@example.com", topics: ["US", "POLITICS", "SPORTS"], date: "Jul 28, 2026", status: "Active" },
      { id: 1003, email: "mchang@globalfirm.org", topics: ["ECONOMY & MARKETS", "BUSINESS", "CRYPTO"], date: "Jul 20, 2026", status: "Active" },
      { id: 1004, email: "rtaylor@apex.io", topics: ["TECHNOLOGY", "INNOVATION"], date: "Jul 15, 2026", status: "Active" },
      { id: 1005, email: "athorne@mit.edu", topics: ["US", "WORLD", "SCIENCE"], date: "Jul 10, 2026", status: "Active" }
    ];

    const jsonDb = readJsonDb();
    const jsonSubs = Array.isArray(jsonDb.subscribers) ? jsonDb.subscribers : [];
    
    const all = [...jsonSubs];
    for (const d of defaultSubs) {
      if (!all.some(s => s.email.toLowerCase() === d.email.toLowerCase())) {
        all.push(d);
      }
    }
    return all;
  },

  async addSubscriber(email: string, topics: string[] = ["ALL NEWS"]): Promise<SubscriberRow> {
    const cleanEmail = email.trim().toLowerCase();
    const jsonDb = readJsonDb();
    if (!Array.isArray(jsonDb.subscribers)) jsonDb.subscribers = [];

    const existingIdx = jsonDb.subscribers.findIndex(s => s.email.toLowerCase() === cleanEmail);
    const dateFormatted = new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
    const formattedTopics = Array.isArray(topics) && topics.length > 0 ? topics.map(t => t.toUpperCase()) : ["ALL NEWS"];

    if (existingIdx >= 0) {
      jsonDb.subscribers[existingIdx] = {
        ...jsonDb.subscribers[existingIdx],
        topics: Array.from(new Set([...(jsonDb.subscribers[existingIdx].topics || []), ...formattedTopics])),
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
      if (data.name) {
        await db.query('UPDATE users SET name = ? WHERE LOWER(email) = LOWER(?)', [data.name, cleanEmail]);
      }
    } catch (e) {}

    return updatedUser;
  },
};

export default getDbPool;
