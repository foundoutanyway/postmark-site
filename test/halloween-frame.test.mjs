// The front page's Halloween frame: on inside the calendar window, nothing outside it,
// decorative only, no text in the art, none of the private things.
import test from "node:test";
import assert from "node:assert/strict";
import { frameOn, frameHTML, HALLOWEEN_FRAME } from "../src/lib/halloween-frame.mjs";

const at = (s) => Date.parse(s);

test("the window: on from 10-01, off from 2026-11-01 07:00Z", () => {
  assert.equal(frameOn(at("2026-09-30T23:59:59Z")), false);
  assert.equal(frameOn(at("2026-10-24T18:00:00Z")), true);
  assert.equal(frameOn(at("2026-11-01T06:59:59Z")), true);
  assert.equal(frameOn(at("2026-11-01T07:00:00Z")), false);
  assert.equal(frameOn(NaN), false);
});

test("outside the window every part renders nothing", () => {
  for (const part of ["top", "foot"]) assert.equal(frameHTML(part, at("2026-11-02T00:00:00Z")), "");
});

test("inside it: decorative only, no text, no private motifs", () => {
  for (const part of ["top", "foot"]) {
    const h = frameHTML(part, at("2026-10-25T12:00:00Z"));
    assert.match(h, /data-pm-hwf/);
    assert.match(h, /aria-hidden="true"/);
    assert.doesNotMatch(h, /<text|<title|<a\s|<button|tabindex/i);
    assert.doesNotMatch(h, /\b(spire|tower|chapel|candied|keys?)\b/i);
  }
  const top = frameHTML("top", at("2026-10-25T12:00:00Z"));
  assert.match(top, /pointer-events: none/);
  assert.match(top, /prefers-reduced-motion/);
  assert.ok(top.includes(String(Date.parse(HALLOWEEN_FRAME.until))), "the browser guard carries the end");
});
