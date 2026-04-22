import { Router } from 'express';
import * as models from '../services/models.js';

const router = Router();

// 获取所有会话
router.get('/', (req, res) => {
  try {
    const sessions = models.getAllSessions();
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// 创建新会话
router.post('/', (req, res) => {
  try {
    const { title, model } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    const session = models.createSession(title, model);
    res.status(201).json(session);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// 获取单个会话详情（含消息）
router.get('/:id', (req, res) => {
  try {
    const session = models.getSessionById(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    const messages = models.getMessagesBySessionId(req.params.id);
    res.json({ ...session, messages });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// 更新会话标题
router.put('/:id', (req, res) => {
  try {
    const { title } = req.body;
    const existing = models.getSessionById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Session not found' });
    }
    models.updateSessionTitle(req.params.id, title || existing.title);
    const updated = models.getSessionById(req.params.id);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// 删除会话
router.delete('/:id', (req, res) => {
  try {
    const existing = models.getSessionById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Session not found' });
    }
    models.deleteSession(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// 更新会话模型
router.put('/:id/model', (req, res) => {
  try {
    const { model } = req.body;
    if (!model) {
      return res.status(400).json({ error: 'Model is required' });
    }
    const existing = models.getSessionById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Session not found' });
    }
    const updated = models.updateSessionModel(req.params.id, model);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// 导出会话
router.get('/:id/export', (req, res) => {
  try {
    const exported = models.exportSession(req.params.id);
    if (!exported) {
      return res.status(404).json({ error: 'Session not found' });
    }
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="session-${req.params.id}.json"`);
    res.json(exported);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// 导入会话
router.post('/import', (req, res) => {
  try {
    const { json } = req.body;
    if (!json) {
      return res.status(400).json({ error: 'JSON data is required' });
    }

    let data: { session: { title: string }; messages: { role: string; content: string }[] };
    try {
      data = typeof json === 'string' ? JSON.parse(json) : json;
    } catch {
      return res.status(400).json({ error: 'Invalid JSON format' });
    }

    if (!data.session?.title || !Array.isArray(data.messages)) {
      return res.status(400).json({ error: 'Invalid session data format' });
    }

    const imported = models.importSession({
      session: { title: data.session.title },
      messages: data.messages.map(m => ({
        session_id: '',
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    });

    res.status(201).json(imported);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

export default router;