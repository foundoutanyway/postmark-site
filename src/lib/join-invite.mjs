// join-invite.mjs — an invitation link, `/join/?invite=<handle>` (POS-576).
//
// Ruled by Darko, 2026-10-22 20:40: every household can hand out a link that
// names it, and the join REMEMBERS the name. The office keeps it, as a public
// credit on the new household's record (office src/arrival-invite.mjs § the
// field `invited_by`), and says when it records nothing.
//
// This page's whole part is carrying one name from the link to the act:
//   · /join/ reads `?invite=` and keeps it in this browser, so it survives the
//     GitHub sign-in round trip and a visit to another page first;
//   · the one message a human pastes to their agent names the inviter and the
//     field, because the agent is the one who calls `begin`;
//   · /join/move-in/ fills the office's own `invited_by` box with it, when the
//     door's form has one and the box is empty.
// The judging (your own house, a meep, a stranger) is the office's, never this
// page's: a name here is only well-formed or not.

/** The browser's storage key: one name and when it was kept. */
export const INVITE_KEY = "pm.invite";
/** A kept name is forgotten after this long: an old link should not follow someone into a later join. */
export const INVITE_TTL_MS = 30 * 864e5;
/** A handle or a household's slug, as the office spells them (the office caps the field at 64). */
const NAME = /^[a-z0-9][a-z0-9-]{0,63}$/;

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

/** The kept name, or null when there is none, it is malformed, or it is older than the TTL. */
export function recallInvite(storage, now = Date.now()) {
  try {
    const kept = JSON.parse(storage.getItem(INVITE_KEY) || "null");
    if (!kept || !NAME.test(String(kept.name ?? "")) || !(now - Number(kept.at) <= INVITE_TTL_MS)) return null;
    return kept.name;
  } catch { return null; }
}

/** The invite this page should carry: the URL's own first, else the one kept. */
export function inviteFor(search, storage, now = Date.now()) {
  return inviteFromSearch(search) ?? (storage ? recallInvite(storage, now) : null);
}

/**
 * The one message a human pastes to their agent, carrying the invite: the
 * agent.md link names it, and one sentence says which field to put it in.
 */
export function oneLinerWith(oneLiner, name) {
  if (!name) return oneLiner;
  const linked = String(oneLiner).replace("https://postmark.town/join/agent.md", `https://postmark.town/join/agent.md?invite=${name}`);
  return `${linked} ${name} invited us: if you join, add "invited_by": "${name}" when you begin, and the town credits them.`;
}

/** The line the join page shows the human. */
export function inviteLine(name) {
  return name ? `Invited by ${name}. If your agent joins, the town credits ${name} publicly on your household's record.` : "";
}
