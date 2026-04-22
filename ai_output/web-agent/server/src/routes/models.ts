import { Router } from 'express';
import { getSettings } from '../services/models.js';

const router = Router();

export interface Model {
  id: string;
  object: string;
  created: number;
  owned_by: string;
}

export interface ModelsResponse {
  object: string;
  data: Model[];
}

// 获取可用模型列表
router.get('/', async (req, res) => {
  try {
    const settings = getSettings();
    const apiEndpoint = settings.api_endpoint;
    const apiKey = settings.api_key;

    if (!apiEndpoint) {
      return res.status(400).json({ error: 'API endpoint not configured' });
    }

    if (!apiKey) {
      return res.status(401).json({ error: 'API key not configured' });
    }

    // 构建模型列表请求 URL
    const modelsUrl = apiEndpoint.endsWith('/')
      ? `${apiEndpoint}v1/models`
      : `${apiEndpoint}/v1/models`;

    const response = await fetch(modelsUrl, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        return res.status(401).json({ error: 'Invalid API key' });
      }
      return res.status(500).json({ error: 'Failed to fetch models' });
    }

    const data = await response.json() as ModelsResponse;

    res.json(data);
  } catch (error) {
    console.error('Error fetching models:', error);
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return res.status(503).json({ error: 'API endpoint unreachable' });
    }
    res.status(500).json({ error: 'Failed to fetch models' });
  }
});

export default router;
