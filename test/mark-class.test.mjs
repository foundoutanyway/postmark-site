// mark-class.test.mjs — the site's one class helper reads both forms (S1, LOGOS v2).
//
//   M1  classOf over the table in the module's header: every old form and its
//       new form name the same class, on a world-state mark and on a graph node
//   M2  isA climbs only when given a tree; a naming is a predicate either way;
//       a loop stops
//   M3  a class node is never an instance of the class it declares (the
//       DEFINITION_KIND ruling in civic.mjs, now one rule for every reader)
//   M4  the readers routed through it answer the same for the new form as for
//       the old: predicatesOf, isIdea, isNotice, isContinuation; and a mark of
//       the old form carrying BOTH fields (`kind: predicated` + `class: idea`,
//       three on world main) is a predicate by its kind and an idea by its class
//   M5  the serialization map's scope goes through the helper: a `kind: thing`
//       mark reads as sited and a `kind: predicate` one as predicated, so the
//       census owes no false debt after W2; a property node is a declaration
//   M6  the readers whose flips stay green today, held on the new form: harbor's
//       charters and their predicates, the cockpit's parcel, lawMeasures' count
//
// Run: node --test test/mark-class.test.mjs

import test from "node:test";
import assert from "node:assert/strict";

import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { classOf, isA, isClassNode, isInstanceOf, isPredicate, recordKind } from "../src/lib/mark-class.mjs";
import { loadCharters } from "../src/lib/harbor.mjs";
import { ownParcelIn } from "../src/lib/world-cockpit.mjs";
import { predicatesOf, isIdea } from "../src/lib/civic.mjs";
import { isNotice } from "../src/lib/board.mjs";
import { REGISTRY_OWN, classRegistry, fieldCensus, filterBucketOf, isContinuation, lawMeasures, mapScopeOf, serializationOf } from "../src/lib/world-lenses.mjs";

// [old form, new form, the class both name]
const PAIRS = [
  [{ kind: "sited", class: "thing" }, { kind: "thing" }, "thing"],
  [{ kind: "sited" }, { kind: "sited" }, "sited"],
  [{ kind: "parcel" }, { kind: "parcel" }, "parcel"],
  [{ kind: "predicated", slot: "s", value: "v" }, { kind: "predicate", slot: "s", value: "v" }, "predicate"],
  [{ kind: "naming", value: "N" }, { kind: "naming", value: "N" }, "naming"],
  [{ kind: "sited", class: "idea" }, { kind: "idea" }, "idea"],
];
const asNode = (m) => { const { kind, ...rest } = m; return { kind: "mark", subkind: kind, ...rest }; };

test("M1: an old form and its new form name the same class, as a world-state mark and as a graph node", () => {
  for (const [old, neu, cls] of PAIRS) {
    assert.equal(classOf(old), cls, `old ${JSON.stringify(old)}`);
    assert.equal(classOf(neu), cls, `new ${JSON.stringify(neu)}`);
    assert.equal(classOf(asNode(old)), cls, `old as a node ${JSON.stringify(old)}`);
    assert.equal(classOf(asNode(neu)), cls, `new as a node ${JSON.stringify(neu)}`);
  }
  assert.equal(recordKind({ kind: "mark", subkind: "parcel" }), "parcel", "a graph node's record kind is its subkind");
  assert.equal(recordKind({ kind: "mark" }), "mark", "a row with no subkind key is read as it is");
  assert.equal(classOf(null), null);
  assert.equal(classOf({}), null);
  assert.equal(classOf({ kind: "sited", class: "  " }), "sited", "a blank class: names nothing");
});

test("M2: isA climbs only with a tree; a naming is a predicate either way; a loop stops", () => {
  const tree = { candy: "consumable", consumable: "thing", thing: "mark", mark: "postmark-node", a: "b", b: "a" };
  const extendsOf = (c) => tree[c] ?? null;
  assert.ok(isA({ kind: "candy" }, "candy"));
  assert.ok(!isA({ kind: "candy" }, "thing"), "no tree, exact only");
  assert.ok(isA({ kind: "candy" }, "thing", { extendsOf }));
  assert.ok(isA({ kind: "sited", class: "candy" }, "thing", { extendsOf }), "the old form climbs the same");
  assert.ok(!isA({ kind: "a" }, "zzz", { extendsOf }), "a loop ends");
  for (const m of [{ kind: "predicated" }, { kind: "predicate" }, { kind: "naming" }, { kind: "mark", subkind: "naming" }]) assert.ok(isPredicate(m), JSON.stringify(m));
  for (const m of [{ kind: "sited" }, { kind: "parcel" }, { kind: "thing" }]) assert.ok(!isPredicate(m), JSON.stringify(m));
});

test("M3: a class node is never an instance of the class it declares", () => {
  const decl = { id: "the-town/idea", kind: "class", class: "idea" };
  assert.ok(isClassNode(decl));
  assert.ok(isClassNode({ kind: "mark", subkind: "sited", class: "idea", declares: true }), "the store's own declares fact");
  assert.ok(!isInstanceOf(decl, "idea"));
  assert.ok(isInstanceOf({ kind: "sited", class: "idea" }, "idea"));
  assert.ok(isInstanceOf({ kind: "idea" }, "idea"));
});

test("M4: the routed readers answer the new form as they answered the old", () => {
  const place = "kai/the-shop";
  const state = (kind) => ({ marks: [
    { id: "kai/sign", kind, slot: "trade", value: "bread", parent: place },
    { id: "kai/name", kind: "naming", value: "The Shop", parent: place },
  ] });
  assert.deepEqual(predicatesOf(place, { state: state("predicate") }), predicatesOf(place, { state: state("predicated") }));
  assert.deepEqual(predicatesOf(place, { state: state("predicated") }), [{ slot: "trade", value: "bread" }], "a naming carries no slot, so it adds no row");
  assert.equal(isIdea({ kind: "idea" }), isIdea({ kind: "sited", class: "idea" }));
  assert.ok(isIdea({ kind: "idea" }));
  assert.ok(!isIdea({ kind: "class", class: "idea" }), "the class node is not an idea");
  const board = "let-there-be-light/the-town-centre/the-bounty-board";
  assert.equal(isNotice({ kind: "bounty", placementParent: board }, { boardPlace: board }), true);
  assert.equal(isNotice({ kind: "sited", class: "bounty", placementParent: board }, { boardPlace: board }), true);
  assert.equal(isNotice({ kind: "class", class: "bounty", placementParent: board }, { boardPlace: board }), false, "nor is the bounty class node a notice");
  assert.ok(isContinuation({ kind: "mark", subkind: "predicate" }));
  assert.ok(isContinuation({ kind: "mark", subkind: "predicated" }));
  assert.ok(isContinuation({ kind: "mark", subkind: "naming" }));
  assert.ok(!isContinuation({ kind: "mark", subkind: "sited" }));
});

test("M4b: a dual-field record (kind: predicated + class: idea) is a predicate by its kind and an idea by its class", () => {
  const dual = { id: "let-there-be-light/the-dropped-field", kind: "predicated", class: "idea", slot: "field", value: "dropped", parent: "kai/the-shop" };
  assert.ok(isPredicate(dual));
  assert.ok(isIdea(dual), "and still an idea, as it was");
  assert.ok(isContinuation({ kind: "mark", subkind: "predicated", class: "idea" }));
  assert.deepEqual(predicatesOf("kai/the-shop", { state: { marks: [dual] } }), [{ slot: "field", value: "dropped" }], "its slot counts on the place it describes");
  const measured = lawMeasures([{ id: dual.id, kind: "mark", subkind: "predicated", class: "idea", keys: ["kind", "slot", "value"] }]);
  assert.equal(measured.find((r) => r.key === "predicates").now, 1, "and in the law's predicate count");
});

test("M5: the serialization map's scope goes through the helper, so the new form owes no false debt", () => {
  const node = (subkind, keys, extra = {}) => ({ id: `x/${subkind}`, kind: "mark", subkind, keys, ...extra });
  assert.equal(mapScopeOf(node("sited", [])), "sited");
  assert.equal(mapScopeOf(node("thing", [])), "sited", "a sited subclass the map does not name reads as sited");
  assert.equal(mapScopeOf(node("candy", [])), "sited");
  assert.equal(mapScopeOf(node("predicate", [])), "predicated");
  assert.equal(mapScopeOf(node("naming", [])), "naming", "a kind the map names is its own scope");
  assert.equal(mapScopeOf(node("class", [])), "class", "a declaration has no standing scope");
  assert.equal(mapScopeOf(node("property", [])), "property");
  const siteKeys = ["kind", "by", "tier", "at", "extent", "date", "points"];
  const predKeys = ["kind", "by", "tier", "date", "slot", "value"];
  const strip = (r) => ({ edges: r.edges.map((e) => e.key), predicates: r.predicates.map((p) => p.key), residue: r.residue.map((x) => x.key), debt: r.debt.map((x) => x.key) });
  assert.deepEqual(strip(serializationOf(node("thing", siteKeys))), strip(serializationOf(node("sited", siteKeys))), "a thing is serialized as the sited mark it was");
  assert.deepEqual(strip(serializationOf(node("predicate", predKeys))), strip(serializationOf(node("predicated", predKeys))), "a predicate as the predicated mark it was");
  const census = (subkind, keys) => fieldCensus([node(subkind, keys)]).rows;
  assert.deepEqual(census("thing", siteKeys), census("sited", siteKeys));
  assert.deepEqual(census("predicate", predKeys), census("predicated", predKeys));
  assert.ok(isClassNode({ kind: "property" }) && isClassNode({ kind: "mark", subkind: "property" }), "a property node is a declaration");
  assert.ok(!isInstanceOf({ kind: "property", class: "idea" }, "idea"));
});

test("M6: harbor's charters, the cockpit's parcel and lawMeasures' count read the new form as the old", () => {
  const registry = (kinds) => {
    const dir = mkdtempSync(join(tmpdir(), "s1-harbor-"));
    const write = (rel, fm, body) => { mkdirSync(join(dir, rel), { recursive: true }); writeFileSync(join(dir, rel, "mark.md"), `---\n${fm}\n---\n${body}\n`); };
    write("1f916", `by: the-town\n${kinds.charter}\ntier: constitution\ndate: 2026-10-01`, "the forum");
    write("1f916/door", `by: the-town\n${kinds.predicate}\nslot: door\nvalue: the forum's gate\ndate: 2026-10-01`, "its door");
    return dir;
  };
  const read = (kinds) => loadCharters({ path: registry(kinds) }).map((t) => ({ slug: t.slug, door: t.door, slots: t.predicates.map((p) => p.slot) }));
  const old = read({ charter: "kind: sited\nclass: town", predicate: "kind: predicated" });
  assert.deepEqual(old, [{ slug: "1f916", door: "the forum's gate", slots: ["door"] }], "the old form reads");
  assert.deepEqual(read({ charter: "kind: town", predicate: "kind: predicate" }), old, "the new form reads the same");
  const within = (w) => ({ within: [{ id: "the-town/the-town-centre", by: "the-town", kind: "sited" }, w] });
  for (const w of [{ id: "kai/the-shop-ground", by: "kai", kind: "parcel" }, { id: "kai/the-shop-ground", by: "kai", kind: "sited", class: "parcel" }])
    assert.equal(ownParcelIn(within(w), ["kai"]), "kai/the-shop-ground", JSON.stringify(w));
  assert.equal(ownParcelIn(within({ id: "kai/the-shop", by: "kai", kind: "thing" }), ["kai"]), null);
  const count = (subkind) => lawMeasures([{ id: "x", kind: "mark", subkind, keys: ["kind", "slot", "value"] }]).find((r) => r.key === "predicates").now;
  assert.equal(count("predicate"), count("predicated"));
  assert.equal(count("predicated"), 1);
  assert.equal(count("naming"), 0, "a naming is not a slot-and-value record");
});

test("M7 (WLD-73 G10/G11): every predicate read answers kind: predicated and kind: predicate the same, pen and state alike", () => {
  const place = "kai/the-shop";
  const plaque = (kind) => ({ id: "kai/sign", kind, slot: "trade", value: "bread", parent: place });
  for (const where of ["pen", "state"]) {
    const feed = (kind) => (where === "pen" ? { pen: { "kai/sign": plaque(kind) } } : { state: { marks: [plaque(kind)] } });
    const old = predicatesOf(place, feed("predicated"));
    assert.deepEqual(old, [{ slot: "trade", value: "bread" }], `${where}: the old form reads`);
    assert.deepEqual(predicatesOf(place, feed("predicate")), old, `${where}: the new form reads the same`);
  }
  // the store publishes kind: <class> with no class: (G11 A), as a graph node's subkind
  for (const subkind of ["predicated", "predicate"]) {
    const d = { id: "kai/sign", kind: "mark", subkind, keys: ["kind", "by", "date", "slot", "value", "parent"] };
    assert.ok(isContinuation(d), `${subkind}: a continuation`);
    assert.equal(mapScopeOf(d), "predicated", `${subkind}: the map's predicated scope`);
  }
  assert.deepEqual(serializationOf({ kind: "mark", subkind: "predicate", keys: ["slot", "value", "parent"] }),
    serializationOf({ kind: "mark", subkind: "predicated", keys: ["slot", "value", "parent"] }), "the slot rows read the same");
});

test("M8: W1's property nodes are declarations: the cutover meter counts none of them as unaddressable, and says how many on their own line", () => {
  const cls = (name) => ({ id: `the-town/${name}`, kind: "mark", subkind: "class", class: name, by: "the-town", tier: "constitution", declares: true });
  // the store's rows of kind property, as W1 writes them (name, default, property_tier, parent; no class:)
  const prop = (parent, name, dflt) => ({ id: `the-town/${parent}-${name}`, kind: "mark", subkind: "property", by: "the-town", tier: "constitution",
    name, default: dflt, property_tier: "constitution", parent: `the-town/${parent}` });
  const instances = [
    { id: "kai/the-good-lighter", kind: "mark", subkind: "thing", by: "kai" },
    { id: "kai/the-shop-ground", kind: "mark", subkind: "parcel", by: "kai" },
    { id: "kai/a-bench", kind: "mark", subkind: "sited", by: "kai" },
  ];
  const props = [prop("thing", "portable", true), prop("thing", "holder", false), prop("resident", "capacity", 24), prop("parcel", "extent_m", 25)];
  const nodes = [cls("thing"), cls("parcel"), cls("resident"), ...props, ...instances];
  const r = classRegistry(nodes);
  assert.equal(r.marks, 3, "only instances are counted");
  assert.equal(r.citing, 2, "the thing and the parcel name registered classes");
  assert.equal(r.unaddressable, 1, "the plain sited mark, and no property node");
  assert.deepEqual(r.unregisteredKinds, [["sited", 1]], "no 'kind: property' in the older vocabulary");
  assert.equal(r.propertyNodes, 4);
  const m = Object.fromEntries(lawMeasures(nodes).map((x) => [x.key, x]));
  assert.equal(m["property-nodes"].now, 4);
  assert.equal(m.citing.of, 3);
  const set = new Set(r.registered);
  for (const p of props) assert.equal(filterBucketOf(p, set), REGISTRY_OWN, `${p.id}: the registry's own chip, never the older vocabulary`);
  // the same world without its property nodes reads the same meter: they add a line, never a debt
  const without = classRegistry([cls("thing"), cls("parcel"), cls("resident"), ...instances]);
  assert.deepEqual({ ...without, propertyNodes: 4 }, r);
});

test("M9: a W1-shaped property row carries no mapping debt: its fixed fields are lawful and its parent is containment", () => {
  const row = { id: "the-town/thing-portable", kind: "mark", subkind: "property", by: "the-town", tier: "constitution",
    keys: ["kind", "by", "tier", "date", "name", "of", "default", "property_tier", "parent"] };
  const r = serializationOf(row);
  assert.deepEqual(r.debt, [], "no key is the map's debt");
  assert.deepEqual(r.predicates.map((p) => [p.key, p.lawful]), [["name", true], ["of", true], ["default", true], ["property_tier", true]]);
  assert.ok(r.edges.some((e) => e.key === "parent" && e.edge === "containment"));
  assert.equal(fieldCensus([row]).rows.unmapped, 0);
  assert.equal(lawMeasures([row]).find((x) => x.key === "debt").now, 0, "the law's debt measure stays where it was");
});
