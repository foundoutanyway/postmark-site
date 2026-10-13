#!/usr/bin/env node
// pos394-render-proof.mjs — the render proof that the household and resident surfaces never print the private human (POS-394).
//
// A LIBRARY: test/public-household-render.test.mjs drives it inside the site's
// own `npm test` (Wright 2026-10-13 05:56, CI renders it; nothing new is
// installed: it binds to the checkout's own node_modules, which CI's `npm ci`
// already made). Importing it does nothing. A direct CLI run stays opt-in:
//   POS394_RENDER_PROOF=1 node tools/pos394-render-proof.mjs [--mutant <name>]
//
// WHAT IT RENDERS: the REAL templates, through Astro's own pipeline, from
// invented literals —
//   householdSeat      town/components/Household.astro, route "household" (the
//                      house seat: HouseDashboard's hd-sub line), FRAGMENT
//   residentWrapper    town/components/Household.astro, route "resident" (the
//                      shared chrome), FRAGMENT — not the resident page
//   householdPage      town/pages/households/[slug].astro, WHOLE page with its
//                      layout (<title>, description), handed a house that still
//                      carries the private human: the prop boundary
//   householdPageBuilt the same page as a build makes it: getStaticPaths() over
//                      the fold of an invented registry whose house has a human
//   residentPage       town/pages/residents/[handle].astro, WHOLE page, as a
//                      build makes it: getStaticPaths() over invented residents,
//                      its house from the same fold
//   residentCard       src/components/ResidentCard.astro (the directory card)
//
// HOW IT STAYS AWAY FROM DATA:
//   - a CODE-ONLY projection: a fresh owned temp dir holding byte-for-byte
//     copies of an EXPLICIT source list, from git objects at one captured head
//     (never the working tree), each verified against its blob id. No records,
//     printouts, assets or generated trees are copied; public/ is an empty dir.
//   - the five generated JSON imports, src/lib/funding.mjs (Rivet 02:03Z, (a))
//     and src/lib/mists-season.mjs (Rivet 05:21Z, harness only) are VIRTUAL
//     modules with invented literals; any other import of a protected id, or
//     of postmark-world, throws in the resolver before anything is read.
//   - the framework comes from the checkout's node_modules through a link; in
//     the child, the pos394 fs guard covers every fs binding, with the
//     projection's protected roots, node_modules/postmark-world and EVERY other
//     top-level entry of the checkout denied (no traversal of the original
//     tree); fetch/http/https/net/tls/dns refused; child processes refused but
//     the exact esbuild binary; workers refused. Every refusal is recorded and
//     any refusal FAILS the run.
//   - configFile false, no integrations, empty publicDir, caches inside the
//     projection, no dep discovery, no watcher, no HMR, controlled env.
//
// MUTANTS: each re-inserts an old private-human clause into the PROJECTION's
// copy (exact anchors, each found exactly once); production files are never
// edited, and no base commit is needed (CI checks out one commit).
//
// CLEANUP: the run owns its temp dir, Vite/Astro caches included, and removes
// it on success and on failure (removeOwnedTree: canonical, owned, links never
// followed, the checkout never a target). If it cannot, the run FAILS.
//
// LIMITS: funding chrome and the Halloween/mists chrome render from invented
// stubs and are NOT exercised; client <script> code is emitted, not run; the
// resident card has no historical private-human emitter, so it has no
// falsifier; zero refusals shows the run stayed inside what the guard sees,
// not containment of native/internal reads (esbuild's binary, internal module
// loaders, FileHandle methods, recursive subtrees walked natively).

import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire, syncBuiltinESMExports } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ESBUILD_BIN = "node_modules/@esbuild/linux-x64/bin/esbuild";
const PINS = { astro: "6.4.0", vite: "7.3.3", esbuild: "0.27.7", marked: "18.0.5" };

// The explicit projection: the render closure of the four entry points, from
// git objects at the captured head. funding.mjs and mists-season.mjs are
// deliberately absent (virtual). Anything the templates import that is not
// here fails the run.
export const SOURCES = Object.freeze([
  "src/components/ChipRow.astro", "src/components/DoorLine.astro", "src/components/HalloweenBat.astro",
  "src/components/HalloweenMotif.astro", "src/components/HalloweenSkin.astro", "src/components/PageFreshness.astro",
  "src/components/ResidentCard.astro",
  "src/components/household-dashboard/HouseDashboard.astro", "src/components/household-dashboard/ResidentCard.astro",
  "src/layouts/BaseLayout.astro", "src/layouts/PostmarkLayout.astro",
  "src/lib/auth.mjs", "src/lib/civic-art.mjs", "src/lib/correspondents.mjs", "src/lib/door-line.mjs",
  "src/lib/freshness.mjs", "src/lib/halloween-motifs.mjs", "src/lib/halloween-navy.mjs",
  "src/lib/halloween-skin.mjs", "src/lib/halloween-sprinkle.mjs", "src/lib/home-face.mjs", "src/lib/home-pick.mjs",
  "src/lib/home-picture.mjs", "src/lib/household-dashboard/faces.mjs", "src/lib/household-dashboard/fold.mjs",
  "src/lib/household-dashboard/paint.mjs", "src/lib/household-dashboard/reads.mjs", "src/lib/household.mjs",
  "src/lib/households-directory.mjs",
  "src/lib/houses.mjs", "src/lib/last-active.mjs", "src/lib/media-door.mjs", "src/lib/meeps-quarter.mjs",
  "src/lib/nav.mjs", "src/lib/page-freshness.mjs", "src/lib/pixel-icons.mjs", "src/lib/pm.mjs",
  "src/lib/sentinel-alert.mjs", "src/lib/tutorial-registry.mjs", "src/lib/tutorial.mjs", "src/lib/world-cockpit.mjs",
  "src/lib/world-feed.mjs", "src/styles/global.css", "src/styles/postmark.css",
  "tools/lib/ids.mjs",
  "town/components/Household.astro", "town/pages/households/[slug].astro", "town/pages/residents/[handle].astro",
]);

// ── the checks, by name ─────────────────────────────────────────────────────
const C = Object.freeze({
  PROP: "the input carries the private human (control)",
  REG: "the registry input carries the private human (control)",
  NEVER: "the HTML never carries the private human",
  MEMBERS: "invented members rendered (the fixture reached the template)",
  PLATE: "the plate is the key, title-cased",
  HDSUB: "hd-sub present",
  HDCOUNT: "hd-sub keeps the public count",
  HDHUMAN: "hd-sub carries no human",
  TITLE_H: "title is the plate",
  DESC: "description is plate, public count and agents",
  BUILT: "the built house carries no human key",
  TITLE_R: "title is the resident's name",
  CARD: "the card shows the resident",
});
export const CHECKS = C;
export const CASES = Object.freeze({
  householdSeat: [C.PROP, C.NEVER, C.MEMBERS, C.HDSUB, C.HDCOUNT, C.HDHUMAN, C.PLATE],
  residentWrapper: [C.PROP, C.NEVER, C.MEMBERS, C.PLATE],
  householdPage: [C.PROP, C.NEVER, C.MEMBERS, C.TITLE_H, C.DESC, C.HDSUB, C.HDCOUNT, C.HDHUMAN, C.PLATE],
  householdPageBuilt: [C.REG, C.BUILT, C.NEVER, C.MEMBERS, C.TITLE_H, C.DESC, C.PLATE],
  residentPage: [C.REG, C.NEVER, C.MEMBERS, C.TITLE_R, C.PLATE],
  residentCard: [C.REG, C.NEVER, C.CARD],
});
// The only checks a mutant may turn red: the privacy ones.
export const PRIVACY = Object.freeze([C.NEVER, C.HDHUMAN, C.DESC, C.BUILT]);
export const REFUSAL_CHANNELS = Object.freeze(["fs", "net", "proc"]);

// ── mutants: old private-human clauses, re-inserted into the projection only ─
const OLD = Object.freeze({
  chrome: "        {house.declared && house.human && <span>{house.human}’s household</span>}\n",
  hdsub: "        {house.human && <><b>{house.human}’s</b> household · </>}\n",
  desc: "  description={`${plate}${house.human ? `, ${house.human}’s household` : \"\"} — ${members.length} ${members.length === 1 ? \"resident\" : \"residents\"} of Postmark: ${who}.`}\n",
  fold: "      human: dec.human ?? null,\n",
});
const EDIT = Object.freeze({
  chrome: { path: "town/components/Household.astro", from: "      <p class=\"house-meta\">\n", to: "      <p class=\"house-meta\">\n" + OLD.chrome },
  hdsub: { path: "src/components/household-dashboard/HouseDashboard.astro", from: "      <p class=\"hd-sub\">\n", to: "      <p class=\"hd-sub\">\n" + OLD.hdsub },
  desc: { path: "town/pages/households/[slug].astro",
    from: "  description={`${plate} — ${members.length} ${members.length === 1 ? \"resident\" : \"residents\"} of Postmark: ${who}.`}\n", to: OLD.desc },
  fold: { path: "src/lib/houses.mjs", from: "      // no `human` (POS-394): the fold is public, and the private name never enters it\n", to: OLD.fold },
});
// Each mutant: its edits and the checks it MUST turn red. Any other red, or a
// red outside PRIVACY, or any crash/refusal, is not the falsifier working.
export const MUTANTS = Object.freeze({
  "household-299": { emitter: "Household.astro:299 (chrome)", edits: [EDIT.chrome],
    mustRed: { householdSeat: [C.NEVER], residentWrapper: [C.NEVER], householdPage: [C.NEVER] } },
  "dashboard-68": { emitter: "HouseDashboard.astro:68 (hd-sub)", edits: [EDIT.hdsub],
    mustRed: { householdSeat: [C.NEVER, C.HDHUMAN], householdPage: [C.NEVER, C.HDHUMAN] } },
  "slug-48": { emitter: "households/[slug].astro:48 (description)", edits: [EDIT.desc],
    mustRed: { householdPage: [C.NEVER, C.DESC] } },
  "fold+299": { emitter: "houses.mjs fold human + Household.astro:299 (the built pages' path)", edits: [EDIT.fold, EDIT.chrome],
    mustRed: { householdPageBuilt: [C.BUILT, C.NEVER], residentPage: [C.NEVER] } },
});

// ── invented fixtures (no real record, row, name or value) ──────────────────
const SENTINEL = "PRIVATE_SENTINEL_h7rn_human";
const row = (handle, agent) => ({
  handle, profile: {}, address: { agent, joined: "2026-07-01", body: `# ${agent}\n\nAn invented row for the POS-394 render proof.` },
  home: null, region: null, homeImages: [], counts: { received: 0, sent: 0 }, is_office: false, window: null, marks: null,
});
const MEMBERS = [row("wren-pos394", "Wren Fixture"), row("moss-pos394", "Moss Fixture")];
const HOUSE = { slug: "brass-hollow", path: "brass-hollow", declared: true, name: null, since: "2026-08-01",
  human: SENTINEL, residents: MEMBERS.map((m) => m.handle), arriving: [] };
const DATA = {
  "households.json": { schema_version: 1, households: { "brass-hollow": { human: SENTINEL, since: "2026-08-01", residents: HOUSE.residents } } },
  "residents.json": MEMBERS,
  "media.json": {},
  "renditions.json": [],
  "letters.json": [],
};
// Rivet 02:03Z (a): the exports the closure's consumers import, invented values only.
const FUNDING_STUB = `
export const HOLO_LINE = "pos394 stub holo line";
export const HOLO_NAME_LINE = "pos394 stub holo name line";
export const DEEDS_FIXTURE = [];
export const STAMPS_FIXTURE = [];
export const loadDeeds = () => [];
export const deedsFor = () => [];
export const shelfTotals = () => ({ usd: 0, holo: 0 });
export const toDeed = (x) => x;
`;
// APPROVED, harness only (Rivet 05:21Z): siteMists() reads
// node_modules/postmark-world/WORLD/skeleton.json whenever it is called bare
// (HalloweenMotif/Bat/Skin do, at render). null is the real function's own
// "no season" answer.
const MISTS_STUB = `export const siteMists = () => null;\n`;

const under = (p, root) => p === root || p.startsWith(root.endsWith("/") ? root : root + "/");
const git = (...a) => execFileSync("git", ["-C", REPO, ...a], { maxBuffer: 64 * 1024 * 1024 });

/** Apply a mutant's edits to file contents, each anchor exactly once. */
export function applyEdits(contents, edits) {
  const out = { ...contents };
  for (const { path: rel, from, to } of edits) {
    const text = out[rel];
    if (typeof text !== "string") throw new Error(`mutant edit on ${rel}, which is not projected`);
    const n = text.split(from).length - 1;
    if (n !== 1) throw new Error(`mutant anchor on ${rel} found ${n} times, expected once`);
    // an insertion adds exactly one line after its anchor; a replacement swaps one line for one
    const oneLine = (s) => s.endsWith("\n") && s.indexOf("\n") === s.length - 1;
    const insertion = to.startsWith(from);
    const added = insertion ? to.slice(from.length) : to;
    if (!oneLine(added) || (!insertion && !oneLine(from))) throw new Error(`mutant edit on ${rel} is not exactly one line`);
    if (!/(house|dec)\.human/.test(added) || /(house|dec)\.human/.test(from)) throw new Error(`mutant edit on ${rel} is not an old private-human clause`);
    out[rel] = text.replace(from, to);
  }
  return out;
}

// ── one run: projection, child, verdict, cleanup ────────────────────────────
/**
 * Render every case once, from the source at the captured head (optionally
 * with one mutant), and return the report. Never throws for a failed run: the
 * report says why. `toolchain` is a dir holding node_modules (the checkout).
 */
export function runProof({ mutant = null, toolchain = REPO, timeoutMs = 240_000 } = {}) {
  if (mutant && !MUTANTS[mutant]) return { pass: false, problems: [`unknown mutant ${mutant}`] };
  const T = path.resolve(toolchain);
  const pre = [];
  const pkgVersion = (name) => { try { return JSON.parse(fs.readFileSync(path.join(T, "node_modules", name, "package.json"), "utf8")).version; } catch { return null; } };
  for (const [name, v] of Object.entries(PINS)) if (pkgVersion(name) !== v) pre.push(`node_modules ${name} is ${pkgVersion(name)}, pinned ${v} (run npm ci)`);
  if (!fs.existsSync(path.join(T, ESBUILD_BIN))) pre.push(`no ${ESBUILD_BIN}`);
  let HEAD = null;
  try { HEAD = git("rev-parse", "--verify", "HEAD^{commit}").toString().trim(); } catch (e) { pre.push(`cannot read the head: ${e.message}`); }
  if (HEAD && !/^[0-9a-f]{40}$/.test(HEAD)) pre.push("the head is not a full sha");
  if (pre.length) return { pass: false, mutant, head: HEAD, problems: pre.map((p) => `setup: ${p}`) };

  // Every top-level entry of the checkout but node_modules is denied in the
  // child (names only; nothing below is listed or read).
  const denyTop = fs.readdirSync(REPO).filter((n) => n !== "node_modules").map((n) => path.join(REPO, n));

  const P = fs.mkdtempSync(path.join(os.tmpdir(), "pos394-proj-"));
  const manifest = [];
  let verdict;
  try {
    let contents = {};
    for (const rel of SOURCES) {
      const blob = git("rev-parse", `${HEAD}:${rel}`).toString().trim();
      contents[rel] = git("cat-file", "blob", blob).toString("utf8");
      manifest.push({ path: rel, blob });
    }
    const edited = mutant ? applyEdits(contents, MUTANTS[mutant].edits) : contents;
    for (const { path: rel, blob } of manifest) {
      const dest = path.join(P, rel);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, edited[rel], { flag: "wx" });
      const written = execFileSync("git", ["hash-object", "--no-filters", dest]).toString().trim();
      const mutated = edited[rel] !== contents[rel];
      if (!mutated && written !== blob) throw new Error(`byte correspondence failed for ${rel}`);
      if (mutated && written === blob) throw new Error(`the mutant did not change ${rel}`);
    }
    for (const d of ["public-empty", "tmp"]) fs.mkdirSync(path.join(P, d));
    fs.writeFileSync(path.join(P, "package.json"), JSON.stringify({ name: "pos394-projection", private: true, type: "module" }), { flag: "wx" });
    fs.symlinkSync(path.join(T, "node_modules"), path.join(P, "node_modules"));

    const env = {
      PATH: "/usr/bin:/bin", HOME: P, TMPDIR: path.join(P, "tmp"), NODE_ENV: "development",
      POS394_RENDER_PROOF: "1", ESBUILD_BINARY_PATH: path.join(T, ESBUILD_BIN), ASTRO_TELEMETRY_DISABLED: "1",
    };
    const res = spawnSync(process.execPath, [fileURLToPath(import.meta.url), "--child", P, T, JSON.stringify(denyTop)],
      { cwd: P, env, encoding: "utf8", timeout: timeoutMs, maxBuffer: 64 * 1024 * 1024 });
    let out = null;
    try { out = JSON.parse(res.stdout.trim().split("\n").at(-1)); } catch { /* judged below */ }
    verdict = { ...judge(out, res), structural: structural(out, res), failed: failedChecks(out) };
  } catch (e) {
    verdict = { pass: false, problems: [`setup: ${e.message}`], structural: [`setup: ${e.message}`], failed: [] };
  }
  // The run owns P, caches and all, and removes it whatever happened. A
  // cleanup that cannot finish FAILS the run; nobody else cleans up after it.
  const cleanup = removeOwnedTree(P, { keepApart: [T, REPO] });
  if (!cleanup.ok) {
    verdict.pass = false;
    verdict.problems = [...(verdict.problems ?? []), `cleanup: ${cleanup.problem}`];
    verdict.structural = [...(verdict.structural ?? []), `cleanup: ${cleanup.problem}`];
  }
  return { mutant, head: HEAD, projection: manifest.length, cleanup, ...verdict };
}

/** For a mutant run: did exactly the falsifier happen? Returns problems ([] = it did). */
export function falsified(report, name) {
  const m = MUTANTS[name];
  const problems = [...(report.structural ?? [])];
  const red = new Set((report.failed ?? []).map(([c, k]) => `${c}\u0000${k}`));
  for (const [c, ks] of Object.entries(m.mustRed)) for (const k of ks) if (!red.has(`${c}\u0000${k}`)) problems.push(`${c}: "${k}" stayed green`);
  for (const [c, k] of report.failed ?? []) if (!PRIVACY.includes(k)) problems.push(`${c}: non-privacy check "${k}" went red`);
  if (!red.size) problems.push("nothing went red");
  return problems;
}

/**
 * Remove the run's own temp tree, and only it. P must be a real directory (not
 * a link) directly inside the canonical os.tmpdir(), named pos394-proj-*,
 * owned by this user, and neither inside nor containing anything in
 * `keepApart` (the toolchain, the checkout). The tree is listed first with
 * lstat — links are entries to unlink, never followed — and if any entry is
 * foreign-owned or escapes P nothing is deleted. Then files and links are
 * unlinked and directories removed deepest first, one by one.
 */
export function removeOwnedTree(P, { keepApart = [] } = {}) {
  const uid = process.getuid();
  try {
    const tmp = fs.realpathSync(os.tmpdir());
    const st = fs.lstatSync(P);
    if (!st.isDirectory() || st.isSymbolicLink()) return { ok: false, problem: `${P} is not a plain directory` };
    if (fs.realpathSync(P) !== P && fs.realpathSync(P) !== path.join(tmp, path.basename(P))) return { ok: false, problem: `${P} does not resolve inside the temp dir` };
    const root = fs.realpathSync(P);
    if (path.dirname(root) !== tmp || !path.basename(root).startsWith("pos394-proj-")) return { ok: false, problem: `${root} is not an owned pos394-proj- dir in ${tmp}` };
    if (st.uid !== uid) return { ok: false, problem: `${root} is not owned by this user` };
    for (const k of keepApart) {
      let kc; try { kc = fs.realpathSync(k); } catch { kc = path.resolve(k); }
      if (under(kc, root) || under(root, kc)) return { ok: false, problem: `${root} overlaps a protected location` };
    }
    const entries = []; // [path, isDir], parents before children
    const walk = (dir) => {
      for (const name of fs.readdirSync(dir)) {
        const p = path.join(dir, name);
        if (!under(p, root) || p === root) throw new Error(`${p} escapes ${root}`);
        const e = fs.lstatSync(p);
        if (e.uid !== uid) throw new Error(`${p} is not owned by this user`);
        entries.push([p, e.isDirectory()]);
        if (e.isDirectory()) walk(p);
      }
    };
    walk(root);
    for (const [p, isDir] of [...entries].reverse()) (isDir ? fs.rmdirSync : fs.unlinkSync)(p);
    fs.rmdirSync(root);
    return { ok: true, removed: entries.length };
  } catch (e) {
    return { ok: false, problem: `${e.code ?? ""} ${e.message}`.trim() };
  }
}

/** Everything about a run but the check values: what makes a run unusable as evidence. */
export function structural(out, res) {
  const problems = [];
  if (res?.error) problems.push(`child did not run: ${res.error.code ?? res.error.message}`);
  if (res?.signal) problems.push(`child killed by ${res.signal} (time bound)`);
  if (res?.status !== 0) problems.push(`child exit status ${res?.status}`);
  if (!out || typeof out !== "object") return [...problems, "child printed no result"];
  if (out.crash) problems.push(`child crashed: ${String(out.crash).split("\n")[0]}`);
  const refusals = out.refusals && typeof out.refusals === "object" ? out.refusals : {};
  const channels = Object.keys(refusals).sort();
  if (channels.join() !== [...REFUSAL_CHANNELS].sort().join()) problems.push(`refusal channels ${channels.join(",") || "none"}, expected ${REFUSAL_CHANNELS.join(",")}`);
  for (const k of REFUSAL_CHANNELS) {
    if (!Array.isArray(refusals[k])) problems.push(`refusal channel ${k} missing`);
    else if (refusals[k].length) problems.push(`${k} refusals: ${refusals[k].length}`);
  }
  const cases = out.cases && typeof out.cases === "object" ? out.cases : {};
  const names = Object.keys(cases).sort();
  if (names.join() !== Object.keys(CASES).sort().join()) problems.push(`cases ${names.join(",") || "none"}, expected ${Object.keys(CASES).join(",")}`);
  for (const [name, expected] of Object.entries(CASES)) {
    const checks = cases[name]?.checks;
    if (!checks || typeof checks !== "object") { problems.push(`${name}: no checks`); continue; }
    const got = Object.keys(checks).sort();
    if (got.join("\u0000") !== [...expected].sort().join("\u0000")) problems.push(`${name}: checks ${got.length}, expected exactly ${expected.length} named`);
    for (const c of expected) if (typeof checks[c] !== "boolean") problems.push(`${name}: "${c}" is not a boolean`);
  }
  return problems;
}

/** [case, check] for every expected check that is not exactly true. */
export function failedChecks(out) {
  const failed = [];
  for (const [name, expected] of Object.entries(CASES)) {
    const checks = out?.cases?.[name]?.checks;
    if (!checks || typeof checks !== "object") continue;
    for (const c of expected) if (checks[c] !== true) failed.push([name, c]);
  }
  return failed;
}

/** The verdict, pure. Anything missing, extra, empty or not exactly expected FAILS. */
export function judge(out, res) {
  const problems = structural(out, res);
  if (out && typeof out === "object") for (const [name, c] of failedChecks(out)) problems.push(`${name}: ${c}`);
  return { pass: problems.length === 0, problems, cases: out?.cases, refusals: out?.refusals, esbuildSpawns: out?.esbuildSpawns };
}

// ── child: guard everything, render, report ─────────────────────────────────
async function child([P, T, denyTopJson]) {
  const out = { cases: {}, refusals: { fs: [], net: [], proc: [] }, esbuildSpawns: 0 };
  try {
    const { installFsGuard } = await import(pathToFileURL(path.join(REPO, "test", "pos394-fs-guard.mjs")).href);
    const refuse = (kind, what) => { out.refusals[kind].push(what); return Object.assign(new Error(`POS-394 render proof refused ${what}`), { code: "EPOS394GUARD" }); };

    // network: nothing leaves the process
    globalThis.fetch = (u) => Promise.reject(refuse("net", `fetch ${String(u)}`));
    const req = createRequire(import.meta.url);
    for (const [mod, names] of [["http", ["request", "get"]], ["https", ["request", "get"]], ["net", ["connect", "createConnection"]], ["tls", ["connect"]], ["dns", ["lookup", "resolve"]]]) {
      const m = req(`node:${mod}`);
      for (const n of names) m[n] = () => { throw refuse("net", `${mod}.${n}`); };
    }
    // processes: only the exact esbuild binary
    const cp = req("node:child_process");
    const esbuild = path.join(T, ESBUILD_BIN);
    const realSpawn = cp.spawn;
    cp.spawn = (cmd, ...rest) => { if (cmd === esbuild) { out.esbuildSpawns++; return realSpawn(cmd, ...rest); } throw refuse("proc", `spawn ${cmd}`); };
    for (const n of ["exec", "execFile", "execSync", "execFileSync", "spawnSync", "fork"]) cp[n] = (cmd) => { throw refuse("proc", `${n} ${cmd}`); };
    req("node:worker_threads").Worker = class { constructor(f) { throw refuse("proc", `Worker ${f}`); } };
    syncBuiltinESMExports();

    const g = installFsGuard({
      roots: [path.join(P, "src/data/postmark"), path.join(P, "public/atelier/postmark"),
        path.join(T, "node_modules/postmark-world"), ...JSON.parse(denyTopJson)],
      cwd: P,
    });
    out.refusals.fs = g.denials;

    const fromP = createRequire(path.join(P, "package.json"));
    const { createServer } = await import(pathToFileURL(fromP.resolve("vite")).href);
    const { getViteConfig } = await import(pathToFileURL(fromP.resolve("astro/config")).href);
    const { experimental_AstroContainer } = await import(pathToFileURL(fromP.resolve("astro/container")).href);

    const deny = [path.join(P, "src/data/postmark"), path.join(P, "public/atelier/postmark")];
    const guardPlugin = {
      name: "pos394-guard", enforce: "pre",
      resolveId(source, importer) {
        if (source === "postmark-world" || source.startsWith("postmark-world/")) throw refuse("fs", `import ${source}`);
        const bare = source.split("?")[0];
        let abs = null;
        if (bare.startsWith("@/")) abs = path.join(P, "src", bare.slice(2));
        else if (bare.startsWith(".") && importer && !importer.startsWith("\0")) abs = path.resolve(path.dirname(importer.split("?")[0]), bare);
        else if (bare.startsWith(P)) abs = bare;
        if (!abs) return null;
        const dataDir = path.join(P, "src/data/postmark");
        if (under(abs, dataDir)) {
          const name = path.relative(dataDir, abs);
          if (Object.hasOwn(DATA, name)) return `\0pos394:data:${name}`;
          throw refuse("fs", `import of an unmapped protected id ${name}`);
        }
        if (deny.some((r) => under(abs, r))) throw refuse("fs", `import under a denied root: ${path.relative(P, abs)}`);
        if (abs === path.join(P, "src/lib/funding.mjs") || abs === path.join(P, "src/lib/funding")) return "\0pos394:funding";
        if (abs === path.join(P, "src/lib/mists-season.mjs") || abs === path.join(P, "src/lib/mists-season")) return "\0pos394:mists";
        return null;
      },
      load(id) {
        if (id.startsWith("\0pos394:data:")) return `export default ${JSON.stringify(DATA[id.slice("\0pos394:data:".length)])};`;
        if (id === "\0pos394:funding") return FUNDING_STUB;
        if (id === "\0pos394:mists") return MISTS_STUB;
        const bare = id.split("?")[0];
        if (deny.some((r) => under(bare, r))) throw refuse("fs", `load under a denied root: ${path.relative(P, bare)}`);
        return null;
      },
    };

    const cfg = await getViteConfig({
      configFile: false, root: P, cacheDir: path.join(P, ".vite-cache"), envDir: path.join(P, "public-empty"),
      appType: "custom", logLevel: "error", clearScreen: false,
      server: { middlewareMode: true, hmr: false, watch: null, fs: { strict: true, allow: [P, path.join(T, "node_modules")] } },
      optimizeDeps: { noDiscovery: true, include: [] },
      ssr: { optimizeDeps: { noDiscovery: true, include: [] } },
      resolve: { alias: { "@": path.join(P, "src") } },
      plugins: [guardPlugin],
    }, {
      root: P, configFile: false, srcDir: "./town", publicDir: "./public-empty", outDir: "./dist-proof",
      cacheDir: "./.astro-cache", integrations: [], site: "https://postmark.town", telemetry: false,
    })({ mode: "development", command: "serve" });
    const server = await createServer(cfg);
    try {
      const container = await experimental_AstroContainer.create();
      const load = async (id) => (await server.ssrLoadModule(id));
      const Household = (await load("/town/components/Household.astro")).default;
      const HouseholdPage = await load("/town/pages/households/[slug].astro");
      const ResidentPage = await load("/town/pages/residents/[handle].astro");
      const Card = (await load("/src/components/ResidentCard.astro")).default;

      const regHasSentinel = JSON.stringify(DATA["households.json"]).includes(SENTINEL);
      const clean = (html) => !html.includes(SENTINEL);
      const both = (html) => MEMBERS.every((m) => html.includes(m.address.agent));
      const title = (html) => /<title>([\s\S]*?)<\/title>/.exec(html)?.[1] ?? null;
      const desc = (html) => /<meta name="description" content="([^"]*)"/.exec(html)?.[1] ?? null;
      const hdsub = (html) => /<p class="hd-sub"[^>]*>([\s\S]*?)<\/p>/.exec(html)?.[1] ?? "";
      const text = (s) => s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      const PAGE_TITLE = "Brass Hollow — a household in Postmark";
      const PAGE_DESC = "Brass Hollow — 2 residents of Postmark: Wren Fixture, Moss Fixture.";
      const record = (name, html, checks) => { out.cases[name] = { bytes: html.length, checks }; };

      {
        const props = { house: HOUSE, members: MEMBERS, active: "__house", route: "household" };
        const html = await container.renderToString(Household, { props });
        const sub = hdsub(html);
        record("householdSeat", html, {
          [C.PROP]: JSON.stringify(props).includes(SENTINEL), [C.NEVER]: clean(html), [C.MEMBERS]: both(html),
          [C.HDSUB]: sub.length > 0, [C.HDCOUNT]: /\b2 residents\b/.test(text(sub)), [C.HDHUMAN]: !sub.includes(SENTINEL),
          [C.PLATE]: html.includes("Brass Hollow"),
        });
      }
      {
        const props = { house: HOUSE, members: MEMBERS, active: MEMBERS[0].handle, route: "resident" };
        const html = await container.renderToString(Household, { props });
        record("residentWrapper", html, {
          [C.PROP]: JSON.stringify(props).includes(SENTINEL), [C.NEVER]: clean(html), [C.MEMBERS]: both(html), [C.PLATE]: html.includes("Brass Hollow"),
        });
      }
      {
        const props = { house: HOUSE };
        const html = await container.renderToString(HouseholdPage.default, { props, params: { slug: HOUSE.path } });
        const sub = hdsub(html);
        record("householdPage", html, {
          [C.PROP]: JSON.stringify(props).includes(SENTINEL), [C.NEVER]: clean(html), [C.MEMBERS]: both(html),
          [C.TITLE_H]: title(html) === PAGE_TITLE, [C.DESC]: desc(html) === PAGE_DESC,
          [C.HDSUB]: sub.length > 0, [C.HDCOUNT]: /\b2 residents\b/.test(text(sub)), [C.HDHUMAN]: !sub.includes(SENTINEL),
          [C.PLATE]: html.includes("Brass Hollow"),
        });
      }
      {
        const paths = await HouseholdPage.getStaticPaths();
        const built = paths.find((p) => p.params.slug === HOUSE.path);
        if (!built || paths.length !== 1) throw new Error(`households getStaticPaths gave ${paths.length} paths`);
        const html = await container.renderToString(HouseholdPage.default, { props: built.props, params: built.params });
        record("householdPageBuilt", html, {
          [C.REG]: regHasSentinel, [C.BUILT]: !Object.hasOwn(built.props.house, "human"), [C.NEVER]: clean(html), [C.MEMBERS]: both(html),
          [C.TITLE_H]: title(html) === PAGE_TITLE, [C.DESC]: desc(html) === PAGE_DESC, [C.PLATE]: html.includes("Brass Hollow"),
        });
      }
      {
        const paths = await ResidentPage.getStaticPaths();
        const wren = paths.find((p) => p.params.handle === MEMBERS[0].handle);
        if (!wren || paths.length !== MEMBERS.length) throw new Error(`residents getStaticPaths gave ${paths.length} paths`);
        const html = await container.renderToString(ResidentPage.default, { props: wren.props, params: wren.params });
        record("residentPage", html, {
          [C.REG]: regHasSentinel, [C.NEVER]: clean(html), [C.MEMBERS]: both(html),
          [C.TITLE_R]: title(html) === "Wren Fixture — resident of Postmark", [C.PLATE]: html.includes("Brass Hollow"),
        });
      }
      {
        const html = await container.renderToString(Card, { props: { r: MEMBERS[0] } });
        record("residentCard", html, { [C.REG]: regHasSentinel, [C.NEVER]: clean(html), [C.CARD]: html.includes("Wren Fixture") });
      }
    } finally { await server.close(); }
  } catch (e) { out.crash = String(e?.stack ?? e); }
  process.stdout.write("\n" + JSON.stringify(out) + "\n");
  process.exit(0);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  if (process.env.POS394_RENDER_PROOF !== "1") { console.error("pos394-render-proof: opt-in only: set POS394_RENDER_PROOF=1"); process.exit(2); }
  if (process.argv[2] === "--child") await child(process.argv.slice(3));
  else {
    const i = process.argv.indexOf("--mutant");
    const report = runProof({ mutant: i === -1 ? null : process.argv[i + 1] });
    console.log(JSON.stringify({ ...report, cases: undefined }, null, 2));
    process.exitCode = report.pass ? 0 : 1;
  }
}
