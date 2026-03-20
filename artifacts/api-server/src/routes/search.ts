import { Router } from "express";
import { logger } from "../lib/logger";

const router = Router();

interface BraveWebResult {
  title: string;
  url: string;
  description: string;
  meta_url?: { hostname?: string; scheme?: string };
}

interface SearchResult {
  id: number;
  title: string;
  url: string;
  domain: string;
  snippet: string;
  provider: "brave" | "mock";
}

function mockResults(query: string): SearchResult[] {
  const q = query || "results";
  return [
    {
      id: 1,
      title: `${q} — Wikipedia`,
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(q.replace(/\s+/g, "_"))}`,
      domain: "en.wikipedia.org",
      snippet: `${q} — overview, history and related topics on Wikipedia.`,
      provider: "mock",
    },
    {
      id: 2,
      title: `${q} — GitHub Search`,
      url: `https://github.com/search?q=${encodeURIComponent(q)}&type=repositories`,
      domain: "github.com",
      snippet: `Open source repositories related to ${q}. Browse code, issues, pull requests, and community discussions.`,
      provider: "mock",
    },
    {
      id: 3,
      title: `${q} — MDN Web Docs`,
      url: `https://developer.mozilla.org/en-US/search?q=${encodeURIComponent(q)}`,
      domain: "developer.mozilla.org",
      snippet: `Developer documentation and references for ${q}. Includes examples, compatibility tables, and guides.`,
      provider: "mock",
    },
    {
      id: 4,
      title: `${q} explained — Stack Overflow`,
      url: `https://stackoverflow.com/search?q=${encodeURIComponent(q)}`,
      domain: "stackoverflow.com",
      snippet: `Community answers and technical discussions about ${q}. Voted solutions from verified developers.`,
      provider: "mock",
    },
    {
      id: 5,
      title: `${q} — latest news`,
      url: `https://news.ycombinator.com/search?q=${encodeURIComponent(q)}`,
      domain: "news.ycombinator.com",
      snippet: `Recent discussions and news articles about ${q} from the Hacker News community.`,
      provider: "mock",
    },
  ];
}

router.get("/search", async (req, res) => {
  const query = String(req.query["q"] ?? "").trim().slice(0, 400);

  if (!query) {
    return res.json({ results: [], provider: "empty", query: "" });
  }

  const apiKey = process.env["BRAVE_SEARCH_API_KEY"];

  if (!apiKey) {
    logger.info({ query }, "BRAVE_SEARCH_API_KEY not set — using mock results");
    return res.json({ results: mockResults(query), provider: "mock", query });
  }

  try {
    const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=8&safesearch=moderate&result_filter=web`;
    const response = await fetch(url, {
      headers: {
        "X-Subscription-Token": apiKey,
        "Accept": "application/json",
        "Accept-Encoding": "gzip",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      throw new Error(`Brave API error: ${response.status}`);
    }

    const data = (await response.json()) as { web?: { results?: BraveWebResult[] } };
    const raw = data?.web?.results ?? [];

    const results: SearchResult[] = raw.map((r, i) => ({
      id: i + 1,
      title: r.title,
      url: r.url,
      domain: r.meta_url?.hostname ?? (() => { try { return new URL(r.url).hostname; } catch { return r.url; } })(),
      snippet: r.description ?? "",
      provider: "brave" as const,
    }));

    logger.info({ query, count: results.length }, "Brave search success");
    return res.json({ results, provider: "brave", query });
  } catch (err) {
    logger.error({ query, err }, "Brave search failed — falling back to mock");
    return res.json({ results: mockResults(query), provider: "mock", query, error: true });
  }
});

export default router;
