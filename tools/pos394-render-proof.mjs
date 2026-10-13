#!/usr/bin/env node
// pos394-render-proof.mjs — OPT-IN render proof that the household surfaces never print the private human (POS-394).
//
//   POS394_RENDER_PROOF=1 node tools/pos394-render-proof.mjs --toolchain <abs dir> [--mutant <name>]
//
// NOT a test file: `npm test` (bare `node --test`) does not discover it, and it
// refuses to run without POS394_RENDER_PROOF=1. Importing it does nothing.
//
// WHAT IT RENDERS: the REAL templates, through Astro's own pipeline —
//   household   town/components/Household.astro, route "household" (the house
//               seat, which mounts HouseDashboard: the hd-sub line)
//   resident    town/components/Household.astro, route "resident" (the shared
//               chrome)
//   page        town/pages/households/[slug].astro, whole page with its layout
//               (<title> and <meta name="description">)
// each handed a house that STILL CARRIES an invented private human, so the
// prop boundary itself is tested, not only the fold that drops it upstream.
//
// HOW IT STAYS AWAY FROM DATA:
//   - a CODE-ONLY projection: an owned temp dir holding byte-for-byte copies of
//     an EXPLICIT list of source files, taken from git objects at HEAD (never
//     the working tree), each verified against its blob id. No records,
//     printouts, assets or generated trees are copied; public/ is an empty dir.
//   - the five generated JSON imports, src/lib/funding.mjs (Rivet 02:03Z, (a))
//     and src/lib/mists-season.mjs (PENDING RULING) are VIRTUAL modules with
//     invented literals; any other import of a protected id, or of
//     postmark-world, throws in the resolver before anything is read.
//   - the toolchain is a separate directory (--toolchain) holding only public
//     packages (astro, marked and their lockfile closure; no postmark-world).
//   - in the child: the pos394 fs guard over every fs binding with the
//     projection's protected roots, the toolchain's postmark-world and the
//     WHOLE original checkout denied; fetch/http/https/net/tls/dns refused;
//     child processes refused except the toolchain's exact esbuild binary;
//     workers refused. Every refusal is recorded and any refusal FAILS the run.
//   - configFile false, no integrations, empty publicDir, caches inside the
//     projection, no dep discovery, no watcher, no HMR, controlled env.
//
// MUTANTS (--mutant): the projection's copy of ONE file is replaced by its
// blob at the issue's base, which differs from HEAD by exactly the old
// private-human line (verified). The repository is never edited.
//   household-299   town/components/Household.astro       (chrome clause)
//   slug-48         town/pages/households/[slug].astro    (description clause)
//   dashboard-68    src/components/household-dashboard/HouseDashboard.astro (hd-sub clause)
//
// CLEANUP: the run owns its temp dir, Vite/Astro caches included, and removes
// it on success and on failure (removeOwnedTree: canonical, owned, links never
// followed, the toolchain and checkout never targets). If it cannot, the run
// FAILS; no one else is expected to clean up after it.
//
// LIMITS: funding chrome and the Halloween/mists chrome render from invented
// stubs and are NOT exercised; client <script> code is emitted, not run; zero
// refusals shows the run stayed inside what the guard sees, not containment of
// native/internal reads (esbuild's binary, internal module loaders, FileHandle
// methods, recursive subtrees walked natively).

import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire, syncBuiltinESMExports } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE = "165d9029e801a8d6f282559a5c820bbb39fd5290"; // train/2026-w43 when POS-394's site lane branched
const ESBUILD_BIN = "node_modules/@esbuild/linux-x64/bin/esbuild";
const PINS = { astro: "6.4.0", vite: "7.3.3", esbuild: "0.27.7", marked: "18.0.5" };

// The explicit projection: the render closure of the three targets, from git
// objects at HEAD. funding.mjs and mists-season.mjs are deliberately absent
// (virtual). Anything the templates import that is not here fails the run.
export const SOURCES = Object.freeze([
  "src/components/ChipRow.astro", "src/components/DoorLine.astro", "src/components/HalloweenBat.astro",
  "src/components/HalloweenMotif.astro", "src/components/HalloweenSkin.astro",
  "src/components/household-dashboard/HouseDashboard.astro", "src/components/household-dashboard/ResidentCard.astro",
  "src/layouts/BaseLayout.astro", "src/layouts/PostmarkLayout.astro",
  "src/lib/auth.mjs", "src/lib/civic-art.mjs", "src/lib/correspondents.mjs", "src/lib/door-line.mjs",
  "src/lib/freshness.mjs", "src/lib/fund-close.mjs", "src/lib/halloween-motifs.mjs", "src/lib/halloween-navy.mjs",
  "src/lib/halloween-skin.mjs", "src/lib/halloween-sprinkle.mjs", "src/lib/home-face.mjs", "src/lib/home-pick.mjs",
  "src/lib/home-picture.mjs", "src/lib/household-dashboard/faces.mjs", "src/lib/household-dashboard/fold.mjs",
  "src/lib/household-dashboard/paint.mjs", "src/lib/household-dashboard/reads.mjs", "src/lib/household.mjs",
  "src/lib/houses.mjs", "src/lib/last-active.mjs", "src/lib/media-door.mjs", "src/lib/meeps-quarter.mjs",
  "src/lib/nav.mjs", "src/lib/page-freshness.mjs", "src/lib/pixel-icons.mjs", "src/lib/pm.mjs",
  "src/lib/sentinel-alert.mjs", "src/lib/tutorial-registry.mjs", "src/lib/tutorial.mjs", "src/lib/world-cockpit.mjs",
  "src/lib/world-feed.mjs", "src/styles/global.css", "src/styles/postmark.css",
  "tools/lib/ids.mjs",
  "town/components/Household.astro", "town/pages/households/[slug].astro",
]);
// Each mutant's exact base..HEAD numstat for its one path. slug-48 is 1/1, not
// 0/1: the fix rewrote the description line rather than deleting it.
export const MUTANTS = Object.freeze({
  "household-299": { path: "town/components/Household.astro", added: 0, deleted: 1 },
  "slug-48": { path: "town/pages/households/[slug].astro", added: 1, deleted: 1 },
  "dashboard-68": { path: "src/components/household-dashboard/HouseDashboard.astro", added: 0, deleted: 1 },
});
export const CASES = Object.freeze({
  household: ["the input carries the private human (control)", "the HTML never carries it", "invented members rendered (the fixture reached the template)",
    "hd-sub present", "hd-sub keeps the public count", "hd-sub carries no human", "the plate is the key, title-cased"],
  resident: ["the input carries the private human (control)", "the HTML never carries it", "invented members rendered (the fixture reached the template)",
    "the plate is the key, title-cased"],
  page: ["the input carries the private human (control)", "the HTML never carries it", "invented members rendered (the fixture reached the template)",
    "title is the plate", "description is plate, public count and agents"],
});
export const REFUSAL_CHANNELS = Object.freeze(["fs", "net", "proc"]);

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
// PENDING RULING: siteMists() reads node_modules/postmark-world/WORLD/skeleton.json
// whenever it is called bare (HalloweenMotif/Bat/Skin do, at render). null is
// the real function's own "no season" answer.
const MISTS_STUB = `export const siteMists = () => null;\n`;

const under = (p, root) => p === root || p.startsWith(root.endsWith("/") ? root : root + "/");
const git = (...a) => execFileSync("git", ["-C", REPO, ...a], { maxBuffer: 64 * 1024 * 1024 });

// ── parent: build the projection, run the child, judge, clean up ────────────
function parent(argv) {
  const arg = (n) => { const i = argv.indexOf(n); return i === -1 ? null : argv[i + 1]; };
  const T = arg("--toolchain");
  const mutant = arg("--mutant");
  if (!T || !path.isAbsolute(T) || under(T, REPO)) die("--toolchain must be an absolute directory outside the checkout");
  if (mutant && !MUTANTS[mutant]) die(`unknown --mutant ${mutant}; one of ${Object.keys(MUTANTS).join(", ")}`);
  const pkgVersion = (name) => { try { return JSON.parse(fs.readFileSync(path.join(T, "node_modules", name, "package.json"), "utf8")).version; } catch { return null; } };
  for (const [name, v] of Object.entries(PINS)) if (pkgVersion(name) !== v) die(`toolchain ${name} is ${pkgVersion(name)}, pinned ${v}`);
  if (fs.existsSync(path.join(T, "node_modules", "postmark-world"))) die("the toolchain holds postmark-world; it must not");
  if (!fs.existsSync(path.join(T, ESBUILD_BIN))) die(`the toolchain has no ${ESBUILD_BIN}`);

  const HEAD = git("rev-parse", "--verify", "HEAD^{commit}").toString().trim(); // captured ONCE; every blob, diff and the report use it
  if (!/^[0-9a-f]{40}$/.test(HEAD)) die("could not capture the head");
  const P = fs.mkdtempSync(path.join(os.tmpdir(), "pos394-proj-"));
  const manifest = [];
  const fail = (msg) => { throw new Error(msg); };
  let verdict;
  try {
    for (const rel of SOURCES) {
      const ref = mutant && MUTANTS[mutant].path === rel ? BASE : HEAD;
      const blob = git("rev-parse", `${ref}:${rel}`).toString().trim();
      const bytes = git("cat-file", "blob", blob);
      const dest = path.join(P, rel);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, bytes, { flag: "wx" });
      const written = execFileSync("git", ["hash-object", "--no-filters", dest]).toString().trim();
      if (written !== blob) fail(`byte correspondence failed for ${rel}`);
      manifest.push({ path: rel, ref, blob });
    }
    if (mutant) {
      const { path: rel, added, deleted } = MUTANTS[mutant];
      const lines = git("diff", "--numstat", BASE, HEAD, "--", rel).toString().trim().split("\n").filter(Boolean);
      const [a, d, p] = (lines[0] ?? "").split("\t");
      if (lines.length !== 1 || p !== rel || Number(a) !== added || Number(d) !== deleted) {
        fail(`the ${mutant} mutant is not exactly +${added}/-${deleted} on ${rel} (${lines.join(" | ")})`);
      }
      const body = git("diff", "-U0", BASE, HEAD, "--", rel).toString().split("\n").filter((l) => /^[-+](?![-+])/.test(l));
      if (!body.some((l) => l.startsWith("-") && l.includes("house.human")) || body.some((l) => l.startsWith("+") && l.includes("human"))) {
        fail(`the ${mutant} mutant's change is not the old private-human clause`);
      }
    }
    for (const d of ["public-empty", "tmp"]) fs.mkdirSync(path.join(P, d));
    fs.writeFileSync(path.join(P, "package.json"), JSON.stringify({ name: "pos394-projection", private: true, type: "module" }), { flag: "wx" });
    fs.symlinkSync(path.join(T, "node_modules"), path.join(P, "node_modules"));

    const env = {
      PATH: "/usr/bin:/bin", HOME: P, TMPDIR: path.join(P, "tmp"), NODE_ENV: "development",
      POS394_RENDER_PROOF: "1", ESBUILD_BINARY_PATH: path.join(T, ESBUILD_BIN), ASTRO_TELEMETRY_DISABLED: "1",
    };
    const res = spawnSync(process.execPath, [fileURLToPath(import.meta.url), "--child", P, T], { cwd: P, env, encoding: "utf8", timeout: 180_000, maxBuffer: 64 * 1024 * 1024 });
    let out = null;
    try { out = JSON.parse(res.stdout.trim().split("\n").at(-1)); } catch { /* judged below */ }
    verdict = judge(out, res);
  } catch (e) {
    verdict = { pass: false, problems: [`setup: ${e.message}`] };
  }
  // The run owns P, caches and all, and removes it whatever happened. A
  // cleanup that cannot finish FAILS the run; nobody else cleans up after it.
  const cleanup = removeOwnedTree(P, { keepApart: [T, REPO] });
  if (!cleanup.ok) { verdict.pass = false; verdict.problems = [...(verdict.problems ?? []), `cleanup: ${cleanup.problem}`]; }
  const report = { mutant: mutant ?? null, head: HEAD, projection: manifest.length, cleanup, ...verdict };
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = verdict.pass ? 0 : 1;
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

/** The verdict, pure. Anything missing, extra, empty or not exactly expected FAILS. */
export function judge(out, res) {
  const problems = [];
  if (res?.error) problems.push(`child did not run: ${res.error.code ?? res.error.message}`);
  if (res?.signal) problems.push(`child killed by ${res.signal} (180 s bound)`);
  if (res?.status !== 0) problems.push(`child exit status ${res?.status}`);
  if (!out || typeof out !== "object") {
    return { pass: false, problems: [...problems, "child printed no result"], stderrTail: String(res?.stderr ?? "").split("\n").slice(-5) };
  }
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
    for (const c of expected) if (checks[c] !== true) problems.push(`${name}: ${c}`);
  }
  return { pass: problems.length === 0, problems, cases: out.cases, refusals: out.refusals, esbuildSpawns: out.esbuildSpawns };
}

function die(msg) { console.error(`pos394-render-proof: ${msg}`); process.exit(2); }

// ── child: guard everything, render, report ─────────────────────────────────
async function child([P, T]) {
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
    // processes: only the toolchain's exact esbuild binary
    const cp = req("node:child_process");
    const esbuild = path.join(T, ESBUILD_BIN);
    const realSpawn = cp.spawn;
    cp.spawn = (cmd, ...rest) => { if (cmd === esbuild) { out.esbuildSpawns++; return realSpawn(cmd, ...rest); } throw refuse("proc", `spawn ${cmd}`); };
    for (const n of ["exec", "execFile", "execSync", "execFileSync", "spawnSync", "fork"]) cp[n] = (cmd) => { throw refuse("proc", `${n} ${cmd}`); };
    req("node:worker_threads").Worker = class { constructor(f) { throw refuse("proc", `Worker ${f}`); } };
    syncBuiltinESMExports();

    const g = installFsGuard({
      roots: [path.join(P, "src/data/postmark"), path.join(P, "public/atelier/postmark"), path.join(P, "node_modules/postmark-world"),
        path.join(T, "node_modules/postmark-world"), REPO],
      cwd: P,
    });
    out.refusals.fs = g.denials;

    const fromT = createRequire(path.join(P, "package.json"));
    const { createServer } = await import(pathToFileURL(fromT.resolve("vite")).href);
    const { getViteConfig } = await import(pathToFileURL(fromT.resolve("astro/config")).href);
    const { experimental_AstroContainer } = await import(pathToFileURL(fromT.resolve("astro/container")).href);

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
      server: { middlewareMode: true, hmr: false, watch: null, fs: { strict: true, allow: [P, T] } },
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
      const { default: Household } = await server.ssrLoadModule("/town/components/Household.astro");
      const { default: Page } = await server.ssrLoadModule("/town/pages/households/[slug].astro");

      const common = (props, html) => ({
        "the input carries the private human (control)": JSON.stringify(props).includes(SENTINEL),
        "the HTML never carries it": !html.includes(SENTINEL),
        "invented members rendered (the fixture reached the template)": html.includes("Wren Fixture"),
      });
      {
        const props = { house: HOUSE, members: MEMBERS, active: "__house", route: "household" };
        const html = await container.renderToString(Household, { props });
        const sub = /<p class="hd-sub"[^>]*>([\s\S]*?)<\/p>/.exec(html)?.[1] ?? "";
        out.cases.household = { bytes: html.length, checks: {
          ...common(props, html),
          "hd-sub present": sub.length > 0,
          "hd-sub keeps the public count": /2 residents/.test(sub.replace(/<[^>]+>/g, "")),
          "hd-sub carries no human": !sub.includes(SENTINEL),
          "the plate is the key, title-cased": html.includes("Brass Hollow"),
        } };
      }
      {
        const props = { house: HOUSE, members: MEMBERS, active: MEMBERS[0].handle, route: "resident" };
        const html = await container.renderToString(Household, { props });
        out.cases.resident = { bytes: html.length, checks: { ...common(props, html), "the plate is the key, title-cased": html.includes("Brass Hollow") } };
      }
      {
        const props = { house: HOUSE };
        const html = await container.renderToString(Page, { props, params: { slug: HOUSE.path } });
        const title = /<title>([\s\S]*?)<\/title>/.exec(html)?.[1] ?? null;
        const desc = /<meta name="description" content="([^"]*)"/.exec(html)?.[1] ?? null;
        out.cases.page = { bytes: html.length, title, description: desc, checks: {
          ...common(props, html),
          "title is the plate": title === "Brass Hollow — a household in Postmark",
          "description is plate, public count and agents": desc === "Brass Hollow — 2 residents of Postmark: Wren Fixture, Moss Fixture.",
        } };
      }
    } finally { await server.close(); }
  } catch (e) { out.crash = String(e?.stack ?? e); }
  process.stdout.write("\n" + JSON.stringify(out) + "\n");
  process.exit(0);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  if (process.env.POS394_RENDER_PROOF !== "1") die("opt-in only: set POS394_RENDER_PROOF=1 (and hold Rivet's execution ACK)");
  if (process.argv[2] === "--child") await child(process.argv.slice(3));
  else parent(process.argv.slice(2));
}
