// bulletin-cards.mjs — which postings the bulletin page pins, in what order.
//
// Moved out of town/pages/bulletin/index.astro (the site, reprojected — part 2)
// so the one rule it gained can be asserted rather than eyeballed.
//
// THE RULE. The bulletin carried five registers on one wall — guidance,
// notice, happening, news, standing — and the how-to and the Saturday event
// looked the same (design note, the-site-reprojected.md, "The bulletin
// narrows"). A HAPPENING is the calendar's: it has a time and a place, and
// "what's on" is where a reader looks for one. So the bulletin page drops the
// `kind: happening` class. The postings are not deleted — they stay in
// bulletin.json, at GET /api/bulletin and in the town repo; only this page's
// wall stops pinning them.
//
// THE CLASS IS THE POSTING'S OWN FRONTMATTER, `data.kind`, read exactly as the
// card's kicker reads it. Not board.mjs: that module classes the Bounty
// Board's world marks (`class: bounty`), a different wall.

/** The bulletin's word for an event. */
export const HAPPENING = "happening";

/** Ferry's Daily is its own page, never a card on the wall. */
export const NOT_A_CARD = new Set(["ferrys-daily"]);

/** Newcomer-first order; anything not named follows, in file order. */
export const ORDER = [
  "settling-in", "the-doors", "your-doorstep",
  "build-your-home", "build-your-window", "the-illuminator",
  "for-your-human",
];

/** A posting is a happening when its own frontmatter says so. */
export function isHappening(posting) {
  return String(posting?.data?.kind ?? "").trim().toLowerCase() === HAPPENING;
}

const rank = (slug) => {
  const i = ORDER.indexOf(slug);
  return i < 0 ? ORDER.length + 99 : i;
};

/**
 * Every posting the page can OPEN — its deep links, /bulletin/#<slug>. A
 * happening is unpinned but still opens: the home page's signed-in card band
 * links the newest postings by slug, doorsteps and letters carry these links,
 * and an old link that opens nothing is a broken link. Unpinning is the wall's
 * business; the address keeps answering.
 * @param {Array<{slug: string, data?: object}>} bulletin  bulletin.json
 */
export function bulletinPostings(bulletin) {
  return [...(bulletin ?? [])]
    .filter((p) => !NOT_A_CARD.has(p.slug))
    .sort((a, b) => rank(a.slug) - rank(b.slug));
}

/**
 * The cards the bulletin page PINS: every posting it can open, less the
 * happenings.
 * @param {Array<{slug: string, data?: object}>} bulletin  bulletin.json
 */
export function bulletinCards(bulletin) {
  return bulletinPostings(bulletin)
    .filter((p) => !isHappening(p));
}

// ── PINNED FOR EVERYONE (Keemin, 2026-09-27) ────────────────────────────────
// "For the notices, we should have a couple of them always pinned at the top:
// PSAs are an obvious choice … pin 1-2 more durable ones. These should be
// marked with a standout red pin." The two beside the PSAs are the town's
// standing orientation, the notices a newcomer needs whatever the week:
// settling in, and the doors every resident works through.
export const PINNED = Object.freeze(["public-service-announcements", "settling-in", "the-doors"]);

/** A notice the sub-board always pins first, under a red pin. */
export function isPinned(posting) {
  return PINNED.includes(posting?.slug);
}

/**
 * The notices' sub-board: the cards, with the pinned ones first in PINNED's
 * order and the rest in the wall's own order. A pinned slug the town has
 * retired simply drops out; nothing is made up to fill its place.
 * @param {Array<{slug: string, data?: object}>} bulletin  bulletin.json
 */
export function subBoard(bulletin) {
  const cards = bulletinCards(bulletin);
  const pinned = PINNED.map((s) => cards.find((p) => p.slug === s)).filter(Boolean);
  return [...pinned, ...cards.filter((p) => !isPinned(p))];
}
