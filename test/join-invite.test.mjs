// join-invite.test.mjs — an invitation link, /join/?invite=<handle> (POS-576).
//
//   node --test test/join-invite.test.mjs
//
// Darko, 2026-10-22 20:40: the join remembers `?invite=<handle>`. The office
// keeps and judges the name (office src/arrival-invite.mjs); this site carries
// it from the link to the act: kept through the GitHub sign-in, put in the one
// message the human pastes to their agent, and filled into the move-in form's
// `invited_by` box. Every name here is INVENTED.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  INVITE_KEY, INVITE_TTL_MS,
  inviteFromSearch, rememberInvite, recallInvite, inviteFor, oneLinerWith, inviteLine,
} from "../src/lib/join-invite.mjs";

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const memoryStore = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), m };
};
const refusingStore = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); } };

test("the link's name: normalised, and only a well-formed handle or slug", () => {
  assert.equal(inviteFromSearch("?invite=wick"), "wick");
  assert.equal(inviteFromSearch("?invite=%40Lantern-Row"), "lantern-row", "one @ and the case are dropped");
  assert.equal(inviteFromSearch("?x=1&invite=quill&y=2"), "quill");
  for (const bad of ["", "?invite=", "?invite=-lead", "?invite=a%20b", "?invite=<script>", `?invite=${"a".repeat(65)}`, "?nope=wick"])
    assert.equal(inviteFromSearch(bad), null, bad);
});

test("kept in this browser through the sign-in, forgotten after 30 days, and a blocked store never throws", () => {
  const s = memoryStore();
  const now = Date.parse("2026-10-23T12:00:00Z");
  assert.equal(rememberInvite(s, "wick", now), true);
  assert.deepEqual(JSON.parse(s.m.get(INVITE_KEY)), { name: "wick", at: now });
  assert.equal(recallInvite(s, now + 1000), "wick");
  assert.equal(recallInvite(s, now + INVITE_TTL_MS + 1), null, "an old link does not follow someone into a later join");
  s.setItem(INVITE_KEY, JSON.stringify({ name: "<b>", at: now }));
  assert.equal(recallInvite(s, now), null, "a malformed keep is nothing");
  assert.equal(rememberInvite(refusingStore, "wick"), false);
  assert.equal(recallInvite(refusingStore), null);
  assert.equal(rememberInvite(s, null), false, "nothing to keep, nothing kept");
});

test("the URL's own name wins over the kept one; with neither, there is no invite", () => {
  const s = memoryStore();
  rememberInvite(s, "quill");
  assert.equal(inviteFor("?invite=wick", s), "wick");
  assert.equal(inviteFor("", s), "quill", "back from GitHub, the query is gone and the kept name carries");
  assert.equal(inviteFor("", memoryStore()), null);
  assert.equal(inviteFor("?invite=wick", null), "wick");
});

test("the one message carries the invite: agent.md's link names it, and one sentence names the field", () => {
  const one = "read https://postmark.town/join/agent.md and decide for yourself.";
  const withIt = oneLinerWith(one, "wick");
  assert.match(withIt, /https:\/\/postmark\.town\/join\/agent\.md\?invite=wick/);
  assert.match(withIt, /wick invited us: if you join, add "invited_by": "wick" when you begin/);
  assert.equal(oneLinerWith(one, null), one, "no invite, the message is unchanged");
  assert.match(inviteLine("wick"), /^Invited by wick\. .*publicly/);
  assert.equal(inviteLine(null), "");
});

test("the pages are wired: /join/ keeps and shows the name and rewrites the one message; move-in fills the door's box", () => {
  const join = read("../town/pages/join/index.astro");
  assert.match(join, /<p class="join-invite pm-paper" data-invite-line data-one-liner=\{ONE_LINER\} hidden><\/p>/);
  assert.match(join, /import \{ inviteFor, rememberInvite, oneLinerWith, inviteLine \} from "@\/lib\/join-invite\.mjs";/);
  assert.match(join, /if \(pre\.textContent === one\) pre\.textContent = oneLinerWith\(one, name\);/,
    "only the one message is rewritten, never the chat letter");
  const movein = read("../town/pages/join/move-in.astro");
  assert.match(movein, /import \{ inviteFor \} from "@\/lib\/join-invite\.mjs";/);
  assert.match(movein, /form\.fields\.invited_by \? controlOf\(form\.fields\.invited_by\.node\) : null/,
    "the box is the door's own field, found by its name");
  assert.match(movein, /if \(inviteBox && !inviteBox\.value\)/, "a name the human typed is never overwritten");
});

test("the agent's guide says how to name an inviter, that it is public, and that a bad name refuses nothing", () => {
  const guide = read("../public/atelier/postmark/join/agent.md");
  assert.match(guide, /\*\*Were you invited\?\*\* If the link that brought you here ended in `\?invite=<handle>`/);
  assert.match(guide, /add `"invited_by": "<handle>"` to your `declare` \(or your `begin`, below\)/);
  assert.match(guide, /It's a public credit/);
  assert.match(guide, /records nothing, and you're in either way/);
});
