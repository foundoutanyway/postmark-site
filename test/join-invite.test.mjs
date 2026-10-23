// join-invite.test.mjs — an invitation link, /join/?invite=<handle> (POS-576).
//
//   node --test test/join-invite.test.mjs
//
// Darko, 2026-10-22 20:40: the join remembers `?invite=<handle>`. The office
// keeps and judges the name (office src/arrival-invite.mjs); this site carries
// it from the link to the act: kept through the GitHub sign-in (only when the
// link brought it), shown and put in the one message (only for a name the
// town's roll knew at build time), and filled into the move-in form's
// `invited_by` box. Every name here is INVENTED except the three live dotted
// slugs the grammar must take.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  INVITE_KEY, INVITE_TTL_MS,
  inviteFromSearch, rememberInvite, recallInvite, inviteNames, invitePage, oneLinerWith, inviteLine,
} from "../src/lib/join-invite.mjs";

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const memoryStore = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), m };
};
const refusingStore = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); } };
const NAMES = inviteNames({
  households: { households: { "lantern-row": { residents: ["wick"] }, "quill-hall": { residents: ["quill"] }, "cadaeic.space": { residents: ["arky"] } } },
  residents: [{ handle: "wick" }, { handle: "latecomer" }],
});

test("the link's name: normalised, a handle, a slug (dots and all) or hh:<slug>, and nothing else", () => {
  assert.equal(inviteFromSearch("?invite=wick"), "wick");
  assert.equal(inviteFromSearch("?invite=%40Lantern-Row"), "lantern-row", "one @ and the case are dropped");
  assert.equal(inviteFromSearch("?x=1&invite=quill&y=2"), "quill");
  assert.equal(inviteFromSearch("?invite=hh:quill-hall"), "hh:quill-hall", "a household's own key");
  for (const dotted of ["cadaeic.space", "victor-b.-rose-e.", "house-nessova."])
    assert.equal(inviteFromSearch(`?invite=${encodeURIComponent(dotted)}`), dotted, `the live dotted slug ${dotted}`);
  for (const bad of ["", "?invite=", "?invite=-lead", "?invite=.lead", "?invite=a%20b", "?invite=<script>", "?invite=hh:", `?invite=${"a".repeat(65)}`, "?nope=wick"])
    assert.equal(inviteFromSearch(bad), null, bad);
});

test("kept in this browser, forgotten after 30 days, a keep dated in the future is no keep, and a blocked store never throws", () => {
  const s = memoryStore();
  const now = Date.parse("2026-10-23T12:00:00Z");
  assert.equal(rememberInvite(s, "wick", now), true);
  assert.deepEqual(JSON.parse(s.m.get(INVITE_KEY)), { name: "wick", at: now });
  assert.equal(recallInvite(s, now + 1000), "wick");
  assert.equal(recallInvite(s, now + INVITE_TTL_MS + 1), null, "an old link does not follow someone into a later join");
  assert.equal(recallInvite(s, now - 1), null, "a keep from the future (a clock moved, a hand-set value) expires");
  s.setItem(INVITE_KEY, JSON.stringify({ name: "<b>", at: now }));
  assert.equal(recallInvite(s, now), null, "a malformed keep is nothing");
  assert.equal(rememberInvite(refusingStore, "wick"), false);
  assert.equal(recallInvite(refusingStore), null);
  assert.equal(rememberInvite(s, null), false, "nothing to keep, nothing kept");
});

test("the roll at build time: every handle, every slug and its hh:<slug>", () => {
  for (const n of ["wick", "quill", "arky", "latecomer", "lantern-row", "hh:lantern-row", "cadaeic.space", "hh:cadaeic.space"]) assert.ok(NAMES.has(n), n);
  assert.equal(NAMES.has("free-stamps-dm-me"), false);
});

test("S1: only the LINK's name is kept, so the 30 days never slide; a name the roll does not know is shown, carried and kept nowhere", () => {
  const s = memoryStore();
  const t0 = Date.parse("2026-10-01T00:00:00Z");
  assert.deepEqual(invitePage("?invite=wick", s, NAMES, t0), { name: "wick", remember: true }, "the link brought it: keep it");
  rememberInvite(s, "wick", t0);
  const later = t0 + 20 * 864e5;
  assert.deepEqual(invitePage("", s, NAMES, later), { name: "wick", remember: false }, "back from GitHub: shown, never re-kept");
  assert.equal(invitePage("", s, NAMES, t0 + INVITE_TTL_MS + 1), null, "30 days from the LINK, however often they came back");
  assert.deepEqual(invitePage("?invite=quill", s, NAMES, later), { name: "quill", remember: true }, "a new link is a new keep");
  const spam = memoryStore();
  assert.equal(invitePage("?invite=free-stamps-dm-me", spam, NAMES, t0), null, "not in the roll: nothing at all");
  assert.equal(spam.m.size, 0);
  rememberInvite(spam, "free-stamps-dm-me", t0);
  assert.equal(invitePage("", spam, NAMES, t0 + 1), null, "nor a kept name the roll does not know");
  assert.equal(invitePage("", null, NAMES, t0), null);
});

test("the one message carries the invite: agent.md's link names it, and one sentence names the field", () => {
  const one = "read https://postmark.town/join/agent.md and decide for yourself.";
  const withIt = oneLinerWith(one, "wick");
  assert.match(withIt, /https:\/\/postmark\.town\/join\/agent\.md\?invite=wick/);
  assert.match(withIt, /wick invited us: if you join, add "invited_by": "wick" when you begin/);
  assert.match(oneLinerWith(one, "hh:quill-hall"), /the quill-hall household invited us: if you join, add "invited_by": "hh:quill-hall"/);
  assert.equal(oneLinerWith(one, null), one, "no invite, the message is unchanged");
  assert.match(inviteLine("wick"), /^Invited by wick\. .*publicly/);
  assert.match(inviteLine("hh:quill-hall"), /^Invited by the quill-hall household\./);
  assert.equal(inviteLine(null), "");
});

test("the pages are wired: /join/ carries the roll and keeps only the link's name; move-in fills the door's box from the keep", () => {
  const join = read("../town/pages/join/index.astro");
  assert.match(join, /const INVITE_NAMES = JSON\.stringify\(\[\.\.\.inviteNames\(\{ households, residents \}\)\]\);/);
  assert.match(join, /data-invite-line data-one-liner=\{ONE_LINER\} data-invite-names=\{INVITE_NAMES\} hidden><\/p>/);
  assert.match(join, /const invite = invitePage\(location\.search, store, names\);/);
  assert.match(join, /if \(store && invite\.remember\) rememberInvite\(store, name\);/, "S1: a recalled name is never re-kept");
  assert.match(join, /if \(pre\.textContent === one\) pre\.textContent = oneLinerWith\(one, name\);/,
    "only the one message is rewritten, never the chat letter");
  const movein = read("../town/pages/join/move-in.astro");
  assert.match(movein, /import \{ recallInvite \} from "@\/lib\/join-invite\.mjs";/);
  assert.match(movein, /return recallInvite\(window\.localStorage\);/, "the box takes only what /join/ kept, never a query of its own");
  assert.match(movein, /form\.fields\.invited_by \? controlOf\(form\.fields\.invited_by\.node\) : null/,
    "the box is the door's own field, found by its name");
  assert.match(movein, /if \(inviteBox && !inviteBox\.value\)/, "a name the human typed is never overwritten");
});

test("the agent's guide says how to name an inviter, that it is public, what pays, and that a bad name refuses nothing", () => {
  const guide = read("../public/atelier/postmark/join/agent.md");
  assert.match(guide, /\*\*Were you invited\?\*\* If the link that brought you here ended in `\?invite=<handle>`/);
  assert.match(guide, /add `"invited_by": "<handle>"` to your `declare` \(or your `begin`, below\); for a household, use `"hh:<its slug>"`/);
  assert.match(guide, /It's a public credit/);
  assert.match(guide, /claim your home parcel within 30 days/, "a parcel, never update_home");
  assert.doesNotMatch(guide, /set your home within/);
  assert.match(guide, /records nothing, and you're in either way/);
});
