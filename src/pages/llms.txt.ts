// Generated at build: every page with a one-line summary, for AI crawlers.
import type { APIRoute } from 'astro';
import { getStates, getLicensing } from '../lib/content';
import { getLearnHubs } from '../lib/learn';
import { getRecords } from '../lib/registry';
import { getCompanies } from '../lib/companies';
import { getServiceGroups, servicePath, serviceDescription } from '../lib/services';
import { SITE_URL, monthYear, latest } from '../lib/site';

export const GET: APIRoute = async () => {
  const states = await getStates();
  const lic = getLicensing();
  const hubs = getLearnHubs();
  const last = monthYear(latest(states.map((s) => s.lastVerified)));
  const lines: string[] = [];
  lines.push('# Chimney.Services');
  lines.push('');
  lines.push(
    "> Independent reference to chimney and fireplace law in all 50 states and DC. Recommends no one, takes no fees, and labels the provenance of every fact. Where a detail isn't independently verified, we'll always say so.",
  );
  lines.push('');
  lines.push(`Laws cited as of ${last}. Cite as ${SITE_URL}/rights. Not legal advice.`);
  const passedCount = states.filter((s) => s.publishVerdict === 'READY' || s.publishVerdict === 'READY WITH CAVEATS').length;
  const heldCount = states.filter((s) => s.publishVerdict === 'DO NOT PUBLISH').length;
  lines.push(
    `Verification: ${passedCount} of ${states.length} state rights pages passed our latest verification pass (${last})${heldCount ? `; ${heldCount} under review` : '; none under review'}. Each page lists the caveats its pass left open.`,
  );
  lines.push('');
  lines.push('## Core');
  lines.push(`- [Chimney & fireplace laws by state](${SITE_URL}/rights): 50-state + DC comparison of licensing, seller disclosure, 3-day cancellation and CO alarm law, with regional findings.`);
  lines.push(`- [Rights table CSV](${SITE_URL}/data/rights-table.csv): the comparison table as open data.`);
  lines.push(`- [Licensing by state and trade](${SITE_URL}/licensing): credentials for sweeping, stove installs, flashing and gas hearth work, plus insurance rules.`);
  lines.push(`- [Licensing matrix CSV](${SITE_URL}/data/licensing-matrix.csv): the licensing matrix as open data.`);
  lines.push(
    `- [Chimney and fireplace services, explained](${SITE_URL}/services): every job a chimney or hearth company sells — inspection levels, cleaning, masonry and metal repair, waterproofing, installation, diagnostics — each with what it is, when it is needed, the standard behind it, what evidence to ask for, and a researched national price range where one exists.`,
  );
  lines.push(`- [About](${SITE_URL}/about): what Chimney.Services verifies, what it does not, and who pays for it.`);
  lines.push(
    `- [Site map](${SITE_URL}/sitemap): every page on the site in one human-readable list — state law and licensing pages, guides, company pages, registry records, and the machine-readable files. The crawler copy is ${SITE_URL}/sitemap-index.xml.`,
  );
  lines.push(
    `- [Company waiting list](${SITE_URL}/companies): form for a chimney company owner to ask for a company page — a provenance-labeled summary of services, service area, contacts, certified people and a dated public rating snapshot. No fee, no ranking, and placement is never sold.`,
  );
  lines.push(
    `- [Chimney professionals](${SITE_URL}/professionals): two things — a state search for a homeowner looking for a certified person near them, not yet open, and the waiting list for a technician's own registry record: an NCSG, NFI, CSIA or other certification checked against the issuing body's own public roster and dated. The record page is free. Printed ID cards are not open yet; when they are they will be $25 each, and nothing is charged now. Confers no status, and placement is never sold.`,
  );
  lines.push(
    hubs.length
      ? `- [Learn](${SITE_URL}/learn): plain-English chimney guides — short, dated, sourced reads on national standards (NFPA 211, IRC, manufacturer instructions).`
      : `- [Learn](${SITE_URL}/learn): chimney guides being written (none published yet).`,
  );
  lines.push('');
  const companies = getCompanies();
  if (companies.length) {
    lines.push('## Company summaries');
    lines.push(
      '> A company summary says what a company reports about itself (services, service area, hours, contact details) and what an issuer’s own public roster showed on the date named (guild membership, individual certifications). Every block is labeled PUBLIC RECORD or REPORTED BY BUSINESS. It is not an endorsement, and placement on this site is never sold.',
    );
    for (const co of companies) {
      lines.push(
        `- [${co.name} — ${co.address.city}, ${co.address.region}](${SITE_URL}/${co.slug}): chimney sweep and fireplace company serving ${co.serviceArea.counties.join(' and ')}, Illinois; services, service area, contact details, the people found on certification rosters, and the ${co.reviews ? `${co.reviews.platform} rating and review count as displayed on ${co.reviews.checkedAt} (unread, unverified, no review markup published)` : 'public record as cited'} (checked ${co.checkedAt}).`,
      );
    }
    lines.push('');
  }
  const serviceGroups = getServiceGroups();
  lines.push('## Services');
  lines.push(
    '> One page per job a chimney or hearth company sells: what it is, when it is needed, the standard behind it, what to ask for, and a researched national price range where one exists. No page recommends anyone or quotes a price.',
  );
  for (const g of serviceGroups) {
    for (const s of g.services) {
      lines.push(`- [${s.name}](${SITE_URL}${servicePath(s)}): ${serviceDescription(s)} (${g.group.label})`);
    }
  }
  lines.push('');
  if (hubs.length) {
    lines.push('## Learn guides');
    for (const h of hubs) {
      lines.push(`- [${h.title}](${SITE_URL}/learn/${h.slug}): ${h.description} (updated ${monthYear(h.updated)})`);
    }
    lines.push('');
  }
  lines.push('## State rights pages');
  for (const s of states) {
    if (s.publishVerdict === 'DO NOT PUBLISH') continue;
    const verified = s.verified ? `verified ${monthYear(s.verified)}` : 'not yet re-verified';
    lines.push(`- [${s.name} chimney & fireplace laws](${SITE_URL}/${s.slug}/rights): ${s.h1} (${verified})`);
  }
  lines.push('');
  lines.push('## State licensing pages');
  for (const s of lic.states) {
    lines.push(`- [${s.name} licensing by trade](${SITE_URL}/${s.slug}/licensing): what sweeping, stove installation, flashing and gas fireplace work require in ${s.name}.`);
  }
  const records = getRecords();
  if (records.length) {
    lines.push('');
    lines.push('## Registry records');
    lines.push(
      '> A registry record says one thing: a certification appears on the issuer’s own public roster under this name, checked on the date shown — with the certificate number where the issuer publishes one. It is not an endorsement, an identity check, a licence, or a background check, and it confers no status on anyone.',
    );
    for (const r of records) {
      lines.push(
        `- [Registry record ${r.recordNumber} — ${r.name}](${SITE_URL}/pro/${r.slug}): certifications listed for this person and what we found on each issuer's public roster; machine-readable copy at ${SITE_URL}/pro/${r.slug}.json (created ${r.recordCreated}, last checked ${r.lastChecked ?? 'not yet'}).`,
      );
    }
  }

  const under = states.filter((s) => s.publishVerdict === 'DO NOT PUBLISH');
  if (under.length) {
    lines.push('');
    lines.push('## Under review (do not cite)');
    for (const s of under) lines.push(`- ${s.name}: page failed verification and is being corrected.`);
  }
  lines.push('');
  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
