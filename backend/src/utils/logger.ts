import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';

// Extend Express Request to carry our request id
declare global {
  namespace Express {
    interface Request {
      id: string;
      startTime: number;
    }
  }
}

function isEnabled(): boolean {
  return process.env.DEBUG_LOGS === 'true';
}

const REDACT_KEYS = ['photoBase64DataUrl', 'photobase64dataurl', 'photo'];
const SECRET_ENV_KEYS = ['OPENAI_API_KEY'];

function redact(data: unknown): unknown {
  if (data === null || data === undefined) return data;
  if (typeof data === 'string') {
    // Redact anything that looks like a base64 data URL
    if (data.startsWith('data:image/')) return '[REDACTED base64 image]';
    // Redact env secrets
    for (const key of SECRET_ENV_KEYS) {
      const val = process.env[key];
      if (val && data.includes(val)) {
        return data.replace(val, '[REDACTED]');
      }
    }
    return data;
  }
  if (Array.isArray(data)) return data.map(redact);
  if (typeof data === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
      if (REDACT_KEYS.includes(k.toLowerCase())) {
        out[k] = v ? '[REDACTED]' : null;
      } else {
        out[k] = redact(v);
      }
    }
    return out;
  }
  return data;
}

function formatEntry(event: string, meta: Record<string, unknown>, data?: unknown) {
  const entry: Record<string, unknown> = {
    ts: new Date().toISOString(),
    event,
    ...meta,
  };
  if (data !== undefined) {
    entry.data = redact(data);
  }
  return JSON.stringify(entry);
}

export function log(event: string, data?: unknown, req?: Request): void {
  if (!isEnabled()) return;
  const meta: Record<string, unknown> = {};
  if (req) {
    meta.requestId = req.id;
    meta.route = req.originalUrl;
    meta.method = req.method;
  }
  console.log(formatEntry(event, meta, data));
}

export function error(event: string, data?: unknown, req?: Request): void {
  // Always log errors, but add extra detail when debug enabled
  const meta: Record<string, unknown> = {};
  if (req) {
    meta.requestId = req.id;
    meta.route = req.originalUrl;
    meta.method = req.method;
  }
  console.error(formatEntry(event, meta, data));
}

export function generateRequestId(): string {
  return crypto.randomBytes(4).toString('hex'); // 8 hex chars
}

// Express middleware: assign request id + log start/end
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  req.id = generateRequestId();
  req.startTime = Date.now();

  if (isEnabled()) {
    log('req:start', { path: req.path, contentLength: req.headers['content-length'] }, req);
  }

  // Capture response finish
  const originalJson = res.json.bind(res);
  res.json = function (body: unknown) {
    if (isEnabled()) {
      const duration = Date.now() - req.startTime;
      log('req:end', { status: res.statusCode, durationMs: duration }, req);
    }
    return originalJson(body);
  } as any;

  next();
}

// Express error middleware: log errors and return structured JSON with requestId
export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  const duration = Date.now() - (req.startTime || Date.now());
  error('req:error', {
    message: err.message,
    stack: isEnabled() ? err.stack : undefined,
    durationMs: duration,
  }, req);

  res.status(500).json({
    error: err.message || 'Internal server error',
    requestId: req.id,
  });
}
