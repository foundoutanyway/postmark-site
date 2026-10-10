// bug-cards.test.mjs — the Bug Catcher's page as one card per bug (POS-547).
//
//   node --test test/bug-cards.test.mjs
//
// Darko, 2026-10-09: "one expandable card per bug. Clicking a bug shows what
// stage it's at, who contributed each earlier stage, and where the links lead."
// The read is the office's GET /posts?class=bug with each row's `history`
// (postmark-office#462); the fixture is hand-written in that shape
// (test/fixtures/office-bug-history.json).

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import {
  cardsOf, paintCards, paintLegacy, hallOf, paintHall, CARD_GROUPS, CARDS_FAILED, CARDS_EMPTY, JAR_ART, NOT_YET_PAID, NO_HISTORY,
  LEGACY_LINE, TOWN_HANDS, TOWN_NAMES, HALL_NO_HISTORY, HALL_NO_STAMPS,
} from "../src/lib/bug-strip.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const READ = JSON.parse(readFileSync(join(ROOT, "test", "fixtures", "office-bug-history.json"), "utf8"));
const SRC = readFileSync(join(ROOT, "src", "lib", "bug-strip.mjs"), "utf8");
const card = (board, id) => board.groups.flatMap((g) => g.cards).find((c) => c.id === id);

// A document just big enough for the painter, whose innerHTML refuses.
function stubDoc() {
  const make = (tag) => {
    const el = {
      tagName: tag.toUpperCase(), className: "", dataset: {}, children: [], textContent: "", href: "", rel: "", target: "",
      append(...c) { el.children.push(...c); },
      replaceChildren(...c) { el.children = [...c]; },
    };
    Object.defineProperty(el, "innerHTML", { set() { throw new Error("innerHTML used"); }, get() { return ""; } });
    return el;
  };
  return { createElement: make, root: make("div") };
}
const textOf = (el) => [el.textContent, ...el.children.map(textOf)].filter(Boolean).join(" ");
const find = (el, pred) => (pred(el) ? [el] : []).concat(...el.children.map((c) => find(c, pred)));
const cls = (name) => (e) => e.className.split(" ").includes(name);

test("cardsOf: one card per post; open bugs first by stage, then the ones set aside, shipped last", () => {
  const b = cardsOf(READ);
  assert.equal(b.ok, true);
  assert.equal(b.total, READ.posts.length);
  assert.deepEqual(b.groups.map((g) => [g.key, g.cards.map((c) => c.id)]), [
    ["reported", ["mari/letters-vanish"]],
    ["confirmed", ["vermillion/spotted"]],
    ["reproduced", ["kinofire/stamps-overlap"]],
    ["fixed", ["sage/old-crack"]],
    ["set-aside", ["sage/dupe", "odd/not-one"]],
    ["shipped", ["wildcat/preview-disagrees"]],
  ]);
  assert.deepEqual(CARD_GROUPS.map((g) => g.key).slice(-2), ["set-aside", "shipped"]);
  assert.deepEqual(b.groups.map((g) => g.label), ["Reported", "Spotted", "Reproduced", "Fixed, shipping soon", "Set aside", "Shipped"]);
});

test("cardsOf: the shipped bug's ladder names who did each stage, when, what it paid and where it points; a stage it jumped is skipped", () => {
  const c = card(cardsOf(READ), "wildcat/preview-disagrees");
  assert.deepEqual([c.critter, c.namedBy, c.caught, c.picture], ["the Two-Minded Moth", "lupi", true, "https://media.postmark.town/media/iris/moth-2.png"]);
  assert.deepEqual([c.issue, c.pr, c.release], [
    "https://github.com/postmark-town/postmark/issues/3555",
    "https://github.com/postmark-town/postmark-office/pull/461",
    "https://github.com/postmark-town/postmark-office/releases/tag/release/2026-w42"]);
  assert.deepEqual(c.ladder.map((r) => [r.stage, r.who, r.paid, r.reached, r.skipped, r.day]), [
    ["reported", "wildcat", null, true, false, "Oct 6"],
    ["confirmed", "wildcat", 2, true, false, "Oct 6"],
    ["reproduced", "kogane", 3, true, false, "Oct 6"],
    ["diagnosed", "kogane", 5, true, false, "Oct 7"],
    ["briefed", null, null, true, true, ""],
    ["fixed", "lupi", 25, true, false, "Oct 9"],        // 23:30Z is 19:30 in the town's time
    ["shipped", "Darko", null, true, false, "Oct 11"],   // credits no one: the hand that shipped it, keemin, who is Darko in town
  ]);
  assert.equal(c.ladder[3].link, "https://github.com/postmark-town/postmark/issues/3555#issuecomment-1");
});

test("cardsOf: an open bug's later stages are not reached; a credited stage with no ledger line is unpaid; the reporter's hand is named", () => {
  const b = cardsOf(READ);
  const k = card(b, "kinofire/stamps-overlap");
  assert.deepEqual(k.ladder.map((r) => [r.stage, r.reached, r.who, r.paid]), [
    ["reported", true, "kinofire", null], ["confirmed", true, "kinofire", null], ["reproduced", true, "seven", 3],
    ["diagnosed", false, null, null], ["briefed", false, null, null], ["fixed", false, null, null], ["shipped", false, null, null],
  ]);
  assert.equal(k.caught, false);
  assert.equal(k.critter, null, "an open bug has no name yet");
  const m = card(b, "mari/letters-vanish");
  assert.deepEqual([m.ladder[0].who, m.ladder[0].hand], ["mari", "bugcatcher"]);
});

test("cardsOf: a side exit's ladder ends at its exit, from where it left", () => {
  const b = cardsOf(READ);
  assert.deepEqual(card(b, "sage/dupe").ladder.map((r) => [r.stage, r.who, r.paid]), [["reported", "sage", null], ["confirmed", "sage", 2], ["duplicate", "bugcatcher", null]]);
  assert.deepEqual(card(b, "odd/not-one").ladder.map((r) => r.stage), ["reported", "not-a-bug"]);
  assert.equal(card(b, "odd/not-one").aside, true);
});

test("cardsOf: only the town's own GitHub becomes a link, and only the town's media a picture; markup is text", () => {
  const b = cardsOf(READ);
  const m = card(b, "mari/letters-vanish");
  assert.equal(m.issue, null, "a javascript: issue became a link");
  assert.equal(m.title, "<img src=x onerror=alert(1)> letters vanish");
  const v = card(b, "vermillion/spotted");
  assert.deepEqual(v.ladder.slice(0, 2).map((r) => r.link), [null, null], "a link off the town's org survived");
  const s = card(b, "sage/old-crack");
  assert.deepEqual([s.critter, s.picture], ["<b>Crackle</b>", null]);
});

test("cardsOf: a failed read is a failed read, never an empty one; a read before #462 (no history) says skipped about nothing", () => {
  for (const bad of [null, undefined, {}, { posts: "no" }, "<html>"]) assert.equal(cardsOf(bad).ok, false, `${JSON.stringify(bad)} read as cards`);
  assert.deepEqual(cardsOf({ ...READ, posts: [] }), { ok: true, groups: [], legacy: [], total: 0, caught: 0 });
  const old = cardsOf({ ...READ, posts: READ.posts.map(({ history, ...p }) => p) });
  assert.equal(old.total, READ.posts.length);
  const w = card(old, "wildcat/preview-disagrees");
  assert.deepEqual(w.ladder.map((r) => [r.reached, r.skipped, r.who]), Array(7).fill([true, false, null]));
});

test("paintCards: each bug is one <details>; its summary is the jar's slot, the title, the reporter and the stage", () => {
  const doc = stubDoc();
  paintCards(doc.root, cardsOf(READ), doc);
  const cards = find(doc.root, (e) => e.tagName === "DETAILS");
  assert.equal(cards.length, READ.posts.length);
  assert.deepEqual(cards.map((d) => d.dataset.post), ["mari/letters-vanish", "vermillion/spotted", "kinofire/stamps-overlap", "sage/old-crack", "sage/dupe", "odd/not-one", "wildcat/preview-disagrees"]);
  for (const d of cards) assert.equal(d.children[0].tagName, "SUMMARY");
  const sum = (id) => cards.find((d) => d.dataset.post === id).children[0];
  assert.equal(find(sum("kinofire/stamps-overlap"), cls("bc-img"))[0].src, JAR_ART.open);
  assert.equal(textOf(find(sum("kinofire/stamps-overlap"), cls("bc-name"))[0]), "?");
  assert.match(textOf(sum("kinofire/stamps-overlap")), /Quest standings overlap at mobile width reported by kinofire Reproduced/);
  assert.equal(find(sum("wildcat/preview-disagrees"), cls("bc-img"))[0].src, "https://media.postmark.town/media/iris/moth-2.png");
  assert.equal(textOf(find(sum("sage/old-crack"), cls("bc-name"))[0]), "<b>Crackle</b>", "a critter's markup is not text");
  assert.match(textOf(doc.root), /Spotted · 1/);
  assert.doesNotMatch(SRC.slice(SRC.indexOf("export function paintCards")), /innerHTML|insertAdjacentHTML|outerHTML/);
});

test("paintCards: the expanded card lists every stage's credit, day, stamps and link; unreached stages say not yet", () => {
  const doc = stubDoc();
  paintCards(doc.root, cardsOf(READ), doc);
  const w = find(doc.root, (e) => e.tagName === "DETAILS" && e.dataset.post === "wildcat/preview-disagrees")[0];
  const steps = find(w, cls("bc-step"));
  assert.deepEqual(steps.map((s) => textOf(s).replace(/\s+/g, " ")), [
    "Reported wildcat Oct 6",
    "Spotted wildcat Oct 6 +2 ✦",
    "Reproduced kogane Oct 6 +3 ✦",
    "Diagnosed kogane Oct 7 +5 ✦ the cause →",
    "Briefed skipped",
    "Fixed lupi Oct 9 +25 ✦ the PR →",
    "Shipped Darko Oct 11 the release →",
  ]);
  assert.ok(steps.at(-1).className.includes("is-now"));
  assert.deepEqual(find(w, (e) => e.tagName === "A").map((a) => [a.textContent, a.href]).slice(-3), [
    ["issue #3555 →", "https://github.com/postmark-town/postmark/issues/3555"],
    ["the PR →", "https://github.com/postmark-town/postmark-office/pull/461"],
    ["the release →", "https://github.com/postmark-town/postmark-office/releases/tag/release/2026-w42"],
  ]);
  assert.match(textOf(w), /named by lupi, who fixed it/);
  const k = find(doc.root, (e) => e.tagName === "DETAILS" && e.dataset.post === "kinofire/stamps-overlap")[0];
  assert.deepEqual(find(k, cls("bc-step")).map((s) => textOf(s).replace(/\s+/g, " ")).slice(1), [
    "Spotted kinofire Oct 8 not yet paid", "Reproduced seven Oct 8 +3 ✦", "Diagnosed not yet", "Briefed not yet", "Fixed not yet", "Shipped not yet"]);
  const m = find(doc.root, (e) => e.tagName === "DETAILS" && e.dataset.post === "mari/letters-vanish")[0];
  assert.match(textOf(m), /mari\s+· put up by bugcatcher/);
  // every ✦ sits in a stamp element
  for (const star of find(doc.root, (e) => e.textContent === "✦")) assert.equal(star.className, "m-u");
});

test("paintCards: a failed read says so, and an empty town says something else", () => {
  const failed = stubDoc();
  paintCards(failed.root, cardsOf(null), failed);
  assert.equal(textOf(failed.root), CARDS_FAILED);
  const empty = stubDoc();
  paintCards(empty.root, cardsOf({ ...READ, posts: [] }), empty);
  assert.equal(textOf(empty.root), CARDS_EMPTY);
  assert.notEqual(CARDS_FAILED, CARDS_EMPTY);
});

// ── The legacy shelf (POS-558, Darko 2026-10-10) ─────────────────────────────
// Supersedes the 09-29 review's "unnamed": a finished bug with no name leaves
// the jar for its own shelf, crediting the resident who caught it.

const LEGACY = [
  { class: "bug", id: "kogane/refused-claim", title: "A refused claim was not legible", author: "kogane", state: "shipped",
    fields: { issue: "https://github.com/postmark-town/postmark/issues/2858" },
    history: [
      { stage: "reported", at: "2026-09-20T10:00:00.000Z", hand: null, credit: "kogane", link: null, stamps_paid: null },
      { stage: "shipped", at: "2026-09-21T10:00:00.000Z", hand: "keemin", credit: null, link: null, stamps_paid: null },
    ] },
  { class: "bug", id: "odd/fixed-before-names", title: "Fixed before the jar", author: "keemin", state: "fixed", fields: { size: "S" }, history: [] },
];
const WITH_LEGACY = { ...READ, posts: [...READ.posts, ...LEGACY] };

test("cardsOf: a finished bug with no name leaves the jar for the legacy shelf; a named one stays in the jar", () => {
  const b = cardsOf(WITH_LEGACY);
  assert.deepEqual(b.legacy.map((c) => c.id), ["kogane/refused-claim", "odd/fixed-before-names"]);
  const jar = b.groups.flatMap((g) => g.cards.map((c) => c.id));
  assert.ok(!jar.includes("kogane/refused-claim") && !jar.includes("odd/fixed-before-names"), "a legacy bug is still in the jar");
  assert.ok(jar.includes("wildcat/preview-disagrees") && jar.includes("sage/old-crack"), "a named bug left the jar");
  assert.equal(b.total, WITH_LEGACY.posts.length);
  assert.equal(b.caught, 2, "the jar's caught count holds only the named");
  assert.deepEqual(cardsOf(READ).legacy, []);
});

test("paintLegacy: the same cards, each crediting its catcher by name and linking its issue; 'unnamed' is printed nowhere", () => {
  const board = cardsOf(WITH_LEGACY);
  const shelf = stubDoc();
  assert.equal(paintLegacy(shelf.root, board, shelf), true);
  const cards = find(shelf.root, (e) => e.tagName === "DETAILS");
  assert.deepEqual(cards.map((d) => d.dataset.post), ["kogane/refused-claim", "odd/fixed-before-names"]);
  for (const d of cards) assert.equal(d.children[0].tagName, "SUMMARY");
  const k = cards[0];
  assert.match(textOf(k.children[0]), /A refused claim was not legible caught by kogane Shipped/);
  assert.equal(find(k, cls("bc-name")).length, 0, "a legacy card shows a name slot");
  assert.equal(find(k, cls("bc-img"))[0].src, JAR_ART.finished);
  assert.deepEqual(find(k, (e) => e.tagName === "A").map((a) => a.href), ["https://github.com/postmark-town/postmark/issues/2858"]);
  assert.match(textOf(cards[1]), /caught by Darko/);
  const jar = stubDoc();
  paintCards(jar.root, board, jar);
  for (const root of [shelf.root, jar.root]) assert.doesNotMatch(textOf(root), /unnamed/i);
  assert.doesNotMatch(SRC.replace(/^\s*\/\/.*$/gm, ""), /"unnamed"|bc-unnamed/, "the code still prints unnamed");
  assert.match(LEGACY_LINE, /spotted before the Bug Catcher's jar existed/);
  assert.match(LEGACY_LINE, /credit the residents who caught them/);
});

test("paintLegacy: nothing on the shelf (or a failed read) answers false, so the page keeps the shelf hidden", () => {
  for (const board of [cardsOf(READ), cardsOf(null)]) {
    const doc = stubDoc();
    assert.equal(paintLegacy(doc.root, board, doc), false);
    assert.equal(doc.root.children.length, 0);
  }
});

// ── The Bug Catchers' Hall of Fame (POS-558, Darko 2026-10-10) ───────────────

test("hallOf: residents by the stamps paid to them on bug stages, from the same read; ties share a rank; unpaid catchers below, by bugs", () => {
  const h = hallOf(READ);
  assert.deepEqual([h.ok, h.known, h.stamps], [true, true, true]);
  assert.deepEqual(h.ranked.map((r) => [r.rank, r.name, r.stamps, r.bugs]), [
    [1, "lupi", 25, 1],
    [2, "sage", 12, 2],          // 10 for the fix, 2 for the duplicate's paid confirm
    [3, "kogane", 8, 1],         // 3 + 5 on one bug
    [4, "seven", 3, 1],
    [5, "vermillion", 2, 1],
    [5, "wildcat", 2, 1],
  ]);
  // credited, no stamps paid: kinofire's confirm is not yet paid, mari only reported
  assert.deepEqual(h.also.map((r) => [r.name, r.stamps, r.bugs]), [["kinofire", 0, 1], ["mari", 0, 1]]);
  // odd's report was ruled not a bug and paid nothing: it credits no one
  assert.ok(![...h.ranked, ...h.also].some((r) => r.handle === "odd"));
});

test("hallOf: the town's hands are never ranked: the meeps, and the founders' hands (keemin, keeminlee, wright)", () => {
  for (const hand of ["bugcatcher", "postmaster", "illuminator", "registrar", "worldkeeper", "architect", "keemin", "keeminlee", "wright"]) assert.ok(TOWN_HANDS.has(hand), hand);
  const hands = [...TOWN_HANDS].map((hand, i) => ({ class: "bug", id: `${hand}/own-${i}`, title: "a hand's own bug", author: hand, state: "shipped",
    fields: { critter: "Hand Moth", named_by: hand },
    history: [
      { stage: "reported", at: "2026-10-09T10:00:00.000Z", hand: null, credit: hand, link: null, stamps_paid: null },
      { stage: "fixed", at: "2026-10-09T11:00:00.000Z", hand: "wright", credit: hand, link: null, stamps_paid: 50 },
    ] }));
  const h = hallOf({ ...READ, posts: [...READ.posts, ...hands] });
  const listed = [...h.ranked, ...h.also].map((r) => r.handle);
  for (const hand of TOWN_HANDS) assert.ok(!listed.includes(hand), `${hand} is on the Hall`);
  assert.deepEqual(h.ranked.map((r) => r.name), hallOf(READ).ranked.map((r) => r.name));
});

test("hallOf: a legacy catcher still appears, below the paid rows, with bugs credited and no stamps", () => {
  const h = hallOf(WITH_LEGACY);
  const kogane = h.ranked.find((r) => r.handle === "kogane");
  assert.deepEqual([kogane.stamps, kogane.bugs], [8, 2], "the legacy bug is not counted among kogane's");
  const more = { ...WITH_LEGACY, posts: [...WITH_LEGACY.posts, { ...LEGACY[0], id: "ellery/old-one", author: "ellery",
    history: LEGACY[0].history.map((r) => (r.stage === "reported" ? { ...r, credit: "ellery" } : r)) }] };
  const e = hallOf(more).also.find((r) => r.handle === "ellery");
  assert.deepEqual([e.stamps, e.bugs], [0, 1]);
});

test("hallOf: a read with no history says so (not an empty board); a read whose chain is unavailable lists by bugs and says the stamps can't be read", () => {
  for (const history of [undefined, []]) {
    const h = hallOf({ ...READ, posts: READ.posts.map((p) => ({ ...p, history })) });
    assert.deepEqual([h.ok, h.known, h.ranked.length, h.also.length], [true, false, 0, 0]);
    const doc = stubDoc();
    assert.equal(paintHall(doc.root, h, doc), true);
    assert.equal(textOf(doc.root), HALL_NO_HISTORY);
    assert.equal(find(doc.root, (e) => e.tagName === "OL").length, 0);
  }
  const none = { ...READ, unavailable: "the store has no stamp chain yet", posts: READ.posts.map((p) => ({ ...p, history: p.history.map((r) => ({ ...r, stamps_paid: null })) })) };
  const h = hallOf(none);
  assert.deepEqual([h.stamps, h.ranked.length], [false, 0]);
  // every catcher holds one bug here (sage's duplicate paid nothing now, so it credits no one), so by name
  assert.deepEqual(h.also.map((r) => [r.name, r.bugs]), ["kinofire", "kogane", "lupi", "mari", "sage", "seven", "vermillion", "wildcat"].map((n) => [n, 1]));
  const doc = stubDoc();
  paintHall(doc.root, h, doc);
  assert.equal(textOf(find(doc.root, cls("hof-note"))[0]), HALL_NO_STAMPS);
  assert.doesNotMatch(textOf(doc.root), /✦/);
  const failed = stubDoc();
  assert.equal(paintHall(failed.root, hallOf(null), failed), false, "a failed read draws a Hall");
});

test("paintHall: each row is the name, the stamps (purple) and the bugs credited; Darko is never 'keemin'", () => {
  const doc = stubDoc();
  assert.equal(paintHall(doc.root, hallOf(WITH_LEGACY), doc), true);
  const rows = find(doc.root, cls("hof-row")).map((r) => textOf(r).replace(/\s+/g, " "));
  assert.deepEqual(rows, [
    "1 lupi 25 ✦ 1 bug", "2 sage 12 ✦ 2 bugs", "3 kogane 8 ✦ 2 bugs", "4 seven 3 ✦ 1 bug", "5 vermillion 2 ✦ 1 bug", "5 wildcat 2 ✦ 1 bug",
    "kinofire 1 bug", "mari 1 bug",
  ]);
  assert.match(textOf(doc.root), /Also credited/);
  for (const star of find(doc.root, (e) => e.textContent === "✦")) assert.equal(star.className, "m-u");
  assert.doesNotMatch(textOf(doc.root), /keemin/i);
  assert.equal(TOWN_NAMES.keemin, "Darko");
});

// ── Wright's review of #462 (2026-10-09) ─────────────────────────────────────

test("Darko's hand reads Darko: 'keemin' is printed nowhere on the cards, as hand, credit, reporter or namer", () => {
  const read = { ...READ, posts: [
    ...READ.posts,
    { class: "bug", id: "keemin/founders-own", title: "The founder's own bug", author: "keemin", state: "fixed",
      fields: { size: "S", critter: "Ledger Louse", named_by: "keemin" },
      history: [
        { stage: "reported", at: "2026-10-09T10:00:00.000Z", hand: "keemin", credit: "keemin", link: null, stamps_paid: null },
        { stage: "fixed", at: "2026-10-09T11:00:00.000Z", hand: "keemin", credit: "keemin", link: null, stamps_paid: null },
      ] },
  ] };
  const doc = stubDoc();
  paintCards(doc.root, cardsOf(read), doc);
  const all = textOf(doc.root);
  assert.doesNotMatch(all, /keemin/i, "the page prints 'keemin'");
  const k = find(doc.root, (e) => e.tagName === "DETAILS" && e.dataset.post === "keemin/founders-own")[0];
  assert.match(textOf(k), /reported by Darko/);
  assert.match(textOf(k), /named by Darko, who fixed it/);
  assert.match(textOf(k), /Fixed Darko Oct 9 not yet paid/);
});

test("a null stamps_paid is never 0: a credited paying stage reads 'not yet paid', a stage that pays nothing reads nothing", () => {
  assert.equal(NOT_YET_PAID, "not yet paid");
  const doc = stubDoc();
  paintCards(doc.root, cardsOf(READ), doc);
  const stamps = find(doc.root, cls("bc-stamps")).map(textOf);
  assert.ok(!stamps.some((t) => /(^|\D)0(\D|$)/.test(t)), `a stamp cell reads 0: ${stamps.join(" | ")}`);
  const ship = find(doc.root, (e) => e.tagName === "DETAILS" && e.dataset.post === "wildcat/preview-disagrees")[0];
  assert.equal(textOf(find(ship, (e) => cls("bc-step")(e) && e.dataset.stage === "shipped")[0].children[3]), "", "shipped pays nothing, so it says nothing");
});

test("a card whose read carries no history (or an empty one) says so once, and claims no skips and no names", () => {
  for (const history of [undefined, []]) {
    const read = { ...READ, posts: READ.posts.map((p) => ({ ...p, history })) };
    const doc = stubDoc();
    paintCards(doc.root, cardsOf(read), doc);
    const w = find(doc.root, (e) => e.tagName === "DETAILS" && e.dataset.post === "wildcat/preview-disagrees")[0];
    assert.equal(find(w, cls("bc-note")).length, 1);
    assert.equal(textOf(find(w, cls("bc-note"))[0]), NO_HISTORY);
    assert.doesNotMatch(textOf(w), /skipped|not yet paid/);
    assert.equal(find(w, cls("bc-handle")).length, 0, "a name with no history behind it");
    assert.ok(find(w, cls("bc-step")).every((r) => r.className.includes("is-reached")), "a shipped bug's stages all read reached");
  }
  const doc = stubDoc();
  paintCards(doc.root, cardsOf(READ), doc);
  assert.equal(find(doc.root, cls("bc-note")).length, 0, "a card with history says it has none");
});
