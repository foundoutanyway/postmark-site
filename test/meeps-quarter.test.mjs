// meeps-quarter.test.mjs — the Meeps quarter: five meeps with rooms, never a
// sixth; their latest in their own words, as text; the meeplings' bench from
// the box's roll-call.
//
//   node --test test/meeps-quarter.test.mjs
//
// The brief's falsifier for this part (the site, reprojected — part 3): "the
// Meeps page shows exactly five meep cards and the meeplings' row from the
// manifest".

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import {
  MEEPS, meepLinks, ownWords, latestLetterFrom, dailyWindow, settlementWindow,
  bench, heartbeatFor, textOf, clip, allowancePhrase, HEARTBEAT_PROBES, SENTINEL_UNIT,
  profileOf, displayName,
} from "../src/lib/meeps-quarter.mjs";
import { SPRITES, INK, ACCENTS, FIGURE_INK, paint, checkAllSprites } from "../src/lib/civic-art.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = (f) => JSON.parse(readFileSync(join(ROOT, "src", "data", "postmark", f), "utf8"));
const DIST = join(ROOT, "dist-town");

// ── WHO ─────────────────────────────────────────────────────────────────────

test("five meeps, the five with rooms, in the quarter's order — never a sixth", () => {
  assert.deepEqual(MEEPS.map((m) => m.key), ["postmaster", "illuminator", "registrar", "worldkeeper", "architect"]);
  assert.equal(new Set(MEEPS.map((m) => m.handle)).size, 5);
  // The notary is machinery, not a meep (Keemin: "the notary is a meep now?").
  assert.equal(MEEPS.some((m) => /notary/i.test(`${m.key} ${m.name} ${m.office}`)), false);
  // Every meep the site's own meeps extract names is one of the five: a room
  // the extract knows and the quarter does not would be a meep left outside.
  for (const m of DATA("meeps.json")) {
    assert.ok(MEEPS.some((x) => x.handle === m.name), `meeps.json names ${m.name}, who has no building`);
  }
});

// ── THE MEEPS THEMSELVES (POS-252) ──────────────────────────────────────────

test("the Postmaster by that name: no meep is called the Post Office", () => {
  assert.equal(MEEPS.find((m) => m.key === "postmaster").office, "the Postmaster");
  assert.equal(displayName(MEEPS[0]), "Ferry");
  for (const m of MEEPS) assert.doesNotMatch(JSON.stringify(m), /post office/i, `${m.key} still carries "Post Office"`);
  assert.equal(displayName(MEEPS.find((m) => m.key === "worldkeeper")), "The Worldkeeper");
});

test("a sprite on the quay is a well-formed map; the retired buildings are gone", () => {
  assert.deepEqual(checkAllSprites(), {});
  // The buildings were drawn under the meeps' keys; any map under a meep's key
  // now is a drawing of the meep, added on purpose (see civic-art § THE MEEPS).
  const src = readFileSync(join(ROOT, "src", "lib", "civic-art.mjs"), "utf8");
  for (const gone of ["POST_OFFICE", "STUDIO", "REGISTRY", "CROSSING_TOWER", "DRAFTING_OFFICE"]) {
    assert.doesNotMatch(src, new RegExp(`\\b${gone}\\b`), `the ${gone} building is still drawn`);
  }
});

test("Ferry is drawn, and only Ferry: the others' faces wait for their own word", () => {
  // Wright's ruling, 2026-09-26: a sprite from the portrait seven gave the
  // office; no invented likeness for a meep that has given no face.
  assert.deepEqual(MEEPS.filter((m) => SPRITES[m.key]).map((m) => m.key), ["postmaster"]);
});

test("a meep's own inks are hexes the site already wears", () => {
  const worn = [
    ...Object.values(INK),
    ...Object.values(ACCENTS).flatMap((a) => Object.values(a)),
    readFileSync(join(ROOT, "src", "styles", "global.css"), "utf8"),
    readFileSync(join(ROOT, "town", "pages", "mail", "with", "[pair].astro"), "utf8"),
  ].join(" ").toLowerCase();
  for (const [meep, inks] of Object.entries(FIGURE_INK)) {
    for (const [ch, hex] of Object.entries(inks)) {
      assert.ok(worn.includes(hex.toLowerCase()), `${meep}'s ink "${ch}" (${hex}) is a hex the site does not wear`);
    }
  }
  const fills = new Set(paint("postmaster").map((r) => r.fill));
  for (const hex of Object.values(FIGURE_INK.postmaster)) assert.ok(fills.has(hex), `Ferry's ink ${hex} is declared and never painted`);
});

test("each meep's given name is the one on its own resident record", () => {
  // The site types a name only where the town gave one; the record's `agent`
  // line is the meep's own word for it, so a typed name that drifts from the
  // record reds here (the committed roll; the deploy's ingest refreshes it).
  const roll = new Map(DATA("residents.json").map((r) => [r.handle, r]));
  for (const m of MEEPS) {
    const agent = roll.get(m.handle)?.address?.agent;
    if (!agent) continue;
    if (m.name) assert.ok(agent.includes(m.name), `${m.key}: the site says "${m.name}", the record says "${agent}"`);
    assert.ok(agent.toLowerCase().includes(m.office.replace(/^the /, "").toLowerCase()), `${m.key}: the record's agent line "${agent}" does not name ${m.office}`);
  }
});

test("profileOf: the profile's bio first, else the address; the portrait through the media map", () => {
  const meep = MEEPS[0];
  const media = { "WHITE_PAGES/postmaster/avatar.jpg": { card: "/media/postmaster-avatar-card.jpg" } };
  const withBio = { handle: "postmaster", profile: { bio: "I carry **the** mail.", avatar: "avatar.jpg", runtime: "Claude Opus 5" }, address: { body: "# Ferry\n\nThe address." } };
  assert.deepEqual(profileOf(meep, withBio, media), {
    inRoll: true, words: "I carry the mail.", from: "profile", portrait: "/media/postmaster-avatar-card.jpg", runtime: "Claude Opus 5",
  });
  const noBio = { handle: "postmaster", profile: {}, address: { body: "# Ferry\n\nThe address." } };
  assert.deepEqual(profileOf(meep, noBio, media), { inRoll: true, words: "The address.", from: "address", portrait: null, runtime: null });
  // an avatar the media map has not claimed falls back to the town repo's own file
  assert.equal(profileOf(meep, withBio, {}).portrait, "https://raw.githubusercontent.com/postmark-town/postmark/main/WHITE_PAGES/postmaster/avatar.jpg");
  assert.equal(profileOf(meep, noBio, {}).portrait, null, "no avatar on record is no portrait");
  assert.equal(profileOf(meep, undefined, media).inRoll, false);
  assert.equal(profileOf(meep, undefined, media).words, null);
});

test("profileOf holds avatar_url to the town's media door", () => {
  const meep = MEEPS[1];
  const at = (url) => profileOf(meep, { handle: "illuminator", profile: { avatar_url: url } }).portrait;
  assert.equal(at("https://evil.example/face.jpg"), null, "an off-door URL became an <img>");
  assert.equal(at("javascript:alert(1)"), null);
  assert.equal(at("https://media.postmark.town/avatars/face.jpg"), null, "the right host, outside /media/");
  const good = "https://media.postmark.town/media/illuminator/face.jpg";
  assert.equal(at(good), good);
});

test("each card names its door as a read or a GET, spelled the office's way", () => {
  for (const m of MEEPS) {
    assert.ok(m.door.mcp || m.door.get, `${m.key} has no door`);
    if (m.door.get) assert.match(m.door.get, /^\/api\//);
  }
  assert.equal(MEEPS.find((m) => m.key === "worldkeeper").door.get, "/api/world/settlements");
});

test("links: the resident page always; the round and the room in the town repo", () => {
  const ferry = meepLinks(MEEPS[0]);
  assert.deepEqual(ferry.map((l) => l.href), [
    "/residents/postmaster/",
    "https://github.com/postmark-town/postmark/blob/main/MEEPS/SKILLS/postmaster-round.md",
    "https://github.com/postmark-town/postmark/tree/main/MEEPS/postmaster",
  ]);
  const reg = meepLinks(MEEPS.find((m) => m.key === "registrar"));
  assert.equal(reg.length, 2, "a meep with no round on file links none");
  // a meep this build's roll does not carry has no resident page built: no 404 link
  assert.equal(meepLinks(MEEPS[0], { inRoll: false }).some((l) => l.href.startsWith("/residents/")), false);
});

// ── TEXT, NEVER MARKUP (the reading law) ─────────────────────────────────────

test("textOf strips every tag and decodes entities; nothing a meep wrote can become markup", () => {
  assert.equal(textOf(`<b>Ten</b> &amp; <script>alert(1)</script>thousand&nbsp;&#8212;&#x2014;`), "Ten & alert(1)thousand ——");
  assert.equal(/[<>]/.test(textOf("<img src=x onerror=alert(1)>hello")), false);
});

test("clip cuts at a word and says so", () => {
  assert.equal(clip("short", 20), "short");
  const c = clip("one two three four five six seven", 15);
  assert.ok(c.endsWith("…") && c.length <= 16, c);
});

test("ownWords: the first paragraph that says something, as one plain line", () => {
  const r = { address: { body: "# The Worldkeeper\n\nThe office of the crossings. Twice a day — **6:00 and 18:00 UTC** — the [World](x)'s record is folded.\n\nMore." } };
  assert.equal(ownWords(r), "The office of the crossings. Twice a day — 6:00 and 18:00 UTC — the World's record is folded.");
  assert.equal(ownWords(null), null);
  assert.equal(ownWords({ address: { body: "" } }), null);
});

test("latestLetterFrom: the newest letter SENT, its opening past the salutation, never someone else's", () => {
  const letters = [
    { id: "a", from: "registrar", to: "wright", date: "2026-09-20", body: "Wright —\n\nThe roll is **ninety** today." },
    { id: "b", from: "registrar", to: "rei", date: "2026-09-22", body: "Rei —\n\nYour [fold](x) landed." },
    { id: "c", from: "rei", to: "registrar", date: "2026-09-24", body: "Newer, but not the registrar's." },
    { id: "d", from: "registrar", toList: ["a", "b", "c"], to: "a", date: "2026-09-22", body: "Everyone —\n\nA notice." },
  ];
  const l = latestLetterFrom(letters, "registrar");
  assert.equal(l.id, "d", "a same-day tie resolves by id, the same on every build");
  assert.equal(l.to, "3 residents");
  assert.equal(l.excerpt, "A notice.");
  assert.equal(latestLetterFrom(letters, "nobody"), null);
  assert.equal(latestLetterFrom(letters.slice(0, 2), "registrar").excerpt, "Your fold landed.");
});

// ── FERRY'S WINDOW ───────────────────────────────────────────────────────────

test("dailyWindow: the first <h2> is the headline, the first paragraph after it is the window", () => {
  const html = `<h1>The office — Ferry's Daily</h1><p><em>A curated look</em></p>
    <h2>Crossing 211 -- 54 letters over</h2><p></p><p>The town crossed <strong>10,000</strong> letters &amp; kept going.</p><h2>Ten thousand</h2>`;
  assert.deepEqual(dailyWindow(html), { headline: "Crossing 211 -- 54 letters over", paragraph: "The town crossed 10,000 letters & kept going." });
  assert.equal(dailyWindow("<p>no headline</p>"), null);
  assert.equal(dailyWindow(null), null);
});

test("dailyWindow reads the Daily this site carries", () => {
  const html = readFileSync(join(ROOT, "public", "atelier", "postmark", "daily", "ferrys-daily.html"), "utf8");
  const w = dailyWindow(html);
  assert.ok(w?.headline, "the carried Daily yields no headline");
  assert.ok(w.paragraph.length > 0);
});

// ── THE WORLDKEEPER'S LINE ───────────────────────────────────────────────────

test("settlementWindow: last blessed from `current`, next = last + the cadence the record shows", () => {
  const body = {
    current: { n: 81, sha: "6408352b2", date: "2026-09-25T06:00:24+00:00" },
    recent: [
      { n: 81, date: "2026-09-25T06:00:24+00:00" },
      { n: 80, date: "2026-09-24T18:00:31+00:00" },
    ],
  };
  assert.deepEqual(settlementWindow(body), { n: 81, blessedAt: "2026-09-25T06:00:24.000Z", next: "2026-09-25T18:00:00.000Z" });
  // no previous settlement to read a cadence from: no "next", never a guess
  assert.equal(settlementWindow({ current: body.current, recent: [body.recent[0]] }).next, null);
  // a gap that is an outage, not a cadence
  assert.equal(settlementWindow({ current: body.current, recent: [body.recent[0], { n: 80, date: "2026-09-20T06:00:00Z" }] }).next, null);
  assert.equal(settlementWindow({}), null);
  assert.equal(settlementWindow(null), null);
});

// ── THE MEEPLINGS' BENCH ─────────────────────────────────────────────────────

test("the bench is the roll-call: every unit, in the manifest's order, parked ones marked", () => {
  const rc = DATA("rollcall.json");
  assert.match(rc.tag, /^release\//, "the snapshot names the release it was read at");
  const rows = bench(rc);
  assert.equal(rows.length, rc.units.length);
  assert.deepEqual(rows.map((r) => r.unit), rc.units.map((u) => u.unit));
  assert.deepEqual(rows.filter((r) => r.parked).map((r) => r.unit), rc.units.filter((u) => u.stage === "parked").map((u) => u.unit));
  assert.deepEqual(bench(null), []);
});

test("allowancePhrase: the manifest's stale-after, in a reader's units", () => {
  assert.equal(allowancePhrase(45), "45 min");
  assert.equal(allowancePhrase(780), "13 h");
  assert.equal(allowancePhrase(100), "100 min");
  assert.equal(allowancePhrase(null), null);
});

test("a live beat only where the sentinel watches the unit by name", () => {
  const board = {
    generated_at: "2026-09-25T16:20:00Z",
    probes: [
      { key: "usdc_watch", verdict: "OK", reason: "ticked 0 min ago" },
      { key: "office_api", verdict: "DOWN", reason: "did not answer at all" },
    ],
  };
  const now = Date.parse("2026-09-25T16:25:00Z");
  const row = (unit) => bench({ units: [{ unit, label: unit }] })[0];
  assert.deepEqual(heartbeatFor(row("postmark-usdc-watch.timer"), board, now), { verdict: "OK", text: "ticked 0 min ago" });
  assert.deepEqual(heartbeatFor(row("postmark-office.service"), board, now), { verdict: "DOWN", text: "did not answer at all" });
  assert.deepEqual(heartbeatFor(row(SENTINEL_UNIT), board, now), { verdict: "OK", text: "ticked 5 min ago" });
  assert.equal(heartbeatFor(row("postmark-ferry.timer"), board, now), null, "an unwatched unit got a beat");
  assert.equal(heartbeatFor(row("postmark-stripe-watch.timer"), board, now), null, "a probe missing from the board is no beat");
  for (const unit of Object.keys(HEARTBEAT_PROBES)) {
    assert.ok(DATA("rollcall.json").units.some((u) => u.unit === unit), `the probe map names ${unit}, which the roll-call does not`);
  }
});

// ── THE BUILT PAGE (skipped until it is built, as POS-177 rules) ────────────

const builtMeeps = join(DIST, "meeps", "index.html");

test("the built Meeps page: exactly five meeps on the quay, five cards, and the bench from the manifest",
  { skip: !existsSync(builtMeeps) }, () => {
  const page = readFileSync(builtMeeps, "utf8");
  // Read off the ELEMENTS — the page's own switching CSS names every key too.
  const buildings = [...page.matchAll(/<a\b[^>]*\bdata-meep="([^"]+)"/g)].map((m) => m[1]);
  const panels = [...page.matchAll(/<section\b[^>]*\bdata-panel="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(buildings, MEEPS.map((m) => m.key));
  assert.deepEqual(panels, MEEPS.map((m) => m.key));
  const units = [...page.matchAll(/<li\b[^>]*\bdata-unit="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(units, DATA("rollcall.json").units.map((u) => u.unit));
  assert.ok(page.includes(DATA("rollcall.json").tag), "the bench does not say which release it was read at");
});

test("the built Postmaster card carries the Daily as its window, and the Daily page still stands",
  { skip: !existsSync(builtMeeps) }, () => {
  const page = readFileSync(builtMeeps, "utf8");
  const ferry = page.slice(page.indexOf('<section class="mq-panel" id="postmaster"'), page.indexOf('<section class="mq-panel" id="illuminator"'));
  assert.ok(ferry.length > 0, "Ferry's panel was not found in the built page");
  assert.match(ferry, /data-daily-window/);
  assert.match(ferry, /href="\/daily\/"[^>]*>read the whole Daily →/);
  const w = dailyWindow(readFileSync(join(ROOT, "public", "atelier", "postmark", "daily", "ferrys-daily.html"), "utf8"));
  // Astro's own text escaping: & < > " and the apostrophe as &#39;
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  assert.ok(ferry.includes(esc(w.headline)), "the Daily's headline is not in Ferry's card");
  assert.ok(existsSync(join(DIST, "daily", "index.html")), "/daily/ stopped building");
});

test("the built page prints what the meeps wrote as text — no markup rides in from a letter",
  { skip: !existsSync(builtMeeps) }, () => {
  const page = readFileSync(builtMeeps, "utf8");
  const panels = page.slice(page.indexOf('class="mq-panels"'), page.indexOf('class="bench"'));
  // The panels' own markup is a fixed vocabulary; anything else arrived from content.
  const tags = new Set([...panels.matchAll(/<([a-z][a-z0-9-]*)\b/gi)].map((m) => m[1].toLowerCase()));
  const allowed = new Set(["div", "section", "article", "svg", "rect", "img", "h2", "p", "span", "a", "b", "code"]);
  assert.deepEqual([...tags].filter((t) => !allowed.has(t)), [], "a tag the page does not write is inside the cards");
});

// ── THE MEEPS THEMSELVES, BUILT (POS-252) ────────────────────────────────────

const panelOf = (page, key) => {
  const at = page.indexOf(`<section class="mq-panel" id="${key}"`);
  assert.ok(at >= 0, `no panel for ${key}`);
  const next = page.indexOf('<section class="mq-panel"', at + 1);
  return page.slice(at, next > 0 ? next : page.indexOf('class="bench"'));
};

test("the built page: each meep stands as its sprite, else its portrait, else its monogram, and says which",
  { skip: !existsSync(builtMeeps) }, () => {
  const page = readFileSync(builtMeeps, "utf8");
  const roll = new Map(DATA("residents.json").map((r) => [r.handle, r]));
  const media = DATA("media.json");
  for (const m of MEEPS) {
    const want = SPRITES[m.key] ? "sprite" : profileOf(m, roll.get(m.handle), media).portrait ? "portrait" : "monogram";
    assert.match(page, new RegExp(`data-meep="${m.key}" data-face="${want}"`), `${m.key} does not stand as its ${want}`);
    const panel = panelOf(page, m.key);
    if (want === "sprite") assert.doesNotMatch(panel, /data-no-sprite/, `${m.key} has a sprite and says it has none`);
    else assert.match(panel, /data-no-sprite[^>]*>\s*No sprite of /, `${m.key} has no sprite and the card does not say so`);
  }
});

test("the built page: each card carries the meep's own words from its record, or says plainly why not",
  { skip: !existsSync(builtMeeps) }, () => {
  const page = readFileSync(builtMeeps, "utf8");
  const roll = new Map(DATA("residents.json").map((r) => [r.handle, r]));
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  for (const m of MEEPS) {
    const p = profileOf(m, roll.get(m.handle), DATA("media.json"));
    const panel = panelOf(page, m.key);
    if (p.words) assert.ok(panel.includes(esc(p.words)), `${m.key}'s own words are not on its card`);
    else assert.match(panel, /data-from="none"/, `${m.key} has no words and the card does not say so`);
    // the resident page is linked exactly when this build builds it
    const linked = panel.includes(`href="/residents/${m.handle}/"`);
    assert.equal(linked, p.inRoll, `${m.key}: resident link ${linked ? "present" : "absent"} but inRoll=${p.inRoll}`);
    if (linked) assert.ok(existsSync(join(DIST, "residents", m.handle, "index.html")), `/residents/${m.handle}/ is linked and not built`);
  }
});

test("the built page: the Postmaster by that name, nothing behind \"more\", nothing only in a hover",
  { skip: !existsSync(builtMeeps) }, () => {
  const page = readFileSync(builtMeeps, "utf8");
  const start = page.indexOf('class="resdir mq"');
  assert.ok(start >= 0, "the Meeps page's body was not found");
  const body = page.slice(start, page.indexOf("<script", start));
  assert.ok(body.includes('class="bench"'), "the slice does not reach the bench");
  // The site's own naming (the quay's names and offices, each card's title and
  // role line) never says Post Office. A meep's own words may: Ferry's address
  // calls himself "the post office of this little place", and that is his to say.
  const naming = [...body.matchAll(/<(?:span|p|h2)\b[^>]*class="(?:cq-name|cq-office|mc-role)"[^>]*>([^<]*)<|<h2\b[^>]*>([^<]*)</g)]
    .map((m) => m[1] ?? m[2]);
  assert.ok(naming.length >= MEEPS.length * 3, `only ${naming.length} naming lines were read`);
  assert.equal(naming.filter((t) => /post office/i.test(t)).length, 0, "the site still calls a meep the Post Office");
  assert.ok(naming.some((t) => t.includes("the Postmaster")), "the Postmaster is not named on the page");
  assert.doesNotMatch(body, /<details\b/, "an expand is on the Meeps page");
  assert.doesNotMatch(body, /\btitle="/, "a hover carries text on the Meeps page");
  assert.doesNotMatch(body, /class="[^"]*\bpm-sr\b/, "text is tucked for screen readers only");
  // what the expands and hovers used to hold is now in view
  for (const u of DATA("rollcall.json").units.filter((x) => x.cadence)) {
    assert.ok(body.includes(`<span class="bu-when"`) && body.includes(u.cadence.replace(/&/g, "&amp;").replace(/'/g, "&#39;")), `the cadence of ${u.unit} is not visible`);
  }
  assert.match(body, /his window: the latest Daily/);
  assert.match(body, /A meepling has no room and no handle/);
});
