import { Router } from 'express';
import * as models from '../services/models.js';

const router = Router();

// 获取设置
router.get('/', (req, res) => {
  try {
    const settings = models.getSettings();
    // 不返回 api_key
    res.json({
      api_endpoint: settings.api_endpoint,
      model: settings.model,
      system_prompt: settings.system_prompt,
      theme: settings.theme,
    });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// 更新设置
router.put('/', (req, res) => {
  try {
    const { api_endpoint, api_key, model, system_prompt, theme } = req.body;

    const updates: Partial<models.Settings> = {};

    if (api_endpoint !== undefined) updates.api_endpoint = api_endpoint;
    if (api_key !== undefined) updates.api_key = api_key;
    if (model !== undefined) updates.model = model;
    if (system_prompt !== undefined) updates.system_prompt = system_prompt;
    if (theme !== undefined) updates.theme = theme;

    const settings = models.updateSettings(updates);

    res.json({
      api_endpoint: settings.api_endpoint,
      model: settings.model,
      system_prompt: settings.system_prompt,
      theme: settings.theme,
    });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

export default router;