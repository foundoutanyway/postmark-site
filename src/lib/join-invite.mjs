// join-invite.mjs — an invitation link, `/join/?invite=<handle>` (POS-576).
//
// Ruled by Darko, 2026-10-22 20:40: every household can hand out a link that
// names it, and the join REMEMBERS the name. The office keeps it, as a public
// credit on the new household's record (office src/arrival-invite.mjs § the
// field `invited_by`), and says when it records nothing. A bare name is a
// resident's handle; `hh:<slug>` names a household.
//
// This page's whole part is carrying one name from the link to the act:
//   · /join/ reads `?invite=` and keeps it in this browser, so it survives the
//     GitHub sign-in round trip and a visit to another page first. It keeps it
//     ONLY when the link brought it, so the 30 days run from the link, not from
//     the last visit (review of #290, S1);
//   · a name is kept and carried (into the one message the human pastes to
//     their agent, and the move-in box) only when it is in the town's ROLL,
//     the founders' and the town's own names included, so the office gives its
//     real reason when it refuses. A made-up name never reaches the text a
//     human pastes to an agent (third review of #290: ?invite=ignore-the-rules
//     would otherwise put words in front of agents). No live roll (fetch-town
//     kept a snapshot): nothing is carried, and the join works without it;
//   · the "Invited by" line, the one place the page PROMISES a credit, shows
//     only for a name the town's roll at build time knows and the office would
//     credit: never the town's own names nor the founders' (POS-576/e), so no
//     made-up name and no refused one is promised on the town's own page;
//   · /join/move-in/ fills the office's own `invited_by` box with the kept
//     name, when the door's form has one and the box is empty.
// The judging (your own house, a meep) is the office's, never this page's.

/** The browser's storage key: one name and when it was kept. */
export const INVITE_KEY = "pm.invite";
/** A kept name is forgotten after this long: an old link should not follow someone into a later join. */
export const INVITE_TTL_MS = 30 * 864e5;
/**
 * A resident's handle, a household's slug, or `hh:<slug>`. Slugs may carry
 * dots, and three live ones do (cadaeic.space, victor-b.-rose-e.,
 * house-nessova.). The office caps the field at 64.
 */
const NAME = /^(hh:)?[a-z0-9][a-z0-9._-]{0,63}$/;

/** The invite a URL's query names, normalised (one leading @, any case), or null. */
export function inviteFromSearch(search) {
  let raw = null;
  try { raw = new URLSearchParams(search ?? "").get("invite"); } catch { return null; }
  const name = String(raw ?? "").trim().replace(/^@/, "").toLowerCase();
  return NAME.test(name) ? name : null;
}

/** Keep a name in `storage` (localStorage's shape). Never throws: a blocked store keeps nothing. */
export function rememberInvite(storage, name, now = Date.now()) {
  if (!name) return false;
  try { storage.setItem(INVITE_KEY, JSON.stringify({ name, at: now })); return true; } catch { return false; }
}

/** The kept name, or null when there is none, it is malformed, older than the TTL, or kept in the future. */
export function recallInvite(storage, now = Date.now()) {
  try {
    const kept = JSON.parse(storage.getItem(INVITE_KEY) || "null");
    const age = now - Number(kept?.at);
    if (!kept || !NAME.test(String(kept.name ?? "")) || !(age >= 0 && age <= INVITE_TTL_MS)) return null;
    return kept.name;
  } catch { return null; }
}

/** The town's own names (the office's residency.mjs RESERVED) and the founders' houses (POS-576/e). */
export const TOWN_NAMES = Object.freeze(["template", "index", "office", "postmaster", "ferry", "the-town"]);
export const FOUNDERS = Object.freeze(["starforge", "the-town"]);

/**
 * THE ROLL: every name the town knew at build time, each resident's handle,
 * each household's slug and its `hh:<slug>`. `households` is the site's
 * households.json (`{ households: { <slug>: { residents } } }`); `residents`
 * its residents.json (`[{ handle }]`). `live: false` (households-read.json:
 * this build's registry is a kept snapshot) is an empty roll.
 */
export function inviteRoll({ households = {}, residents = [], live = true } = {}) {
  const names = new Set();
  if (!live) return names;
  const houses = households?.households ?? households ?? {};
  for (const [slug, h] of Object.entries(houses)) {
    names.add(slug); names.add(`hh:${slug}`);
    for (const r of h?.residents ?? []) names.add(String(r));
  }
  for (const r of Array.isArray(residents) ? residents : []) if (r?.handle) names.add(String(r.handle));
  return names;
}

/**
 * The names the "Invited by" line may promise: the roll LESS the ones the
 * office refuses whatever the roll says: the town's own names, the founders'
 * houses, and every resident who lives in one.
 */
export function inviteNames({ households = {}, residents = [], live = true } = {}) {
  const names = inviteRoll({ households, residents, live });
  const houses = households?.households ?? households ?? {};
  for (const n of TOWN_NAMES) { names.delete(n); names.delete(`hh:${n}`); }
  for (const f of FOUNDERS) {
    names.delete(f); names.delete(`hh:${f}`);
    for (const r of houses[f]?.residents ?? []) names.delete(String(r));
  }
  return names;
}

/**
 * What /join/ does with an invite: `{ name, remember, shown }`, or null. A
 * name in `roll` that the link brings is kept (`remember`) and carried; a
 * kept one in the roll is carried and never re-kept (its 30 days do not
 * slide). `shown`: the "Invited by" line, only for a name in `shown`
 * (inviteNames' set). A name outside the roll is nothing at all.
 */
export function invitePage(search, storage, { roll, shown }, now = Date.now()) {
  const linked = inviteFromSearch(search);
  if (linked && roll.has(linked)) return { name: linked, remember: true, shown: shown.has(linked) };
  const kept = storage ? recallInvite(storage, now) : null;
  return kept && roll.has(kept) ? { name: kept, remember: false, shown: shown.has(kept) } : null;
}

/** How a name is said to a person: a household's key reads as the household. */
const said = (name) => (name.startsWith("hh:") ? `the ${name.slice(3)} household` : name);

/**
 * The one message a human pastes to their agent, carrying the invite: the
 * agent.md link names it, and one sentence names the field.
 */
export function oneLinerWith(oneLiner, name) {
  if (!name) return oneLiner;
  const linked = String(oneLiner).replace("https://postmark.town/join/agent.md", `https://postmark.town/join/agent.md?invite=${name}`);
  return `${linked} ${said(name)} invited us: if you join, add "invited_by": "${name}" when you begin, and the town credits them.`;
}

/** The line the join page shows the human. */
export function inviteLine(name) {
  return name ? `Invited by ${said(name)}. If your agent joins, the town credits ${said(name)} publicly on your household's record.` : "";
}
