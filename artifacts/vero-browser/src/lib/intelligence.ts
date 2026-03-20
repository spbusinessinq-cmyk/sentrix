// ─── Sentrix Intelligence Engine ─────────────────────────────────────────────
// Pure analysis over real result data. No fabrication. No invented facts.
// All outputs are structural observations derived from actual result fields.

export interface AnalysisItem {
  id: number;
  domain: string;
  title: string;
  snippet: string;
  score: number;
  confidence: 'high' | 'medium' | 'low';
  posture: string;
  sourceType: string;
  category: 'web' | 'news' | 'docs';
}

export type SignalTier = 'primary' | 'high' | 'normal' | 'low' | 'noise';
export type QueryType   = 'reference' | 'news' | 'technical' | 'mixed';
export type SignalLevel = 'strong' | 'moderate' | 'weak';
export type Agreement   = 'consensus' | 'mixed' | 'divergent';
export type Recency     = 'recent' | 'mixed' | 'static';

export interface IntelligenceReport {
  queryType: QueryType;
  sourceMix: string;
  signalLevel: SignalLevel;
  agreement: Agreement;
  recencyProfile: Recency;

  topFindings: string[];
  disagreements: string[];
  keyEntities: string[];

  startHereIds: number[];
  compareTheseIds: number[];
  reviewCarefullyIds: number[];

  signalTiers: Map<number, SignalTier>;

  sageSummary: string;
  sageSignals: string[];
  sageDivergences: string[];
  sageGuidance: string;
  sageDeeperAngles: string[];
}

// ─── Stop-word list for entity extraction ────────────────────────────────────

const STOP = new Set([
  'the','a','an','and','or','but','in','on','at','to','for','of','with','by','from',
  'is','are','was','were','be','been','being','have','has','had','do','does','did',
  'will','would','could','should','may','might','shall','can','about','above','after',
  'against','along','amid','among','around','before','behind','below','beneath',
  'beside','between','beyond','during','except','inside','into','near','off',
  'outside','over','past','since','through','throughout','under','until','upon',
  'within','without','that','this','these','those','which','who','what','when',
  'where','why','how','all','both','each','either','every','few','more','most',
  'other','some','such','no','not','only','same','so','than','then','there','they',
  'we','you','he','she','it','its','as','if','while','although','though','because',
  'unless','whether','yet','just','also','even','still','again','already','always',
  'never','often','sometimes','usually','very','much','many','long','high','low',
  'good','bad','new','old','first','last','own','real','great','small','large',
  'different','important','possible','right','left','next','same','use','using',
  'used','get','make','made','find','found','see','look','know','work','need',
  'way','time','year','day','one','two','three','four','five','six','seven','eight',
  'nine','ten','here','their','them','then','than','into','your','our','its',
  'out','up','down','now','back','well','can','any','our','too','via','per',
]);

// ─── Recency signal detection ─────────────────────────────────────────────────

const RECENCY_RE = /\b(2024|2025|2026|recently|latest|new\s+release|just\s+released|update[sd]?|announced|this\s+week|this\s+month|today|breaking|now\s+available)\b/i;

// ─── Source type buckets ──────────────────────────────────────────────────────

function isAuthoritative(item: AnalysisItem): boolean {
  return item.score >= 72 && item.posture === 'SAFE';
}
function isNewsSource(item: AnalysisItem): boolean {
  return item.sourceType === 'News' || item.category === 'news';
}
function isUserGen(item: AnalysisItem): boolean {
  const d = item.domain.toLowerCase();
  return (
    d.includes('reddit') || d.includes('quora') ||
    d.includes('twitter') || d.includes('x.com') ||
    item.sourceType === 'Community' || item.sourceType === 'Social media'
  );
}
function isDocSource(item: AnalysisItem): boolean {
  return item.category === 'docs' || item.sourceType === 'Documentation' || item.sourceType === 'Reference';
}

// ─── Key entity extraction ────────────────────────────────────────────────────
// Extract terms that appear in 2+ result titles. No NLP — pure frequency.

function extractKeyEntities(items: AnalysisItem[]): string[] {
  const titleFreq = new Map<string, number>();

  for (const item of items) {
    const words = item.title
      .split(/[\s,.:;!?()\[\]{}<>"'|/\\]+/)
      .map(w => w.replace(/[^a-zA-Z0-9-]/g, '').toLowerCase())
      .filter(w => w.length >= 4 && !STOP.has(w) && !/^\d+$/.test(w));

    const seen = new Set<string>();
    for (const w of words) {
      if (!seen.has(w)) {
        titleFreq.set(w, (titleFreq.get(w) || 0) + 1);
        seen.add(w);
      }
    }
  }

  return [...titleFreq.entries()]
    .filter(([, c]) => c >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([term]) => term);
}

// ─── Signal tier classification ───────────────────────────────────────────────

function classifyTier(item: AnalysisItem): SignalTier {
  if (item.posture === 'DANGER') return 'noise';
  if (item.score >= 80 && item.posture === 'SAFE' && item.confidence === 'high') return 'primary';
  if (item.score >= 65 && item.posture === 'SAFE' && item.confidence !== 'low') return 'high';
  if (item.score < 46 || item.confidence === 'low') return isUserGen(item) ? 'noise' : 'low';
  return 'normal';
}

// ─── Main analysis function ───────────────────────────────────────────────────

export function analyzeResults(items: AnalysisItem[], query: string): IntelligenceReport | null {
  if (items.length === 0) return null;

  const q = query.toLowerCase();
  const n = items.length;

  // ── Signal tiers ────────────────────────────────────────────────────────────
  const signalTiers = new Map<number, SignalTier>();
  for (const item of items) signalTiers.set(item.id, classifyTier(item));

  // ── Query type ──────────────────────────────────────────────────────────────
  const isNewsQ = /\b(news|latest|today|breaking|current|recently)\b/.test(q);
  const isDocsQ = /\b(how to|tutorial|guide|api|documentation|docs|reference|example|install|setup|configure)\b/.test(q);
  const isRefQ  = /\b(what is|who is|define|definition|meaning|explain|overview|history of)\b/.test(q);

  const newsCount = items.filter(isNewsSource).length;
  const docsCount = items.filter(isDocSource).length;

  let queryType: QueryType;
  if (isRefQ || (items.some(i => i.domain.includes('wikipedia')) && n >= 3)) {
    queryType = 'reference';
  } else if (isNewsQ || newsCount / n >= 0.4) {
    queryType = 'news';
  } else if (isDocsQ || docsCount / n >= 0.4) {
    queryType = 'technical';
  } else {
    queryType = 'mixed';
  }

  // ── Source mix ──────────────────────────────────────────────────────────────
  const authCount  = items.filter(isAuthoritative).length;
  const newsC      = items.filter(isNewsSource).length;
  const userGenC   = items.filter(isUserGen).length;
  const generalC   = n - authCount - newsC - userGenC;

  const mixParts: string[] = [];
  if (authCount > 0) mixParts.push(`${authCount} authoritative`);
  if (newsC > 0)     mixParts.push(`${newsC} news`);
  if (userGenC > 0)  mixParts.push(`${userGenC} community`);
  if (generalC > 0 && (authCount + newsC + userGenC) < n) mixParts.push(`${Math.max(0, n - authCount - newsC - userGenC)} general`);
  const sourceMix = mixParts.join(', ');

  // ── Signal level ────────────────────────────────────────────────────────────
  const highConfCount = items.filter(i => i.confidence === 'high').length;
  const pct = highConfCount / n;
  const signalLevel: SignalLevel = pct >= 0.5 ? 'strong' : pct >= 0.25 ? 'moderate' : 'weak';

  // ── Agreement ───────────────────────────────────────────────────────────────
  const hasAuth    = authCount > 0;
  const hasUserGen = userGenC > 0;
  const hasNews    = newsC > 0;
  const sourceTypeSet = new Set(items.map(i => i.sourceType));

  let agreement: Agreement;
  if (hasAuth && hasUserGen && hasNews && sourceTypeSet.size >= 4) {
    agreement = 'divergent';
  } else if ((hasUserGen && hasNews) || (hasUserGen && hasAuth) || sourceTypeSet.size >= 3) {
    agreement = 'mixed';
  } else {
    agreement = 'consensus';
  }

  // ── Recency profile ─────────────────────────────────────────────────────────
  const recentCount = items.filter(i => RECENCY_RE.test(i.title + ' ' + i.snippet)).length;
  const rPct = recentCount / n;
  const recencyProfile: Recency = rPct >= 0.35 ? 'recent' : rPct >= 0.12 ? 'mixed' : 'static';

  // ── Key entities ────────────────────────────────────────────────────────────
  const keyEntities = extractKeyEntities(items);

  // ── Decision guidance IDs ────────────────────────────────────────────────────
  const startHereIds = items
    .filter(i => signalTiers.get(i.id) === 'primary')
    .slice(0, 2)
    .map(i => i.id);

  // "Compare these" — pick 2-3 high-tier results from distinct source types
  const seenTypes = new Set<string>();
  const compareTheseIds: number[] = [];
  for (const item of items) {
    const tier = signalTiers.get(item.id);
    if ((tier === 'primary' || tier === 'high') && !seenTypes.has(item.sourceType)) {
      compareTheseIds.push(item.id);
      seenTypes.add(item.sourceType);
    }
    if (compareTheseIds.length >= 3) break;
  }

  const reviewCarefullyIds = items
    .filter(i => signalTiers.get(i.id) === 'noise' || signalTiers.get(i.id) === 'low')
    .map(i => i.id);

  // ── Top findings (structural, not invented) ──────────────────────────────────
  const topFindings: string[] = [];

  const primaryCount = [...signalTiers.values()].filter(v => v === 'primary').length;
  if (primaryCount >= 2) {
    topFindings.push(`${primaryCount} high-confidence sources found across distinct domains`);
  } else if (primaryCount === 1) {
    topFindings.push('One strong primary source identified — use as anchor for verification');
  }

  if (authCount >= 3) {
    topFindings.push(`${authCount} of ${n} sources are authoritative — solid information base`);
  } else if (signalLevel === 'weak') {
    topFindings.push('Limited high-authority sources — treat claims with more scrutiny');
  }

  if (recencyProfile === 'recent') {
    topFindings.push('Multiple results contain recent time signals — topic may be evolving');
  } else if (recencyProfile === 'static') {
    topFindings.push('Results appear reference-focused with no strong recency signal');
  }

  // ── Disagreements (structural, not invented) ─────────────────────────────────
  const disagreements: string[] = [];

  if (hasUserGen && hasNews) {
    disagreements.push('User-generated sources and news sources are both present — framing may differ');
  }
  if (hasUserGen && hasAuth && !hasNews) {
    disagreements.push('Community sources alongside authoritative references — verify claims cross-source');
  }
  if (items.some(i => i.posture === 'CAUTION') && items.some(i => i.posture === 'SAFE')) {
    disagreements.push('Mixed trust signals — some sources require closer review before relying on them');
  }

  // ── Sage narrative ────────────────────────────────────────────────────────────
  const qTypeLabel: Record<QueryType, string> = {
    reference: 'Reference query',
    news: 'News-oriented query',
    technical: 'Technical query',
    mixed: 'Mixed query',
  };

  const sageSummary = `${qTypeLabel[queryType]} — ${n} results across ${sourceMix || 'general web sources'}. Signal is ${signalLevel}.`;

  const sageSignals: string[] = [];
  if (signalLevel === 'strong') {
    sageSignals.push('Strong signal — multiple high-confidence sources provide a solid foundation');
  } else if (signalLevel === 'moderate') {
    sageSignals.push('Moderate signal — some reliable sources present, but verify before concluding');
  } else {
    sageSignals.push('Weak signal — limited authority sources; treat all results with scrutiny');
  }

  if (recencyProfile === 'recent') {
    sageSignals.push('Topic shows signs of recency — reporting may be developing');
  } else if (recencyProfile === 'static') {
    sageSignals.push('Results lean reference — this is likely established information rather than breaking news');
  }

  if (keyEntities.length >= 3) {
    sageSignals.push(`Recurring terms across results: ${keyEntities.slice(0, 4).join(' · ')}`);
  }

  const sageDivergences: string[] = [];
  if (agreement === 'divergent') {
    sageDivergences.push('Multiple source types present with potentially different framings — compare conclusions across source categories');
  } else if (agreement === 'mixed' && disagreements.length > 0) {
    sageDivergences.push(disagreements[0]);
  }

  const topResult = items.find(i => signalTiers.get(i.id) === 'primary');
  const sageGuidance = topResult
    ? `Start with "${topResult.domain}" — highest-confidence source in this set`
    : startHereIds.length === 0
      ? 'No clearly primary source found — compare top results manually before drawing conclusions'
      : `Start with result #${startHereIds[0]} — strongest authority signal in this set`;

  const sageDeeperAngles: string[] = [];
  if (keyEntities.length > 0) {
    sageDeeperAngles.push(`Dig deeper on: ${keyEntities.slice(0, 3).join(', ')}`);
  }
  if (agreement !== 'consensus') {
    sageDeeperAngles.push('Compare how authoritative and community sources frame this topic differently');
  }

  return {
    queryType,
    sourceMix,
    signalLevel,
    agreement,
    recencyProfile,
    topFindings,
    disagreements,
    keyEntities,
    startHereIds,
    compareTheseIds,
    reviewCarefullyIds,
    signalTiers,
    sageSummary,
    sageSignals,
    sageDivergences,
    sageGuidance,
    sageDeeperAngles,
  };
}
