/**
 * EdgeOne Node Function — /api/search
 * Provides search results via Brave → DuckDuckGo → mock fallback chain.
 * Always returns JSON. Never returns HTML.
 */

function extractDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function cleanTitle(text, url) {
  if (!text || text.length < 2) return extractDomain(url);
  const stripped = text.replace(/<[^>]+>/g, '').trim();
  if (!stripped || /^https?:\/\//i.test(stripped)) return extractDomain(url);
  return stripped.slice(0, 160);
}

function cleanSnippet(text, title, domain) {
  if (!text || text.length < 3) return `${title} — ${domain}`;
  const stripped = text.replace(/<[^>]+>/g, '').trim();
  if (!stripped || stripped.length < 5) return `${title} — ${domain}`;
  return stripped.slice(0, 280);
}

function isValidUrl(url) {
  try {
    const u = new URL(url);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    if (u.hostname === 'duckduckgo.com' || u.hostname === 'www.duckduckgo.com') return false;
    return true;
  } catch {
    return false;
  }
}

function parseDDGTopics(topics) {
  const out = [];
  for (const t of topics) {
    if (t.FirstURL && t.Text) {
      out.push({ text: t.Text, url: t.FirstURL });
    } else if (t.Topics) {
      for (const sub of t.Topics) {
        if (sub.FirstURL && sub.Text) {
          out.push({ text: sub.Text, url: sub.FirstURL });
        }
      }
    }
  }
  return out;
}

function ddgTextToTitleSnippet(text, url) {
  const stripped = text.replace(/<[^>]+>/g, '').trim();
  const dashIdx = stripped.indexOf(' - ');
  if (dashIdx > 0 && dashIdx < 100) {
    return {
      title: stripped.slice(0, dashIdx).trim(),
      snippet: stripped.slice(dashIdx + 3).trim() || `Content from ${extractDomain(url)}`,
    };
  }
  const domain = extractDomain(url);
  if (stripped.length > 80) {
    return { title: domain, snippet: stripped.slice(0, 280) };
  }
  return { title: stripped || domain, snippet: `Related result from ${domain}` };
}

async function searchDuckDuckGo(query) {
  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1&no_html=0&kl=us-en`;
    const res = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'Sentrix/1.0' },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;

    const data = await res.json();
    const results = [];
    let id = 1;

    if (data.AbstractURL && isValidUrl(data.AbstractURL)) {
      const heading = data.Heading || query;
      const snippet = data.AbstractText
        ? cleanSnippet(data.AbstractText, heading, extractDomain(data.AbstractURL))
        : `${heading} — ${data.AbstractSource || extractDomain(data.AbstractURL)}`;
      results.push({
        id: id++,
        title: `${heading} — ${data.AbstractSource || extractDomain(data.AbstractURL)}`,
        url: data.AbstractURL,
        domain: extractDomain(data.AbstractURL),
        snippet,
        provider: 'duckduckgo',
      });
    }

    if (data.Definition && data.DefinitionURL && isValidUrl(data.DefinitionURL)) {
      results.push({
        id: id++,
        title: `${query} — Definition (${data.DefinitionSource || 'Dictionary'})`,
        url: data.DefinitionURL,
        domain: extractDomain(data.DefinitionURL),
        snippet: cleanSnippet(data.Definition, query, extractDomain(data.DefinitionURL)),
        provider: 'duckduckgo',
      });
    }

    const directTopics = parseDDGTopics(data.Results ?? []);
    for (const t of directTopics) {
      if (!isValidUrl(t.url)) continue;
      const { title, snippet } = ddgTextToTitleSnippet(t.text, t.url);
      results.push({ id: id++, title, url: t.url, domain: extractDomain(t.url), snippet, provider: 'duckduckgo' });
    }

    const related = parseDDGTopics(data.RelatedTopics ?? []);
    for (const t of related) {
      if (!isValidUrl(t.url)) continue;
      if (results.some(r => r.url === t.url)) continue;
      const { title, snippet } = ddgTextToTitleSnippet(t.text, t.url);
      results.push({ id: id++, title, url: t.url, domain: extractDomain(t.url), snippet, provider: 'duckduckgo' });
      if (results.length >= 20) break;
    }

    return results.length >= 1 ? results : null;
  } catch {
    return null;
  }
}

async function searchBrave(query, apiKey) {
  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=15&safesearch=moderate&result_filter=web`;
  const response = await fetch(url, {
    headers: {
      'X-Subscription-Token': apiKey,
      Accept: 'application/json',
      'Accept-Encoding': 'gzip',
    },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`Brave API error: ${response.status}`);
  const data = await response.json();
  const raw = data?.web?.results ?? [];
  return raw.map((r, i) => ({
    id: i + 1,
    title: cleanTitle(r.title, r.url),
    url: r.url,
    domain: r.meta_url?.hostname ?? extractDomain(r.url),
    snippet: cleanSnippet(r.description ?? '', r.title, extractDomain(r.url)),
    provider: 'brave',
  }));
}

function mockResults(query) {
  const q = query.trim() || 'results';
  const qEnc = encodeURIComponent(q);
  const qWiki = encodeURIComponent(q.replace(/\s+/g, '_'));
  return [
    { id: 1, title: `${q} — Wikipedia`, url: `https://en.wikipedia.org/wiki/${qWiki}`, domain: 'en.wikipedia.org', snippet: `${q} — overview, history, and key concepts.`, provider: 'mock' },
    { id: 2, title: `${q} — GitHub repositories`, url: `https://github.com/search?q=${qEnc}&type=repositories`, domain: 'github.com', snippet: `Open source repositories related to ${q}.`, provider: 'mock' },
    { id: 3, title: `${q} — MDN Web Docs`, url: `https://developer.mozilla.org/en-US/search?q=${qEnc}`, domain: 'developer.mozilla.org', snippet: `Developer documentation and references for ${q}.`, provider: 'mock' },
    { id: 4, title: `Questions about ${q} — Stack Overflow`, url: `https://stackoverflow.com/search?q=${qEnc}`, domain: 'stackoverflow.com', snippet: `Community answers and technical discussion about ${q}.`, provider: 'mock' },
    { id: 5, title: `${q} — Hacker News discussions`, url: `https://news.ycombinator.com/search?q=${qEnc}`, domain: 'news.ycombinator.com', snippet: `Recent technical discussions about ${q}.`, provider: 'mock' },
    { id: 6, title: `${q} — Reuters`, url: `https://www.reuters.com/search/news?blob=${qEnc}`, domain: 'reuters.com', snippet: `News and journalism about ${q} from Reuters.`, provider: 'mock' },
    { id: 7, title: `${q} — Reddit community`, url: `https://www.reddit.com/search?q=${qEnc}`, domain: 'reddit.com', snippet: `Community discussions and user perspectives on ${q}.`, provider: 'mock' },
    { id: 8, title: `${q} — YouTube`, url: `https://www.youtube.com/results?search_query=${qEnc}`, domain: 'youtube.com', snippet: `Video content related to ${q}.`, provider: 'mock' },
    { id: 9, title: `${q} — X / Twitter`, url: `https://x.com/search?q=${qEnc}`, domain: 'x.com', snippet: `Real-time posts about ${q}.`, provider: 'mock' },
    { id: 10, title: `${q} — DuckDuckGo`, url: `https://duckduckgo.com/?q=${qEnc}`, domain: 'duckduckgo.com', snippet: `Privacy-first web search for ${q}.`, provider: 'mock' },
  ];
}

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  const url = new URL(request.url);
  const query = (url.searchParams.get('q') ?? '').trim().slice(0, 400);

  if (!query) {
    return new Response(JSON.stringify({ results: [], provider: 'empty', query: '' }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  const braveKey = env?.BRAVE_SEARCH_API_KEY;

  if (braveKey) {
    try {
      const results = await searchBrave(query, braveKey);
      return new Response(JSON.stringify({ results, provider: 'brave', query }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    } catch {
      // fall through to DuckDuckGo
    }
  }

  try {
    const ddgResults = await searchDuckDuckGo(query);
    if (ddgResults && ddgResults.length >= 1) {
      const mock = mockResults(query);
      const combined = [...ddgResults];
      for (const m of mock) {
        if (!combined.some(r => r.domain === m.domain)) {
          combined.push({ ...m, id: combined.length + 1 });
        }
        if (combined.length >= 15) break;
      }
      combined.forEach((r, i) => { r.id = i + 1; });
      return new Response(JSON.stringify({ results: combined, provider: 'duckduckgo', query }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }
  } catch {
    // fall through to mock
  }

  return new Response(JSON.stringify({ results: mockResults(query), provider: 'mock', query }), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}
