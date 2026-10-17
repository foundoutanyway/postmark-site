// mark-class.test.mjs — the site's one class helper reads both forms (S1, LOGOS v2).
//
//   M1  classOf over the table in the module's header: every old form and its
//       new form name the same class, on a world-state mark and on a graph node
//   M2  isA climbs only when given a tree; a naming is a predicate either way;
//       a loop stops
//   M3  a class node is never an instance of the class it declares (the
//       DEFINITION_KIND ruling in civic.mjs, now one rule for every reader)
//   M4  the readers routed through it answer the same for the new form as for
//       the old: predicatesOf, isIdea, isNotice, isContinuation
//
// Run: node --test test/mark-class.test.mjs

import test from "node:test";
import assert from "node:assert/strict";

import { classOf, isA, isClassNode, isInstanceOf, isPredicate, recordKind } from "../src/lib/mark-class.mjs";
import { predicatesOf, isIdea } from "../src/lib/civic.mjs";
import { isNotice } from "../src/lib/board.mjs";
import { isContinuation } from "../src/lib/world-lenses.mjs";

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
