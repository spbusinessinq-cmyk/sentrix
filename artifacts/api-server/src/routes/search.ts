import { Router } from "express";
import { logger } from "../lib/logger";

const router = Router();

interface SearchResult {
  id: number;
  title: string;
  url: string;
  domain: string;
  snippet: string;
  provider: "brave" | "duckduckgo" | "mock";
}

// ─── Domain extraction ─────────────────────────────────────────────────────────

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function cleanTitle(text: string, url: string): string {
  if (!text || text.length < 2) return extractDomain(url);
  // Strip HTML tags
  const stripped = text.replace(/<[^>]+>/g, "").trim();
  if (!stripped || /^https?:\/\//i.test(stripped)) return extractDomain(url);
  return stripped.slice(0, 160);
}

function cleanSnippet(text: string, title: string, domain: string): string {
  if (!text || text.length < 3) return `${title} — ${domain}`;
  const stripped = text.replace(/<[^>]+>/g, "").trim();
  if (!stripped || stripped.length < 5) return `${title} — ${domain}`;
  return stripped.slice(0, 280);
}

function isValidUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    // DuckDuckGo's own domain in topic results = internal disambiguation pages — skip
    if (u.hostname === "duckduckgo.com" || u.hostname === "www.duckduckgo.com") return false;
    return true;
  } catch {
    return false;
  }
}

// ─── DuckDuckGo Instant Answer API ────────────────────────────────────────────

interface DDGTopic {
  Text?: string;
  FirstURL?: string;
  Result?: string;
  Topics?: DDGTopic[];
  Name?: string;
}

interface DDGResponse {
  AbstractText?: string;
  AbstractURL?: string;
  AbstractSource?: string;
  Heading?: string;
  RelatedTopics?: DDGTopic[];
  Results?: DDGTopic[];
  Definition?: string;
  DefinitionURL?: string;
  DefinitionSource?: string;
  Answer?: string;
  AnswerType?: string;
  Type?: string;
}

function parseDDGTopics(topics: DDGTopic[]): Array<{ text: string; url: string }> {
  const out: Array<{ text: string; url: string }> = [];
  for (const t of topics) {
    if (t.FirstURL && t.Text) {
      out.push({ text: t.Text, url: t.FirstURL });
    } else if (t.Topics) {
      // Nested group (e.g., "Websites", "Software")
      for (const sub of t.Topics) {
        if (sub.FirstURL && sub.Text) {
          out.push({ text: sub.Text, url: sub.FirstURL });
        }
      }
    }
  }
  return out;
}

function ddgTextToTitleSnippet(text: string, url: string): { title: string; snippet: string } {
  // DuckDuckGo Text is often "Title - Description" separated by " - "
  const stripped = text.replace(/<[^>]+>/g, "").trim();
  const dashIdx = stripped.indexOf(" - ");
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

async function searchDuckDuckGo(query: string): Promise<SearchResult[] | null> {
  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1&no_html=0&kl=us-en`;
    const res = await fetch(url, {
      headers: { "Accept": "application/json", "User-Agent": "Sentrix/1.0" },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;

    const data = (await res.json()) as DDGResponse;
    const results: SearchResult[] = [];
    let id = 1;

    // 1. Abstract (Wikipedia-style summary) — capture even if text is empty
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
        provider: "duckduckgo",
      });
    }

    // 2. Definition
    if (data.Definition && data.DefinitionURL && isValidUrl(data.DefinitionURL)) {
      results.push({
        id: id++,
        title: `${query} — Definition (${data.DefinitionSource || "Dictionary"})`,
        url: data.DefinitionURL,
        domain: extractDomain(data.DefinitionURL),
        snippet: cleanSnippet(data.Definition, query, extractDomain(data.DefinitionURL)),
        provider: "duckduckgo",
      });
    }

    // 3. Direct results
    const directTopics = parseDDGTopics(data.Results ?? []);
    for (const t of directTopics) {
      if (!isValidUrl(t.url)) continue;
      const { title, snippet } = ddgTextToTitleSnippet(t.text, t.url);
      results.push({ id: id++, title, url: t.url, domain: extractDomain(t.url), snippet, provider: "duckduckgo" });
    }

    // 4. Related topics
    const related = parseDDGTopics(data.RelatedTopics ?? []);
    for (const t of related) {
      if (!isValidUrl(t.url)) continue;
      if (results.some(r => r.url === t.url)) continue;
      const { title, snippet } = ddgTextToTitleSnippet(t.text, t.url);
      results.push({ id: id++, title, url: t.url, domain: extractDomain(t.url), snippet, provider: "duckduckgo" });
      if (results.length >= 20) break;
    }

    return results.length >= 1 ? results : null;
  } catch (err) {
    logger.warn({ query, err }, "DuckDuckGo search failed");
    return null;
  }
}

// ─── Enhanced mock results ────────────────────────────────────────────────────

function mockResults(query: string): SearchResult[] {
  const q = query.trim() || "results";
  const qEnc = encodeURIComponent(q);
  const qWiki = encodeURIComponent(q.replace(/\s+/g, "_"));

  return [
    {
      id: 1,
      title: `${q} — Wikipedia`,
      url: `https://en.wikipedia.org/wiki/${qWiki}`,
      domain: "en.wikipedia.org",
      snippet: `${q} — overview, history, and key concepts. Wikipedia provides community-maintained encyclopedic content on this topic.`,
      provider: "mock",
    },
    {
      id: 2,
      title: `${q} — GitHub repositories`,
      url: `https://github.com/search?q=${qEnc}&type=repositories`,
      domain: "github.com",
      snippet: `Open source repositories related to ${q}. Browse code, issues, pull requests, and community-contributed projects.`,
      provider: "mock",
    },
    {
      id: 3,
      title: `${q} — MDN Web Docs`,
      url: `https://developer.mozilla.org/en-US/search?q=${qEnc}`,
      domain: "developer.mozilla.org",
      snippet: `Developer documentation and references for ${q}. Includes technical guides, API references, and browser compatibility tables.`,
      provider: "mock",
    },
    {
      id: 4,
      title: `Questions about ${q} — Stack Overflow`,
      url: `https://stackoverflow.com/search?q=${qEnc}`,
      domain: "stackoverflow.com",
      snippet: `Community answers and technical discussion about ${q}. Voted solutions and insights from verified developers and engineers.`,
      provider: "mock",
    },
    {
      id: 5,
      title: `${q} — Hacker News discussions`,
      url: `https://news.ycombinator.com/search?q=${qEnc}`,
      domain: "news.ycombinator.com",
      snippet: `Recent technical discussions and news articles about ${q} from the Hacker News community and startup ecosystem.`,
      provider: "mock",
    },
    {
      id: 6,
      title: `${q} — Google Search`,
      url: `https://www.google.com/search?q=${qEnc}`,
      domain: "google.com",
      snippet: `Search Google for ${q}. Access the web's largest search index for comprehensive results across all domains.`,
      provider: "mock",
    },
    {
      id: 7,
      title: `${q} — Reddit community`,
      url: `https://www.reddit.com/search?q=${qEnc}`,
      domain: "reddit.com",
      snippet: `Community discussions and user perspectives on ${q}. Browse subreddits, posts, and comments from Reddit's global community.`,
      provider: "mock",
    },
    {
      id: 8,
      title: `Latest news: ${q} — Reuters`,
      url: `https://www.reuters.com/search/news?blob=${qEnc}`,
      domain: "reuters.com",
      snippet: `Breaking news and journalism about ${q} from Reuters. Trusted global news coverage with rigorous editorial standards.`,
      provider: "mock",
    },
    {
      id: 9,
      title: `${q} packages — npm`,
      url: `https://www.npmjs.com/search?q=${qEnc}`,
      domain: "npmjs.com",
      snippet: `JavaScript and Node.js packages related to ${q}. Explore open source modules, documentation, and install commands.`,
      provider: "mock",
    },
    {
      id: 10,
      title: `${q} — YouTube`,
      url: `https://www.youtube.com/results?search_query=${qEnc}`,
      domain: "youtube.com",
      snippet: `Video tutorials, explanations, and content related to ${q}. Watch and learn from creators and educators worldwide.`,
      provider: "mock",
    },
    {
      id: 11,
      title: `${q} — X / Twitter`,
      url: `https://x.com/search?q=${qEnc}`,
      domain: "x.com",
      snippet: `Real-time posts and discussion threads about ${q} on X (formerly Twitter). Live commentary and community reactions.`,
      provider: "mock",
    },
    {
      id: 12,
      title: `${q} — DuckDuckGo web search`,
      url: `https://duckduckgo.com/?q=${qEnc}`,
      domain: "duckduckgo.com",
      snippet: `Search the web for ${q} via DuckDuckGo — privacy-first search engine with no personal data tracking.`,
      provider: "mock",
    },
  ];
}

// ─── Brave Web Search ──────────────────────────────────────────────────────────

interface BraveWebResult {
  title: string;
  url: string;
  description?: string;
  meta_url?: { hostname?: string; scheme?: string };
}

async function searchBrave(query: string, apiKey: string): Promise<SearchResult[]> {
  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=15&safesearch=moderate&result_filter=web`;
  const response = await fetch(url, {
    headers: {
      "X-Subscription-Token": apiKey,
      "Accept": "application/json",
      "Accept-Encoding": "gzip",
    },
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) throw new Error(`Brave API error: ${response.status}`);
  const data = (await response.json()) as { web?: { results?: BraveWebResult[] } };
  const raw = data?.web?.results ?? [];

  return raw.map((r, i) => ({
    id: i + 1,
    title: cleanTitle(r.title, r.url),
    url: r.url,
    domain: r.meta_url?.hostname ?? extractDomain(r.url),
    snippet: cleanSnippet(r.description ?? "", r.title, extractDomain(r.url)),
    provider: "brave" as const,
  }));
}

// ─── Route ────────────────────────────────────────────────────────────────────

router.get("/search", async (req, res) => {
  const query = String(req.query["q"] ?? "").trim().slice(0, 400);

  if (!query) {
    return res.json({ results: [], provider: "empty", query: "" });
  }

  // 1. Try Brave Search (if API key set)
  const apiKey = process.env["BRAVE_SEARCH_API_KEY"];
  if (apiKey) {
    try {
      const results = await searchBrave(query, apiKey);
      logger.info({ query, count: results.length }, "Brave search success");
      return res.json({ results, provider: "brave", query });
    } catch (err) {
      logger.error({ query, err }, "Brave search failed — trying DuckDuckGo");
    }
  }

  // 2. Try DuckDuckGo Instant Answer API (free, no key)
  try {
    const ddgResults = await searchDuckDuckGo(query);
    if (ddgResults && ddgResults.length >= 1) {
      // Supplement with mock results to reach at least 12 unique domains
      const mock = mockResults(query);
      const combined = [...ddgResults];
      for (const m of mock) {
        if (!combined.some(r => r.domain === m.domain)) {
          combined.push({ ...m, id: combined.length + 1 });
        }
        if (combined.length >= 15) break;
      }
      // Re-number IDs
      combined.forEach((r, i) => { r.id = i + 1; });
      logger.info({ query, count: combined.length, ddg: ddgResults.length }, "DuckDuckGo search success");
      return res.json({ results: combined, provider: "duckduckgo", query });
    }
  } catch (err) {
    logger.warn({ query, err }, "DuckDuckGo failed — using mock");
  }

  // 3. Enhanced mock fallback
  logger.info({ query }, "Using mock results");
  return res.json({ results: mockResults(query), provider: "mock", query });
});

export default router;
