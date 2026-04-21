import initSqlJs, { Database } from 'sql.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db: Database | null = null;
// 调试：打印路径
const DB_PATH = path.resolve(__dirname, '../../../data/web-agent.db');
console.log('Database path:', DB_PATH);

// Periodic save timer
let saveTimer: NodeJS.Timeout | null = null;

export async function initDatabase(): Promise<Database> {
  const SQL = await initSqlJs();

  // 尝试加载已有数据库
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // 创建表
  db.run(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      reasoning TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      api_endpoint TEXT DEFAULT '',
      api_key TEXT DEFAULT '',
      model TEXT DEFAULT 'gpt-3.5-turbo',
      system_prompt TEXT DEFAULT '',
      theme TEXT DEFAULT 'light',
      mcp_servers TEXT DEFAULT '[]'
    )
  `);

  // 初始化 settings 表（如果为空）
  const result = db.exec('SELECT COUNT(*) as count FROM settings');
  if (result.length === 0 || result[0].values[0][0] === 0) {
    db.run('INSERT INTO settings (id, theme) VALUES (1, "light")');
  }

  // 启动定期保存（每 30 秒）
  saveTimer = setInterval(() => {
    saveDatabase();
    console.log('Database auto-saved');
  }, 30000);

  saveDatabase();

  console.log('Database initialized');
  return db;
}

export function getDatabase(): Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

export function saveDatabase(): void {
  if (db) {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

export function closeDatabase(): void {
  if (saveTimer) {
    clearInterval(saveTimer);
    saveTimer = null;
  }
  if (db) {
    saveDatabase();
    db.close();
    db = null;
  }
}