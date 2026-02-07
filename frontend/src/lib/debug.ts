export interface DebugEntry {
  ts: string;
  level: 'log' | 'error';
  event: string;
  data?: unknown;
}

const MAX_ENTRIES = 50;
const _buffer: DebugEntry[] = [];

// Listeners for the in-app debug panel
type Listener = () => void;
const _listeners = new Set<Listener>();

function isEnabled(): boolean {
  try {
    return localStorage.getItem('skinsync_debug') === 'true';
  } catch {
    return false;
  }
}

function push(entry: DebugEntry) {
  _buffer.push(entry);
  if (_buffer.length > MAX_ENTRIES) _buffer.shift();
  _listeners.forEach((fn) => fn());
}

export function debugLog(event: string, data?: unknown): void {
  if (!isEnabled()) return;
  const entry: DebugEntry = { ts: new Date().toISOString(), level: 'log', event, data };
  push(entry);
  console.log(`[SkinSync] ${event}`, data ?? '');
}

export function debugError(event: string, data?: unknown): void {
  if (!isEnabled()) return;
  const entry: DebugEntry = { ts: new Date().toISOString(), level: 'error', event, data };
  push(entry);
  console.error(`[SkinSync] ${event}`, data ?? '');
}

// For the in-app debug panel
export function getDebugEntries(): DebugEntry[] {
  return [..._buffer];
}

export function subscribeDebug(fn: Listener): () => void {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

export function copyDebugLogs(): string {
  return _buffer
    .map((e) => `${e.ts} [${e.level.toUpperCase()}] ${e.event}${e.data ? ' ' + JSON.stringify(e.data) : ''}`)
    .join('\n');
}

export function isDebugEnabled(): boolean {
  return isEnabled();
}
