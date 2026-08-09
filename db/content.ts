// =====================================================================
// Canonical playbook content — the seed for the template layer.
// Ported from the v0.1 static artifact. Once seeded, editors change it
// in the app, not here.
// =====================================================================

export type Blk = {
  kind: 'card' | 'ai' | 'note' | 'quote' | 'table' | 'phase' | 'stats' | 'pills';
  title?: string;
  body?: string;
  meta?: Record<string, unknown>;
  items?: string[];
  children?: Blk[]; // for phases: nested ai/note/gate blocks
};

export type Sec = {
  slug: string;
  navGroup: string;
  badge: string;
  title: string;
  eyebrow?: string;
  lede?: string;
  kind: 'page' | 'checklist' | 'timeline' | 'grid' | 'table';
  blocks: Blk[];
};

export const TEMPLATE = {
  name: 'NCCHCA Conference & Event Playbook',
  version: 'v0.1',
  description:
    'One operating manual for every event NCCHCA runs — the Annual Primary Care Conference, the year-round CMHN and HCCN virtual cadence, hybrid learning series, and one-off trainings.',
};

export const SECTIONS: Sec[] = [
  // ------------------------------------------------------------------
  {
    slug: 'overview',
    navGroup: 'Start here',
    badge: '◆',
    title: 'Overview',
    kind: 'page',
    lede: 'One operating manual for every event NCCHCA runs. Standardized timeline, roles, budget, sponsorship, and production, with AI and automation identified at each stage.',
    blocks: [
      {
        kind: 'stats',
        meta: {
          stats: [
            { n: '500+', l: 'Annual conference attendees' },
            { n: '70+', l: 'Sessions across 6 tracks' },
            { n: '15+', l: 'Virtual meetings per month' },
            { n: '43', l: 'Member health centers' },
          ],
        },
      },
      {
        kind: 'card',
        title: 'Why now',
        body: 'NCCHCA runs roughly fifteen or more virtual meetings a month across CMHN, HCCN, and association workgroups, plus a 500-attendee, 70-session, six-track annual conference. That volume is currently held together by institutional knowledge. A playbook converts it into a repeatable system that survives staff turnover and scales without added headcount.',
      },
      {
        kind: 'quote',
        body: 'The annual conference is the visible event. The recurring virtual cadence is the larger operational load — and the least documented. This playbook weights both.',
      },
      {
        kind: 'pills',
        title: 'Three event tiers',
        meta: {
          pills: [
            'Tier 1 — Annual conference',
            'Tier 2 — Multi-session learning series',
            'Tier 3 — Recurring workgroup',
          ],
        },
      },
      {
        kind: 'ai',
        title: 'AI woven throughout',
        body: 'Every part carries an AI layer — not a bolt-on chapter. The through-line is a single structured event registry that feeds calendar, website, sponsor reporting, and HRSA narrative from one source of truth.',
      },
    ],
  },

  // ------------------------------------------------------------------
  {
    slug: 'portfolio',
    navGroup: 'Start here',
    badge: '◆',
    title: 'Event Portfolio',
    eyebrow: 'Baseline',
    kind: 'table',
    lede: 'Established from public sources — to be validated in discovery.',
    blocks: [
      {
        kind: 'table',
        title: 'The portfolio at a glance',
        meta: {
          cols: ['Event type', 'Cadence', 'Format', 'Audience'],
          rows: [
            ['Annual Primary Care Conference (47th · "Moving Health Forward")', 'Annual — June 3–5, 2026 · Washington Duke Inn, Durham', 'In-person', '500+ leaders, clinicians, government officials, school-based & rural partners'],
            ['CMHN meetings (Clinical Committee, Task Force, Board of Managers)', 'Monthly / recurring', 'Virtual', '25 participating health centers'],
            ['HCCN user groups (Epic, eCW, Athena, Arcadia)', 'Monthly / recurring', 'Virtual', '36 participating health centers'],
            ['HCCN learning series (e.g. Excel Dashboard series)', 'Series-based', 'Hybrid', 'HCCN members'],
            ['Association workgroups (Behavioral Health, HR, Task Force)', 'Monthly', 'Virtual', 'Member health centers'],
          ],
        },
      },
      {
        kind: 'stats',
        title: 'Conference specifics to build around',
        meta: {
          stats: [
            { n: '6', l: 'Tracks (A–F), with sequential "threads"' },
            { n: '12.0', l: 'CE contact hours via Northwest AHEC' },
            { n: '10', l: 'Sponsorship tiers, $2K–$50K' },
            { n: '10–11', l: 'Concurrent options per block' },
          ],
        },
      },
      {
        kind: 'pills',
        title: 'Track structure',
        meta: {
          pills: [
            'A · Innovation & Emerging Trends',
            'B · Best Practices & Implementation',
            'C · Leadership & Strategy',
            'D · Policy, Finance & Compliance',
            'E · Skills & Professional Development',
            'F · School-Based Health',
          ],
        },
      },
      {
        kind: 'note',
        title: 'Two visible gaps',
        body: 'The public agenda shows no virtual or hybrid component for the annual conference, and no CE offerings attached to the recurring virtual meetings. Both are opportunities to design rather than processes to document.',
      },
    ],
  },

  // ------------------------------------------------------------------
  {
    slug: 'p1',
    navGroup: 'The Playbook',
    badge: '1',
    title: 'Foundations',
    eyebrow: 'Part 1',
    kind: 'checklist',
    lede: 'What has to be true before any single event gets planned.',
    blocks: [
      {
        kind: 'card',
        title: '1.1–1.6 Components',
        items: [
          '<b>1.1 Event portfolio map</b> — full inventory, tiered by scale and effort',
          '<b>1.2 Purpose test</b> — what each event exists to do: member value, revenue, HRSA deliverable, workforce development',
          '<b>1.3 Roles &amp; RACI</b> — staff owners, committee roles, vendor boundaries',
          '<b>1.4 Governance</b> — how an event gets approved, budgeted, and killed',
          '<b>1.5 Universal standards</b> — brand, accessibility, language access, CE handling, data privacy',
          '<b>1.6 Event tiering model</b> — Tier 1 / 2 / 3, each with a scaled version of the full process',
        ],
      },
      {
        kind: 'ai',
        title: 'AI layer',
        body: 'A single structured event registry — one row per event with owner, format, audience, budget, and status — that feeds every downstream artifact: calendar, website, sponsor reporting, and HRSA narrative. Build this first; everything else in the playbook reads from it.',
      },
    ],
  },

  // ------------------------------------------------------------------
  {
    slug: 'p2',
    navGroup: 'The Playbook',
    badge: '2',
    title: '12-Month Timeline',
    eyebrow: 'Part 2',
    kind: 'timeline',
    lede: 'Anchored to the June conference. Each phase carries an owner, deliverables, and a go/no-go gate.',
    blocks: [
      {
        kind: 'phase',
        title: 'Strategy & theme',
        meta: { when: 'T-12 → T-10', gate: 'Theme approved, venue contracted, budget v1 signed off by leadership.' },
        items: [
          'Prior-year post-mortem inputs drive theme selection',
          'Date and venue lock; room block secured',
          'Contract terms reviewed — attrition, F&amp;B minimums, force majeure',
          'Budget v1 and revenue targets set',
          'Format decision: in-person, hybrid, or in-person + virtual companion',
        ],
      },
      {
        kind: 'phase',
        title: 'Sponsorship & prospectus',
        meta: { when: 'T-10 → T-8', gate: 'Renewal commitments at or above target % of prior-year sponsorship revenue.' },
        items: [
          'Tier restructure and pricing review across all 10 levels',
          'Prospectus produced and launched',
          'Prior-year sponsor renewal outreach — before open market',
        ],
      },
      {
        kind: 'phase',
        title: 'Call for proposals',
        meta: {
          when: 'T-9 → T-7',
          gate: 'Enough accepted sessions to fill all six tracks with viable threads.',
          ai: 'First-pass proposal summarization and rubric scoring — flagging duplicates and thread fit. AI prepares the packet; humans decide.',
        },
        items: [
          'CFP designed against tracks A–F and thread logic',
          'Reviewer rubric and scoring process defined',
          'Selection, notification, and decline handling complete',
        ],
      },
      {
        kind: 'phase',
        title: 'Agenda architecture',
        meta: {
          when: 'T-7 → T-5',
          gate: 'Agenda locked; CE submission accepted.',
          ai: 'Conflict detection across tracks and audience-overlap modeling — catching the case where three sessions aimed at CFOs run in the same block.',
        },
        items: [
          'Thread construction — sequential sessions that build on each other',
          "Concurrent block balancing so the same audience isn't stacked against itself",
          'Keynote and plenary booking confirmed',
          'CE accreditation submitted on the Northwest AHEC timeline',
        ],
      },
      {
        kind: 'phase',
        title: 'Marketing & registration',
        meta: {
          when: 'T-6 → T-2',
          gate: 'Registration pace tracking to target at T-2; contingency triggered if not.',
          ai: 'Segment-specific campaign copy generated from one source brief — CEO, clinical, school-based, and rural audiences each get language that lands, without four separate writing efforts.',
        },
        items: [
          'Registration opens; pricing tiers and early-bird live',
          'Segmented campaign calendar by audience',
          'Speaker and sponsor amplification kits distributed',
        ],
      },
      {
        kind: 'phase',
        title: 'Logistics & production',
        meta: { when: 'T-3 → T-1', gate: 'Run-of-show approved; all vendor contracts executed.' },
        items: [
          'Run-of-show built',
          'AV, room sets, signage, exhibit hall layout finalized',
          'Receptions, shuttles, and awards program confirmed',
          'Materials, event app, or digital agenda ready',
        ],
      },
      {
        kind: 'phase',
        title: 'Final prep',
        meta: {
          when: 'T-2wk → T-0',
          gate: '100% speaker confirmation or documented substitute for each gap.',
          ai: 'Automated speaker reminder sequences with per-speaker status tracking, so staff chase only the genuinely unresponsive.',
        },
        items: [
          'Speaker confirmations and tech checks complete',
          'Onsite staffing plan and shift schedule published',
          'Contingency plans documented — speaker no-show, AV failure, weather',
        ],
      },
      {
        kind: 'phase',
        title: 'Execution',
        meta: {
          when: 'Onsite',
          ai: 'Live evaluation sentiment monitoring — problems surface on day one instead of in the post-event survey.',
        },
        items: [
          'Daily standup cadence running',
          'Command center staffed with clear escalation path',
          'Real-time issue log maintained',
        ],
      },
      {
        kind: 'phase',
        title: 'Close-out',
        meta: {
          when: 'T+1 → T+8wk',
          gate: 'Post-mortem findings documented before the next cycle opens.',
          ai: 'Session recordings → transcripts → summaries → blog posts, member newsletter items, and next-year CFP intelligence. Seventy sessions become a year of member value instead of a folder of MP4s.',
        },
        items: [
          'Evaluations collected; CE certificates issued',
          'Financial reconciliation complete',
          'Sponsor ROI reports delivered',
          'Content repurposing pipeline run',
          "Post-mortem completed and fed into next year's T-12",
        ],
      },
    ],
  },

  // ------------------------------------------------------------------
  {
    slug: 'p3',
    navGroup: 'The Playbook',
    badge: '3',
    title: 'Virtual & Hybrid Ops',
    eyebrow: 'Part 3',
    kind: 'checklist',
    lede: "The highest-volume and least-documented part of NCCHCA's portfolio — and where standardization pays back fastest.",
    blocks: [
      {
        kind: 'card',
        title: '3.1–3.8 Components',
        items: [
          '<b>3.1 Platform standard</b> — which tool for which meeting type, and why',
          '<b>3.2 Recurring meeting template</b> — standing agenda, pre-read, minutes, action tracking',
          '<b>3.3 Host/producer split</b> — who runs content vs. who runs the room',
          '<b>3.4 Engagement design for virtual</b> — polls, breakouts, chat moderation, the 90-minute attention problem',
          '<b>3.5 Hybrid specifically</b> — the Excel Dashboard series model extended: room audio, remote participant parity, dual-facilitator model',
          '<b>3.6 Accessibility &amp; language access</b> — captioning, interpretation, materials in advance',
          '<b>3.7 Recording, retention, and the member library</b>',
          '<b>3.8 Attendance tracking</b> that rolls up to HRSA reporting',
        ],
      },
      {
        kind: 'ai',
        title: 'AI layer',
        body: 'Auto-generated minutes and action items from recordings. A searchable member-facing knowledge base built from workgroup recordings — a health center that missed the Athena user group gets the answer without emailing staff. Recurring-meeting agenda drafts pre-populated from last session’s open items.',
      },
      {
        kind: 'note',
        title: 'Where the leverage is',
        body: 'Roughly 15+ virtual meetings a month, each generating minutes, action items, and follow-up questions. Standardizing this layer touches more staff hours per year than the annual conference does.',
      },
    ],
  },

  // ------------------------------------------------------------------
  {
    slug: 'p4',
    navGroup: 'The Playbook',
    badge: '4',
    title: 'Sponsorship & Revenue',
    eyebrow: 'Part 4',
    kind: 'checklist',
    lede: "Ten tiers from $2,000 to $50,000 — plus the year-round inventory that doesn't exist yet.",
    blocks: [
      {
        kind: 'card',
        title: '4.1–4.7 Components',
        items: [
          '<b>4.1 Tier architecture review</b> — what each of the 10 tiers actually delivers vs. costs to fulfill',
          '<b>4.2 Fulfillment checklist per tier</b> — the operational side of every promise made',
          '<b>4.3 Exhibitor experience</b> — traffic design, hall hours, engagement mechanics',
          '<b>4.4 Lead capture and delivery</b> — what sponsors receive and when',
          '<b>4.5 Sponsor ROI reporting</b> — the artifact that drives renewal',
          '<b>4.6 Year-round sponsor engagement</b> — virtual sponsorship inventory between conferences',
          '<b>4.7 Non-dues revenue expansion</b> — paid learning series, on-demand library, GPO vendor integration',
        ],
      },
      {
        kind: 'ai',
        title: 'AI layer',
        body: 'Sponsor matching against attendee profile data. Auto-generated post-event ROI decks, one per sponsor. Renewal-risk scoring from engagement signals.',
      },
      {
        kind: 'quote',
        body: 'Signature tier runs $50,000; non-profit exhibitor $2,000. The gap between what a tier promises and what it costs to fulfill is where margin quietly disappears — 4.1 and 4.2 exist to close it.',
      },
    ],
  },

  // ------------------------------------------------------------------
  {
    slug: 'p5',
    navGroup: 'The Playbook',
    badge: '5',
    title: 'Content & Education',
    eyebrow: 'Part 5',
    kind: 'checklist',
    lede: 'Twelve CE contact hours, seventy-plus sessions, six tracks — and what happens to all of it after June 5.',
    blocks: [
      {
        kind: 'card',
        title: '5.1–5.5 Components',
        items: [
          '<b>5.1 CE/CME workflow end to end</b> — accreditation, tracking, evaluation, certificate issuance',
          '<b>5.2 Speaker management</b> — recruitment, agreements, prep, disclosure forms, no-show protocol',
          "<b>5.3 Session design standards</b> — learning objectives, formats that aren't lecture, thread coherence",
          '<b>5.4 The content afterlife</b> — turning 70 sessions into a year of member value',
          '<b>5.5 On-demand strategy</b> — what gets recorded, what gets gated, what drives membership value',
        ],
      },
      {
        kind: 'ai',
        title: 'AI layer',
        body: 'Learning-objective quality checks at the CFP stage. Automated evaluation analysis by session and by track. Content repurposing pipeline: recording → summary → clip → article → next-year CFP theme.',
      },
    ],
  },

  // ------------------------------------------------------------------
  {
    slug: 'p6',
    navGroup: 'The Playbook',
    badge: '6',
    title: 'Measurement',
    eyebrow: 'Part 6',
    kind: 'checklist',
    lede: 'What gets measured, how it rolls up to HRSA, and how the post-mortem actually changes next year.',
    blocks: [
      {
        kind: 'card',
        title: '6.1–6.5 Components',
        items: [
          '<b>6.1 The metric set</b> — registration, attendance, no-show, engagement, satisfaction, CE completion, sponsor renewal, net revenue, cost per attendee',
          '<b>6.2 Event scorecard template</b> — one page per event, comparable year over year',
          '<b>6.3 HRSA reporting alignment</b> — mapping event data to grant deliverables',
          '<b>6.4 Post-mortem protocol</b> — structured, blameless, feeding directly into the next cycle',
          '<b>6.5 Portfolio-level review</b> — annual read on which events earn their keep',
        ],
      },
      {
        kind: 'ai',
        title: 'AI layer',
        body: 'A live event dashboard fed by the Part 1 registry. Automated variance flags when a metric drifts from target. Narrative summaries generated for board and grant reporting.',
      },
    ],
  },

  // ------------------------------------------------------------------
  {
    slug: 'p7',
    navGroup: 'The Playbook',
    badge: '7',
    title: 'Toolkit',
    eyebrow: 'Part 7',
    kind: 'grid',
    lede: 'Seventeen working templates — built as usable files, not screenshots in a PDF.',
    blocks: [
      {
        kind: 'card',
        title: 'Appendices A–Q',
        meta: {
          grid: [
            ['A', 'Event registry template'],
            ['B', 'RACI matrix'],
            ['C', '12-month conference Gantt'],
            ['D', 'Budget template — revenue & expense lines'],
            ['E', 'Sponsorship fulfillment checklist by tier'],
            ['F', 'CFP form + reviewer rubric'],
            ['G', 'Speaker agreement & prep packet'],
            ['H', 'Run-of-show template'],
            ['I', 'Virtual meeting standing agenda + minutes'],
            ['J', 'Hybrid AV checklist'],
            ['K', 'Marketing campaign calendar'],
            ['L', 'Evaluation instrument — session & overall'],
            ['M', 'Post-mortem facilitation guide'],
            ['N', 'Event scorecard'],
            ['O', 'Crisis & contingency protocols'],
            ['P', 'Vendor contact directory'],
            ['Q', 'AI enablement map — tool, use case, owner, guardrails'],
          ],
        },
      },
    ],
  },

  // ------------------------------------------------------------------
  {
    slug: 'path',
    navGroup: 'Delivery',
    badge: '◆',
    title: 'Development Path',
    eyebrow: 'Delivery',
    kind: 'table',
    lede: 'Five phases from discovery to handoff.',
    blocks: [
      {
        kind: 'table',
        meta: {
          cols: ['Phase', 'What happens', 'Output'],
          rows: [
            ['1 · Discovery', 'Interviews with event owners; audit of current tools, templates, and contracts', 'Findings memo, validated portfolio map'],
            ['2 · Draft', 'Build Parts 1–7 against real NCCHCA process, not generic best practice', 'Full playbook draft'],
            ['3 · Templates', 'Build the toolkit as working files', 'Appendices A–Q'],
            ['4 · Pilot', 'Run one virtual series and one conference phase through the playbook', 'Revisions'],
            ['5 · Handoff', 'Staff training, ownership assignment, review cadence', 'Final playbook + adoption plan'],
          ],
        },
      },
    ],
  },

  // ------------------------------------------------------------------
  {
    slug: 'open',
    navGroup: 'Delivery',
    badge: '◆',
    title: 'Open Questions',
    eyebrow: 'Delivery',
    kind: 'checklist',
    lede: 'To resolve in discovery, before Part 2 and Part 4 can be made concrete.',
    blocks: [
      {
        kind: 'card',
        title: 'To resolve',
        items: [
          'Confirm whether the annual conference has <b>hybrid ambitions</b> — Part 3.5 scales up significantly if yes',
          'Get read-only access to the <b>Cvent instance and prior-year budget</b> to make Parts 2 and 4 concrete',
          'Determine whether AI recommendations need <b>internal governance review</b> before inclusion — likely a short guardrails subsection in Appendix Q, given FQHC data sensitivity',
          'Decide whether this is <b>one document</b> or a document plus a live internal wiki',
          'Identify the current <b>platform stack</b> — Zoom, Teams, Cvent, other',
          'Identify <b>who owns event ops internally</b> across the annual conference and the recurring virtual cadence',
          'Establish the current <b>sponsor renewal rate</b> and post-event content practice',
        ],
      },
    ],
  },
];
