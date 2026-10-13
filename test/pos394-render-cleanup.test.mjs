// pos394-render-cleanup.test.mjs — the render proof removes its own temp tree and nothing else (POS-394).
//
//   node --test --test-concurrency=1 test/pos394-render-cleanup.test.mjs
//
// Node builtins only. removeOwnedTree() is called ONLY on fresh synthetic roots
// this file creates in os.tmpdir(); every fixture is a fixed literal. Anything
// the remover is expected to refuse is cleaned up here afterwards, one exact
// path at a time. No repository, toolchain or protected path is touched or read.
// This proves cooperative single-process cleanup, not TOCTOU or mount safety.

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { removeOwnedTree } from "../tools/pos394-render-proof.mjs";

const TMP = fs.realpathSync(os.tmpdir());
const mk = (prefix) => fs.mkdtempSync(path.join(TMP, prefix));
const put = (file, body = "fixed literal\n") => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, body, { flag: "wx" }); };
const exists = (p) => { try { fs.lstatSync(p); return true; } catch { return false; } };
const count = (dir) => { let n = 0; for (const e of fs.readdirSync(dir, { withFileTypes: true })) { n++; if (e.isDirectory()) n += count(path.join(dir, e.name)); } return n; };

// A sentinel OUTSIDE the root, reached through a link inside it.
function external() {
  const E = mk("pos394-ext-");
  put(path.join(E, "sentinel.txt"), "must survive\n");
  return { E, done: () => { fs.unlinkSync(path.join(E, "sentinel.txt")); fs.rmdirSync(E); } };
}
// A root shaped like a finished run: sources, nested Vite/Astro caches, a link out.
function populated(P, linkTo) {
  put(path.join(P, "package.json"), "{}\n");
  put(path.join(P, "src/lib/houses.mjs"));
  put(path.join(P, ".vite-cache/deps/_metadata.json"), "{}\n");
  put(path.join(P, ".vite-cache/deps/chunk-a.js"));
  put(path.join(P, ".astro-cache/content/a/b/c.txt"));
  put(path.join(P, ".astro/types.d.ts"));
  fs.mkdirSync(path.join(P, "public-empty"));
  fs.mkdirSync(path.join(P, "tmp/empty"), { recursive: true });
  if (linkTo) fs.symlinkSync(linkTo, path.join(P, "node_modules"));
}
// Exact teardown for a root the remover refused: the test's own fixture list.
function teardown(P, linked) {
  if (linked) fs.unlinkSync(path.join(P, "node_modules"));
  for (const f of ["package.json", "src/lib/houses.mjs", ".vite-cache/deps/_metadata.json", ".vite-cache/deps/chunk-a.js",
    ".astro-cache/content/a/b/c.txt", ".astro/types.d.ts"]) fs.unlinkSync(path.join(P, f));
  for (const d of ["src/lib", "src", ".vite-cache/deps", ".vite-cache", ".astro-cache/content/a/b", ".astro-cache/content/a",
    ".astro-cache/content", ".astro-cache", ".astro", "public-empty", "tmp/empty", "tmp"]) fs.rmdirSync(path.join(P, d));
  fs.rmdirSync(P);
}

test("an owned root is removed whole, nested caches included, and a link out is unlinked, not followed", () => {
  const ext = external();
  try {
    const P = mk("pos394-proj-");
    populated(P, ext.E);
    const entries = count(P);
    const r = removeOwnedTree(P, { keepApart: [] });
    assert.deepEqual(r, { ok: true, removed: entries });
    assert.equal(exists(P), false, "the root is gone");
    assert.equal(fs.readFileSync(path.join(ext.E, "sentinel.txt"), "utf8"), "must survive\n", "the link's target is untouched");
    assert.deepEqual(fs.readdirSync(ext.E), ["sentinel.txt"]);
  } finally { ext.done(); }
});

test("a root that is itself a symlink is refused, and neither it nor its target is touched", () => {
  const D = mk("pos394-proj-");
  populated(D, null);
  const L = path.join(TMP, `pos394-proj-link-${process.pid}-${Date.now()}`);
  fs.symlinkSync(D, L);
  try {
    const before = count(D);
    const r = removeOwnedTree(L, { keepApart: [] });
    assert.equal(r.ok, false);
    assert.match(r.problem, /not a plain directory/);
    assert.equal(fs.lstatSync(L).isSymbolicLink(), true, "the link stays");
    assert.equal(count(D), before, "nothing behind it was deleted");
  } finally { fs.unlinkSync(L); teardown(D, false); }
});

test("a root overlapping a keepApart location (inside or around it) is refused with nothing deleted", () => {
  const ext = external();
  const P = mk("pos394-proj-");
  populated(P, ext.E);
  try {
    const before = count(P);
    for (const [what, keep] of [["keepApart inside the root", path.join(P, "src")], ["keepApart around the root", TMP], ["keepApart is the root", P]]) {
      const r = removeOwnedTree(P, { keepApart: [keep] });
      assert.equal(r.ok, false, what);
      assert.match(r.problem, /overlaps a protected location/, what);
      assert.equal(count(P), before, `${what}: nothing deleted`);
    }
    assert.equal(fs.readFileSync(path.join(ext.E, "sentinel.txt"), "utf8"), "must survive\n");
  } finally { teardown(P, true); ext.done(); }
});

test("a wrong prefix, or a root not directly in the temp dir, is refused with nothing deleted", () => {
  const W = mk("pos394-wrong-");
  populated(W, null);
  const OUTER = mk("pos394-outer-");
  const N = path.join(OUTER, "pos394-proj-nested");
  fs.mkdirSync(N);
  populated(N, null);
  try {
    const w = removeOwnedTree(W, { keepApart: [] });
    assert.equal(w.ok, false);
    assert.match(w.problem, /not an owned pos394-proj- dir/);
    const n = removeOwnedTree(N, { keepApart: [] });
    assert.equal(n.ok, false);
    assert.match(n.problem, /not an owned pos394-proj- dir/);
    assert.ok(count(W) > 0 && count(N) > 0, "both left whole");
    const missing = removeOwnedTree(path.join(TMP, `pos394-proj-absent-${process.pid}-${Date.now()}`), { keepApart: [] });
    assert.equal(missing.ok, false, "a root that does not exist is a failure, not a pass");
  } finally { teardown(W, false); teardown(N, false); fs.rmdirSync(OUTER); }
});
