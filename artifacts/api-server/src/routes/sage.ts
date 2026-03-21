import { Router } from "express";
import { ai } from "@workspace/integrations-gemini-ai";
import { logger } from "../lib/logger";

const sageRouter = Router();

// ── Input classification ──────────────────────────────────────────────────────

type InputClass = "url" | "article" | "current-events" | "general";

type EventType = "death" | "arrest" | "war-attack" | "lawsuit" | "election" | "health" | "business" | "general";

const CURRENT_EVENTS_RE =
  /(died?|dies|dead|killed|arrested|charged|indicted|convicted|elected|fired|resigned|appointed|invaded|attacked|struck|bombed|crashed|launched|outbreak|confirmed|signed|declared|passed\s+away|murdered|shot|leaked|hacked|bankrupt|collapsed|shooting|explosion|earthquake|hurricane|pandemic|war|invasion|sanctions|missile|airstrike|ceasefire|impeach|hospitali[sz]ed|detained|sentenced)/i;

function detectInputClass(msg: string): InputClass {
  const t = msg.trim();
  if (/^https?:\/\/[^\s]{4,}/.test(t)) return "url";
  if (t.length > 300) return "article";
  if (CURRENT_EVENTS_RE.test(t)) return "current-events";
  return "general";
}

function detectEventType(input: string): EventType {
  const t = input.toLowerCase();
  if (/(died?|dies|dead|killed|murder|shot dead|passed away|deceased)/.test(t)) return "death";
  if (/(arrested|charged|indicted|convicted|detained|sentenced)/.test(t)) return "arrest";
  if (/(attacked|invaded|bombed|struck|airstrike|missile|shooting|explosion|terror attack)/.test(t)) return "war-attack";
  if (/(lawsuit|sued|suing|litigation|legal action|court case)/.test(t)) return "lawsuit";
  if (/(elected|election|won the vote|lost the vote|ballot|referendum)/.test(t)) return "election";
  if (/(hospitalized|hospitalised|ill|sick|cancer|surgery|outbreak|pandemic|disease)/.test(t)) return "health";
  if (/(acquired|merger|bankrupt|ipo|earnings|fired|layoff|ceo|company)/.test(t)) return "business";
  return "general";
}

function isNonTechnical(q: string): boolean {
  return !/\b(javascript|typescript|react|python|css|html|node\.?js|npm|api|function|component|code|deploy|error|bug|debug|install|package|github|git|docker|kubernetes|sql|database|aws|cloud|server|backend|frontend|webpack|vite|eslint|prettier|lint|jest|vitest|ruby|rust|java|swift|kotlin|golang|c\+\+|bash|shell|terminal|regex|algorithm|recursion)\b/i.test(q);
}

// ── Named entity extraction ───────────────────────────────────────────────────

function extractEntities(text: string): string[] {
  const raw = text.match(/\b[A-Z][a-z]{1,20}(?:\s+[A-Z][a-z]{1,20}){0,3}\b/g) ?? [];
  const stopWords = new Set(["The", "A", "An", "It", "They", "He", "She", "We", "I", "This", "That", "These", "Those", "What", "Who", "When", "Where", "Why", "How"]);
  return [...new Set(raw.filter(e => !stopWords.has(e.split(" ")[0] ?? "")))].slice(0, 4);
}

// ── Dual-track query generation ───────────────────────────────────────────────

interface DualTrackQueries {
  confirming: string[];
  contradicting: string[];
}

function generateDualTrackQueries(
  input: string,
  eventType: EventType,
  articleTitle?: string
): DualTrackQueries {
  const base = articleTitle ?? input;
  const entities = extractEntities(base);
  const name = entities[0] ?? "";                // primary named entity
  const entityStr = entities.slice(0, 2).join(" ");
  const year = new Date().getFullYear();

  const confirming: string[] = [];
  const contradicting: string[] = [];

  if (articleTitle) {
    // Article mode — search for the article title and entity context
    confirming.push(articleTitle.slice(0, 120));
    if (name) {
      confirming.push(`${name} news ${year}`);
      confirming.push(`${name} confirmed report`);
    }
    if (entityStr) {
      contradicting.push(`${entityStr} denied false disputed`);
      contradicting.push(`${articleTitle.slice(0, 70)} disputed false`);
    }
  } else {
    // Claim mode — generate event-type-specific queries optimised for news search
    confirming.push(input.slice(0, 120));

    switch (eventType) {
      case "death":
        if (name) {
          confirming.push(`${name} died`);
          confirming.push(`${name} death`);
          confirming.push(`${name} obituary`);
          confirming.push(`${name} confirmed dead`);
          contradicting.push(`${name} alive ${year}`);
          contradicting.push(`${name} death hoax`);
          contradicting.push(`${name} not dead`);
          contradicting.push(`${name} health update`);
        } else {
          confirming.push(`${input.slice(0, 60)} confirmed`);
          contradicting.push(`${input.slice(0, 60)} false rumor`);
          contradicting.push(`${input.slice(0, 60)} hoax denied`);
        }
        break;
      case "arrest":
        if (name) {
          confirming.push(`${name} arrested`);
          confirming.push(`${name} arrest charges`);
          confirming.push(`${name} indicted`);
          contradicting.push(`${name} not arrested`);
          contradicting.push(`${name} arrest denied`);
          contradicting.push(`${name} charges dropped`);
        } else {
          confirming.push(`${input.slice(0, 60)} confirmed`);
          contradicting.push(`${input.slice(0, 60)} false charges`);
        }
        break;
      case "war-attack":
        if (entityStr) {
          confirming.push(`${entityStr} attack strike`);
          confirming.push(`${entityStr} attack confirmed`);
          confirming.push(`${entityStr} airstrike missile`);
          contradicting.push(`${entityStr} attack denied false`);
          contradicting.push(`${entityStr} ceasefire no attack`);
        } else {
          confirming.push(`${input.slice(0, 60)} confirmed`);
          contradicting.push(`${input.slice(0, 60)} denied`);
        }
        break;
      case "lawsuit":
        if (name) {
          confirming.push(`${name} lawsuit sued`);
          confirming.push(`${name} legal case charges`);
          contradicting.push(`${name} lawsuit dismissed`);
          contradicting.push(`${name} case dropped acquitted`);
        } else {
          confirming.push(`${input.slice(0, 60)} lawsuit confirmed`);
          contradicting.push(`${input.slice(0, 60)} dismissed disputed`);
        }
        break;
      case "election":
        if (name) {
          confirming.push(`${name} election result won`);
          confirming.push(`${name} elected victory`);
          contradicting.push(`${name} election disputed contested`);
          contradicting.push(`${name} election fraud claims`);
        } else {
          confirming.push(`${input.slice(0, 60)} result confirmed`);
          contradicting.push(`${input.slice(0, 60)} disputed`);
        }
        break;
      case "health":
        if (name) {
          confirming.push(`${name} hospitalized sick`);
          confirming.push(`${name} health condition`);
          contradicting.push(`${name} healthy fine`);
          contradicting.push(`${name} health false rumor`);
        } else {
          confirming.push(`${input.slice(0, 60)} confirmed`);
          contradicting.push(`${input.slice(0, 60)} false`);
        }
        break;
      default:
        if (entityStr) {
          confirming.push(`${entityStr} ${year}`);
          contradicting.push(`${entityStr} denied disputed`);
          contradicting.push(`${entityStr} false misleading`);
        } else {
          confirming.push(`${input.slice(0, 60)}`);
          contradicting.push(`${input.slice(0, 60)} disputed false`);
        }
    }
  }

  return {
    confirming:    [...new Set(confirming)].filter(Boolean).slice(0, 4),
    contradicting: [...new Set(contradicting)].filter(Boolean).slice(0, 4),
  };
}

// ── Article extraction ────────────────────────────────────────────────────────

interface ArticleData {
  title: string;
  domain: string;
  author?: string;
  date?: string;
  content: string;
  success: boolean;
  error?: string;
}

function extractDomain(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ""); }
  catch { return url.slice(0, 40); }
}

function parseHtml(html: string, url: string): ArticleData {
  const domain = extractDomain(url);
  const titleMatch =
    html.match(/property="og:title"\s+content="([^"]{3,200})"/i) ||
    html.match(/content="([^"]{3,200})"\s+property="og:title"/i) ||
    html.match(/<title[^>]*>([^<]{3,200})<\/title>/i) ||
    html.match(/<h1[^>]*>([^<]{3,150})<\/h1>/i);
  const title = titleMatch ? titleMatch[1].trim().replace(/&amp;/g, "&") : domain;

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
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, " ")
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, " ")
    .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z#0-9]{1,8};/gi, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 9000);

  return { title, domain, author, date, content, success: true };
}

async function fetchArticle(url: string): Promise<ArticleData> {
  const domain = extractDomain(url);
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; SentrixAnalysis/1.0; +https://sentrix.io)",
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return { title: domain, domain, content: `Content could not be fully retrieved. HTTP ${res.status}.`, success: false, error: `HTTP ${res.status}` };
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("html")) return { title: domain, domain, content: `Non-HTML content (${ct}).`, success: false, error: "non-html" };
    const html = await res.text();
    return parseHtml(html, url);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { title: domain, domain, content: `Content could not be fully retrieved. (${msg.slice(0, 120)})`, success: false, error: msg };
  }
}

// ── Corroboration search ──────────────────────────────────────────────────────

interface CorroborationResult {
  title: string; url: string; domain: string; snippet: string;
}

type RetrievalStatus = "SUCCESS" | "DEGRADED" | "FAILED";

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ").replace(/&#\d+;/g, " ");
}

// ── Stage 1: Brave Search (when API key present) ───────────────────────────

async function searchBraveCorroboration(query: string, apiKey: string): Promise<CorroborationResult[]> {
  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=8&safesearch=moderate&result_filter=web`;
  const res = await fetch(url, {
    headers: { "X-Subscription-Token": apiKey, Accept: "application/json" },
    signal: AbortSignal.timeout(7000),
  });
  if (!res.ok) throw new Error(`Brave ${res.status}`);
  const data = await res.json() as { web?: { results?: Array<{ title: string; url: string; description?: string; meta_url?: { hostname?: string } }> } };
  return (data?.web?.results ?? []).slice(0, 8).map(r => ({
    title: r.title ?? "",
    url: r.url ?? "",
    domain: r.meta_url?.hostname ?? extractDomain(r.url ?? ""),
    snippet: r.description ?? "",
  })).filter(r => r.title && r.domain);
}

// ── Stage 2: Google News RSS (free, real news headlines and snippets) ──────

async function searchGoogleNews(query: string): Promise<CorroborationResult[]> {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; SentrixVerify/1.0; +https://sentrix.io)",
        "Accept": "application/rss+xml,application/xml,text/xml,*/*",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const xml = await res.text();

    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)];
    const results: CorroborationResult[] = [];

    for (const match of items.slice(0, 12)) {
      const itemXml = match[1] ?? "";

      // Title: CDATA or plain; format is often "Article headline - Source Name"
      const titleRaw = decodeHtmlEntities(
        itemXml.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/)?.[1] ??
        itemXml.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? ""
      ).trim();
      const lastDash = titleRaw.lastIndexOf(" - ");
      const articleTitle = lastDash > 10 ? titleRaw.slice(0, lastDash).trim() : titleRaw;
      const sourceName   = lastDash > 10 ? titleRaw.slice(lastDash + 3).trim() : "";

      // Source element gives us the real publisher's domain
      const sourceUrl = itemXml.match(/<source\s+url="([^"]+)"/)?.[1]?.trim() ?? "";
      const domain = sourceUrl ? extractDomain(sourceUrl) : "";
      if (!articleTitle || !domain) continue;

      // Description: extract text from CDATA HTML
      const descRaw =
        itemXml.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/)?.[1] ??
        itemXml.match(/<description>([\s\S]*?)<\/description>/)?.[1] ?? "";

      // Extract first plain-text sentence from the description HTML
      const snippetHtml = descRaw.replace(/<[^>]+>/g, " ").replace(/\s{2,}/g, " ").trim();
      const snippet = decodeHtmlEntities(snippetHtml).slice(0, 280) ||
                      `${articleTitle} — ${sourceName || domain}`;

      // Best article URL: from description href, else source domain
      const descLink = descRaw.match(/href="(https?:\/\/(?!news\.google\.com)[^"]+)"/)?.[1] ?? "";
      const articleUrl = descLink || sourceUrl || `https://${domain}`;

      results.push({ title: articleTitle + (sourceName ? ` — ${sourceName}` : ""), url: articleUrl, domain, snippet });
    }

    return results;
  } catch {
    return [];
  }
}

// ── Stage 3: Wikipedia search API (free, no key) ───────────────────────────

async function searchWikipedia(query: string): Promise<CorroborationResult[]> {
  const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=4&format=json&origin=*`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "SentrixVerify/1.0 (fact-check)" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    const data = await res.json() as {
      query?: { search?: Array<{ title: string; snippet: string; pageid: number }> };
    };
    return (data?.query?.search ?? []).slice(0, 4).map(r => ({
      title: `${r.title} — Wikipedia`,
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(r.title.replace(/ /g, "_"))}`,
      domain: "en.wikipedia.org",
      snippet: r.snippet.replace(/<[^>]+>/g, "").replace(/\s{2,}/g, " ").trim().slice(0, 280),
    })).filter(r => r.snippet.length > 10);
  } catch {
    return [];
  }
}

// ── Stage 4: DuckDuckGo Instant Answers (knowledge cards only) ─────────────

async function searchDDGInstant(query: string): Promise<CorroborationResult[]> {
  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1&no_html=0&kl=us-en`;
    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "Sentrix/1.0" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    const data = await res.json() as {
      AbstractText?: string; AbstractURL?: string; Heading?: string;
      RelatedTopics?: Array<{ FirstURL?: string; Text?: string; Topics?: Array<{ FirstURL?: string; Text?: string }> }>;
    };
    const results: CorroborationResult[] = [];
    if (data.AbstractURL && data.AbstractText && data.AbstractText.length > 20) {
      results.push({
        title: data.Heading ?? query,
        url: data.AbstractURL,
        domain: extractDomain(data.AbstractURL),
        snippet: data.AbstractText.slice(0, 280),
      });
    }
    const topics = data.RelatedTopics ?? [];
    for (const t of topics) {
      if (t.FirstURL && t.Text && t.Text.length > 20 && results.length < 5) {
        results.push({ title: t.Text.slice(0, 120), url: t.FirstURL, domain: extractDomain(t.FirstURL), snippet: t.Text.slice(0, 280) });
      }
      if ("Topics" in t && (t as { Topics?: Array<{ FirstURL?: string; Text?: string }> }).Topics) {
        for (const sub of (t as { Topics: Array<{ FirstURL?: string; Text?: string }> }).Topics) {
          if (sub.FirstURL && sub.Text && sub.Text.length > 20 && results.length < 5) {
            results.push({ title: sub.Text.slice(0, 120), url: sub.FirstURL, domain: extractDomain(sub.FirstURL), snippet: sub.Text.slice(0, 280) });
          }
        }
      }
    }
    return results;
  } catch { return []; }
}

// ── Broadening strategy: simplify query to entity + keyword ───────────────

function broadenQuery(query: string, eventType: EventType): string {
  const entities = extractEntities(query);
  const name = entities[0] ?? query.split(" ").slice(0, 3).join(" ");
  const keywordMap: Record<EventType, string> = {
    death: "death",
    arrest: "arrest",
    "war-attack": "attack",
    lawsuit: "lawsuit",
    election: "election result",
    health: "health",
    business: "news",
    general: "news",
  };
  return `${name} ${keywordMap[eventType] ?? "news"}`;
}

// ── Multi-stage corroboration search with fallback ────────────────────────

async function runCorroborationSearch(
  queries: string[],
  eventType: EventType,
  braveKey?: string
): Promise<{ results: CorroborationResult[]; status: RetrievalStatus; provider: string }> {
  const all: CorroborationResult[] = [];
  const seenDomains = new Set<string>();
  const providers: string[] = [];

  const merge = (incoming: CorroborationResult[]) => {
    for (const r of incoming) {
      if (r.domain && r.snippet && r.snippet.length > 15 && !seenDomains.has(r.domain)) {
        seenDomains.add(r.domain);
        all.push(r);
      }
    }
  };

  for (const q of queries.slice(0, 4)) {
    // Stage A: Brave (if key present)
    if (braveKey && all.length < 3) {
      try {
        const bResults = await searchBraveCorroboration(q, braveKey);
        if (bResults.length > 0) { merge(bResults); providers.push("brave"); }
      } catch { /* fall through */ }
    }

    // Stage B: Google News RSS — primary free provider
    if (all.length < 3) {
      const gnResults = await searchGoogleNews(q);
      if (gnResults.length > 0) { merge(gnResults); providers.push("google-news"); }
    }

    // Stage C: Wikipedia for entity context
    if (all.length < 2) {
      const wikiResults = await searchWikipedia(q);
      if (wikiResults.length > 0) { merge(wikiResults); providers.push("wikipedia"); }
    }

    // Stage D: DDG Instant Answers (knowledge cards, entity-level)
    if (all.length < 2) {
      const ddgResults = await searchDDGInstant(q);
      if (ddgResults.length > 0) { merge(ddgResults); providers.push("ddg"); }
    }

    if (all.length >= 6) break;
  }

  // Stage E: Broaden query if still empty
  if (all.length === 0) {
    const broad = broadenQuery(queries[0] ?? "", eventType);
    const gnBroad = await searchGoogleNews(broad);
    merge(gnBroad);
    if (gnBroad.length > 0) providers.push("google-news-broad");

    if (all.length === 0) {
      const wikiBroad = await searchWikipedia(broad);
      merge(wikiBroad);
      if (wikiBroad.length > 0) providers.push("wikipedia-broad");
    }
  }

  const status: RetrievalStatus = all.length >= 3 ? "SUCCESS" : all.length >= 1 ? "DEGRADED" : "FAILED";
  return { results: all.slice(0, 10), status, provider: [...new Set(providers)].join("+") || "none" };
}

async function runDualTrackSearch(
  queries: DualTrackQueries,
  eventType: EventType,
  braveKey?: string
): Promise<{
  confirming: CorroborationResult[];
  contradicting: CorroborationResult[];
  confirmStatus: RetrievalStatus;
  denyStatus: RetrievalStatus;
  confirmProvider: string;
  denyProvider: string;
}> {
  const [confirmResult, denyResult] = await Promise.allSettled([
    runCorroborationSearch(queries.confirming, eventType, braveKey),
    runCorroborationSearch(queries.contradicting, eventType, braveKey),
  ]);
  return {
    confirming:      confirmResult.status === "fulfilled" ? confirmResult.value.results      : [],
    contradicting:   denyResult.status    === "fulfilled" ? denyResult.value.results        : [],
    confirmStatus:   confirmResult.status === "fulfilled" ? confirmResult.value.status      : "FAILED",
    denyStatus:      denyResult.status    === "fulfilled" ? denyResult.value.status         : "FAILED",
    confirmProvider: confirmResult.status === "fulfilled" ? confirmResult.value.provider    : "error",
    denyProvider:    denyResult.status    === "fulfilled" ? denyResult.value.provider       : "error",
  };
}

// ── System prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are SAGE — Sentrix's Signal & Truth Filter and Intelligence Engine.

You exist to turn raw user input into structured, decision-useful intelligence.
You are not a chatbot. You do not chat. You classify, retrieve, reason, and report.

━━━━━━━━━━━━━━━━━━━━━━━
STEP 0 — CLASSIFY THE INPUT
━━━━━━━━━━━━━━━━━━━━━━━

Before answering, classify the input into exactly one mode:

VERIFIER MODE — use when the input is:
- a concrete factual claim ("did X happen", "is X dead", "was X arrested")
- a breaking-news question
- a specific event claim (death, arrest, attack, election, lawsuit)
- a headline to fact-check
- an article asking to be fact-checked

ANALYST MODE — use when the input is:
- a broad political, geopolitical, or strategic assertion
- an economic or ideological claim ("can X survive without Y", "would X collapse")
- a dependency or power-dynamics question
- something too broad to verify as a simple true/false
- an interpretive claim that requires weighing evidence and context

EXTRACTOR MODE — use when the input is:
- a URL
- a pasted long-form article or document
- a block of raw text longer than ~300 characters
→ After extracting, classify the content as VERIFIER or ANALYST and continue in that mode.

State the mode you selected at the top of your response as:
**MODE: VERIFIER** or **MODE: ANALYST** or **MODE: EXTRACTOR → [VERIFIER|ANALYST]**

━━━━━━━━━━━━━━━━━━━━━━━
TONE AND DISCIPLINE
━━━━━━━━━━━━━━━━━━━━━━━

Write like an elite analyst briefing a serious operator.
- Sharp. Calm. Structured.
- Answer directly first. No throat-clearing.
- No filler ("Great question!", "I'll do my best", "As an AI...")
- No fake certainty. No empty disclaimers.
- No verbose academic padding.
- Uncertainty is fine. Vagueness is not.
- If evidence is weak, say it clearly and move on.

Distinguish between:
- FACT — verifiable and verified assertion
- CLAIM — asserted but unverified
- QUOTE — attributed to a named source
- STAT — numerical/percentage claim
- IMPLIED — framing-driven, not stated directly
- SPECULATION — conjecture without evidence basis

━━━━━━━━━━━━━━━━━━━━━━━
VERIFIER MODE FORMAT
━━━━━━━━━━━━━━━━━━━━━━━

Use this format for specific factual claims and events.

## ANSWER
Direct conclusion. State what is being claimed, whether it holds up, and what the real picture is.
Anchor to retrieved sources. If evidence is thin, say so explicitly.

## VERIFICATION STATUS
One of: CONFIRMED / LIKELY / DISPUTED / UNSUPPORTED / UNKNOWN

Standards:
- CONFIRMED: 2+ independent high-quality sources, OR 1 official/primary + 1 major news source
- LIKELY: 1 corroborating source, no major counter-evidence found
- DISPUTED: confirming and contradicting sources both exist, or official denial present
- UNSUPPORTED: no corroboration found
- UNKNOWN: contradictory signals, too early to assess, or zero evidence either way

For DEATHS, ARRESTS, WAR EVENTS, ELECTIONS, HEALTH EMERGENCIES: require CONFIRMED before applying that label.

## SIGNAL
HIGH / MEDIUM / LOW — explain what drives this (source quality, evidence density, corroboration).

## AGREEMENT
CONSENSUS / MIXED / CONFLICT / UNKNOWN — explain what sources agree or disagree on.

## RISK
SAFE / CAUTION / DANGER — explain manipulation patterns, trust signals, or sourcing weaknesses.

## WHAT HOLDS UP
Bullet list of supported facts from retrieved evidence. Cite sources where possible.

## WHAT DOES NOT HOLD UP
Bullet list of unsupported, weak, contradicted, or misleading parts of the input.

## WHAT TO VERIFY NEXT
3–5 concrete next steps to resolve remaining uncertainty. Be specific.

## SOURCES
Only sources actually used in this analysis.
Format: • domain.com — what this source contributes
Max 6 entries.

━━━━━━━━━━━━━━━━━━━━━━━
ANALYST MODE FORMAT
━━━━━━━━━━━━━━━━━━━━━━━

Use this format for broad strategic, political, economic, or ideological claims.
Do NOT force a binary true/false frame. Think like an analyst, not a fact-check bot.
Do NOT say "no confirming sources found" for inherently interpretive questions.

## ANSWER
Direct reasoned conclusion first. State where the claim is strong, where it is overstated, and what the real picture is.

## CLAIM TYPE
Strategic / geopolitical / political / economic / ideological / analytical

## CORE QUESTION
Restate exactly what is being asked, stripped of framing or loaded language.

## KEY ASSUMPTIONS
Bullet list of hidden assumptions embedded in the claim. Surface what the claim takes for granted.

## ASSESSMENT
One of: STRONG / MODERATE / WEAK / OVERSTATED / UNCLEAR
Then explain the basis for this rating.

## WHAT SUPPORTS THE CLAIM
Bullet list of evidence, precedent, or logic that supports the claim.

## WHAT WEAKENS THE CLAIM
Bullet list of counter-evidence, missing context, or logical gaps.

## WHAT WOULD NEED TO BE VERIFIED
Specific facts, data, or sources needed to settle the question properly.

## SOURCES / REFERENCE AREAS
Retrieved sources or reference domains relevant to this analysis, if available.

━━━━━━━━━━━━━━━━━━━━━━━
EXTRACTOR MODE FORMAT
━━━━━━━━━━━━━━━━━━━━━━━

Use when input is a URL or long pasted article/document.

## ARTICLE
- Title:
- Outlet:
- Domain:
- Date:
- Author:

## SUMMARY
What the article is actually saying. 2–4 sentences. Neutral, factual.

## CORE CLAIMS
Bullet list of claims extracted from the content, each tagged:
- [FACT] — verifiable assertion
- [QUOTED] — attributed to a named source
- [STAT] — numerical/percentage claim
- [IMPLIED] — framing-driven, not stated directly
- [SPECULATION] — conjecture without evidence basis
Each assessed as: supported / partially supported / unsupported / unclear

## VERDICT
WELL SUPPORTED / PARTIALLY SUPPORTED / WEAKLY SUPPORTED / UNCLEAR / HIGH RISK
One sentence explanation.

Then continue in VERIFIER or ANALYST mode as appropriate for the content.

━━━━━━━━━━━━━━━━━━━━━━━
SOURCE QUALITY
━━━━━━━━━━━━━━━━━━━━━━━

Tier 1: official statements, court records, company filings, primary records, direct verified accounts
Tier 2: Reuters, AP, BBC, NYT, WSJ, Bloomberg, Guardian, established major outlets
Tier 3: secondary reporting, blogs, aggregators, reposts, discussion forums

Tier 1 and Tier 2 carry the most weight.
Tier 3 alone cannot produce CONFIRMED — only LIKELY at best.

Aggressively deprioritize for non-technical queries:
- MDN, GitHub, npm, Stack Overflow, Hacker News, developer docs
- Results that match query keywords but are not about the claim itself

━━━━━━━━━━━━━━━━━━━━━━━
HALLUCINATION GUARDRAILS
━━━━━━━━━━━━━━━━━━━━━━━

YOU MUST:
- Base factual conclusions on the retrieved sources provided, not model memory
- Label uncertainty explicitly: LIKELY / DISPUTED / UNSUPPORTED / UNKNOWN
- Show both supporting and contradicting evidence — never only one side
- Distinguish between fact, claim, implication, and speculation

YOU MUST NEVER:
- State CONFIRMED without meeting the 2-source standard in retrieved data
- Invent corroboration not present in the sources provided
- Use model knowledge alone for current events, deaths, arrests, war events, elections
- Imply verification occurred when corroboration is missing
- Say "I cannot access live URLs" — analyze what is available and note gaps once
- Give an "unable to help" response when the issue is just analytical complexity

If evidence is thin: say it clearly. Uncertainty stated honestly is more useful than false confidence.

The user must leave knowing exactly what was found, what was not found, and what to do next.`

// ── Context builders ──────────────────────────────────────────────────────────

function buildResultsContext(
  results: Array<{ title: string; domain: string; snippet: string; score?: number }>
): string {
  if (!results || results.length === 0) return "No search results provided.";
  return results.slice(0, 10).map((r, i) => {
    const tier = r.score != null ? (r.score >= 80 ? "[HIGH]" : r.score >= 60 ? "[MED]" : "[LOW]") : "";
    return `[Ref ${i + 1}] ${r.domain} ${tier}\nTitle: ${r.title}\nSnippet: ${r.snippet}`;
  }).join("\n\n");
}

function buildDualTrackContext(
  confirming: CorroborationResult[],
  contradicting: CorroborationResult[],
  queries: DualTrackQueries,
  confirmStatus: RetrievalStatus = "FAILED",
  denyStatus: RetrievalStatus = "FAILED",
  confirmProvider = "none",
  denyProvider = "none"
): string {
  const cfmQStr  = queries.confirming.map(q => `"${q}"`).join(" | ");
  const denyQStr = queries.contradicting.map(q => `"${q}"`).join(" | ");

  const overallStatus: RetrievalStatus =
    confirmStatus === "SUCCESS" && denyStatus === "SUCCESS" ? "SUCCESS" :
    confirmStatus === "FAILED"  && denyStatus === "FAILED"  ? "FAILED"  : "DEGRADED";

  const statusNote =
    overallStatus === "FAILED"   ? "RETRIEVAL STATUS: FAILED — live search returned no usable sources. Sage must not draw confident conclusions and must note retrieval failure." :
    overallStatus === "DEGRADED" ? "RETRIEVAL STATUS: DEGRADED — one or both search tracks returned limited results. Note this limitation in the analysis." :
                                   "RETRIEVAL STATUS: SUCCESS — live search retrieved sources on both tracks.";

  const confirmBlock = confirming.length > 0
    ? `CONFIRMING SEARCH RESULTS [status:${confirmStatus} via:${confirmProvider}] (queries: ${cfmQStr}):\n` +
      confirming.map((s, i) =>
        `[Confirm ${i + 1}] ${s.domain}\nTitle: ${s.title}\nURL: ${s.url}\nSnippet: ${s.snippet}`
      ).join("\n\n")
    : `CONFIRMING SEARCH RESULTS [status:${confirmStatus}]: No confirming sources retrieved — retrieval returned empty.\nQueries attempted: ${cfmQStr}\nNote: Empty retrieval ≠ no evidence exists. The search may have failed to reach the relevant sources.`;

  const denyBlock = contradicting.length > 0
    ? `DENIAL/CONTRADICTION SEARCH RESULTS [status:${denyStatus} via:${denyProvider}] (queries: ${denyQStr}):\n` +
      contradicting.map((s, i) =>
        `[Deny ${i + 1}] ${s.domain}\nTitle: ${s.title}\nURL: ${s.url}\nSnippet: ${s.snippet}`
      ).join("\n\n")
    : `DENIAL/CONTRADICTION SEARCH RESULTS [status:${denyStatus}]: No contradicting sources retrieved.\nQueries attempted: ${denyQStr}`;

  return `${statusNote}\n\n${confirmBlock}\n\n${denyBlock}`;
}

// ── Limited-mode fallback ─────────────────────────────────────────────────────

function limitedMode(userMessage: string): string {
  const q = (userMessage ?? "").trim().slice(0, 120);
  return [
    `## ANSWER`,
    `Analysis engine is running in limited mode. Input received: "${q}"`,
    ``,
    `## VERIFICATION STATUS`,
    `UNKNOWN — analysis engine unavailable; no verification was performed.`,
    ``,
    `## CONFIRMING EVIDENCE`,
    `- Analysis engine unavailable — no confirming sources retrieved.`,
    ``,
    `## CONTRADICTING OR MISSING EVIDENCE`,
    `- Analysis engine unavailable — no contradicting sources retrieved.`,
    ``,
    `## SOURCE WEIGHT`,
    `N/A — engine unavailable.`,
    ``,
    `## SIGNAL`,
    `LOW — analysis engine unavailable.`,
    ``,
    `## AGREEMENT`,
    `UNKNOWN — cannot assess source agreement without the analysis engine.`,
    ``,
    `## RISK`,
    `CAUTION — verify claims independently; automated analysis is not available in this mode.`,
    ``,
    `## WHAT MATTERS`,
    `- Manual review required for this input`,
    ``,
    `## WHAT TO QUESTION`,
    `- Automated verification was not performed`,
    ``,
    `## WHAT TO VERIFY NEXT`,
    `- Check if the Gemini API integration is configured correctly`,
    `- Verify the API key has access to gemini-2.5-flash`,
    `- Try again — this may be a transient error`,
  ].join("\n");
}

// ── Route ─────────────────────────────────────────────────────────────────────

sageRouter.post("/sage/query", async (req, res) => {
  const { query, results, context, messages, userMessage } = req.body as {
    query?: string;
    results?: Array<{ title: string; domain: string; snippet: string; score?: number }>;
    context?: string;
    messages?: Array<{ role: "user" | "assistant"; content: string }>;
    userMessage?: string;
  };

  if (!userMessage || typeof userMessage !== "string" || !userMessage.trim()) {
    res.status(400).json({ error: "userMessage is required" });
    return;
  }

  const inputClass = detectInputClass(userMessage);
  const eventType  = detectEventType(userMessage);
  const needsCorroboration = inputClass === "url" || inputClass === "current-events" || inputClass === "article";
  const isArticleMode = inputClass === "url" || inputClass === "article";
  const braveKey = process.env["BRAVE_SEARCH_API_KEY"];

  logger.info(
    { inputClass, eventType, needsCorroboration, braveKey: !!braveKey, query: userMessage.trim().slice(0, 100) },
    `[Sentrix] /api/sage/query — class=${inputClass} event=${eventType}`
  );

  // ── Parallel: article fetch + dual-track corroboration search ───────────────
  let articleData: ArticleData | undefined;
  let confirmingSources: CorroborationResult[] = [];
  let contradictingSources: CorroborationResult[] = [];
  let dualTrackQueries: DualTrackQueries = { confirming: [], contradicting: [] };
  let confirmStatus: RetrievalStatus = "FAILED";
  let denyStatus:    RetrievalStatus = "FAILED";
  let confirmProvider = "none";
  let denyProvider    = "none";

  if (needsCorroboration) {
    const initialQueries = generateDualTrackQueries(userMessage, eventType, undefined);
    dualTrackQueries = initialQueries;

    logger.info(
      { confirming: initialQueries.confirming, contradicting: initialQueries.contradicting },
      "[Sentrix] Dual-track queries generated"
    );

    const [fetchResult, dualResult] = await Promise.allSettled([
      inputClass === "url" ? fetchArticle(userMessage.trim()) : Promise.resolve(undefined),
      runDualTrackSearch(initialQueries, eventType, braveKey),
    ]);

    if (fetchResult.status === "fulfilled" && fetchResult.value) {
      articleData = fetchResult.value;
      logger.info(
        { success: articleData.success, domain: articleData.domain, error: articleData.error },
        `[Sentrix] Article fetch — success=${articleData.success}`
      );

      // Re-run targeted search with article title for better grounding
      if (articleData.success && articleData.title) {
        const betterQueries = generateDualTrackQueries(userMessage, eventType, articleData.title);
        dualTrackQueries = betterQueries;
        logger.info(
          { confirming: betterQueries.confirming, contradicting: betterQueries.contradicting },
          "[Sentrix] Refined dual-track queries from article title"
        );
        const extra = await runDualTrackSearch(betterQueries, eventType, braveKey);
        const seenConfirm = new Set<string>();
        const seenDeny = new Set<string>();
        for (const s of extra.confirming) {
          if (!seenConfirm.has(s.domain)) { seenConfirm.add(s.domain); confirmingSources.push(s); }
        }
        for (const s of extra.contradicting) {
          if (!seenDeny.has(s.domain)) { seenDeny.add(s.domain); contradictingSources.push(s); }
        }
        confirmStatus   = extra.confirmStatus;
        denyStatus      = extra.denyStatus;
        confirmProvider = extra.confirmProvider;
        denyProvider    = extra.denyProvider;
      }
    }

    if (dualResult.status === "fulfilled") {
      const seenConfirm = new Set(confirmingSources.map(s => s.domain));
      const seenDeny    = new Set(contradictingSources.map(s => s.domain));
      for (const s of dualResult.value.confirming) {
        if (!seenConfirm.has(s.domain)) { seenConfirm.add(s.domain); confirmingSources.push(s); }
      }
      for (const s of dualResult.value.contradicting) {
        if (!seenDeny.has(s.domain)) { seenDeny.add(s.domain); contradictingSources.push(s); }
      }
      // Use the initial run's status if we didn't do an article-refined run
      if (confirmStatus === "FAILED") {
        confirmStatus   = dualResult.value.confirmStatus;
        denyStatus      = dualResult.value.denyStatus;
        confirmProvider = dualResult.value.confirmProvider;
        denyProvider    = dualResult.value.denyProvider;
      }
    }

    // Re-evaluate status based on final merged counts
    confirmStatus = confirmingSources.length >= 3 ? "SUCCESS" : confirmingSources.length >= 1 ? "DEGRADED" : "FAILED";
    denyStatus    = contradictingSources.length >= 3 ? "SUCCESS" : contradictingSources.length >= 1 ? "DEGRADED" : "FAILED";

    logger.info(
      {
        confirmingCount:  confirmingSources.length,
        contradictingCount: contradictingSources.length,
        confirmStatus,
        denyStatus,
        confirmProvider,
        denyProvider,
        confirming:   dualTrackQueries.confirming,
        contradicting: dualTrackQueries.contradicting,
        domains: {
          confirming:   confirmingSources.map(s => s.domain),
          contradicting: contradictingSources.map(s => s.domain),
        },
      },
      `[Sentrix] Dual-track complete — ${confirmingSources.length} confirming, ${contradictingSources.length} contradicting [${confirmStatus}/${denyStatus}]`
    );
  }

  // ── Build grounding block ───────────────────────────────────────────────────
  const resultsContext = buildResultsContext(results ?? []);
  const intelligenceSummary = context ? `\n\nINTELLIGENCE BRIEF:\n${context}` : "";
  const searchQuery = query ? `\n\nORIGINAL QUERY: "${query}"` : "";
  const modeNote = isArticleMode ? "\n\nMODE: Article/URL analysis — include Article Mode Extension sections." : "";
  const verificationNote = needsCorroboration
    ? `\n\nMODE: Live verification — dual-track corroboration active. Event type: ${eventType}. Use VERIFICATION STATUS and both CONFIRMING EVIDENCE and CONTRADICTING OR MISSING EVIDENCE sections.`
    : "";
  const claimNote = `\n\nCLAIM ANALYSIS:\n- Input: "${userMessage.trim().slice(0, 200)}"\n- Event type: ${eventType}\n- Input class: ${inputClass}`;

  let articleBlock = "";
  if (articleData) {
    if (articleData.success) {
      articleBlock =
        `\n\nARTICLE EXTRACTED:\nURL: ${userMessage.trim()}\nTitle: ${articleData.title}\nDomain: ${articleData.domain}\n` +
        (articleData.author ? `Author: ${articleData.author}\n` : "") +
        (articleData.date ? `Date: ${articleData.date}\n` : "") +
        `\n--- ARTICLE TEXT ---\n${articleData.content}\n--- END ARTICLE ---`;
    } else {
      articleBlock = `\n\nARTICLE FETCH NOTE: Content could not be fully retrieved. Reason: ${articleData.error ?? "unknown"}. Analyze based on available data.`;
    }
  }

  const corroborationBlock = needsCorroboration
    ? `\n\nDUAL-TRACK CORROBORATION SOURCES (server-retrieved):\n${buildDualTrackContext(confirmingSources, contradictingSources, dualTrackQueries, confirmStatus, denyStatus, confirmProvider, denyProvider)}`
    : "";

  const groundingBlock =
    `${searchQuery}${claimNote}${modeNote}${verificationNote}` +
    `\n\nSUPPORTING REFERENCES:\n${resultsContext}` +
    `${intelligenceSummary}` +
    `${articleBlock}` +
    `${corroborationBlock}`;

  // ── Build conversation ──────────────────────────────────────────────────────
  type GeminiContent = { role: "user" | "model"; parts: Array<{ text: string }> };
  const contents: GeminiContent[] = [];
  const priorMessages = messages ?? [];

  if (priorMessages.length === 0) {
    contents.push({ role: "user", parts: [{ text: `${groundingBlock}\n\n---\n\nUser input: ${userMessage.trim()}` }] });
  } else {
    const [first, ...rest] = priorMessages;
    contents.push({ role: "user", parts: [{ text: `${groundingBlock}\n\n---\n\nUser input: ${first.content}` }] });
    for (const msg of rest) {
      contents.push({ role: msg.role === "assistant" ? "model" : "user", parts: [{ text: msg.content }] });
    }
    contents.push({ role: "user", parts: [{ text: userMessage.trim() }] });
  }

  // ── Stream ──────────────────────────────────────────────────────────────────
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.flushHeaders();

  let geminiUsed = false;
  let fallbackUsed = false;

  try {
    const stream = await ai.models.generateContentStream({
      model: "gemini-2.5-flash",
      config: { maxOutputTokens: 8192, systemInstruction: SYSTEM_PROMPT },
      contents,
    });

    geminiUsed = true;
    let hasOutput = false;

    for await (const chunk of stream) {
      const text = chunk.text;
      if (text) {
        hasOutput = true;
        res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
      }
    }

    if (!hasOutput) {
      fallbackUsed = true;
      res.write(`data: ${JSON.stringify({ content: limitedMode(userMessage) })}\n\n`);
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();

    logger.info(
      {
        inputClass, eventType, geminiUsed, fallbackUsed,
        confirmingCount: confirmingSources.length,
        contradictingCount: contradictingSources.length,
        articleFetched: !!articleData?.success,
      },
      "[Sentrix] Sage completed"
    );
  } catch (err) {
    fallbackUsed = true;
    logger.error({ err, inputClass, eventType }, "[Sentrix] Sage stream failed");
    res.write(`data: ${JSON.stringify({ content: limitedMode(userMessage) })}\n\n`);
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  }
});

export default sageRouter;
