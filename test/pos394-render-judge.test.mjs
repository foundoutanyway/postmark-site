// pos394-render-judge.test.mjs — the render proof's verdict fails anything incomplete (POS-394).
//
//   node --test --test-concurrency=1 test/pos394-render-judge.test.mjs
//
// PURE: judge() only, on invented child outputs. Importing the harness renders
// nothing and runs nothing (its main is gated); no Vite, Astro or packages.

import test from "node:test";
import assert from "node:assert/strict";
import { judge, CASES, REFUSAL_CHANNELS } from "../tools/pos394-render-proof.mjs";

const OK_RES = { status: 0, signal: null };
const good = () => ({
  cases: Object.fromEntries(Object.entries(CASES).map(([n, checks]) => [n, { checks: Object.fromEntries(checks.map((c) => [c, true])) }])),
  refusals: Object.fromEntries(REFUSAL_CHANNELS.map((k) => [k, []])),
  esbuildSpawns: 1,
});

test("a complete, all-true, zero-refusal result passes (control)", () => {
  const v = judge(good(), OK_RES);
  assert.deepEqual(v.problems, []);
  assert.equal(v.pass, true);
});

test("every incompleteness or failure fails the verdict", () => {
  const variants = {
    "no output": [null, OK_RES],
    "non-zero exit": [good(), { status: 1, signal: null }],
    "killed": [good(), { status: null, signal: "SIGTERM" }],
    "spawn error": [good(), { status: null, error: { code: "ENOENT" } }],
    "crash": [{ ...good(), crash: "Error: boom" }, OK_RES],
    "a case missing": [(() => { const o = good(); delete o.cases.page; return o; })(), OK_RES],
    "an extra case": [(() => { const o = good(); o.cases.extra = { checks: { x: true } }; return o; })(), OK_RES],
    "empty checks": [(() => { const o = good(); o.cases.resident.checks = {}; return o; })(), OK_RES],
    "checks missing": [(() => { const o = good(); delete o.cases.household.checks; return o; })(), OK_RES],
    "a check name missing": [(() => { const o = good(); delete o.cases.household.checks["hd-sub carries no human"]; return o; })(), OK_RES],
    "an extra check": [(() => { const o = good(); o.cases.page.checks.bonus = true; return o; })(), OK_RES],
    "a check false": [(() => { const o = good(); o.cases.page.checks["the HTML never carries it"] = false; return o; })(), OK_RES],
    "a check truthy but not true": [(() => { const o = good(); o.cases.page.checks["title is the plate"] = "yes"; return o; })(), OK_RES],
    "an fs refusal": [(() => { const o = good(); o.refusals.fs.push({ api: "readFileSync" }); return o; })(), OK_RES],
    "a net refusal": [(() => { const o = good(); o.refusals.net.push("fetch x"); return o; })(), OK_RES],
    "a proc refusal": [(() => { const o = good(); o.refusals.proc.push("spawn sh"); return o; })(), OK_RES],
    "a channel missing": [(() => { const o = good(); delete o.refusals.net; return o; })(), OK_RES],
    "a channel not a list": [(() => { const o = good(); o.refusals.proc = 0; return o; })(), OK_RES],
    "an extra channel": [(() => { const o = good(); o.refusals.other = []; return o; })(), OK_RES],
    "no refusals object": [(() => { const o = good(); delete o.refusals; return o; })(), OK_RES],
  };
  for (const [what, [out, res]] of Object.entries(variants)) {
    const v = judge(out, res);
    assert.equal(v.pass, false, what);
    assert.ok(v.problems.length > 0, `${what}: names its problem`);
  }
  assert.equal(Object.keys(variants).length, 20);
});

test("the expected cases and channels are exactly the three surfaces and three channels", () => {
  assert.deepEqual(Object.keys(CASES), ["household", "resident", "page"]);
  assert.deepEqual([...REFUSAL_CHANNELS], ["fs", "net", "proc"]);
  for (const [n, checks] of Object.entries(CASES)) {
    assert.ok(checks.length >= 4, `${n} has its checks`);
    assert.ok(checks.includes("the HTML never carries it") && checks.includes("the input carries the private human (control)"), n);
  }
});
