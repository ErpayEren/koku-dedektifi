export interface JsonRecord {
  [key: string]: unknown;
}

async function requestJson<T = JsonRecord>(url: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });

  const payload = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) {
    const message = (payload as { error?: string })?.error || `HTTP ${response.status}`;
    throw new Error(message);
  }
  return payload as T;
}

export async function emitEvent(event: string, props: JsonRecord = {}): Promise<void> {
  await requestJson('/api/event', {
    method: 'POST',
    body: JSON.stringify({ event, props }),
    keepalive: true,
  });
}

export async function fetchWardrobe<T = JsonRecord>(method: 'GET' | 'PUT', body?: JsonRecord): Promise<T> {
  return requestJson<T>('/api/wardrobe', {
    method,
    body: body ? JSON.stringify(body) : undefined,
  });
}

