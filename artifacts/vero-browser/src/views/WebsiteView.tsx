import React, { useState } from 'react';
import {
  ShieldAlert, AlertTriangle, ShieldCheck, Lock, Globe,
  ChevronRight, Hash,
  XCircle, Eye
} from 'lucide-react';
import { useBrowserState } from '@/hooks/use-browser-state';
import { twMerge } from 'tailwind-merge';
import { getDomainTitle } from '@/lib/blackdog';
import { motion, AnimatePresence } from 'framer-motion';

// ----- Domain-aware mock content -----

interface MockPage {
  pageTitle: string;
  navItems: string[];
  sections: { heading?: string; body: string }[];
  tags?: string[];
}

function getMockPage(url: string, domain: string): MockPage {
  const d = domain.toLowerCase();

  if (d.includes('wikipedia.org')) {
    const title = (() => { try { return decodeURIComponent(new URL(url).pathname.split('/').pop() ?? 'Article').replace(/_/g, ' '); } catch { return 'Article'; } })();
    return {
      pageTitle: title,
      navItems: ['Article', 'Talk', 'Read', 'Edit source', 'View history'],
      sections: [
        { body: `${title} is a subject covered by this encyclopedia article. The content below is illustrative — Sentrix renders a structural summary, not the full live page.` },
        { heading: 'Overview', body: `${title} encompasses a broad range of concepts and has been documented across numerous peer-reviewed publications and reference works. This entry provides an introductory summary.` },
        { heading: 'History', body: `The origins of ${title} can be traced to foundational research conducted in the early 20th century. Several key milestones are noted in the timeline below.` },
        { heading: 'See also', body: `Related topics include adjacent fields of study, cross-linked articles, and bibliographic references maintained by the editorial board.` },
      ],
      tags: ['Reference', 'Open Content', 'CC BY-SA'],
    };
  }

  if (d.includes('github.com')) {
    const repo = (() => { try { return new URL(url).pathname.replace(/^\//, '') || 'Search'; } catch { return 'Search'; } })();
    return {
      pageTitle: `${repo} · GitHub`,
      navItems: ['Code', 'Issues', 'Pull Requests', 'Actions', 'Insights'],
      sections: [
        { body: `Repository browser — Sentrix shows a structural preview. Navigate to view README, source files, CI status, and contributor activity.` },
        { heading: 'README.md', body: `# ${repo}\n\nThis is an open source repository hosted on GitHub. It contains source code, documentation, and automated workflows. Stars, forks, and open issues are listed in the sidebar.` },
        { heading: 'Activity', body: `Last commit: 2 hours ago. Open issues: 14. Pull requests: 3 open. Watchers: 842. Language breakdown available in the Insights tab.` },
      ],
      tags: ['Open Source', 'MIT License', 'Verified Platform'],
    };
  }

  if (d.includes('technews') || d.includes('news')) {
    return {
      pageTitle: `Latest Coverage — ${domain}`,
      navItems: ['Home', 'Technology', 'Security', 'Analysis', 'Opinion'],
      sections: [
        { body: `News aggregator — articles from multiple editorial outlets. Third-party analytics are active on this domain. BLACKDOG has flagged tracking scripts.` },
        { heading: 'Top Story', body: `Industry observers are closely watching developments in the field. Analysts from three separate firms provided commentary, with views ranging from cautiously optimistic to skeptical.` },
        { heading: 'Analysis', body: `A deeper look at the underlying dynamics suggests a more complex picture than initial headlines implied. Data from multiple sources points to ongoing structural shifts.` },
      ],
      tags: ['News', 'Analytics Active', 'Trackers Detected'],
    };
  }

  if (d.includes('docs.') || d.includes('documentation')) {
    return {
      pageTitle: `Documentation — ${domain}`,
      navItems: ['Getting Started', 'API Reference', 'Examples', 'Changelog', 'Support'],
      sections: [
        { body: `Official documentation hub — structured reference material, integration guides, and API specifications maintained by the product team.` },
        { heading: 'Quick Start', body: `Install the package via your preferred package manager. Follow the initial configuration guide to set up authentication, configure environment variables, and validate your first integration.` },
        { heading: 'API Reference', body: `Full endpoint documentation, request schemas, response models, error codes, and rate-limiting guidelines. SDKs available for JavaScript, Python, Go, and Rust.` },
      ],
      tags: ['Official', 'Documentation', 'No Tracking'],
    };
  }

  // Generic fallback
  return {
    pageTitle: domain,
    navItems: ['Home', 'About', 'Services', 'Contact'],
    sections: [
      { body: `Sentrix is rendering a structural preview of this page. The BLACKDOG engine has completed its analysis — results are visible in the security panel to the right.` },
      { heading: 'Page Content', body: `This domain hosts content that has been analyzed for tracking scripts, redirect chains, certificate validity, and known threat signatures. See the BLACKDOG panel for the full assessment.` },
      { heading: 'Session Status', body: `Your session is isolated from other tabs. Cookies encountered on this page are sandboxed. No data has been written to persistent storage outside the current session boundary.` },
    ],
    tags: undefined,
  };
}

// ----- Components -----

function PageNav({ items }: { items: string[] }) {
  const [active, setActive] = useState(items[0]);
  return (
    <div className="flex items-center gap-0 border-b border-white/[0.05] overflow-x-auto shrink-0">
      {items.map(item => (
        <button
          key={item}
          onClick={() => setActive(item)}
          className={twMerge(
            'relative px-4 py-2.5 text-[11px] font-mono whitespace-nowrap transition-colors',
            active === item ? 'text-foreground/80' : 'text-muted-foreground/40 hover:text-muted-foreground/70'
          )}
        >
          {item}
          {active === item && <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-primary/60" />}
        </button>
      ))}
    </div>
  );
}

function DangerBlockPage({ domain, onDismiss }: { domain: string; onDismiss: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center h-full text-center px-8 bg-background"
    >
      <div className="relative mb-8">
        <div className="w-20 h-20 rounded-full border border-red-500/20 bg-red-500/[0.06] flex items-center justify-center">
          <ShieldAlert className="w-9 h-9 text-red-500" />
        </div>
        <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
          <XCircle className="w-3.5 h-3.5 text-white" />
        </div>
      </div>

      <div className="text-[9px] font-mono uppercase tracking-[0.25em] text-red-500/60 mb-2">
        BLACKDOG — Threat Detected
      </div>
      <h2 className="text-lg font-bold text-foreground/90 mb-2">Page Blocked</h2>
      <p className="text-[13px] text-muted-foreground/60 mb-1 max-w-xs">
        <span className="font-mono text-red-400/80">{domain}</span> has been identified as a high-risk domain.
      </p>
      <p className="text-[12px] text-muted-foreground/40 max-w-xs leading-relaxed mb-8">
        Known malware signatures detected. Payload scripts active on landing page. Multiple redirect chains intercepted.
      </p>

      <div className="flex flex-col gap-2 items-center w-full max-w-xs">
        <button
          onClick={onDismiss}
          className="w-full px-4 py-2 rounded border border-red-500/20 bg-red-500/[0.06] text-red-400/80 text-[12px] font-mono hover:bg-red-500/10 transition-colors"
        >
          Proceed anyway (not recommended)
        </button>
        <div className="text-[10px] font-mono text-muted-foreground/30 mt-2">
          Session isolation is enforced even if you proceed.
        </div>
      </div>
    </motion.div>
  );
}

function CautionBanner({ finding }: { finding: string }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div className="flex items-center gap-3 px-5 py-3 bg-amber-500/[0.07] border-b border-amber-500/15">
      <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
      <span className="text-[12px] text-amber-400/80 flex-1">
        <span className="font-semibold">BLACKDOG: </span>{finding}
      </span>
      <button onClick={() => setDismissed(true)} className="text-amber-500/40 hover:text-amber-500/70 transition-colors text-[10px] font-mono shrink-0">
        Dismiss
      </button>
    </div>
  );
}

function PageInspectionPanel({ riskLevel, blackdog, url }: { riskLevel: string; blackdog: any; url: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-white/[0.05] bg-black/20 shrink-0">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-2.5 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Eye className="w-3 h-3 text-muted-foreground/40" />
          <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/40">Page Inspection</span>
          <span className={twMerge('text-[9px] font-mono font-bold uppercase tracking-widest',
            riskLevel === 'safe' ? 'text-primary/60' :
            riskLevel === 'caution' ? 'text-amber-500/60' :
            riskLevel === 'danger' ? 'text-red-500/70' : 'text-muted-foreground/40'
          )}>
            {riskLevel.toUpperCase()}
          </span>
        </div>
        <ChevronRight className={twMerge('w-3 h-3 text-muted-foreground/30 transition-transform', open && 'rotate-90')} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-4 grid grid-cols-2 gap-x-8 gap-y-2 border-t border-white/[0.04]">
              <div className="col-span-2 pt-3 pb-1 text-[10px] font-mono text-muted-foreground/30 uppercase tracking-widest">Security Summary</div>
              {[
                ['Certificate',     blackdog.certificate,                            blackdog.certificate.includes('None') || blackdog.certificate.includes('Invalid')],
                ['HSTS',            blackdog.hsts ? 'Enabled' : 'Not found',         !blackdog.hsts],
                ['Mixed Content',   blackdog.mixedContent ? 'Detected' : 'None',     blackdog.mixedContent],
                ['Fingerprinting',  blackdog.fingerprinting ? 'Detected' : 'None',   blackdog.fingerprinting],
              ].map(([k, v, warn]) => (
                <div key={String(k)} className="flex items-center justify-between py-0.5">
                  <span className="text-[10px] font-mono text-muted-foreground/40">{k}</span>
                  <span className={twMerge('text-[10px] font-mono', warn ? 'text-amber-500/70' : 'text-primary/60')}>{v}</span>
                </div>
              ))}
              <div className="col-span-2 pt-2 border-t border-white/[0.04]">
                {blackdog.findings.map((f: string, i: number) => (
                  <div key={i} className="flex items-start gap-2 py-0.5">
                    <div className="w-1 h-1 rounded-full bg-muted-foreground/30 mt-1.5 shrink-0" />
                    <span className="text-[10px] font-mono text-muted-foreground/45">{f}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function WebsiteView() {
  const { activeTab } = useBrowserState();
  const { url, riskLevel, blackdog } = activeTab;
  const domain = getDomainTitle(url);
  const mockPage = getMockPage(url, domain);
  const [dangerDismissed, setDangerDismissed] = useState(false);

  // Reset dismiss state when URL changes
  const key = url;

  if (riskLevel === 'danger' && !dangerDismissed) {
    return (
      <div className="h-full flex flex-col bg-background">
        <div key={key} className="flex-1">
          <DangerBlockPage domain={domain} onDismiss={() => setDangerDismissed(true)} />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      key={key}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
      className="h-full flex flex-col bg-background overflow-hidden"
    >
      {/* Risk banners */}
      {riskLevel === 'danger' && dangerDismissed && (
        <div className="flex items-center gap-3 px-5 py-2 bg-red-500/10 border-b border-red-500/20 shrink-0">
          <ShieldAlert className="w-3.5 h-3.5 text-red-500 shrink-0" />
          <span className="text-[11px] font-mono text-red-400/80 flex-1">
            <span className="font-bold">HIGH RISK — </span>Viewing with warnings. BLACKDOG isolation active.
          </span>
        </div>
      )}
      {riskLevel === 'caution' && <CautionBanner finding={blackdog.findings[0]} />}

      {/* URL / page header bar */}
      <div className={twMerge(
        'flex items-center gap-3 px-5 py-2 border-b shrink-0',
        riskLevel === 'safe' ? 'border-white/[0.05] bg-black/20' :
        riskLevel === 'caution' ? 'border-amber-500/10 bg-black/20' :
        'border-red-500/10 bg-black/20'
      )}>
        {/* Protocol indicator */}
        <div className="flex items-center gap-1.5 shrink-0">
          {riskLevel === 'safe' || riskLevel === 'unknown'
            ? <Lock className="w-3 h-3 text-primary/60" />
            : <ShieldAlert className="w-3 h-3 text-amber-500/70" />
          }
          {!url.startsWith('http://') && (
            <span className="text-[10px] font-mono text-primary/40">https://</span>
          )}
        </div>

        {/* Domain + path */}
        <div className="flex items-center gap-1 flex-1 min-w-0 font-mono text-[12px]">
          <span className="text-foreground/70 font-medium">{domain}</span>
          <span className="text-muted-foreground/30">
            {(() => { try { const path = new URL(url).pathname; return path !== '/' ? path : ''; } catch { return ''; } })()}
          </span>
        </div>

        {/* Risk badge */}
        <div className="flex items-center gap-2 shrink-0">
          <div className={twMerge('px-2 py-0.5 rounded border text-[9px] font-bold font-mono tracking-wider uppercase',
            riskLevel === 'safe' ? 'text-primary border-primary/20 bg-primary/[0.06]' :
            riskLevel === 'caution' ? 'text-amber-500 border-amber-500/20 bg-amber-500/[0.05]' :
            riskLevel === 'danger' ? 'text-red-500 border-red-500/20 bg-red-500/[0.05]' :
            'text-muted-foreground border-white/10 bg-white/[0.03]'
          )}>
            {riskLevel}
          </div>
        </div>
      </div>

      {/* Mock page chrome */}
      <div className="flex-1 overflow-y-auto bg-background">
        {/* Mock page top bar */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-white/[0.04] bg-black/30">
          <Globe className="w-4 h-4 text-muted-foreground/30 shrink-0" />
          <h1 className="text-[14px] font-semibold text-foreground/80 flex-1">{mockPage.pageTitle}</h1>
          {mockPage.tags && (
            <div className="flex items-center gap-1.5 shrink-0">
              {mockPage.tags.map(tag => (
                <span key={tag} className="px-1.5 py-0.5 rounded border border-white/[0.06] text-[9px] font-mono text-muted-foreground/40 uppercase tracking-wider">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Mock page nav */}
        <PageNav items={mockPage.navItems} />

        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 px-5 py-2.5 text-[10px] font-mono text-muted-foreground/30">
          <span>{domain}</span>
          <ChevronRight className="w-3 h-3" />
          <span className="text-muted-foreground/50">{mockPage.pageTitle}</span>
        </div>

        {/* Page content */}
        <div className="px-5 pb-6 max-w-2xl">
          {mockPage.sections.map((section, i) => (
            <div key={i} className={twMerge('mb-5', i > 0 && 'pt-5 border-t border-white/[0.04]')}>
              {section.heading && (
                <div className="flex items-center gap-2 mb-2">
                  <Hash className="w-3 h-3 text-muted-foreground/25 shrink-0" />
                  <h2 className="text-[13px] font-semibold text-foreground/60">{section.heading}</h2>
                </div>
              )}
              <p className={twMerge(
                'text-[13px] leading-[1.75] font-mono whitespace-pre-line',
                section.heading ? 'text-foreground/45 pl-5' : 'text-foreground/55'
              )}>
                {section.body}
              </p>
            </div>
          ))}

          {/* BLACKDOG bottom note */}
          <div className={twMerge(
            'mt-6 px-4 py-3 rounded-lg border text-[11px] font-mono leading-snug',
            riskLevel === 'safe' ? 'border-primary/10 bg-primary/[0.04] text-primary/50' :
            riskLevel === 'caution' ? 'border-amber-500/10 bg-amber-500/[0.04] text-amber-500/50' :
            'border-red-500/10 bg-red-500/[0.04] text-red-500/50'
          )}>
            <span className="font-bold tracking-widest uppercase text-[9px]">BLACKDOG</span>
            {' '}— {blackdog.findings.join(' · ')}
          </div>
        </div>
      </div>

      {/* Collapsible inspection panel */}
      <PageInspectionPanel riskLevel={riskLevel} blackdog={blackdog} url={url} />
    </motion.div>
  );
}
