// Services catalogue (/services). One entry per job a chimney or hearth company
// sells, loaded from src/data/services.json so the list can grow without the
// template changing.
//
// The rules this file enforces, because the page is worthless if they slip:
//   - slugs are unique, kebab-case, and become the page's stable anchors;
//   - a priceSlug must exist in the researched national price file, and may be
//     used by only one service, so a range is rendered once per page;
//   - a learn path must point at a published guide hub;
//   - every entry carries what it is, when it is needed, and what to ask for.
// Any violation throws at build time, naming the entry.
import raw from '../data/services.json';
import { getPrices, clipDescription, LEARN_TOPICS } from './learn';

export type ServiceGroupId =
  | 'inspection'
  | 'cleaning'
  | 'masonry'
  | 'metal'
  | 'weather'
  | 'installation'
  | 'diagnostics'
  | 'related';

export interface ServiceEntry {
  slug: string;
  name: string;
  /** Shorter name for the page title and H1, where `name` runs long. Defaults to `name`. */
  shortName: string;
  /** Hand-tuned H1 for the service page, when the template's phrasing does not fit. */
  h1: string | null;
  /** The noun phrase questions use: "What is {noun}?" — with its article where it takes one. */
  noun: string;
  group: ServiceGroupId;
  /** 2–4 plain sentences: what the work is and what it is for. */
  what: string;
  /** When it is actually needed, or what triggers it. */
  when: string;
  /** Standard named, never a section number we are not certain of. */
  standard: string | null;
  /** What to ask for in writing, or what evidence to expect. */
  askFor: string;
  /** A slug from the researched national price file, or null. */
  priceSlug: string | null;
  /** Path to the matching guide hub, or null. */
  learn: string | null;
  /** The known scare-sell around this job and how to check it. Null elsewhere. */
  upsellNote: string | null;
  /** Licensing, permits or what is allowed differ by state: link /rights and /licensing. */
  variesByState: boolean;
  /**
   * Which trade credential usually applies, in general terms from the licensing
   * research — never one state's law. Required when variesByState is true.
   */
  credential: string | null;
  /** Cross-linked services, made two-way at load. */
  related: string[];
}

export interface ServiceGroup {
  id: ServiceGroupId;
  /** Short label, used in the jump chips. */
  label: string;
  /** Question-phrased H2 for the group. */
  heading: string;
  /** One sentence under the heading. */
  blurb: string;
}

/** Group order is the page order. */
export const SERVICE_GROUPS: ServiceGroup[] = [
  {
    id: 'inspection',
    label: 'Inspection',
    heading: 'What do chimney inspections cover?',
    blurb:
      'NFPA 211 sorts inspections into three levels by how much access they need. The level you are buying should be named before the work, not after it.',
  },
  {
    id: 'cleaning',
    label: 'Cleaning',
    heading: 'What does a chimney cleaning actually include?',
    blurb:
      'Cleaning removes what has built up. It is a separate job from inspecting, even when one visit covers both, and it is priced by what is being cleaned.',
  },
  {
    id: 'masonry',
    label: 'Repair — masonry',
    heading: 'Which chimney repairs are masonry work?',
    blurb:
      'Brick, mortar, firebrick and concrete: the parts of a chimney that fail slowly, mostly because of water, and get repaired in the same order every time.',
  },
  {
    id: 'metal',
    label: 'Repair — metal & components',
    heading: 'Which chimney parts are metal, and what happens when they fail?',
    blurb:
      'Caps, covers, dampers, flashing and liners are manufactured components. Each one is listed for a purpose, and each has a failure you can be shown.',
  },
  {
    id: 'weather',
    label: 'Waterproofing & weather',
    heading: 'What keeps water out of a chimney?',
    blurb:
      'Most chimney repair is really about water, so several jobs exist only to keep it out of the masonry or to undo what it already did.',
  },
  {
    id: 'installation',
    label: 'Installation',
    heading: 'What does a chimney company install?',
    blurb:
      'Appliances, venting and the structure around them. Manufacturer instructions are the specification here, and permits and licensing vary by state.',
  },
  {
    id: 'diagnostics',
    label: 'Diagnostics & problems',
    heading: 'What gets diagnosed when something is wrong?',
    blurb:
      'Smoke, smells, water and carbon monoxide are symptoms. These are the jobs that find the cause before anyone sells you the cure.',
  },
  {
    id: 'related',
    label: 'Related work',
    heading: 'What else gets sold alongside chimney work?',
    blurb:
      'Work chimney companies often do because they are already there. It is useful, it is not chimney work, and it belongs on its own line of the invoice.',
  },
];

const GROUP_IDS = new Set(SERVICE_GROUPS.map((g) => g.id));
const LEARN_PATHS = new Set(LEARN_TOPICS.map((t) => `/learn/${t.slug}`));
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
/** ids the page template renders itself; a service slug may never take one. */
const RESERVED_IDS = new Set(['main', 'intro', 'jump', 'faq', 'before-you-rely', 'before-you-rely-box', 'services']);

class ServicesError extends Error {
  constructor(where: string, msg: string) {
    super(`[services] ${where}: ${msg}`);
    this.name = 'ServicesContractError';
  }
}

let cache: ServiceEntry[] | null = null;

export function getServices(): ServiceEntry[] {
  if (cache) return cache;
  const rows = (raw as { services: unknown[] }).services;
  if (!Array.isArray(rows) || rows.length === 0) throw new ServicesError('src/data/services.json', 'no services');

  const prices = getPrices();
  const seen = new Set<string>();
  const pricesUsed = new Map<string, string>();
  const out: ServiceEntry[] = [];

  rows.forEach((r, i) => {
    const s = (r ?? {}) as Record<string, unknown>;
    const where = typeof s.slug === 'string' ? `"${s.slug}"` : `entry ${i + 1}`;
    for (const key of ['slug', 'name', 'group', 'what', 'when', 'askFor']) {
      if (typeof s[key] !== 'string' || !(s[key] as string).trim()) throw new ServicesError(where, `"${key}" is required`);
    }
    const slug = (s.slug as string).trim();
    if (!SLUG_RE.test(slug)) throw new ServicesError(where, `slug "${slug}" must be kebab-case`);
    if (RESERVED_IDS.has(slug)) throw new ServicesError(where, `slug "${slug}" is reserved by the page template`);
    if (seen.has(slug)) throw new ServicesError(where, `slug "${slug}" is used twice`);
    seen.add(slug);

    const group = s.group as ServiceGroupId;
    if (!GROUP_IDS.has(group)) throw new ServicesError(where, `group "${String(s.group)}" is not one of ${[...GROUP_IDS].join(', ')}`);

    const priceSlug = s.priceSlug == null ? null : String(s.priceSlug);
    if (priceSlug) {
      if (!prices.has(priceSlug)) throw new ServicesError(where, `priceSlug "${priceSlug}" is not in the national price file`);
      if (pricesUsed.has(priceSlug)) throw new ServicesError(where, `priceSlug "${priceSlug}" is already used by "${pricesUsed.get(priceSlug)}" — a range renders once per page`);
      pricesUsed.set(priceSlug, slug);
    }

    const learn = s.learn == null ? null : String(s.learn);
    if (learn && !LEARN_PATHS.has(learn)) throw new ServicesError(where, `learn "${learn}" is not a guide hub`);

    const what = (s.what as string).trim();
    if (/\$\s?\d/.test(what) || /\$\s?\d/.test((s.when as string) ?? '')) throw new ServicesError(where, 'no dollar figures in prose — that is what priceSlug is for');

    const noun = typeof s.noun === 'string' ? s.noun.trim() : '';
    if (!noun) throw new ServicesError(where, '"noun" is required — the phrase the page\'s questions use');
    if (/^[A-Z]/.test(noun) && !/^(Level|NFPA|IRC)\b/.test(noun)) throw new ServicesError(where, `noun "${noun}" should start lower-case`);
    const credential = s.credential == null ? null : String(s.credential).trim() || null;
    if (s.variesByState === true && !credential) throw new ServicesError(where, 'variesByState needs a "credential" line saying which trade credential usually applies');
    if (credential && /\$\s?\d/.test(credential)) throw new ServicesError(where, 'no dollar figures in prose — that is what priceSlug is for');
    const related = Array.isArray(s.related) ? s.related.map(String) : [];
    const h1 = s.h1 == null ? null : String(s.h1).trim() || null;
    if (h1 && h1.length > 90) throw new ServicesError(where, `h1 is ${h1.length} chars (max 90)`);

    out.push({
      slug,
      name: (s.name as string).trim(),
      shortName: typeof s.shortName === 'string' && s.shortName.trim() ? s.shortName.trim() : (s.name as string).trim(),
      h1,
      noun,
      group,
      what,
      when: (s.when as string).trim(),
      standard: s.standard == null ? null : String(s.standard).trim(),
      askFor: (s.askFor as string).trim(),
      priceSlug,
      learn,
      upsellNote: s.upsellNote == null ? null : String(s.upsellNote).trim(),
      variesByState: s.variesByState === true,
      credential,
      related,
    });
  });

  // Related links: every slug must exist and may not point at itself; then make
  // them two-way, so declaring a pair once links both pages.
  const bySlug = new Map(out.map((x) => [x.slug, x]));
  for (const x of out) {
    for (const r of x.related) {
      if (!bySlug.has(r)) throw new ServicesError(`"${x.slug}"`, `related "${r}" is not a service slug`);
      if (r === x.slug) throw new ServicesError(`"${x.slug}"`, 'related may not list the service itself');
    }
  }
  for (const x of out) for (const r of [...x.related]) {
    const back = bySlug.get(r)!;
    if (!back.related.includes(x.slug)) back.related.push(x.slug);
  }

  cache = out;
  return out;
}

/** Services in page order: group order first, then the order of the data file. */
export function getServiceGroups(): { group: ServiceGroup; services: ServiceEntry[] }[] {
  const all = getServices();
  return SERVICE_GROUPS.map((group) => ({ group, services: all.filter((s) => s.group === group.id) })).filter(
    (g) => g.services.length > 0,
  );
}

/** The chips over a service: the standards it answers to, plus the state caveat. */
export function serviceTags(s: ServiceEntry): string[] {
  const tags: string[] = [];
  const standard = (s.standard ?? '').toLowerCase();
  if (standard.includes('nfpa 211')) tags.push('NATIONAL · NFPA 211');
  if (standard.includes('irc')) tags.push('NATIONAL · IRC');
  if (standard.includes('manufacturer')) tags.push('NATIONAL · MANUFACTURER INSTRUCTIONS');
  if (s.variesByState) tags.push('VARIES BY STATE');
  return tags;
}

/** The guide hub's own name, for the "more on this" link. */
export function learnName(path: string): string {
  const slug = path.replace(/^\/learn\//, '');
  return LEARN_TOPICS.find((t) => t.slug === slug)?.name ?? 'the guide';
}

export const SERVICES_UPDATED: string = String((raw as { updated?: string }).updated ?? '');

// ---------------------------------------------------------------- service pages
// /services/{slug}: one indexable page per entry, built from the same fields.
// Everything a page says is assembled here from services.json, so the page
// template, llms.txt and the site map all read the same words.

export const servicePath = (s: ServiceEntry) => `/services/${s.slug}`;
export const serviceGroup = (s: ServiceEntry) => SERVICE_GROUPS.find((g) => g.id === s.group)!;

/** Split prose into sentences without breaking inside a quotation or a standard's name. */
export function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?][”"’)]?)\s+(?=[A-Z“"‘(])/)
    .map((x) => x.trim())
    .filter(Boolean);
}

/**
 * The answer block: the first two sentences of `what`, or three when the third
 * still keeps it short enough to quote whole. `rest` is whatever `what` has left,
 * rendered straight after it so nothing is said twice.
 */
export function serviceAnswer(s: ServiceEntry): { answer: string; rest: string } {
  const parts = sentences(s.what);
  let n = Math.min(2, parts.length);
  if (parts.length >= 3 && parts.slice(0, 3).join(' ').length <= 330) n = 3;
  return { answer: parts.slice(0, n).join(' '), rest: parts.slice(n).join(' ') };
}

/** ≤155 characters, front-loaded: the answer block clipped at a sentence boundary. */
export function serviceDescription(s: ServiceEntry): string {
  const MAX = 155;
  const answer = serviceAnswer(s).answer;
  const parts = sentences(answer);
  const greedy = (first: string, from: number) => {
    let out = first;
    for (const p of parts.slice(from)) {
      if (`${out} ${p}`.length > MAX) break;
      out = `${out} ${p}`;
    }
    return out;
  };
  // Whole sentences first.
  const whole = parts[0] && parts[0].length <= MAX ? greedy(parts[0], 1) : '';
  if (whole.length >= 60) return whole;
  // The first sentence alone runs long: cut it at its last clause break that
  // fits (a colon, a dash, a semicolon), close it there, and add what follows
  // if it fits — rather than stopping mid-phrase.
  if (parts[0] && parts[0].length > MAX) {
    const head = parts[0].slice(0, MAX - 1);
    let dash = head.lastIndexOf(' —');
    // A dash that closes an aside (" — a, b, c — ") is not a clause break: use the one that opened it.
    if (dash > 0 && (head.slice(0, dash).match(/ —/g) ?? []).length % 2 === 1) dash = head.lastIndexOf(' —', dash - 1);
    const at = Math.max(head.lastIndexOf(':'), dash, head.lastIndexOf(';'));
    if (at >= 40) {
      const cut = greedy(`${head.slice(0, at).trim()}.`, 1);
      if (cut.length >= 45) return cut;
    }
  }
  if (whole.length >= 45) return whole;
  return clipDescription(answer, MAX);
}

const H1_MAX = 70;
/** The H1: the service phrased as the question a homeowner types. */
export function serviceH1(s: ServiceEntry): string {
  if (s.h1) return s.h1;
  const n = s.shortName;
  const candidates = [
    `${n}: what it is, when you need it, what to ask for`,
    `${n}: what it is and when you need it`,
    `${n}: when you need it`,
  ];
  return candidates.find((c) => c.length <= H1_MAX) ?? `${n}, explained`;
}

const TITLE_MAX = 60; // before " | Chimney.Services"
/** `{Name} — {short hook}`; the hook names the cost only where a real national range exists. */
export function serviceTitle(s: ServiceEntry): string {
  const row = s.priceSlug ? getPrices().get(s.priceSlug) : undefined;
  const hasRange = Boolean(row && !row.quoteOnly);
  const hooks = hasRange
    ? ["when it's needed and what it costs", 'when needed, what it costs', 'what it costs']
    : ["what it is and when it's needed", "when it's needed", 'explained'];
  const base = hooks.map((h) => `${s.shortName} — ${h}`).find((t) => t.length <= TITLE_MAX) ?? s.shortName;
  return `${base} | Chimney.Services`;
}

/** Cross-links first (up to five), then three to five neighbours from the same group. */
export function relatedServices(s: ServiceEntry): { service: ServiceEntry; sibling: boolean }[] {
  const all = getServices();
  const bySlug = new Map(all.map((x) => [x.slug, x]));
  const explicit = s.related.map((r) => bySlug.get(r)!).filter(Boolean);
  const group = all.filter((x) => x.group === s.group);
  const at = group.findIndex((x) => x.slug === s.slug);
  // Nearest first: the next entry, the previous one, the one after that…
  const ordered: ServiceEntry[] = [];
  for (let d = 1; d < group.length; d++) {
    for (const i of [at + d, at - d]) if (i >= 0 && i < group.length) ordered.push(group[i]);
  }
  // Declared links come before the ones made two-way, so the cap keeps the declared ones.
  const cross = explicit.slice(0, 5);
  const seen = new Set([s.slug, ...cross.map((x) => x.slug)]);
  const siblings = ordered.filter((x) => !seen.has(x.slug)).slice(0, Math.min(5, Math.max(3, 7 - cross.length)));
  return [...cross.map((service) => ({ service, sibling: false })), ...siblings.map((service) => ({ service, sibling: true }))];
}

/** The standards a service names, split into their parts in the order given. */
export function standardParts(s: ServiceEntry): ('NFPA 211' | 'IRC' | 'manufacturer instructions')[] {
  const out: ('NFPA 211' | 'IRC' | 'manufacturer instructions')[] = [];
  for (const raw of (s.standard ?? '').split('·').map((x) => x.trim().toLowerCase())) {
    if (raw.includes('nfpa 211')) out.push('NFPA 211');
    else if (raw === 'irc') out.push('IRC');
    else if (raw.includes('manufacturer')) out.push('manufacturer instructions');
  }
  return out;
}

export const STANDARD_NOTES: Record<'NFPA 211' | 'IRC' | 'manufacturer instructions', string> = {
  'NFPA 211':
    'NFPA 211, the Standard for Chimneys, Fireplaces, Vents, and Solid Fuel-Burning Appliances — the national standard that sets the yearly inspection and the three inspection levels.',
  IRC: 'The International Residential Code (IRC) — the model building code for one- and two-family homes, adopted and often amended state by state and city by city.',
  'manufacturer instructions':
    "The manufacturer's installation and service instructions — for a listed appliance or component, they are the specification it was tested to.",
};

const joinAnd = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}`);

/**
 * "Does your state regulate this?" as sentences. The page links /rights and
 * /licensing after them; the FAQ answer uses the same words as plain text.
 */
export function stateSentences(s: ServiceEntry): string[] {
  const parts = standardParts(s);
  const model = parts.filter((p) => p !== 'manufacturer instructions').map((p) => (p === 'IRC' ? 'the IRC' : p));
  const out: string[] = [];
  if (model.length) {
    const subject = joinAnd(model);
    out.push(
      `${subject.charAt(0).toUpperCase()}${subject.slice(1)} ${model.length > 1 ? 'are national model documents, not state law' : 'is a national model document, not state law'}: which edition applies to your home, if any, depends on the codes your state and city have adopted.`,
    );
  }
  if (parts.includes('manufacturer instructions')) {
    out.push('Manufacturer instructions travel with the product: they set its requirements wherever it is installed, separately from the building code.');
  }
  if (s.variesByState) {
    out.push(`Licensing, permits and what is allowed for ${s.noun} differ by state, and sometimes by city.`);
  } else if (!s.credential) {
    out.push(
      'Few jurisdictions name chimney or hearth work in a credential at all; the rule that usually touches a job like this is about the company — a general contractor or home-improvement license or registration where the state has one, sometimes only above a dollar threshold.',
    );
  }
  if (s.credential) out.push(s.credential);
  return out;
}
export const STATE_LINKS_TEXT = 'Our 50-state laws table and licensing by state set out what each state requires.';

export interface ServiceFaq { id: string; q: string; a: string }
/** Three questions from the fields; a field too thin to answer from is dropped rather than padded. */
export function serviceFaq(s: ServiceEntry): ServiceFaq[] {
  const faq: ServiceFaq[] = [];
  const parts = standardParts(s).map((p) => (p === 'IRC' ? 'the IRC' : p === 'manufacturer instructions' ? "the manufacturer's instructions" : p));
  if (s.when.length >= 40) {
    faq.push({
      id: 'faq-when',
      q: `When is ${s.noun} needed?`,
      // Name the standard unless the answer already does.
      a: `${s.when}${parts.length && !/NFPA|IRC|manufacturer/i.test(s.when) ? ` The work answers to ${joinAnd(parts)}.` : ''}`,
    });
  }
  faq.push({ id: 'faq-law', q: `Is ${s.noun} regulated by state law?`, a: [...stateSentences(s), STATE_LINKS_TEXT].join(' ') });
  if (s.askFor.length >= 40) {
    faq.push({
      id: 'faq-ask',
      q: `What should I ask before agreeing to ${s.noun}?`,
      a: `${s.askFor}${s.upsellNote ? ` ${s.upsellNote}` : ''}`,
    });
  }
  return faq;
}
