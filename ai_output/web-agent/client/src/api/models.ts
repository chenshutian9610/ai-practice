const API_BASE = '/api';

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

export async function getModels(): Promise<ModelsResponse> {
  const apiKey = localStorage.getItem('api_key') || '';
  const res = await fetch(`${API_BASE}/models`, {
    headers: {
      ...(apiKey ? { 'x-api-key': apiKey } : {})
    }
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to fetch models');
  }

  return res.json();
}
