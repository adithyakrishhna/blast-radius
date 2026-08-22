'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { SearchResult } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';

export function SearchBox() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (query.trim().length < 1) { setResults([]); setOpen(false); return; }

    const id = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const json = await res.json();
        if (json.ok) { setResults(json.data); setOpen(true); }
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(id);
  }, [query]);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function select(result: SearchResult) {
    setOpen(false);
    setQuery('');
    router.push(`/component/${result.id}`);
  }

  return (
    <div ref={ref} className="relative w-full max-w-xl">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search services, databases, credentials, vendors…"
          className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 shadow-sm placeholder:text-zinc-400
            focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
        />
        {loading && (
          <div className="absolute right-3 top-3.5 h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-xl border border-zinc-200 bg-white shadow-lg">
          {results.map(r => (
            <button
              key={r.id}
              onClick={() => select(r)}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-zinc-50 first:rounded-t-xl last:rounded-b-xl"
            >
              <Badge variant={r.type as never}>{r.type}</Badge>
              <span className="font-mono text-zinc-900">{r.name}</span>
              {r.extra && <span className="ml-auto text-xs text-zinc-400">{r.extra}</span>}
            </button>
          ))}
        </div>
      )}

      {open && results.length === 0 && !loading && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-xl border border-zinc-200 bg-white px-4 py-6 text-center shadow-lg">
          <p className="text-sm text-zinc-500">No components match &ldquo;{query}&rdquo;</p>
        </div>
      )}
    </div>
  );
}
