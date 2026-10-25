// The front page's Halloween frame: on inside the calendar window, nothing outside it,
// decorative only, no text in the art, none of the private things.
import test from "node:test";
import assert from "node:assert/strict";
import { frameOn, frameShows, frameHTML, HALLOWEEN_FRAME } from "../src/lib/halloween-frame.mjs";

const at = (s) => Date.parse(s);
const MISTS = { crossing: 300, veil: 0.5, density: 0.9, t: 1 };   // what siteMists() answers while the Mists stand

test("the window: on from 10-01, off from 2026-11-01 07:00Z", () => {
  assert.equal(frameOn(at("2026-09-30T23:59:59Z")), false);
  assert.equal(frameOn(at("2026-10-24T18:00:00Z")), true);
  assert.equal(frameOn(at("2026-11-01T06:59:59Z")), true);
  assert.equal(frameOn(at("2026-11-01T07:00:00Z")), false);
  assert.equal(frameOn(NaN), false);
});

test("outside the window every part renders nothing", () => {
  for (const part of ["top", "foot"]) assert.equal(frameHTML(part, at("2026-11-02T00:00:00Z"), undefined, MISTS), "");
});

test("inside it: decorative only, no text, no private motifs", () => {
  for (const part of ["top", "foot"]) {
    const h = frameHTML(part, at("2026-10-25T12:00:00Z"), undefined, MISTS);
    assert.match(h, /data-pm-hwf/);
    assert.match(h, /aria-hidden="true"/);
    assert.doesNotMatch(h, /<text|<title|<a\s|<button|tabindex/i);
    assert.doesNotMatch(h, /\b(spire|tower|chapel|candied|keys?)\b/i);
  }
  const top = frameHTML("top", at("2026-10-25T12:00:00Z"), undefined, MISTS);
  assert.match(top, /pointer-events: none/);
  assert.match(top, /prefers-reduced-motion/);
  assert.ok(top.includes(String(Date.parse(HALLOWEEN_FRAME.until))), "the browser guard carries the end");
});

test("one switch with the skin: no Mists, no frame, even inside the window", () => {
  for (const part of ["top", "foot"]) assert.equal(frameHTML(part, at("2026-10-25T12:00:00Z"), undefined, null), "");
  assert.equal(frameShows(null, at("2026-10-25T12:00:00Z")), false);
  assert.equal(frameShows(MISTS, at("2026-10-25T12:00:00Z")), true);
});

test("the Mists may outlast Halloween, the frame does not: skin on, past UNTIL, off", () => {
  assert.equal(frameShows(MISTS, at("2026-11-01T06:59:59Z")), true);
  assert.equal(frameShows(MISTS, at("2026-11-01T07:00:00Z")), false);
  assert.equal(frameShows(MISTS, at("2026-11-20T00:00:00Z")), false);
});

test("it is drawn in the skin's palette, not the harbour-night one", async () => {
  const { VARIANTS } = await import("../src/lib/halloween-skin.mjs");
  const h = frameHTML("top", at("2026-10-25T12:00:00Z"), undefined, MISTS).toLowerCase();
  assert.ok(h.includes(VARIANTS[2].orange), "candle orange");
  assert.ok(h.includes(VARIANTS[2].violet), "violet");
  assert.ok(h.includes(VARIANTS[2].blood), "the rare blood red");
  for (const old of ["#3f8f93", "#e08a2c", "#2f2d5c", "#171b30"]) assert.ok(!h.includes(old), `the old harbour colour ${old} is gone`);
});
