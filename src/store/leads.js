import { useState, useCallback, useEffect } from 'react';
import { scoreICP, calcTier } from '../engine/icp';
import { fireEmailSequence } from '../engine/sequence';
import { trackEmailSend } from '../engine/learning';

const STORAGE_KEY = 'salesedge:leads';

const SEED_LEADS = [
  {
    id: 'seed-1',
    firmName: 'Carrero Law PA',
    contactName: 'Ray Carrero',
    email: 'rcarrero@carrerolaw.com',
    phone: '(305) 555-0142',
    city: 'Miami',
    county: 'Miami-Dade',
    practiceArea: 'HOA+Eviction',
    firmSize: 'Solo',
    matterVolume: 120,
    source: 'Florida Bar Directory',
    barNumber: '0987654',
    stage: 'demo-booked',
    score: 100,
    tier: 1,
    researchStatus: 'complete',
    researchBrief: 'Carrero Law PA is a solo practice in Miami-Dade County led by Ray Carrero, focusing exclusively on HOA foreclosure and eviction defense for Florida condominium and homeowner associations. The firm handles an exceptionally high volume of 120+ active matters, primarily representing associations in collections, lien foreclosures, and tenant evictions across Miami-Dade. Carrero has been practicing for 12 years and is known in the Miami HOA legal community for aggressive litigation tactics. The firm currently relies on manual case tracking via spreadsheets and basic practice management software that lacks AI capabilities. With solo overhead constraints and 120 active matters, operational efficiency is a critical bottleneck.',
    painPoints: [
      'Managing 120+ active matters as a solo practitioner creates severe capacity constraints',
      'Manual document assembly for HOA lien foreclosures is consuming 15+ hours per week',
      'No automated deadline tracking — relying on calendar reminders for statute of limitations',
      'Difficulty scaling intake without hiring additional staff',
      'Court filing compliance across multiple Miami-Dade divisions requires constant manual verification',
    ],
    personalizationHooks: [
      'Fellow solo practitioners using LegalEdge report 60% reduction in document prep time',
      'Miami-Dade HOA foreclosure filings have increased 23% YoY — automation is now essential',
      'Ray is active in the Miami-Dade Bar Association HOA law section',
      'His firm was recently mentioned in Daily Business Review for a notable HOA collections win',
    ],
    bestAngle: 'Position LegalEdge as the force multiplier that lets a solo practitioner handle 120+ matters without hiring. Lead with the document automation for HOA lien foreclosures and the AI-powered deadline tracking that eliminates malpractice risk.',
    suggestedSubject: 'How solo HOA attorneys in Miami-Dade are handling 100+ matters without burning out',
    competitorAlert: null,
    sequenceTier: 1,
    sequenceStatus: 'complete',
    touchCount: 7,
    touchHistory: [
      { touchNumber: 1, day: 1, channel: 'email', action: 'Cold intro email', sentAt: '2026-03-10T10:30:00Z' },
      { touchNumber: 2, day: 3, channel: 'linkedin', action: 'LinkedIn connection request', sentAt: '2026-03-12T09:00:00Z' },
      { touchNumber: 3, day: 5, channel: 'email', action: 'Follow-up email', sentAt: '2026-03-14T09:00:00Z' },
      { touchNumber: 4, day: 7, channel: 'call', action: 'Phone call', sentAt: '2026-03-16T14:00:00Z' },
      { touchNumber: 5, day: 10, channel: 'email', action: 'Value add email', sentAt: '2026-03-19T09:00:00Z' },
      { touchNumber: 6, day: 12, channel: 'linkedin', action: 'LinkedIn DM', sentAt: '2026-03-21T09:00:00Z' },
      { touchNumber: 7, day: 14, channel: 'email', action: 'Breakup email', sentAt: '2026-03-23T09:00:00Z' },
    ],
    sequenceStartedAt: '2026-03-10T10:00:00Z',
    sequenceCompletedAt: '2026-03-23T09:00:00Z',
    stageHistory: [
      { stage: 'new', changedAt: '2026-03-10T10:00:00Z', reason: 'import' },
      { stage: 'contacted', changedAt: '2026-03-10T10:30:00Z', reason: 'Day 1 email sent' },
      { stage: 'replied', changedAt: '2026-03-17T08:00:00Z', reason: 'Reply received' },
      { stage: 'demo-booked', changedAt: '2026-03-18T12:00:00Z', reason: 'Manual' },
    ],
    createdAt: '2026-03-10T10:00:00Z',
  },
  {
    id: 'seed-2',
    firmName: 'Goldstein & Reyes PLLC',
    contactName: 'David Goldstein',
    email: 'dgoldstein@goldsteinreyes.com',
    phone: '(954) 555-0283',
    city: 'Fort Lauderdale',
    county: 'Broward',
    practiceArea: 'HOA Foreclosure',
    firmSize: '2-3',
    matterVolume: 85,
    source: 'LinkedIn Prospecting',
    barNumber: '1234567',
    stage: 'contacted',
    score: 90,
    tier: 1,
    researchStatus: 'complete',
    researchBrief: 'Goldstein & Reyes PLLC is a 3-attorney firm in Fort Lauderdale specializing in HOA and condominium association foreclosure actions across Broward County. Founded by David Goldstein and Maria Reyes in 2019, the firm has rapidly grown to 85 active matters. They represent approximately 40 community associations and handle the full lifecycle from demand letters through judicial foreclosure sales. The firm recently posted on LinkedIn about struggling with document volume and seeking "better tech solutions." They use Clio for case management but have expressed frustration with its limitations for high-volume foreclosure workflows.',
    painPoints: [
      'Current Clio setup cannot handle batch processing of foreclosure filings efficiently',
      'Paralegals spending 20+ hours/week on repetitive lien search and title verification tasks',
      'No integration between case management and Broward County e-filing portal',
      'Growing pains as matter count increased from 40 to 85 in the past year',
      'Difficulty generating accurate reporting for association board presentations',
    ],
    personalizationHooks: [
      'David recently posted on LinkedIn about needing better legal tech — perfect timing',
      'Broward County just updated its e-filing requirements, creating new compliance burden',
      'Goldstein & Reyes is at the inflection point where manual processes start breaking down',
      'Similar 2-3 attorney firms using LegalEdge report handling 2x more matters per attorney',
    ],
    bestAngle: 'Reference David\'s LinkedIn post about needing better tech. Position LegalEdge as the purpose-built solution for FL HOA foreclosure firms that outgrows Clio. Lead with the batch filing automation and Broward County e-filing integration.',
    suggestedSubject: 'Re: your LinkedIn post about legal tech — built exactly for Broward HOA firms',
    competitorAlert: 'Currently using Clio — will need migration path messaging and ROI comparison showing LegalEdge advantage for HOA-specific workflows.',
    sequenceTier: 1,
    sequenceStatus: 'active',
    touchCount: 2,
    touchHistory: [
      { touchNumber: 1, day: 1, channel: 'email', action: 'Cold intro email', sentAt: '2026-03-08T15:00:00Z' },
      { touchNumber: 2, day: 3, channel: 'linkedin', action: 'LinkedIn connection request', sentAt: '2026-03-10T09:00:00Z' },
    ],
    sequenceStartedAt: '2026-03-08T14:30:00Z',
    stageHistory: [
      { stage: 'new', changedAt: '2026-03-08T14:30:00Z', reason: 'import' },
      { stage: 'contacted', changedAt: '2026-03-08T15:00:00Z', reason: 'Day 1 email sent' },
    ],
    createdAt: '2026-03-08T14:30:00Z',
  },
  {
    id: 'seed-3',
    firmName: 'Rivera & Associates PA',
    contactName: 'Monica Rivera',
    email: 'mrivera@riveralawfl.com',
    phone: '(305) 555-0391',
    city: 'Coral Gables',
    county: 'Miami-Dade',
    practiceArea: 'Eviction',
    firmSize: '2-3',
    matterVolume: 70,
    source: 'Florida Bar Directory',
    barNumber: '2345678',
    stage: 'new',
    score: 95,
    tier: 1,
    researchStatus: 'complete',
    researchBrief: 'Rivera & Associates PA is a 2-attorney eviction defense and landlord representation firm based in Coral Gables, Miami-Dade County. Monica Rivera founded the firm in 2017 after spending 8 years at a large property management law firm. The practice handles approximately 70 active eviction matters, split between commercial and residential properties. They are known for fast turnaround on eviction filings and have strong relationships with several large property management companies in Miami-Dade. The firm\'s website mentions they are "embracing technology" but their tech stack appears to be basic — primarily using MyCase and manual Word templates.',
    painPoints: [
      'Eviction filing deadlines are extremely time-sensitive — any delay costs landlord clients money',
      'Manual 3-day notice generation and service tracking is error-prone at 70+ matter volume',
      'No automated rent calculation or ledger integration for eviction complaints',
      'Difficulty tracking multiple hearing dates across Miami-Dade County divisions',
      'Property management clients demanding faster turnaround and real-time case status updates',
    ],
    personalizationHooks: [
      'Monica previously worked at a large firm and understands enterprise-level tooling benefits',
      'Miami-Dade eviction filings are at a 5-year high — automation is a competitive advantage',
      'Firm website explicitly mentions interest in technology adoption',
      'Rivera & Associates handles both commercial and residential — LegalEdge covers both workflows',
    ],
    bestAngle: 'Lead with the speed advantage — LegalEdge\'s AI generates eviction filings 10x faster than manual templates. Emphasize the automated 3-day notice system and hearing date tracking that eliminates the risk of missed deadlines. Position as the "enterprise-level tech" Monica experienced at her prior large firm, now available for her boutique practice.',
    suggestedSubject: 'Cutting eviction filing time by 90% for Miami-Dade landlord attorneys',
    competitorAlert: null,
    sequenceTier: 1,
    sequenceStatus: 'active',
    touchCount: 0,
    touchHistory: [],
    sequenceStartedAt: '2026-03-15T09:00:00Z',
    stageHistory: [
      { stage: 'new', changedAt: '2026-03-15T09:00:00Z', reason: 'import' },
    ],
    createdAt: '2026-03-15T09:00:00Z',
  },
  {
    id: 'seed-4',
    firmName: 'Boca RE Law Group',
    contactName: 'James Whitfield',
    email: 'jwhitfield@bocarelawgroup.com',
    phone: '(561) 555-0174',
    city: 'Boca Raton',
    county: 'Palm Beach',
    practiceArea: 'RE Litigation',
    firmSize: '2-3',
    matterVolume: 55,
    source: 'Google Search',
    barNumber: '3456789',
    stage: 'replied',
    score: 65,
    tier: 2,
    researchStatus: 'complete',
    researchBrief: 'Boca RE Law Group is a 3-attorney real estate litigation boutique in Boca Raton, Palm Beach County. Led by James Whitfield, the firm handles a mix of real estate disputes including contract litigation, title disputes, and some HOA-related work, though HOA is not their primary focus. They maintain 55 active matters across various real estate litigation categories. The firm has a modern website and appears tech-savvy, using PracticePanther for case management. They serve primarily individual property owners and small developers in the Palm Beach area.',
    painPoints: [
      'Juggling diverse real estate litigation types requires flexible case management',
      'Document discovery and review for litigation matters is highly manual',
      'No standardized intake process — each matter type requires different information gathering',
      'Palm Beach County court procedures differ from other jurisdictions they occasionally practice in',
      'Client communication tracking is fragmented across email, phone, and portal',
    ],
    personalizationHooks: [
      'James replied to initial outreach showing interest — warm lead',
      'Firm handles some HOA work that could become primary focus with right tools',
      'Palm Beach County real estate market is highly active, driving litigation volume up',
      'PracticePanther users often find it lacking for specialized litigation workflows',
    ],
    bestAngle: 'Since James already replied, focus on the demo value proposition. Position LegalEdge as the tool that can help them systematize their HOA-related work and potentially grow that practice area. Lead with the litigation-specific features that PracticePanther lacks.',
    suggestedSubject: 'Quick demo: how Boca RE firms are streamlining real estate litigation',
    competitorAlert: 'Using PracticePanther — position LegalEdge as complementary specialist tool rather than replacement. Emphasize features PP lacks for RE litigation.',
    sequenceTier: 2,
    sequenceStatus: 'paused',
    touchCount: 3,
    touchHistory: [
      { touchNumber: 1, day: 1, channel: 'email', action: 'Cold intro email', sentAt: '2026-03-12T12:00:00Z' },
      { touchNumber: 2, day: 5, channel: 'email', action: 'Follow-up email', sentAt: '2026-03-16T09:00:00Z' },
      { touchNumber: 3, day: 7, channel: 'call', action: 'Phone call', sentAt: '2026-03-18T14:00:00Z' },
    ],
    sequenceStartedAt: '2026-03-12T11:15:00Z',
    stageHistory: [
      { stage: 'new', changedAt: '2026-03-12T11:15:00Z', reason: 'import' },
      { stage: 'contacted', changedAt: '2026-03-12T12:00:00Z', reason: 'Day 1 email sent' },
      { stage: 'replied', changedAt: '2026-03-18T16:00:00Z', reason: 'Reply received' },
    ],
    createdAt: '2026-03-12T11:15:00Z',
  },
  {
    id: 'seed-5',
    firmName: 'Sunshine State Legal',
    contactName: 'Patricia Voss',
    email: 'pvoss@sunshinestatelegal.com',
    phone: '(407) 555-0265',
    city: 'Orlando',
    county: 'Orange',
    practiceArea: 'General RE',
    firmSize: '4-10',
    matterVolume: 200,
    source: 'Referral',
    barNumber: '4567890',
    stage: 'new',
    score: 45,
    tier: 3,
    researchStatus: 'complete',
    researchBrief: 'Sunshine State Legal is a mid-size firm with 7 attorneys based in Orlando, Orange County. Led by Patricia Voss, the firm handles general real estate transactions, closings, and occasional litigation across Central Florida. While they have a high volume of 200+ matters, the majority are transactional (closings, title work) rather than litigation. The firm is well-established with 15+ years in the Orlando market and has a robust referral network. Their current tech stack includes Smokeball for conveyancing and transaction management. They occasionally handle eviction work but it represents less than 10% of their practice.',
    painPoints: [
      'High transaction volume creates bottlenecks in closing coordination',
      'Limited litigation capability despite growing demand from existing clients',
      'Difficulty cross-training transactional attorneys on litigation workflows',
      'Orlando market is saturated with general RE firms — need differentiation',
      'Current Smokeball setup is optimized for transactions, not litigation',
    ],
    personalizationHooks: [
      'Referred by an existing contact — leverage the warm introduction',
      'Growing eviction demand from existing clients could shift practice mix',
      'Orlando-Orange County is seeing increased HOA disputes in new developments',
      'Firm has the size and resources to add a dedicated litigation practice area',
    ],
    bestAngle: 'Long-term nurture play. Position LegalEdge as the tool that could help them build out an HOA/eviction litigation practice area to serve their existing client base. Not an immediate fit but worth maintaining the relationship.',
    suggestedSubject: 'Adding HOA litigation to your Orlando RE practice — a growing opportunity',
    competitorAlert: 'Using Smokeball for transactions. LegalEdge serves a different need (litigation), so position as additive rather than replacement. Low urgency — nurture only.',
    sequenceTier: 3,
    sequenceStatus: 'active',
    touchCount: 0,
    touchHistory: [],
    sequenceStartedAt: '2026-03-14T16:45:00Z',
    stageHistory: [
      { stage: 'new', changedAt: '2026-03-14T16:45:00Z', reason: 'import' },
    ],
    createdAt: '2026-03-14T16:45:00Z',
  },
];

// Migrate a lead to the new decoupled schema
function migrateLead(lead) {
  if (lead.touchHistory) return lead; // already migrated
  const history = lead.sequenceHistory || [];
  return {
    ...lead,
    sequenceTier: lead.sequenceTier || lead.tier || 3,
    sequenceStatus: lead.sequenceStatus || (lead.stage === 'replied' || lead.stage === 'demo-booked' ? 'paused' : 'active'),
    touchCount: lead.touchCount || history.length,
    touchHistory: lead.touchHistory || history.map((h, i) => ({
      touchNumber: i + 1,
      day: h.day,
      channel: h.channel,
      action: h.action,
      sentAt: h.completedAt || h.sentAt || new Date().toISOString(),
      openedAt: null,
      repliedAt: null,
    })),
    stageHistory: lead.stageHistory || [{ stage: lead.stage || 'new', changedAt: lead.createdAt, reason: 'migrated' }],
    sequenceStartedAt: lead.sequenceStartedAt || lead.createdAt,
  };
}

function loadLeads() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed.map(migrateLead);
    }
  } catch (e) {
    console.error('Failed to load leads from localStorage:', e);
  }
  return SEED_LEADS;
}

function saveLeads(leads) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
  } catch (e) {
    console.error('Failed to save leads to localStorage:', e);
  }
}

export function useLeads() {
  const [leads, setLeads] = useState(loadLeads);

  useEffect(() => {
    saveLeads(leads);
  }, [leads]);

  const importLead = useCallback((leadData) => {
    const { score, breakdown } = scoreICP(leadData);
    const tier = calcTier(score);
    const newLead = {
      ...leadData,
      id: `lead-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      score,
      tier,
      breakdown,
      stage: 'new',
      researchStatus: 'researching',
      researchBrief: '',
      painPoints: [],
      personalizationHooks: [],
      bestAngle: '',
      suggestedSubject: '',
      competitorAlert: null,
      sequenceTier: tier,
      sequenceStatus: 'active',
      touchCount: 0,
      touchHistory: [],
      sequenceHistory: [], // backward compat
      sequenceStartedAt: new Date().toISOString(),
      stageHistory: [{ stage: 'new', changedAt: new Date().toISOString(), reason: 'import' }],
      createdAt: new Date().toISOString(),
    };
    setLeads(prev => [newLead, ...prev]);

    // GHL sync on import
    fetch('/api/ghl-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lead: newLead, action: 'import' }),
    }).catch(err => console.error('GHL sync on import failed:', err));

    return newLead;
  }, []);

  const updateStage = useCallback((id, stage) => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, stage } : l));
  }, []);

  const updateLead = useCallback((id, updates) => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
  }, []);

  const deleteLead = useCallback((id) => {
    setLeads(prev => prev.filter(l => l.id !== id));
  }, []);

  return { leads, importLead, updateStage, updateLead, deleteLead };
}
