import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import cors from 'cors';
import { initDatabase, closeDatabase } from '../services/database.js';
import sessionRoutes from '../routes/session.js';
import chatRoutes from '../routes/chat.js';
import settingsRoutes from '../routes/settings.js';

describe('REST API Integration', () => {
  let app: express.Application;

  beforeEach(async () => {
    await initDatabase();
    app = express();
    app.use(cors());
    app.use(express.json());
    app.use('/api/sessions', sessionRoutes);
    app.use('/api/chat', chatRoutes);
    app.use('/api/settings', settingsRoutes);
  });

  afterEach(() => {
    closeDatabase();
  });

  // ============ Sessions API ============

  describe('GET /api/sessions', () => {
    it('should return empty array initially', async () => {
      const res = await request(app).get('/api/sessions');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('POST /api/sessions', () => {
    it('should create a new session', async () => {
      const res = await request(app)
        .post('/api/sessions')
        .send({ title: 'New Session' });
      expect(res.status).toBe(201);
      expect(res.body.title).toBe('New Session');
      expect(res.body.id).toBeDefined();
    });

    it('should return 400 if title is missing', async () => {
      const res = await request(app)
        .post('/api/sessions')
        .send({});
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/sessions/:id', () => {
    it('should return session with messages', async () => {
      const createRes = await request(app)
        .post('/api/sessions')
        .send({ title: 'Test' });
      const sessionId = createRes.body.id;

      const res = await request(app).get(`/api/sessions/${sessionId}`);
      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Test');
      expect(res.body.messages).toBeDefined();
    });

    it('should return 404 for non-existent session', async () => {
      const res = await request(app).get('/api/sessions/non-existent-id');
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/sessions/:id', () => {
    it('should delete session and return 204', async () => {
      const createRes = await request(app)
        .post('/api/sessions')
        .send({ title: 'To Delete' });
      const sessionId = createRes.body.id;

      const res = await request(app).delete(`/api/sessions/${sessionId}`);
      expect(res.status).toBe(204);

      // Verify deleted
      const getRes = await request(app).get(`/api/sessions/${sessionId}`);
      expect(getRes.status).toBe(404);
    });
  });

  // ============ Settings API ============

  describe('GET /api/settings', () => {
    it('should return settings', async () => {
      const res = await request(app).get('/api/settings');
      expect(res.status).toBe(200);
      expect(res.body.theme).toBeDefined();
      expect(res.body.model).toBeDefined();
    });
  });

  describe('PUT /api/settings', () => {
    it('should update settings', async () => {
      const res = await request(app)
        .put('/api/settings')
        .send({ theme: 'dark', model: 'gpt-4' });
      expect(res.status).toBe(200);
      expect(res.body.theme).toBe('dark');
      expect(res.body.model).toBe('gpt-4');
    });
  });

  // ============ Export/Import ============

  describe('GET /api/sessions/:id/export', () => {
    it('should export session', async () => {
      const createRes = await request(app)
        .post('/api/sessions')
        .send({ title: 'Export Test' });
      const sessionId = createRes.body.id;

      const res = await request(app).get(`/api/sessions/${sessionId}/export`);
      expect(res.status).toBe(200);
      expect(res.body.session).toBeDefined();
      expect(res.body.messages).toBeDefined();
    });
  });

  describe('POST /api/sessions/import', () => {
    it('should import session', async () => {
      const res = await request(app)
        .post('/api/sessions/import')
        .send({
          json: JSON.stringify({
            session: { title: 'Imported' },
            messages: [
              { role: 'user', content: 'Hello' },
              { role: 'assistant', content: 'Hi' },
            ],
          }),
        });
      expect(res.status).toBe(201);
      expect(res.body.title).toBe('Imported');
    });
  });
});