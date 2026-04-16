import { v4 as uuidv4 } from 'uuid';
import { getDatabase, saveDatabase } from './database';

export interface Session {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  reasoning?: string;
  created_at: string;
}

export interface Settings {
  id: number;
  api_endpoint: string;
  api_key: string;
  model: string;
  system_prompt: string;
  theme: string;
}

// ============ Session 操作 ============

export function createSession(title: string): Session {
  const db = getDatabase();
  const id = uuidv4();
  const now = new Date().toISOString();

  db.run(
    'INSERT INTO sessions (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)',
    [id, title, now, now]
  );

  saveDatabase();

  return { id, title, created_at: now, updated_at: now };
}

export function getAllSessions(): Session[] {
  const db = getDatabase();
  const result = db.exec('SELECT id, title, created_at, updated_at FROM sessions ORDER BY updated_at DESC');

  if (result.length === 0) return [];

  return result[0].values.map(row => ({
    id: row[0] as string,
    title: row[1] as string,
    created_at: row[2] as string,
    updated_at: row[3] as string,
  }));
}

export function getSessionById(id: string): Session | null {
  const db = getDatabase();
  const result = db.exec('SELECT id, title, created_at, updated_at FROM sessions WHERE id = ?', [id]);

  if (result.length === 0 || result[0].values.length === 0) return null;

  const row = result[0].values[0];
  return {
    id: row[0] as string,
    title: row[1] as string,
    created_at: row[2] as string,
    updated_at: row[3] as string,
  };
}

export function updateSessionTitle(id: string, title: string): void {
  const db = getDatabase();
  const now = new Date().toISOString();
  db.run('UPDATE sessions SET title = ?, updated_at = ? WHERE id = ?', [title, now, id]);
  saveDatabase();
}

export function deleteSession(id: string): void {
  const db = getDatabase();
  // 先删除消息
  db.run('DELETE FROM messages WHERE session_id = ?', [id]);
  // 再删除会话
  db.run('DELETE FROM sessions WHERE id = ?', [id]);
  saveDatabase();
}

// ============ Message 操作 ============

export function createMessage(sessionId: string, role: 'user' | 'assistant', content: string, reasoning: string = ''): Message {
  const db = getDatabase();
  const id = uuidv4();
  const now = new Date().toISOString();

  db.run(
    'INSERT INTO messages (id, session_id, role, content, reasoning, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [id, sessionId, role, content, reasoning, now]
  );

  // 更新会话的 updated_at
  db.run('UPDATE sessions SET updated_at = ? WHERE id = ?', [now, sessionId]);

  saveDatabase();

  return { id, session_id: sessionId, role, content, reasoning, created_at: now };
}

export function getMessagesBySessionId(sessionId: string): Message[] {
  const db = getDatabase();
  const result = db.exec(
    'SELECT id, session_id, role, content, reasoning, created_at FROM messages WHERE session_id = ? ORDER BY created_at ASC',
    [sessionId]
  );

  if (result.length === 0) return [];

  return result[0].values.map(row => ({
    id: row[0] as string,
    session_id: row[1] as string,
    role: row[2] as 'user' | 'assistant',
    content: row[3] as string,
    reasoning: row[4] as string || '',
    created_at: row[5] as string,
  }));
}

export function deleteMessage(id: string): void {
  const db = getDatabase();
  db.run('DELETE FROM messages WHERE id = ?', [id]);
  saveDatabase();
}

export function updateMessageContent(id: string, content: string, reasoning: string = ''): void {
  const db = getDatabase();
  db.run('UPDATE messages SET content = ?, reasoning = ? WHERE id = ?', [content, reasoning, id]);
  saveDatabase();
}

// ============ Settings 操作 ============

export function getSettings(): Settings {
  const db = getDatabase();
  const result = db.exec('SELECT id, api_endpoint, api_key, model, system_prompt, theme FROM settings WHERE id = 1');

  if (result.length === 0 || result[0].values.length === 0) {
    return {
      id: 1,
      api_endpoint: '',
      api_key: '',
      model: 'gpt-3.5-turbo',
      system_prompt: '',
      theme: 'light',
    };
  }

  const row = result[0].values[0];
  return {
    id: row[0] as number,
    api_endpoint: row[1] as string,
    api_key: row[2] as string,
    model: row[3] as string,
    system_prompt: row[4] as string,
    theme: row[5] as string,
  };
}

export function updateSettings(settings: Partial<Omit<Settings, 'id'>>): Settings {
  const db = getDatabase();
  const current = getSettings();

  const newSettings = {
    ...current,
    ...settings,
  };

  db.run(
    'UPDATE settings SET api_endpoint = ?, api_key = ?, model = ?, system_prompt = ?, theme = ? WHERE id = 1',
    [
      newSettings.api_endpoint,
      newSettings.api_key,
      newSettings.model,
      newSettings.system_prompt,
      newSettings.theme,
    ]
  );

  saveDatabase();

  return newSettings;
}

// ============ 导入/导出 ============

export function exportSession(sessionId: string): { session: Session; messages: Message[] } | null {
  const session = getSessionById(sessionId);
  if (!session) return null;

  const messages = getMessagesBySessionId(sessionId);
  return { session, messages };
}

export function importSession(data: { session: Omit<Session, 'id' | 'created_at' | 'updated_at'>; messages: Omit<Message, 'id' | 'created_at'>[] }): Session {
  const db = getDatabase();
  const sessionId = uuidv4();
  const now = new Date().toISOString();

  // 创建会话
  db.run(
    'INSERT INTO sessions (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)',
    [sessionId, data.session.title, now, now]
  );

  // 导入消息
  for (const msg of data.messages) {
    const msgId = uuidv4();
    db.run(
      'INSERT INTO messages (id, session_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)',
      [msgId, sessionId, msg.role, msg.content, now]
    );
  }

  saveDatabase();

  return { id: sessionId, title: data.session.title, created_at: now, updated_at: now };
}