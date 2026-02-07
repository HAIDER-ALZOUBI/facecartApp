import { debugLog, debugError } from './debug';

const BASE = '/api';

function summarizeBody(body: unknown): unknown {
  if (!body || typeof body !== 'object') return body;
  const clone = { ...(body as Record<string, unknown>) };
  // Never log base64 photo data
  if ('photoBase64DataUrl' in clone) {
    clone.photoBase64DataUrl = clone.photoBase64DataUrl ? '[REDACTED base64]' : null;
  }
  return clone;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const start = performance.now();
  debugLog(`api:request`, { path, body: summarizeBody(body) });

  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const durationMs = Math.round(performance.now() - start);

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    const requestId = err.requestId || 'unknown';
    debugError(`api:error`, { path, status: res.status, durationMs, requestId, error: err.error });
    throw new Error(err.requestId
      ? `${err.error || 'Request failed'} (ID: ${err.requestId})`
      : (err.error || `HTTP ${res.status}`));
  }

  const data = await res.json();
  debugLog(`api:response`, { path, status: res.status, durationMs });
  return data as T;
}

export const api = {
  intakeQuestions: (text: string) =>
    post<{ questions: Array<{ id: string; question: string }> }>('/intake/questions', { text }),

  intakeProfile: (body: {
    text: string;
    photoBase64DataUrl: string | null;
    answers: Record<string, 'yes' | 'no'>;
    allergies: string[] | null;
    existingProfile: any | null;
  }) => post<any>('/intake/profile', body),

  analysisPaths: (profile: any) =>
    post<{ paths: any[] }>('/analysis/paths', { profile }),

  analysisPreview: (profile: any, paths: any[], allergies?: string[] | null) =>
    post<{ previews: any[] }>('/analysis/preview', { profile, paths, allergies }),

  routineGenerate: (body: {
    profile: any;
    selectedPath: any;
    budget: any;
    allergies?: string[] | null;
  }) => post<any>('/routine/generate', body),

  productOptions: (body: {
    profile: any;
    selectedPath: any;
    step: string;
    currentRoutine: any[];
    budget: any;
    allergies?: string[] | null;
  }) => post<{ options: any[] }>('/products/options', body),

  cartSwap: (body: {
    profile: any;
    selectedPath: any;
    step: string;
    currentRoutine: any[];
    excludeProductId: string;
    budget: any;
    allergies?: string[] | null;
  }) => post<any>('/cart/swap', body),

  existingCheck: (body: {
    existing: { name: string; step_type: string; key_ingredient: string };
    currentRoutine: any[];
  }) => post<any>('/existing/check', body),
};
