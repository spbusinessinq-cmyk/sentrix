/**
 * Sage streaming client
 * Calls /api/sage/query via Server-Sent Events and streams the response back.
 * All responses are grounded — the API injects real search results into the prompt.
 */

import { apiUrl } from './api-client';

export interface SageResult {
  title: string;
  domain: string;
  snippet: string;
  score?: number;
  confidence?: string;
}

export interface SageMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface SageQueryOptions {
  query: string;
  results: SageResult[];
  context?: string;
  messages: SageMessage[];
  userMessage: string;
  onChunk: (text: string) => void;
  onDone: () => void;
  onError: (msg: string) => void;
  signal?: AbortSignal;
}

export async function streamSageQuery(opts: SageQueryOptions): Promise<void> {
  const { query, results, context, messages, userMessage, onChunk, onDone, onError, signal } = opts;

  const url = apiUrl('/api/sage/query');

  let response: Response;
  try {
    console.info(`[Sentrix] Sage request → ${url}`);
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, results, context, messages, userMessage }),
      signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return;
    console.error(`[Sentrix] Sage fetch failed for: ${url}`, err);
    onError('Could not reach Sage — check your connection and browser console');
    return;
  }

  if (!response.ok) {
    console.error(`[Sentrix] Sage API returned ${response.status} for: ${url}`);
    onError(`Sage returned an error (${response.status}) — check console for the API URL`);
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    onError('No stream body returned from Sage');
    return;
  }

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const rawJson = line.slice(6).trim();
        if (!rawJson) continue;

        try {
          const parsed = JSON.parse(rawJson) as { content?: string; done?: boolean; error?: string };
          if (parsed.error) { onError(parsed.error); return; }
          if (parsed.content) onChunk(parsed.content);
          if (parsed.done) { onDone(); return; }
        } catch {
          // ignore malformed SSE lines
        }
      }
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return;
    onError('Stream interrupted — please try again');
  } finally {
    reader.releaseLock();
  }
}

// Cache for Sage intelligence briefs (non-streaming, auto-generated on search)
const BRIEF_CACHE = new Map<string, string>();

export async function fetchSageBrief(opts: Omit<SageQueryOptions, 'messages' | 'userMessage' | 'onChunk' | 'onDone' | 'onError' | 'signal'>): Promise<string> {
  const cacheKey = opts.query.toLowerCase().trim();
  const cached = BRIEF_CACHE.get(cacheKey);
  if (cached) return cached;

  return new Promise((resolve) => {
    let full = '';
    streamSageQuery({
      ...opts,
      messages: [],
      userMessage: `Briefly analyze these search results for the query "${opts.query}". In 2-3 sentences: what is the signal quality, what do the results agree or disagree on, and what should the user prioritize reading first? Be direct and analytical.`,
      onChunk: (text) => { full += text; },
      onDone: () => {
        BRIEF_CACHE.set(cacheKey, full);
        if (BRIEF_CACHE.size > 20) {
          const firstKey = BRIEF_CACHE.keys().next().value;
          if (firstKey !== undefined) BRIEF_CACHE.delete(firstKey);
        }
        resolve(full);
      },
      onError: () => resolve(''),
    });
  });
}
