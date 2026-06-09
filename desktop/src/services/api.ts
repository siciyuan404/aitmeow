const BASE_URL = 'http://localhost:8765';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export const api = {
  health: () => request<{ status: string }>('/health'),

  renderSvg: (svg: string) =>
    request<{ result: string }>('/render', {
      method: 'POST',
      body: JSON.stringify({ svg }),
    }),

  listItems: () => request<{ items: unknown[] }>('/repository'),

  listRules: () => request<{ rules: unknown[] }>('/rules'),
  createRule: (rule: unknown) =>
    request<{ rule: unknown }>('/rules', {
      method: 'POST',
      body: JSON.stringify(rule),
    }),

  getSettings: () => request<{ settings: unknown }>('/settings'),
  updateSettings: (settings: unknown) =>
    request<{ success: boolean }>('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    }),
};
