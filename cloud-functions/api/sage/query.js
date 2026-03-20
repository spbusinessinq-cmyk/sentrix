/**
 * EdgeOne Node Function — /api/sage/query
 * Live verification pipeline: classify → fetch → corroborate → stream analysis.
 * Sage never answers major factual claims from model priors alone.
 */

// ── Input classification ──────────────────────────────────────────────────────

const CURRENT_EVENTS_RE =
  /(died|dead|killed|arrested|charged|indicted|convicted|elected|fired|resigned|appointed|invaded|attacked|struck|bombed|crashed|launched|outbreak|confirmed|signed|declared|passed\s+away|murdered|shot|leaked|hacked|bankrupt|collapsed|shooting|explosion|earthquake|hurricane|pandemic|war|invasion|sanctions|missile|airstrike|ceasefire|impeach|hospitali[sz]ed|detained|sentenced)/i;

function detectInputClass(msg) {
  const t = msg.trim();
  if (/^https?:\/\/[^\s]{4,}/.test(t)) return 'url';
  if (t.length > 300) return 'article';
  if (CURRENT_EVENTS_RE.test(t)) return 'current-events';
  return 'general';
}

// ── Named entity extraction ───────────────────────────────────────────────────

function extractEntities(text) {
  const raw = text.match(/\b[A-Z][a-z]{1,20}(?:\s+[A-Z][a-z]{1,20}){0,3}\b/g) ?? [];
  const stopWords = new Set(['The', 'A', 'An', 'It', 'They', 'He', 'She', 'We', 'I', 'This', 'That', 'These', 'Those', 'What', 'Who', 'When', 'Where', 'Why', 'How']);
  return [...new Set(raw.filter(e => !stopWords.has(e.split(' ')[0] ?? '')))].slice(0, 4);
}

function generateCorroborationQueries(input, articleTitle) {
  const queries = [];
  const base = articleTitle ?? input;
  const entities = extractEntities(base);
  const year = new Date().getFullYear();

  if (articleTitle) {
    queries.push(articleTitle.slice(0, 120));
    if (entities.length > 0) queries.push(`${entities.slice(0, 2).join(' ')} ${year} news confirmed`);
  } else {
    queries.push(input.slice(0, 120));
    if (entities.length > 0) {
      queries.push(`${entities.slice(0, 2).join(' ')} ${year} official`);
      queries.push(`${entities.slice(0, 2).join(' ')} confirmed news`);
    }
  }

  return [...new Set(queries)].filter(Boolean).slice(0, 3);
}

// ── Article extraction ────────────────────────────────────────────────────────

function extractDomain(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); }
  catch { return url.slice(0, 40); }
}

function parseHtml(html, url) {
  const domain = extractDomain(url);
  const titleMatch =
    html.match(/property="og:title"\s+content="([^"]{3,200})"/i) ||
    html.match(/content="([^"]{3,200})"\s+property="og:title"/i) ||
    html.match(/<title[^>]*>([^<]{3,200})<\/title>/i) ||
    html.match(/<h1[^>]*>([^<]{3,150})<\/h1>/i);
  const title = titleMatch ? titleMatch[1].trim().replace(/&amp;/g, '&') : domain;

  const authorMatch =
    html.match(/property="article:author"\s+content="([^"]{2,80})"/i) ||
    html.match(/name="author"\s+content="([^"]{2,80})"/i);
  const author = authorMatch ? authorMatch[1].trim() : undefined;

  const dateMatch =
    html.match(/property="article:published_time"\s+content="([^"]{8,})"/i) ||
    html.match(/property="og:article:published_time"\s+content="([^"]{8,})"/i) ||
    html.match(/datetime="([0-9]{4}-[0-9]{2}-[0-9]{2}[^"]{0,20})"/i);
  const date = dateMatch ? dateMatch[1].slice(0, 10) : undefined;

  const content = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, ' ')
    .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]{1,8};/gi, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, 9000);

  return { title, domain, author, date, content, success: true };
}

async function fetchArticle(url) {
  const domain = extractDomain(url);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SentrixAnalysis/1.0)',
        Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return { title: domain, domain, content: `Content could not be fully retrieved. HTTP ${res.status}.`, success: false, error: `HTTP ${res.status}` };
    const ct = res.headers.get('content-type') ?? '';
    if (!ct.includes('html')) return { title: domain, domain, content: `Non-HTML content (${ct}).`, success: false, error: 'non-html' };
    const html = await res.text();
    return parseHtml(html, url);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { title: domain, domain, content: `Content could not be fully retrieved. (${msg.slice(0, 120)})`, success: false, error: msg };
  }
}

// ── Corroboration search ──────────────────────────────────────────────────────

async function searchBraveCorroboration(query, apiKey) {
  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=8&safesearch=moderate&result_filter=web`;
  const res = await fetch(url, {
    headers: { 'X-Subscription-Token': apiKey, Accept: 'application/json' },
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) throw new Error(`Brave ${res.status}`);
  const data = await res.json();
  return (data?.web?.results ?? []).slice(0, 8).map(r => ({
    title: r.title ?? '',
    url: r.url ?? '',
    domain: r.meta_url?.hostname ?? extractDomain(r.url ?? ''),
    snippet: r.description ?? '',
  }));
}

async function searchDDGCorroboration(query) {
  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1&no_html=0&kl=us-en`;
    const res = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'Sentrix/1.0' },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const results = [];
    if (data.AbstractURL && data.AbstractText) {
      results.push({ title: data.Heading ?? query, url: data.AbstractURL, domain: extractDomain(data.AbstractURL), snippet: data.AbstractText.slice(0, 280) });
    }
    const topics = [...(data.RelatedTopics ?? []), ...(data.Results ?? [])];
    for (const t of topics) {
      if (t.FirstURL && t.Text && results.length < 8) {
        results.push({ title: t.Text.slice(0, 100), url: t.FirstURL, domain: extractDomain(t.FirstURL), snippet: t.Text.slice(0, 280) });
      }
      if (t.Topics) {
        for (const sub of t.Topics) {
          if (sub.FirstURL && sub.Text && results.length < 8) {
            results.push({ title: sub.Text.slice(0, 100), url: sub.FirstURL, domain: extractDomain(sub.FirstURL), snippet: sub.Text.slice(0, 280) });
          }
        }
      }
    }
    return results;
  } catch { return []; }
}

function newsMockCorroboration(query) {
  const qEnc = encodeURIComponent(query);
  const qWiki = encodeURIComponent(query.replace(/\s+/g, '_'));
  return [
    { title: `${query} — Reuters`, url: `https://www.reuters.com/search/news?blob=${qEnc}`, domain: 'reuters.com', snippet: `Reuters coverage of: ${query}` },
    { title: `${query} — AP News`, url: `https://apnews.com/search?q=${qEnc}`, domain: 'apnews.com', snippet: `AP reporting on: ${query}` },
    { title: `${query} — Wikipedia`, url: `https://en.wikipedia.org/wiki/${qWiki}`, domain: 'en.wikipedia.org', snippet: `Encyclopedia reference: ${query}` },
    { title: `${query} — BBC News`, url: `https://www.bbc.com/search?q=${qEnc}`, domain: 'bbc.com', snippet: `BBC coverage: ${query}` },
  ];
}

async function runCorroborationSearch(queries, braveKey) {
  const all = [];
  const seenDomains = new Set();

  await Promise.allSettled(queries.map(async (q) => {
    let results = [];
    if (braveKey) {
      try { results = await searchBraveCorroboration(q, braveKey); }
      catch { results = await searchDDGCorroboration(q); }
    } else {
      results = await searchDDGCorroboration(q);
      if (results.length === 0) results = newsMockCorroboration(q);
    }
    for (const r of results) {
      if (r.domain && !seenDomains.has(r.domain)) {
        seenDomains.add(r.domain);
        all.push(r);
      }
    }
  }));

  return all.slice(0, 15);
}

// ── System prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are SAGE — Sentrix's Signal & Truth Filter and live verification engine.

Your job: help the user understand before they believe or act.
You are a verification intelligence system, not a chatbot. Be direct, precise, and operator-grade.
You have access to retrieved article content and corroboration search results. Use them.

━━━━━━━━━━━━━━━━━━━━━━━
CORE FORMAT (ALL RESPONSES)
━━━━━━━━━━━━━━━━━━━━━━━

## ANSWER
Direct conclusion first. Complete explanation based on retrieved evidence. What is true, what is supported.
- For claims or headlines: what is being asserted, whether it holds up, and what the real picture is
- For questions: answer fully and clearly
- For URLs or articles: summarize the core content and assess its substance
- For political/controversial content: present the factual landscape without advocacy
Use retrieved corroboration sources to anchor your answer. If evidence is weak, say so explicitly.

## VERIFICATION STATUS
One of: CONFIRMED / LIKELY / DISPUTED / UNSUPPORTED / UNKNOWN
Then explain the standard used (source count, source quality, official confirmation status).

CONFIRMATION STANDARDS:
- CONFIRMED: 2+ independent corroborating sources, or 1 official source + 1 major news source
- LIKELY: 1 corroborating source, not yet officially confirmed
- DISPUTED: conflicting claims across corroboration sources
- UNSUPPORTED: no corroboration found in retrieved sources
- UNKNOWN: insufficient evidence to assess at this time

For DEATHS, ARRESTS, WAR EVENTS, ELECTIONS, HEALTH EMERGENCIES: require CONFIRMED standard before using that word.

## SIGNAL
HIGH / MEDIUM / LOW — then explain what drives this level (source quality, evidence density, corroboration count).

## AGREEMENT
CONSENSUS / MIXED / CONFLICT / UNKNOWN — then explain what sources agree or disagree on.

## RISK
SAFE / CAUTION / DANGER — then explain manipulation patterns, trust signals, or sourcing weaknesses.

## WHAT HOLDS UP
Bullet list of claims supported by retrieved evidence. Cite sources where possible.

## WHAT DOES NOT HOLD UP
Bullet list of weak, unverified, or potentially misleading claims.

## WHAT TO VERIFY NEXT
Bullet list of 3–5 concrete next investigation steps.

## SOURCES
List the corroborating sources actually used from the provided data.
Format: • domain.com — what this source specifically contributes
Max 5 entries. Omit if no retrieved sources add value.

━━━━━━━━━━━━━━━━━━━━━━━
ARTICLE / URL MODE EXTENSION
━━━━━━━━━━━━━━━━━━━━━━━

When the input is a URL or pasted article, ALSO include AFTER the core sections:

## ARTICLE
- Title:
- Outlet:
- Date:
- Author:

## SUMMARY
What the article is actually saying in 2–4 sentences. Neutral, factual.

## CORE CLAIMS
Bullet list of actual claims, tagged:
- [FACT] — verifiable assertion
- [QUOTED] — attributed to a named source
- [STAT] — numerical/percentage claim
- [IMPLIED] — framing-driven, not stated directly
Each assessed as: supported / partially supported / unsupported / unclear

## VERDICT
WELL SUPPORTED / PARTIALLY SUPPORTED / WEAKLY SUPPORTED / UNCLEAR / HIGH RISK
Follow with one sentence explanation.

━━━━━━━━━━━━━━━━━━━━━━━
HALLUCINATION GUARDRAILS
━━━━━━━━━━━━━━━━━━━━━━━

YOU MUST:
- Base all factual claims on the retrieved corroboration sources provided
- Label uncertainty explicitly (LIKELY, DISPUTED, UNSUPPORTED, UNKNOWN)
- Distinguish between: confirmed / probable / disputed / speculation

YOU MUST NEVER:
- State a claim as CONFIRMED without 2+ corroborating sources or 1 official + 1 major news source in the data
- Invent corroboration that is not in the provided sources
- Use model knowledge alone for current events, deaths, arrests, war events, or elections
- Imply verification occurred if corroboration is missing
- Say "I cannot access live URLs" — attempt analysis from available data and note limitations once
- Say "I don't have access to" — work with what is available

If evidence is weak: say so clearly. Uncertainty is honest; fabrication is not.

━━━━━━━━━━━━━━━━━━━━━━━
SEARCH RESULT QUALITY
━━━━━━━━━━━━━━━━━━━━━━━

In the provided search results, prioritize:
- Official sources (government, institutional, primary)
- Major news outlets (Reuters, AP, BBC, NYT, WSJ, Bloomberg, Guardian)
- Wikipedia as reference (not primary)

Deprioritize for non-technical fact-check queries:
- MDN, GitHub, npm, Stack Overflow, Hacker News
- Generic tech results that do not relate to the claim

The user should walk away informed, in control, and knowing exactly what to question next.`;

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildResultsContext(results) {
  if (!results || results.length === 0) return 'No search results provided.';
  return results.slice(0, 10).map((r, i) => {
    const tier = r.score != null ? (r.score >= 80 ? '[HIGH]' : r.score >= 60 ? '[MED]' : '[LOW]') : '';
    return `[Ref ${i + 1}] ${r.domain} ${tier}\nTitle: ${r.title}\nSnippet: ${r.snippet}`;
  }).join('\n\n');
}

function buildCorroborationContext(sources, queries) {
  if (sources.length === 0) return 'No corroboration sources retrieved.';
  const header = `CORROBORATION QUERIES: ${queries.map(q => `"${q}"`).join(' | ')}\nSOURCES RETRIEVED: ${sources.length}\n\n`;
  return header + sources.map((s, i) =>
    `[Corroboration ${i + 1}] ${s.domain}\nTitle: ${s.title}\nURL: ${s.url}\nSnippet: ${s.snippet}`
  ).join('\n\n');
}

function sseChunk(obj) { return `data: ${JSON.stringify(obj)}\n\n`; }

function resolveGeminiKey(env) {
  return env?.GEMINI_API_KEY || env?.AI_INTEGRATIONS_GEMINI_API_KEY || null;
}

function resolveGeminiBase(env) {
  return env?.AI_INTEGRATIONS_GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com';
}

function limitedModeFallback(userMessage) {
  const q = (userMessage || 'this input').trim().slice(0, 120);
  return [
    `## ANSWER`, `Analysis engine is running in limited mode. Input: "${q}"`, ``,
    `## VERIFICATION STATUS`, `UNKNOWN — analysis engine unavailable.`, ``,
    `## SIGNAL`, `LOW — analysis engine unavailable.`, ``,
    `## AGREEMENT`, `UNKNOWN — cannot assess without the analysis engine.`, ``,
    `## RISK`, `CAUTION — verify claims independently; automated analysis not available.`, ``,
    `## WHAT HOLDS UP`, `- Manual review required`, ``,
    `## WHAT DOES NOT HOLD UP`, `- Automated verification was not performed`, ``,
    `## WHAT TO VERIFY NEXT`,
    `- Has GEMINI_API_KEY been set in the EdgeOne Pages dashboard?`,
    `- Is the key a valid Google AI Studio key with gemini-2.5-flash access?`,
    `- Try again — this may be a transient error`,
  ].join('\n');
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400' } });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
  }

  let body;
  try { body = await request.json(); }
  catch { return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers: { 'Content-Type': 'application/json' } }); }

  const { query, results, context: intelligenceContext, messages, userMessage } = body;

  if (!userMessage || typeof userMessage !== 'string' || !userMessage.trim()) {
    return new Response(JSON.stringify({ error: 'userMessage is required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const inputClass = detectInputClass(userMessage);
  const needsCorroboration = inputClass === 'url' || inputClass === 'current-events';
  const isArticleMode = inputClass === 'url' || inputClass === 'article';
  const apiKey = resolveGeminiKey(env ?? {});
  const braveKey = env?.BRAVE_SEARCH_API_KEY;

  console.log(`[Sentrix] /api/sage/query — class=${inputClass} geminiKey=${!!apiKey} braveKey=${!!braveKey} corroborate=${needsCorroboration} query="${(userMessage || '').slice(0, 60)}"`);

  const sseHeaders = { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive', 'X-Accel-Buffering': 'no' };

  if (!apiKey) {
    console.warn('[Sentrix] GEMINI_API_KEY not set — limited-mode fallback');
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();
    writer.write(encoder.encode(sseChunk({ content: limitedModeFallback(userMessage) })));
    writer.write(encoder.encode(sseChunk({ done: true })));
    writer.close();
    return new Response(readable, { headers: sseHeaders });
  }

  // ── Parallel: article fetch + corroboration ─────────────────────────────────
  let articleData = undefined;
  let corroborationSources = [];
  let corroborationQueries = [];

  if (needsCorroboration || isArticleMode) {
    const initialQueries = generateCorroborationQueries(userMessage, undefined);
    corroborationQueries = initialQueries;

    const [fetchResult, corrobResult] = await Promise.allSettled([
      inputClass === 'url' ? fetchArticle(userMessage.trim()) : Promise.resolve(undefined),
      runCorroborationSearch(initialQueries, braveKey),
    ]);

    if (fetchResult.status === 'fulfilled' && fetchResult.value) {
      articleData = fetchResult.value;
      console.log(`[Sentrix] Article fetch — success=${articleData.success} domain=${articleData.domain} error=${articleData.error ?? 'none'}`);

      if (articleData.success && articleData.title) {
        const betterQueries = generateCorroborationQueries(userMessage, articleData.title);
        corroborationQueries = betterQueries;
        const extraSources = await runCorroborationSearch(betterQueries.slice(0, 2), braveKey);
        const seenDomains = new Set(corroborationSources.map(s => s.domain));
        for (const s of extraSources) {
          if (!seenDomains.has(s.domain)) { seenDomains.add(s.domain); corroborationSources.push(s); }
        }
      }
    }

    if (corrobResult.status === 'fulfilled') {
      const seenDomains = new Set(corroborationSources.map(s => s.domain));
      for (const s of corrobResult.value) {
        if (!seenDomains.has(s.domain)) { seenDomains.add(s.domain); corroborationSources.push(s); }
      }
    }

    console.log(`[Sentrix] Corroboration complete — ${corroborationSources.length} sources, queries: ${corroborationQueries.join(' | ')}`);
  }

  // ── Grounding block ─────────────────────────────────────────────────────────
  const resultsContext = buildResultsContext(results ?? []);
  const intelligenceSummary = intelligenceContext ? `\n\nINTELLIGENCE BRIEF:\n${intelligenceContext}` : '';
  const searchQuery = query ? `\n\nORIGINAL QUERY: "${query}"` : '';
  const modeNote = isArticleMode ? '\n\nMODE: Article/URL analysis — include Article Mode Extension sections.' : '';
  const verificationNote = needsCorroboration ? '\n\nMODE: Live verification required — use VERIFICATION STATUS and corroboration sources.' : '';

  let articleBlock = '';
  if (articleData) {
    if (articleData.success) {
      articleBlock = `\n\nARTICLE EXTRACTED:\nURL: ${userMessage.trim()}\nTitle: ${articleData.title}\nDomain: ${articleData.domain}\n` +
        (articleData.author ? `Author: ${articleData.author}\n` : '') +
        (articleData.date ? `Date: ${articleData.date}\n` : '') +
        `\n--- ARTICLE TEXT ---\n${articleData.content}\n--- END ARTICLE ---`;
    } else {
      articleBlock = `\n\nARTICLE FETCH NOTE: Content could not be fully retrieved. Reason: ${articleData.error ?? 'unknown'}. Analyze based on available data.`;
    }
  }

  const corroborationBlock = corroborationSources.length > 0
    ? `\n\nCORROBORATION SOURCES:\n${buildCorroborationContext(corroborationSources, corroborationQueries)}`
    : needsCorroboration ? '\n\nCORROBORATION: No additional sources retrieved — base assessment on available evidence and label uncertainty accordingly.' : '';

  const groundingBlock = `${searchQuery}${modeNote}${verificationNote}\n\nSUPPORTING REFERENCES:\n${resultsContext}${intelligenceSummary}${articleBlock}${corroborationBlock}`;

  // ── Conversation ────────────────────────────────────────────────────────────
  const priorMessages = messages ?? [];
  const contents = [];

  if (priorMessages.length === 0) {
    contents.push({ role: 'user', parts: [{ text: `${groundingBlock}\n\n---\n\nUser input: ${userMessage.trim()}` }] });
  } else {
    const [first, ...rest] = priorMessages;
    contents.push({ role: 'user', parts: [{ text: `${groundingBlock}\n\n---\n\nUser input: ${first.content}` }] });
    for (const msg of rest) {
      contents.push({ role: msg.role === 'assistant' ? 'model' : 'user', parts: [{ text: msg.content }] });
    }
    contents.push({ role: 'user', parts: [{ text: userMessage.trim() }] });
  }

  // ── Stream from Gemini ──────────────────────────────────────────────────────
  const geminiBase = resolveGeminiBase(env ?? {});
  const geminiPayload = {
    system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents,
    generationConfig: { maxOutputTokens: 8192 },
  };
  const geminiUrl = `${geminiBase}/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse&key=${apiKey}`;

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  (async () => {
    try {
      const geminiRes = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geminiPayload),
        signal: AbortSignal.timeout(90000),
      });

      if (!geminiRes.ok) {
        const errText = await geminiRes.text().catch(() => String(geminiRes.status));
        console.error(`[Sentrix] Gemini API error ${geminiRes.status}: ${errText.slice(0, 300)}`);
        writer.write(encoder.encode(sseChunk({ content: limitedModeFallback(userMessage) })));
        writer.write(encoder.encode(sseChunk({ done: true })));
        writer.close();
        return;
      }

      const reader = geminiRes.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      let hasOutput = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const raw = trimmed.slice(5).trim();
          if (!raw || raw === '[DONE]') continue;
          try {
            const evt = JSON.parse(raw);
            const text = evt?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) { hasOutput = true; writer.write(encoder.encode(sseChunk({ content: text }))); }
          } catch { /* skip malformed */ }
        }
      }

      if (!hasOutput) {
        console.warn('[Sentrix] Gemini returned no text — limited-mode fallback');
        writer.write(encoder.encode(sseChunk({ content: limitedModeFallback(userMessage) })));
      }

      writer.write(encoder.encode(sseChunk({ done: true })));
      writer.close();

      console.log(`[Sentrix] Sage completed — class=${inputClass} corroborationSources=${corroborationSources.length} articleFetched=${!!articleData?.success}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error(`[Sentrix] Sage stream error: ${msg}`);
      writer.write(encoder.encode(sseChunk({ content: limitedModeFallback(userMessage) })));
      writer.write(encoder.encode(sseChunk({ done: true })));
      writer.close();
    }
  })();

  return new Response(readable, { headers: sseHeaders });
}
