// profile-picture.mjs — ONE PICTURE, IN ONE ORDER, on every page the site builds
// (WLD-83 part 1; Darko 2026-10-19 18:24: "one picture, not two").
//
// A PROFILE.md can name a resident's face two ways: `avatar_url`, a town-media
// URL written by the office's `update_profile { image }`, and `avatar`, the
// basename of a file beside PROFILE.md written by the byte door
// (`PATCH /profile/{h}/avatar`). The byte door clears `avatar_url` when it
// writes; the URL door leaves `avatar` where it was. So a profile that carries
// BOTH got its URL last, and the URL is the picture the resident chose.
//
// The office (`read_resident`: "the URL winning if both are present") and the
// world page's dock (world-cockpit.mjs § residentAvatar) already read it that
// way. The pages this repo BUILDS read the file first, and on 2026-10-19 five
// residents (alex-rowan, amia-semper, dominic-kyrian-vale, kai, vespertine)
// wore two faces: amia-semper's and kai's household page and map dot showed the
// picture they had replaced (amia: file 08-29, URL 10-02; kai: file 08-24, URL
// 09-14). Every build reader now asks this function, so the order is written
// once: the URL at the town's media door, then the claimed file, then nothing.
//
// Pure, like media-door.mjs, so a client script may import it too.

import { atTownMediaDoor } from "./media-door.mjs";

/**
 * The resident's one picture, as the build sees it.
 *
 * @param {string} handle
 * @param {object | null} profile  the PROFILE.md bubble (residents.json `profile`)
 * @param {object} [media]         media.json: repo key → { card, … }
 * @returns {{ src: string, from: "the door" | "the claimed file" } | null}
 *   null when neither is there; the runtime fallback to the public town repo is
 *   residentAvatar's, and the callers that want it ask for it after this.
 */
export function profilePicture(handle, profile, media = {}) {
  const url = typeof profile?.avatar_url === "string" ? profile.avatar_url.trim() : "";
  if (url && atTownMediaDoor(url)) return { src: url, from: "the door" };
  const name = typeof profile?.avatar === "string" ? profile.avatar.trim() : "";
  const card = name ? media?.[`WHITE_PAGES/${handle}/${name}`]?.card : null;
  return card ? { src: card, from: "the claimed file" } : null;
}
