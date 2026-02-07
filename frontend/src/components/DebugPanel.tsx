import { useState, useEffect, useRef } from 'react';
import { getDebugEntries, subscribeDebug, copyDebugLogs, isDebugEnabled, type DebugEntry } from '../lib/debug';

export default function DebugPanel() {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<DebugEntry[]>(getDebugEntries());
  const [copied, setCopied] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = subscribeDebug(() => setEntries(getDebugEntries()));
    return unsub;
  }, []);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries, open]);

  if (!isDebugEnabled()) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(copyDebugLogs());
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100]">
      {/* Toggle tab */}
      <button
        onClick={() => setOpen(!open)}
        className="ml-2 mb-0 px-3 py-1 text-xs font-mono bg-gray-900 text-green-400 rounded-t-md border border-b-0 border-gray-700 hover:bg-gray-800"
      >
        {open ? '▼ Debug' : `▲ Debug (${entries.length})`}
      </button>

      {open && (
        <div className="bg-gray-900 border-t border-gray-700 max-h-56 overflow-y-auto font-mono text-xs text-gray-300 p-2">
          {/* Actions */}
          <div className="flex gap-2 mb-2 sticky top-0 bg-gray-900 pb-1 border-b border-gray-700">
            <button onClick={handleCopy} className="px-2 py-0.5 bg-gray-700 rounded text-green-400 hover:bg-gray-600">
              {copied ? 'Copied!' : 'Copy logs'}
            </button>
            <span className="text-gray-500">{entries.length} events</span>
          </div>

          {entries.length === 0 && <p className="text-gray-500 italic">No events yet.</p>}

          {entries.map((e, i) => (
            <div key={i} className={`py-0.5 ${e.level === 'error' ? 'text-red-400' : 'text-gray-300'}`}>
              <span className="text-gray-500">{e.ts.slice(11, 23)}</span>{' '}
              <span className={e.level === 'error' ? 'text-red-500' : 'text-green-400'}>[{e.level.toUpperCase()}]</span>{' '}
              <span className="text-blue-300">{e.event}</span>
              {e.data !== undefined && (
                <span className="text-gray-400"> {JSON.stringify(e.data)}</span>
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
}
