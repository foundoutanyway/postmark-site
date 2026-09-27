// join-funnel.test.mjs — the join, one question at a time (POS-275). 2026-09-27.
//
//   node --test test/join-funnel.test.mjs
//
// WHAT THIS FILE IS FOR. Keemin asked for the join as a funnel: big type, one
// question filling the screen, Enter continues, Back works. The law under it
// is POS-188's and the move-in page's: the site owns no form. So the field
// screens here are the office's generator's own nodes, one at a time, and these
// tests RUN THE COPIED GENERATOR (as test/join-move-in.test.mjs does) and ask
// the funnel's decisions of the form it really builds. A regex over the page
// could not say "the steps are the generator's order".
//
// Every assertion here can fail; the ones that guard a law say which.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

import { fieldsFor, missingRequired, controlOf } from "../src/lib/join-move-in.mjs";
import {
  LANE_SCREENS, laneScreen, laneProgress, laneParent, dots,
  fieldSteps, fieldOfStep, hashForStep, stepFromHash, stepOfField,
  continueLabel, isRequired, isPresent, missingHere,
  enterContinues, enterHint, labelOf, reviewRows,
} from "../src/lib/join-funnel.mjs";

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const PROTO = read("../public/atelier/postmark/join/move-in/mcp-proto.js");
const JOIN = read("../town/pages/join/index.astro");
const MOVEIN = read("../town/pages/join/move-in.astro");
const FUNNEL = read("../src/components/JoinFunnel.astro");
const CSS = read("../src/styles/join-funnel.css");

// the door's `declare` card after office PR #172 — the same shape
// test/join-move-in.test.mjs pins, trimmed to what the funnel reads
const DECLARE = {
  read: "declare",
  card: {
    act: "declare",
    teaches: "Found your household at the door.",
    fields: {
      household: { type: "string", title: "Household name", "x-group": "household", "x-group-title": "The household", "x-multiline": false, examples: ["Starforge"], description: "The name your house goes by in town.", required: true },
      handle: { type: "string", title: "Handle", "x-group": "resident", "x-group-title": "The resident", "x-multiline": false, examples: ["wright"], description: "The address letters go to.", required: true },
      card: { type: "string", title: "Address Card", "x-group": "resident", "x-multiline": true, description: "The body of their ADDRESS.md.", required: true },
      agent: { type: "string", title: "Agent's name", "x-group": "resident", "x-multiline": false, description: "Their name, as they are called at home." },
      since: { type: "string", title: "Since", "x-group": "resident", "x-multiline": false, description: "YYYY-MM-DD." },
    },
  },
};

// the smallest document the generator can build into (as in join-move-in.test.mjs)
function makeDocument() {
  const node = (tag) => {
    const el = {
      tag, tagName: String(tag).toUpperCase(),
      className: "", hidden: false, value: "", placeholder: "",
      attrs: Object.create(null), listeners: Object.create(null), children: [], style: {}, _text: "",
      appendChild(c) { el.children.push(c); return c; },
      removeChild(c) { const i = el.children.indexOf(c); if (i >= 0) el.children.splice(i, 1); return c; },
      replaceChild(n, o) { const i = el.children.indexOf(o); if (i >= 0) el.children[i] = n; return o; },
      insertBefore(n, r) { const i = el.children.indexOf(r); if (i >= 0) el.children.splice(i, 0, n); else el.children.push(n); return n; },
      addEventListener(n, fn) { (el.listeners[n] || (el.listeners[n] = [])).push(fn); },
      setAttribute(k, v) { el.attrs[k] = String(v); },
      getAttribute(k) { return k in el.attrs ? el.attrs[k] : null; },
      focus() {},
      get firstChild() { return el.children[0] ?? null; },
      get textContent() { return el._text + el.children.map((c) => c.textContent).join(""); },
      set textContent(v) { el._text = String(v); el.children.length = 0; },
    };
    return el;
  };
  return { createElement: node, readyState: "complete", addEventListener() {} };
}
function buildDeclare() {
  const window = { MCP_PROTO_MANUAL: true };
  vm.runInContext(PROTO, vm.createContext({ window, document: makeDocument() }), { filename: "mcp-proto.js" });
  const P = window.MCPProto;
  const picked = fieldsFor(DECLARE, null);
  return { form: P._internals.buildForm(P._internals.fieldsSchema(picked.fields)), fields: picked.fields };
}
const put = (form, name, v) => { controlOf(form.fields[name].node).value = v; };
const plain = (v) => JSON.parse(JSON.stringify(v));

// ── 1. the steps are the generator's ─────────────────────────────────────────

test("the move-in road is the act's opening, one step per field IN THE GENERATOR'S ORDER, then review", () => {
  // CAN FAIL: hand-list the fields in the lib, or sort them, and the order
  // stops being the door's. The names come off form.names and nowhere else.
  const { form } = buildDeclare();
  const steps = fieldSteps(form);
  assert.deepEqual(plain(steps), ["intro", ...plain(form.names).map((n) => "field:" + n), "review"]);
  assert.deepEqual(plain(form.names), Object.keys(DECLARE.card.fields), "the generator kept the door's order");
  assert.equal(fieldOfStep("field:card"), "card");
  assert.equal(fieldOfStep("intro"), null);
  assert.equal(fieldOfStep("review"), null);
  assert.equal(stepOfField("handle", steps), 2);
  assert.equal(stepOfField("nope", steps), null);
});

test("a field the office grows tomorrow is a screen tomorrow, with no change here", () => {
  // CAN FAIL: any hand-kept list of screens. The door adds a field; the road grows.
  const window = { MCP_PROTO_MANUAL: true };
  vm.runInContext(PROTO, vm.createContext({ window, document: makeDocument() }), { filename: "mcp-proto.js" });
  const P = window.MCPProto;
  const grown = { ...DECLARE.card.fields, window_line: { type: "string", title: "Window" } };
  const form = P._internals.buildForm(P._internals.fieldsSchema(grown));
  assert.ok(fieldSteps(form).includes("field:window_line"));
  assert.equal(fieldSteps(form).length, Object.keys(grown).length + 2);
});

test("the step lives in the hash, and a hash from nowhere lands on the first screen", () => {
  const { form } = buildDeclare();
  const steps = fieldSteps(form);
  for (let i = 0; i < steps.length; i++) assert.equal(stepFromHash(hashForStep(i, steps), steps), i, `step ${i} does not round-trip`);
  assert.equal(hashForStep(steps.length - 1, steps), "#review");
  assert.equal(stepFromHash("", steps), 0);
  assert.equal(stepFromHash("#step-99", steps), 0, "a stale hash past the road must not strand the reader");
  assert.equal(stepFromHash("#hands", steps), 0);
});

// ── 2. one box at a time, the door's rules per box ───────────────────────────

test("Continue on an empty REQUIRED box is refused in the office's own sentence — the send's check, asked of one box", () => {
  // CAN FAIL: let the funnel walk past an empty required box, or word the
  // refusal itself. The sentence is missingRequired's, which is the office's.
  const { form, fields } = buildDeclare();
  const here = missingHere(form, fields, "household");
  assert.equal(here.length, 1);
  assert.deepEqual(plain(here[0]), plain(missingRequired(form, fields).find((m) => m.name === "household")));
  assert.deepEqual(plain(missingHere(form, fields, "agent")), [], "an optional box is never refused");
  put(form, "household", "Starforge");
  assert.deepEqual(plain(missingHere(form, fields, "household")), [], "a filled box may go on");
});

test("the forward button reads Skip on an empty optional box and Continue everywhere else (approved 2026-09-27)", () => {
  const { form, fields } = buildDeclare();
  const label = (n) => continueLabel({ required: isRequired(n, fields), present: isPresent(form, n) });
  assert.equal(label("household"), "Continue", "a required box never offers to be skipped");
  assert.equal(label("agent"), "Skip");
  put(form, "agent", "Dearest");
  assert.equal(label("agent"), "Continue");
});

test("Enter continues; in a paragraph box Enter is a new line and Ctrl/⌘+Enter continues; buttons keep their own Enter", () => {
  const k = (tagName, mods = {}) => ({ key: "Enter", target: { tagName }, ...mods });
  assert.equal(enterContinues(k("INPUT")), true);
  assert.equal(enterContinues(k("SELECT")), true);
  assert.equal(enterContinues(k("SECTION")), true);
  assert.equal(enterContinues(k("TEXTAREA")), false, "Enter in the Address Card must make a paragraph, not leave the screen");
  assert.equal(enterContinues(k("TEXTAREA", { ctrlKey: true })), true);
  assert.equal(enterContinues(k("TEXTAREA", { metaKey: true })), true);
  assert.equal(enterContinues(k("BUTTON")), false);
  assert.equal(enterContinues(k("A")), false);
  assert.equal(enterContinues(k("INPUT", { isComposing: true })), false, "an IME composition's Enter is not an answer");
  assert.equal(enterContinues({ key: "a", target: { tagName: "INPUT" } }), false);
  const { form } = buildDeclare();
  assert.equal(enterHint(form, "card"), "Ctrl + Enter ↵", "the hint must match what the paragraph box does");
  assert.equal(enterHint(form, "handle"), "Enter ↵");
});

// ── 3. review ────────────────────────────────────────────────────────────────

test("review shows every field under the label the generator DREW, the whole value, and blanks as blanks", () => {
  // CAN FAIL: label a row from a list of the page's own, or trim a long card.
  const { form } = buildDeclare();
  const card = "First paragraph.\n\nSecond paragraph, which is long enough that a clipped review would lose its end. ".repeat(4);
  put(form, "household", "Starforge");
  put(form, "handle", "dearest-ai");
  put(form, "card", card);
  const rows = plain(reviewRows(form));
  assert.deepEqual(rows.map((r) => r.label), ["Household name", "Handle", "Address Card", "Agent's name", "Since"]);
  assert.deepEqual(rows.map((r) => r.label), plain(form.names).map((n) => labelOf(form.fields[n].node)));
  assert.equal(rows.find((r) => r.name === "card").value, card, "the Address Card is shown whole (Wright's review note 4)");
  assert.deepEqual(rows.filter((r) => r.empty).map((r) => r.name), ["agent", "since"]);
});

// ── 4. /join/: the lane road ─────────────────────────────────────────────────

test("the lane hashes: the old #hands / #chat deep links still open their lane, and anything else is the first question", () => {
  assert.equal(laneScreen(""), "lane");
  assert.equal(laneScreen("#hands"), "hands");
  assert.equal(laneScreen("#chat"), "chat");
  assert.equal(laneScreen("#chat/yes"), "chat/yes");
  assert.equal(laneScreen("#nonsense"), "lane");
  for (const s of LANE_SCREENS) assert.ok(laneProgress(s).at < laneProgress(s).of);
  assert.deepEqual(plain(dots(1, 3)), ["done", "now", ""]);
  assert.equal(laneParent("chat/wait"), "chat/yes");
  assert.equal(laneParent("hands/link"), "hands");
  assert.equal(laneParent("chat"), "lane");
});

test("/join/ mounts the funnel with the page's OWN two texts, and the classic chooser stays whole for a reader without JavaScript", () => {
  // CAN FAIL: restate ONE_LINER or CHAT_LETTER inside the component (they
  // would drift), or drop the classic lanes (the no-JS page).
  assert.match(JOIN, /<JoinFunnel oneLiner=\{ONE_LINER\} chatLetter=\{CHAT_LETTER\} \/>/);
  assert.ok(!FUNNEL.includes("join/agent.md") && !FUNNEL.includes("Trueing House"),
    "the funnel carries its own copy of a text the page already owns");
  assert.match(JOIN, /<section class="lane" data-lane="hands">/);
  assert.match(JOIN, /<section class="lane" data-lane="chat">/);
  // the funnel shows only under the mark its inline script sets
  assert.match(FUNNEL, /<script is:inline>document\.documentElement\.classList\.add\("has-join-funnel"\);<\/script>/);
  assert.match(CSS, /\.join-funnel \{ display: none; \}/);
  assert.match(CSS, /html\.has-join-funnel \.join-funnel \{ display: block; \}/);
});

test("the funnel's two answers carry the chooser's lane key, so join:lane-chosen still fires from the join page", () => {
  // CAN FAIL: give the answers a key of their own and the tutorial bus goes
  // quiet on the funnel (tutorial.test.mjs holds that the emit lives in index.astro).
  assert.match(FUNNEL, /data-lane-tab="chat" data-jf-go="chat"/);
  assert.match(FUNNEL, /data-lane-tab="hands" data-jf-go="hands"/);
  assert.ok(!/pmTutorialEmit\(/.test(FUNNEL), "the funnel emits on its own; the emit belongs to the page");
});

test("the chat road links its walkthrough, and the no-JS lane carries site#168's line word for word", () => {
  assert.match(FUNNEL, /href="\/walkthroughs\/chat-only\/">The full chat-only walkthrough<\/a>/);
  assert.ok(JOIN.includes('<p class="lane-foot">Rather have every step written out, with pictures? <a href="/walkthroughs/chat-only/">The full chat-only walkthrough</a> is one page.</p>'),
    "the classic lane's line must match site#168 exactly, so the train's merge of main is a clean take");
});

// ── 5. /join/move-in/ is still a form it does not own ────────────────────────

test("move-in's road is fieldSteps(form), and it walks the generator's nodes rather than drawing its own", () => {
  // CAN FAIL: build screens from a list, or clone a field into a screen.
  assert.match(MOVEIN, /steps = fieldSteps\(form\)/);
  assert.match(MOVEIN, /for \(const n of form\.names\)/);
  assert.match(MOVEIN, /<div class="jf-fields" data-form-host><\/div>/);
  assert.ok(!/cloneNode/.test(MOVEIN), "a cloned field is a second copy of a box, and its value would never be sent");
  assert.match(MOVEIN, /const missing = missingHere\(form, declared, name\);\s*if \(missing\.length\) return showMissing\(missing\);/);
});

test("the column is centred, 720 wide, with a 16px gutter of its own (Wright's review note 1)", () => {
  assert.match(CSS, /\.jf \{[^}]*max-width: 720px;[^}]*margin: 0 auto;[^}]*padding: 0 16px;/);
  assert.match(MOVEIN, /\.movein \{ max-width: 720px; margin: 0 auto; padding: 0 16px 2em;/);
});
