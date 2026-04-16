import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { initDatabase, closeDatabase } from '../services/database';
import * as models from '../services/models';

describe('Database Models', () => {
  beforeEach(async () => {
    await initDatabase();
  });

  afterEach(() => {
    closeDatabase();
  });

  // ============ Session Tests ============

  it('should create a session', () => {
    const session = models.createSession('Test Session');
    expect(session.title).toBe('Test Session');
    expect(session.id).toBeDefined();
    expect(session.created_at).toBeDefined();
  });

  it('should get all sessions', () => {
    models.createSession('Session 1');
    models.createSession('Session 2');

    const sessions = models.getAllSessions();
    expect(sessions.length).toBeGreaterThanOrEqual(2);
  });

  it('should get session by id', () => {
    const created = models.createSession('Find Me');
    const found = models.getSessionById(created.id);

    expect(found).not.toBeNull();
    expect(found?.title).toBe('Find Me');
  });

  it('should return null for non-existent session', () => {
    const found = models.getSessionById('non-existent-id');
    expect(found).toBeNull();
  });

  it('should update session title', () => {
    const session = models.createSession('Original Title');
    models.updateSessionTitle(session.id, 'New Title');

    const updated = models.getSessionById(session.id);
    expect(updated?.title).toBe('New Title');
  });

  it('should delete session', () => {
    const session = models.createSession('To Delete');
    const id = session.id;

    models.deleteSession(id);

    const found = models.getSessionById(id);
    expect(found).toBeNull();
  });

  // ============ Message Tests ============

  it('should create a message', () => {
    const session = models.createSession('Test');
    const message = models.createMessage(session.id, 'user', 'Hello');

    expect(message.content).toBe('Hello');
    expect(message.role).toBe('user');
    expect(message.session_id).toBe(session.id);
  });

  it('should get messages by session id', () => {
    const session = models.createSession('Test');
    models.createMessage(session.id, 'user', 'Hello');
    models.createMessage(session.id, 'assistant', 'Hi there');

    const messages = models.getMessagesBySessionId(session.id);
    expect(messages.length).toBe(2);
    expect(messages[0].role).toBe('user');
    expect(messages[1].role).toBe('assistant');
  });

  // ============ Settings Tests ============

  it('should get settings', () => {
    const settings = models.getSettings();
    expect(settings.theme).toBeDefined();
    expect(settings.model).toBeDefined();
  });

  it('should update settings', () => {
    const updated = models.updateSettings({
      api_endpoint: 'https://api.example.com',
      theme: 'dark',
    });

    expect(updated.api_endpoint).toBe('https://api.example.com');
    expect(updated.theme).toBe('dark');
  });

  // ============ Import/Export Tests ============

  it('should export and import session', () => {
    // Create original session with messages
    const session = models.createSession('Original');
    models.createMessage(session.id, 'user', 'Hello');
    models.createMessage(session.id, 'assistant', 'Hi');

    // Export
    const exported = models.exportSession(session.id);
    expect(exported).not.toBeNull();
    expect(exported?.session.title).toBe('Original');
    expect(exported?.messages.length).toBe(2);

    // Delete original
    models.deleteSession(session.id);

    // Import
    const imported = models.importSession({
      session: { title: 'Imported' },
      messages: exported!.messages.map(m => ({
        session_id: '',
        role: m.role,
        content: m.content,
      })),
    });

    expect(imported.title).toBe('Imported');

    // Verify messages were imported
    const messages = models.getMessagesBySessionId(imported.id);
    expect(messages.length).toBe(2);
  });
});