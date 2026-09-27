// the-board-mock.mjs — the design mock for POS-273 (the board holds the town).
//
// A static sheet, not the page: it draws the board closed and one piece open
// from the real data and the real art (bulletin.json, calendar.json, the civic
// sprites, the pixel icons), so the design is argued over what the town
// actually holds. Writes qa-shots/the-board-mock.html; open it at #open-calendar
// for the open panel.
//
//   node qa-shots/the-board-mock.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { bulletinCards } from "../src/lib/bulletin-cards.mjs";
import { dailyFront, pinnedMonth, postitLook, tendedText } from "../src/lib/bulletin-board.mjs";
import { WEEKDAYS } from "../src/lib/calendar.mjs";
import { paint, SPRITE_W, SPRITE_H } from "../src/lib/civic-art.mjs";
import { iconSvg } from "../src/lib/pixel-icons.mjs";
import { LANES } from "../src/lib/civic.mjs";
import { MEEPS, displayName } from "../src/lib/meeps-quarter.mjs";
import { postingTitle } from "../src/lib/pm.mjs";

const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), "utf8"));
const bulletin = read("../src/data/postmark/bulletin.json");
const calendar = read("../src/data/postmark/calendar.json");
const cards = bulletinCards(bulletin);
const month = pinnedMonth(calendar);
const daily = dailyFront(bulletin);
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

const sprite = (name, cls = "px") =>
  `<svg class="${cls}" viewBox="0 0 ${SPRITE_W} ${SPRITE_H}" shape-rendering="crispEdges" aria-hidden="true">` +
  paint(name).map((r) => `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="1" fill="${r.fill}"/>`).join("") +
  `</svg>`;

// a round postmark: two rings, the town's name on top, a date or a crossing
const cancel = (top, mid, bottom, cls = "") => `
  <svg class="cancel ${cls}" viewBox="0 0 100 100" aria-hidden="true">
    <defs><path id="arc-${cls}" d="M 18 50 A 32 32 0 0 1 82 50"/></defs>
    <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" stroke-width="3"/>
    <circle cx="50" cy="50" r="36" fill="none" stroke="currentColor" stroke-width="1.4"/>
    <text font-size="10.5" letter-spacing="2" fill="currentColor"><textPath href="#arc-${cls}" startOffset="50%" text-anchor="middle">${top}</textPath></text>
    <text x="50" y="58" font-size="15" font-weight="700" text-anchor="middle" fill="currentColor">${mid}</text>
    <text x="50" y="74" font-size="8.5" letter-spacing="1.5" text-anchor="middle" fill="currentColor">${bottom}</text>
  </svg>`;
// the ferry's wake: the wavy cancellation lines a machine postmark trails
const waves = (cls = "") => `
  <svg class="waves ${cls}" viewBox="0 0 120 40" aria-hidden="true" preserveAspectRatio="none">
    ${[6, 16, 26, 36].map((y) => `<path d="M0 ${y} q7.5 -6 15 0 t15 0 t15 0 t15 0 t15 0 t15 0 t15 0 t15 0" fill="none" stroke="currentColor" stroke-width="2.2"/>`).join("")}
  </svg>`;

const dayCells = month.weeks.map((w) => `<tr>${w.map((d) =>
  `<td class="${[!d.inMonth && "out", d.today && "today", d.events.length && "on"].filter(Boolean).join(" ")}">${d.day}</td>`).join("")}</tr>`).join("");

const bigCells = month.weeks.map((w) => `<tr>${w.map((d) =>
  `<td class="bd ${!d.inMonth ? "is-out" : ""} ${d.today ? "is-today" : ""}"><span class="bn">${d.day}</span>${d.today ? cancel("POSTMARK", String(d.day), "TODAY", "td") : ""}</td>`).join("")}</tr>`).join("");

const notes = cards.slice(0, 5).map((p, i) => {
  const look = postitLook(i);
  return `<span class="note n${i}" style="--paper:${look.bg}">${i === 4 ? `<b>Pinned for everyone</b><em>${esc(postingTitle(cards[0]))} · ${esc(postingTitle(cards[1]))} · …</em>` : ""}</span>`;
}).join("");

const meeps = MEEPS.map((m) => {
  const face = m.key === "postmaster" ? sprite("postmaster", "px meep")
    : `<span class="mono">${esc(displayName(m).replace(/^The /, "").charAt(0))}</span>`;
  return `<li>${face}<span class="mn">${esc(m.name ?? displayName(m).replace(/^the /i, ""))}</span></li>`;
}).join("");

const quarter = LANES.map((l) => `<span class="lot">${sprite(l.key, "px bld")}</span>`).join("");

const html = `<!doctype html>
<html lang="en" class="pm"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>The board — design mock (POS-273)</title>
<style>
:root{--pm-night:#070b15;--pm-harbor:#0d1426;--pm-harbor-2:#1c2c4f;--pm-paper:#f7efdc;--pm-paper-deep:#efe3c8;--pm-ink:#2e2417;--pm-ink-soft:#6d5c44;--pm-line:#e3d4b8;--pm-gold:#e8c48b;--pm-gold-bright:#f6dcae;--pm-accent:#a4632a;--pm-wax:#9c3f2e;--pm-stamp:#aa8fd8;
--pm-serif:"Iowan Old Style","Palatino Linotype",Palatino,Georgia,Charter,serif;--pm-mono:ui-monospace,"SF Mono",Consolas,monospace}
*{box-sizing:border-box}
body{margin:0;min-height:100vh;color:#ece1cf;font-family:var(--pm-serif);background:radial-gradient(120% 90% at 50% -10%,#1c2c4f,#0d1426 48%,#070b15) fixed,#070b15}
.rail{display:flex;gap:1.2em;align-items:center;justify-content:center;flex-wrap:wrap;padding:1em;font-family:var(--pm-mono);font-size:.74rem;letter-spacing:.08em;color:rgba(232,196,139,.75);border-bottom:1px solid rgba(232,196,139,.12)}
.rail b{color:#241505;background:linear-gradient(180deg,var(--pm-gold-bright),var(--pm-gold));padding:.45em .8em;border-radius:999px}
.rail .gone{font-style:italic;opacity:.55}
.page{max-width:1120px;margin:0 auto;padding:1.4em 16px 3em}
.head{text-align:center;margin:0 0 1.3em}
.head h1{margin:0;font-size:clamp(2rem,5vw,2.9rem);color:var(--pm-gold-bright);text-shadow:0 0 34px rgba(232,196,139,.35)}
.head p{margin:.3em 0 0;font-style:italic;color:rgba(232,196,139,.8)}

/* THE BOARD: the office wall's cork (the civic art's wall browns) in a timber
   frame whose sill is a strip of the quay's wet stone */
.board{position:relative;padding:2.6em 2em 3.2em;border:14px solid #3a2a1a;border-bottom-width:0;border-radius:10px 10px 0 0;
 background:radial-gradient(ellipse at 18% 6%,rgba(232,196,139,.16),transparent 55%),radial-gradient(ellipse at 88% 100%,rgba(7,11,21,.45),transparent 60%),
 repeating-radial-gradient(circle at 37% 61%,rgba(0,0,0,.1) 0 1px,transparent 1px 4px),repeating-radial-gradient(circle at 71% 23%,rgba(246,220,174,.05) 0 1px,transparent 1px 5px),linear-gradient(180deg,#655741,#443c30);
 box-shadow:inset 0 0 0 2px rgba(232,196,139,.3),inset 0 0 60px rgba(0,0,0,.5),0 24px 60px rgba(0,0,0,.5);
 display:grid;grid-template-columns:1.05fr 1.5fr 1fr;grid-template-areas:"cal news notes" "card card meeps";gap:2.2em 2em;align-items:start}
.sill{height:18px;border-radius:0 0 10px 10px;background:
 repeating-linear-gradient(90deg,#2f3a56 0 22px,#465577 22px 26px,#2f3a56 26px 58px,#465577 58px 60px);box-shadow:0 0 0 1px rgba(232,196,139,.18),0 18px 40px rgba(0,0,0,.5);margin:0 0 .6em}
.plaque{position:absolute;top:-14px;left:50%;transform:translate(-50%,-50%);padding:.35em 1.1em;background:linear-gradient(180deg,#c9a468,#8f6f3d);color:#241505;border-radius:4px;font-family:var(--pm-mono);font-size:.62rem;font-weight:700;letter-spacing:.26em;text-transform:uppercase;box-shadow:0 3px 8px rgba(0,0,0,.6);white-space:nowrap}
.piece{position:relative;display:block;text-decoration:none;color:inherit;transform:rotate(var(--tilt,0deg));transition:transform .16s ease}
.piece:hover{transform:rotate(var(--tilt,0deg)) translateY(-3px)}
.tack{position:absolute;top:-7px;left:50%;margin-left:-7px;width:14px;height:14px;border-radius:50%;z-index:3;background:radial-gradient(circle at 35% 30%,#f6dcae,#b08d4d 55%,#6d5c44);box-shadow:0 2px 3px rgba(0,0,0,.6)}
.why{display:block;margin:.8em .2em 0;font-family:var(--pm-mono);font-size:.62rem;line-height:1.5;letter-spacing:.04em;color:#f6dcae;background:rgba(7,11,21,.72);padding:.45em .6em;border-radius:6px;border-left:2px solid var(--pm-gold);transform:rotate(calc(var(--tilt,0deg) * -1))}
.cancel{color:var(--pm-wax);font-family:var(--pm-mono)}
.waves{color:var(--pm-wax)}

/* 1 · the calendar, dark, like /calendar/ */
.cal{grid-area:cal;--tilt:-1.6deg;padding:1.2em 1em 1em;border-radius:10px;background:linear-gradient(160deg,var(--pm-harbor-2),var(--pm-harbor));border:1px solid rgba(232,196,139,.35);box-shadow:0 10px 22px rgba(0,0,0,.55)}
.kick{display:block;text-align:center;font-family:var(--pm-mono);font-size:.6rem;letter-spacing:.2em;text-transform:uppercase;color:rgba(232,196,139,.8)}
.cal .mon{display:block;text-align:center;font-weight:700;font-size:1.15rem;color:#f4e9d7;margin:.1em 0 .4em}
.mini{width:100%;border-collapse:collapse;table-layout:fixed;font-family:var(--pm-mono)}
.mini th{font-size:.58rem;color:rgba(232,196,139,.75);font-weight:400;padding:0 0 .3em;border-bottom:1px solid rgba(232,196,139,.25)}
.mini td{text-align:center;font-size:.7rem;line-height:1.95;color:#cdc2ab}
.mini td.out{opacity:.3}
.mini td.today{position:relative;color:var(--pm-gold-bright);font-weight:700}
.mini td.today::after{content:"";position:absolute;inset:1px 2px;border:1.5px solid #e0846b;border-radius:50%;box-shadow:0 0 0 2px rgba(224,132,107,.25)}
.cal .next{display:block;text-align:center;font-size:.78rem;font-style:italic;color:#b9ae98;margin-top:.5em}

/* 2 · Ferry's Daily, the front page as newsprint */
.news{grid-area:news;--tilt:.7deg;padding:1.4em 1.4em 1.1em;background:linear-gradient(180deg,rgba(109,92,68,.06),transparent 30%),var(--pm-paper-deep);color:var(--pm-ink);box-shadow:0 10px 22px rgba(0,0,0,.55);clip-path:polygon(0 0,100% 0,100% 97%,96% 100%,88% 98%,76% 100%,62% 98.5%,48% 100%,33% 98%,18% 100%,6% 98%,0 100%)}
.news .mast{display:block;text-align:center;font-weight:700;font-size:clamp(1.7rem,3vw,2.3rem);line-height:1.05;border-bottom:3px double var(--pm-ink);padding-bottom:.15em}
.news .dl{display:block;text-align:center;font-family:var(--pm-mono);font-size:.6rem;letter-spacing:.12em;text-transform:uppercase;color:var(--pm-ink-soft);padding:.35em 0;border-bottom:1px solid rgba(46,36,23,.35)}
.news .lead{display:block;font-weight:700;font-size:1.3rem;line-height:1.2;margin:.4em 0 .3em}
.news .sf{display:block;font-size:.88rem;line-height:1.55;columns:2 12em;column-gap:1.3em}
.news .cancel{position:absolute;bottom:2.6em;right:.3em;width:78px;height:78px;transform:rotate(-14deg);opacity:.78}
.news .waves{position:absolute;bottom:3.6em;right:5em;width:110px;height:34px;opacity:.45}
.news .sf{padding-right:5.5em}

/* 3 · the post-its: a cluster, one click for all of them */
.notes{grid-area:notes;--tilt:0deg;height:15.5em;margin-top:.4em}
.note{position:absolute;width:10.5em;height:10.5em;background:linear-gradient(180deg,rgba(0,0,0,.06),transparent 16%),var(--paper);box-shadow:0 7px 14px rgba(0,0,0,.45);padding:1em .9em;font-size:.9rem;color:var(--pm-ink);line-height:1.3}
.n0{left:6%;top:6%;transform:rotate(-9deg)}.n1{left:38%;top:0;transform:rotate(7deg)}.n2{left:2%;top:36%;transform:rotate(4deg)}.n3{left:40%;top:38%;transform:rotate(-6deg)}
.n4{left:20%;top:18%;transform:rotate(-1.5deg);z-index:2;display:flex;flex-direction:column;justify-content:center;text-align:center}
.n4 b{font-size:1.05rem}.n4 em{display:block;margin-top:.4em;font-size:.72rem;color:var(--pm-ink-soft)}
.n4::after{content:"${cards.length} notices · open all";display:block;margin-top:.6em;font-family:var(--pm-mono);font-size:.58rem;letter-spacing:.14em;text-transform:uppercase;color:var(--pm-accent)}
.notes .tack{top:14%;left:48%}
.notes .why{position:absolute;bottom:-3.6em;left:0;right:0}

/* 4 · the civic quarter, a postcard from the quay */
.card{grid-area:card;--tilt:-.9deg;display:grid;grid-template-columns:1fr auto;gap:0 1em;padding:1em 1.1em 1.1em;border-radius:6px;background:var(--pm-paper);box-shadow:0 10px 24px rgba(0,0,0,.55)}
.card .pic{grid-column:1/-1;position:relative;border-radius:3px;overflow:hidden;background:linear-gradient(180deg,#070b15 0%,#1c2c4f 70%,#2f3a56 100%);padding:1.3em .8em 0;display:flex;justify-content:center;align-items:flex-end;gap:.3em}
.card .pic::before{content:"";position:absolute;inset:0;background:radial-gradient(1.5px 1.5px at 12% 18%,#f6dcae,transparent),radial-gradient(1px 1px at 33% 9%,#f6dcae,transparent),radial-gradient(1.5px 1.5px at 71% 14%,#f6dcae,transparent),radial-gradient(1px 1px at 88% 30%,#f6dcae,transparent),radial-gradient(1px 1px at 52% 24%,#e8c48b,transparent)}
.card .lot{flex:1;max-width:120px}
.px{display:block;width:100%;height:auto;image-rendering:pixelated}
.card .greet{position:absolute;left:.7em;top:.45em;font-style:italic;font-weight:700;font-size:1.15rem;color:var(--pm-gold-bright);text-shadow:0 2px 0 #070b15}
.card .greet small{display:block;font-family:var(--pm-mono);font-style:normal;font-weight:400;font-size:.55rem;letter-spacing:.2em;text-transform:uppercase;color:rgba(232,196,139,.75)}
.card .quay{grid-column:1/-1;height:10px;background:repeating-linear-gradient(90deg,#2f3a56 0 18px,#465577 18px 20px)}
.card .cap{align-self:end;color:var(--pm-ink);font-size:.86rem;line-height:1.4;padding-top:.6em}
.card .cap b{display:block;font-family:var(--pm-mono);font-size:.6rem;letter-spacing:.16em;text-transform:uppercase;color:var(--pm-ink-soft);font-weight:400}
.stamp{position:absolute;top:-.9em;right:-.7em;width:66px;height:78px;padding:6px;background:var(--pm-paper);--p:radial-gradient(circle at 50% 0,transparent 3px,#000 3.5px);-webkit-mask:radial-gradient(circle 3.2px at 50% 50%,transparent 97%,#000) -5px -5px/10px 10px;mask:radial-gradient(circle 3.2px at 50% 50%,transparent 97%,#000) -5px -5px/10px 10px;transform:rotate(6deg);box-shadow:0 3px 6px rgba(0,0,0,.4)}
.stamp i{display:grid;place-items:center;width:100%;height:100%;background:linear-gradient(160deg,var(--pm-harbor-2),var(--pm-night));color:var(--pm-gold)}
.stamp i svg{width:34px;height:34px}
.card .cancel.cq{position:absolute;top:-.2em;right:2.6em;width:70px;height:70px;transform:rotate(-12deg);opacity:.8;z-index:2}
.card .waves.cq{position:absolute;top:.8em;right:6.8em;width:120px;height:36px;opacity:.6;z-index:2}

/* 5 · the meeps, the office's staff roster */
.meeps{grid-area:meeps;--tilt:1.8deg;padding:1.1em 1em .9em;background:linear-gradient(180deg,#f7efdc,#efe3c8);color:var(--pm-ink);box-shadow:0 10px 22px rgba(0,0,0,.55);border-top:10px solid var(--pm-wax)}
.meeps .kick{color:var(--pm-ink-soft)}
.meeps .ttl{display:block;text-align:center;font-weight:700;font-size:1.1rem;margin:.1em 0 .5em}
.meeps ul{list-style:none;margin:0;padding:.5em .3em 0;display:flex;justify-content:space-between;gap:.2em;background:linear-gradient(180deg,#0d1426,#1c2c4f);border-radius:4px}
.meeps li{flex:1;display:flex;flex-direction:column;align-items:center}
.meeps .meep{width:44px}
.meeps .mono{display:grid;place-items:center;width:30px;height:30px;margin:7px 0;border-radius:50%;border:1px solid var(--pm-gold);color:var(--pm-gold);font-weight:700;font-size:.9rem}
.meeps .mn{display:block;width:100%;overflow:hidden;text-overflow:ellipsis;text-align:center;font-family:var(--pm-mono);font-size:.5rem;letter-spacing:.06em;color:#f6dcae;background:#2f3a56;padding:.25em 0}
.meeps .sig{display:block;text-align:right;font-style:italic;font-size:.78rem;color:var(--pm-ink-soft);margin-top:.4em}

/* THE PANEL: the whole component, large, over the cork */
.panel{display:none}
.panel:target{display:block;position:absolute;inset:1.2em;z-index:20}
.panel .scrim{position:absolute;inset:-1.2em;background:rgba(4,7,14,.55);backdrop-filter:blur(2px)}
.sheet{position:relative;height:100%;overflow:auto;border-radius:10px;background:linear-gradient(180deg,rgba(28,44,79,.97),rgba(13,20,38,.98));border:1px solid rgba(232,196,139,.4);box-shadow:0 30px 80px rgba(0,0,0,.7);padding:0 1.6em 1.6em}
.sheet-head{position:sticky;top:0;display:flex;align-items:center;gap:1em;padding:.9em 0 .7em;margin:0 0 1em;background:inherit;border-bottom:1px dashed rgba(232,196,139,.35)}
.route{font-family:var(--pm-mono);font-size:.64rem;letter-spacing:.16em;text-transform:uppercase;color:rgba(232,196,139,.8)}
.route b{color:var(--pm-gold-bright)}
.route a{color:var(--pm-gold);margin-left:1em}
.close{margin-left:auto;display:grid;place-items:center;width:40px;height:40px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#c4553f,#9c3f2e 60%,#6a2a1f);color:#f7efdc;text-decoration:none;font-size:1.3rem;box-shadow:0 3px 8px rgba(0,0,0,.5)}
.bmonth h2{margin:0 0 .2em;text-align:center;color:#f4e9d7;font-size:1.5rem}
.bmonth .z{margin:0 0 .9em;text-align:center;font-family:var(--pm-mono);font-size:.66rem;letter-spacing:.12em;text-transform:uppercase;color:rgba(232,196,139,.7)}
.bgrid{width:100%;table-layout:fixed;border-collapse:separate;border-spacing:0;background:rgba(13,20,38,.6);border:1px solid rgba(232,196,139,.25);border-radius:12px;overflow:hidden}
.bgrid th{padding:.6em 0 .5em;font-family:var(--pm-mono);font-weight:400;font-size:.66rem;letter-spacing:.14em;text-transform:uppercase;color:rgba(232,196,139,.8);border-bottom:1px solid rgba(232,196,139,.25)}
.bd{position:relative;vertical-align:top;height:5.4em;padding:.35em .4em;border-top:1px solid rgba(232,196,139,.12);border-left:1px solid rgba(232,196,139,.12)}
.bd:first-child{border-left:0}
.bd.is-out{background:rgba(7,11,21,.35)}.bd.is-out .bn{opacity:.45}
.bn{font-family:var(--pm-mono);font-size:.78rem;color:#cdc2ab}
.bd.is-today{background:rgba(232,196,139,.08)}
.bd .cancel.td{position:absolute;right:.3em;bottom:.2em;width:54px;height:54px;color:#e0846b;transform:rotate(-10deg);opacity:.85}
.groups{display:grid;grid-template-columns:repeat(3,1fr);gap:1em;margin-top:1.2em}
.groups section h3{margin:0 0 .4em;font-size:1rem;color:var(--pm-gold);border-bottom:1px solid rgba(232,196,139,.25)}
.groups p{margin:0;font-style:italic;color:#b9ae98;font-size:.88rem}
.note-foot{margin:1.4em 0 0;text-align:center;font-family:var(--pm-mono);font-size:.62rem;letter-spacing:.1em;color:rgba(232,196,139,.6)}

@media (max-width:760px){
 .board{grid-template-columns:1fr;grid-template-areas:"card" "cal" "news" "notes" "meeps";padding:2.2em .9em 3em;border-width:8px;border-bottom-width:0;gap:2.4em}
 .piece{transform:none}.why{transform:none}
 .notes{height:16em}
 .card .greet{position:static;margin:0 0 .4em;align-self:flex-start;width:100%}
 .card .pic{flex-wrap:wrap}
 .card .lot{flex:0 0 18%}
 .news .sf{padding-right:0}
 .news .cancel{width:60px;height:60px;bottom:3.4em}
 .news .sf{columns:auto}
 .panel:target{position:fixed;inset:0;z-index:60}
 .panel .scrim{inset:0}
 .sheet{border-radius:0;padding:0 1em 1.2em}
 .bgrid{display:none}
 .agenda{display:block!important}
 .groups{grid-template-columns:1fr}
}
.agenda{display:none;margin:0;padding:0;list-style:none}
.agenda li{padding:.75em .9em;background:rgba(13,20,38,.6);border:1px solid rgba(232,196,139,.25);border-radius:12px;border-left:3px solid var(--pm-gold);color:#b9ae98;font-style:italic}
</style></head>
<body>
<nav class="rail">Postmark <b>The Town</b> The World · The Mail · The Households · Docs · Join <span class="gone">(no chip row under The Town)</span></nav>
<div class="page">
  <header class="head"><h1>The bulletin</h1><p>the town's board, at the office door</p></header>
  <section class="board" id="board">
    <span class="plaque">Postmark · posted at the office</span>

    <a class="piece cal" href="#open-calendar">
      <span class="tack"></span>
      <span class="kick">The calendar</span>
      <span class="mon">${esc(month.label)}</span>
      <table class="mini"><thead><tr>${WEEKDAYS.map((d) => `<th>${d[0]}</th>`).join("")}</tr></thead><tbody>${dayCells}</tbody></table>
      <span class="next">${month.next ? esc(month.next.event.title) : "Nothing is announced yet."}</span>
      <span class="why">POSTMARK: the office's night colours; today is ringed like a cancelled stamp.</span>
    </a>

    <a class="piece news" href="#open-daily">
      <span class="tack"></span>
      ${cancel("FERRY'S DAILY", `№${daily.crossing ?? ""}`, "CROSSING", "nw")}${waves()}
      <span class="mast">Ferry's Daily</span>
      <span class="dl">the office's view from the doorway · crossing ${daily.crossing ?? ""} · ${esc(tendedText(daily.tended) ?? "")}</span>
      <span class="lead">${esc(daily.lead ?? "")}</span>
      <span class="sf">${esc(daily.standfirst ?? "")}</span>
      <span class="why">POSTMARK: datelined by crossing, not by clock, and franked with the ferry's wake.</span>
    </a>

    <a class="piece notes" href="#open-notices">
      ${notes}<span class="tack"></span>
      <span class="why">POSTMARK: the town's own papers (never stamp violet: violet is money); one click opens every notice.</span>
    </a>

    <a class="piece card" href="#open-quarter">
      <span class="pic"><span class="greet"><small>Greetings from</small>the Civic Quarter</span>${quarter}</span>
      <span class="quay"></span>
      <span class="cap"><b>five buildings on the quay</b>The town's asks and its residents': quests, ideas, bounties, listings, votes.</span>
      <span class="stamp"><i>${iconSvg("quarter")}</i></span>
      ${cancel("POSTMARK", "QUAY", "THE TOWN", "cq")}${waves("cq")}
      <span class="why" style="grid-column:1/-1">POSTMARK: a real postcard: the civic art's own sprites, stamped with the quarter's pixel icon and cancelled.</span>
    </a>

    <a class="piece meeps" href="#open-meeps">
      <span class="tack"></span>
      <span class="kick">on duty at the office</span>
      <span class="ttl">The Meeps</span>
      <ul>${meeps}</ul>
      <span class="sig">the town's staff, five of them</span>
      <span class="why">POSTMARK: a staff roster under a wax-red band; the meeps stand on the quay as their own sprites.</span>
    </a>

    <div class="panel" id="open-calendar">
      <a class="scrim" href="#board" aria-hidden="true"></a>
      <div class="sheet">
        <div class="sheet-head">
          <span class="route">from the board → <b>the calendar</b><a href="/calendar/">its own page ↗</a></span>
          <a class="close" href="#board" aria-label="Close">×</a>
        </div>
        <div class="bmonth">
          <h2>${esc(month.label)}</h2>
          <p class="z">Times are in your time zone (EDT)</p>
          <table class="bgrid"><thead><tr>${WEEKDAYS.map((d) => `<th>${d}</th>`).join("")}</tr></thead><tbody>${bigCells}</tbody></table>
          <ol class="agenda"><li>${esc(month.empty ?? "Nothing on this month.")}</li></ol>
        </div>
        <div class="groups">
          <section><h3>Now</h3><p>Nothing is on right now.</p></section>
          <section><h3>Coming</h3><p>Nothing is announced yet.</p></section>
          <section><h3>Lately</h3><p>Nothing ended this week.</p></section>
        </div>
        <p class="note-foot">THE SAME CalendarMonth + CalendarCard COMPONENTS /calendar/ RENDERS · ESC OR × CLOSES · BACK CLOSES · /bulletin/#calendar LINKS HERE</p>
      </div>
    </div>
  </section>
  <div class="sill" aria-hidden="true"></div>
</div>
</body></html>`;

writeFileSync(new URL("./the-board-mock.html", import.meta.url), html);
console.log("wrote qa-shots/the-board-mock.html");
