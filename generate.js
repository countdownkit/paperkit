/*
 * Static generator for the printable paper site.
 * Run: node generate.js   ->   writes everything into ./public
 *
 * Page families:
 *   /<paper-type>/   one full-page printable sheet per paper type (SVG)
 *   /                homepage — grid of every paper type
 *
 * The artifact IS the page: each page server-renders a full US-Letter sheet as
 * inline SVG (via the shared PAPER module) that prints edge-to-edge at true
 * physical scale. Controls re-draw the same SVG in the browser, then
 * window.print(). Print CSS strips everything but the sheet.
 */
const fs = require("fs");
const path = require("path");
const PAPER = require("./assets/paper.js");

// ---- config -------------------------------------------------------------
const DOMAIN = process.env.DOMAIN || "https://paper.elevatedprogress.com";
const BASE = process.env.BASE || "";
const SITE = "Paper Maker";
const OUT = path.join(__dirname, "public");
const ASSETS = path.join(__dirname, "assets");
const DATA = JSON.parse(fs.readFileSync(path.join(__dirname, "data", "papers.json"), "utf8"));

const CATEGORIES = ["Grid & graph", "Writing & notes", "Specialty"];
const CAT_ID = { "Grid & graph": "grids", "Writing & notes": "writing", "Specialty": "specialty" };
const COLOR_LABELS = { black: "Black", blue: "Blue", gray: "Gray", light: "Light gray", green: "Green" };

// ---- html layout --------------------------------------------------------
function layout({ title, desc, urlPath, h1, body }) {
  const canonical = DOMAIN + BASE + urlPath;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${desc}">
<link rel="canonical" href="${canonical}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${desc}">
<meta property="og:type" content="website">
<link rel="stylesheet" href="${BASE}/styles.css">
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5580575158570188" crossorigin="anonymous"></script>
<script async src="https://www.googletagmanager.com/gtag/js?id=G-TJY4TRRKD6"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','G-TJY4TRRKD6');</script>
</head>
<body>
<header class="site-head no-print"><div class="wrap">
  <a class="brand" href="${BASE}/">📄 ${SITE}</a>
  <nav class="nav"><a href="${BASE}/#grids">Grid & graph</a><a href="${BASE}/#writing">Writing</a><a href="${BASE}/#specialty">Specialty</a></nav>
</div></header>
<main class="wrap">
  <div class="crumbs no-print"><a href="${BASE}/">Home</a> ›&nbsp;${h1}</div>
  <h1 class="no-print">${h1}</h1>
  ${body}
</main>
<footer class="site-foot no-print"><div class="wrap">
  <a href="${BASE}/">Home</a><a href="${BASE}/#grids">Grid & graph paper</a><a href="${BASE}/#writing">Writing paper</a>
  <span>· ${SITE} — free printable paper. No downloads, no signups: pick a paper, customize, and print. Part of <a href="https://elevatedprogress.com/">Elevated Progress</a>. · <a href="https://elevatedprogress.com/about/">About</a> · <a href="https://elevatedprogress.com/contact/">Contact</a> · <a href="https://elevatedprogress.com/privacy/">Privacy Policy</a></span>
</div></footer>
<script src="${BASE}/paper.js"></script>
<script src="${BASE}/tool.js" defer></script>
</body>
</html>`;
}
function grid(links) {
  return `<div class="grid">` + links.map(l =>
    `<a href="${BASE}${l.href}">${l.emoji ? `<span class="chip-emoji">${l.emoji}</span>` : ""}${l.label}</a>`).join("") + `</div>`;
}

// ---- controls -----------------------------------------------------------
function controls(pg) {
  const c = pg.controls;
  const d = pg.defaults;
  const parts = [];

  if (c.includes("ruling")) {
    parts.push(`<div><label for="ruling">Ruling</label><select id="ruling" data-ctl="ruling">${pg.rulings.map(o =>
      `<option value="${o.pt}"${o.pt === d.spacing ? " selected" : ""}>${o.label}</option>`).join("")}</select></div>`);
  }
  if (c.includes("spacing")) {
    parts.push(`<div><label for="spacing">Spacing</label><select id="spacing" data-ctl="spacing">${pg.spacings.map(o =>
      `<option value="${o.pt}"${o.pt === d.spacing ? " selected" : ""}>${o.label}</option>`).join("")}</select></div>`);
  }
  if (c.includes("color")) {
    const keys = [d.color, "black", "blue", "gray", "light"].filter((v, i, a) => a.indexOf(v) === i);
    parts.push(`<div><label for="color">Line color</label><select id="color" data-ctl="color">${keys.map(k =>
      `<option value="${k}"${k === d.color ? " selected" : ""}>${COLOR_LABELS[k] || k}</option>`).join("")}</select></div>`);
  }
  if (c.includes("orient")) {
    parts.push(`<div><label for="orient">Paper</label><select id="orient" data-ctl="orient"><option value="portrait"${d.orient === "portrait" ? " selected" : ""}>Portrait</option><option value="landscape"${d.orient === "landscape" ? " selected" : ""}>Landscape</option></select></div>`);
  }
  if (c.includes("margin")) {
    parts.push(`<div><label for="margin">Margin</label><select id="margin" data-ctl="margin"><option value="0"${d.margin ? "" : " selected"}>No margin (full page)</option><option value="1"${d.margin ? " selected" : ""}>Add 1/2 inch margin</option></select></div>`);
  }

  return `<div class="controls no-print">
    <div class="row">
      ${parts.join("\n      ")}
    </div>
    <div class="ctl-foot">
      <button type="button" class="print-btn" data-ctl="print">🖨️ Print this paper</button>
      <span class="hint">Tip: adjust the options, then Print. Choose "Save as PDF" in the print dialog to keep a copy.</span>
    </div>
  </div>`;
}

// ---- write helpers ------------------------------------------------------
const urls = [];
function writePage(urlPath, html) {
  const dir = path.join(OUT, urlPath.replace(/^\/+|\/+$/g, ""));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), html);
  urls.push(urlPath);
}

const pgLink = pg => ({ href: `/${pg.slug}/`, emoji: pg.emoji, label: pg.title });

// ---- page builder -------------------------------------------------------
function paperPage(pg) {
  const d = pg.defaults;
  const svg = PAPER.renderPaper(pg.slug, d);
  const paper = `<div class="paper-wrap" data-type="${pg.slug}" data-spacing="${d.spacing}" data-color="${d.color}" data-orient="${d.orient}" data-margin="${d.margin ? 1 : 0}">
    <div class="paper-sheet" data-sheet>${svg}</div>
  </div>`;
  const related = DATA.filter(o => o.slug !== pg.slug).map(pgLink);
  const body = `${controls(pg)}
  ${paper}
  <div class="ad-slot no-print">Advertisement</div>
  <div class="prose no-print">
    <p>${pg.blurb}</p>
    <p>${pg.tip}</p>
    <p><b>To print:</b> set the options above, then hit Print — the sheet fills a standard US Letter page at true scale, so a 1/4-inch square really measures 1/4 inch. <b>To save a PDF instead:</b> pick "Save as PDF" as the printer in the print dialog. Everything except the paper is stripped from the printout.</p>
  </div>
  <h2 class="no-print">More printable paper</h2>
  <div class="no-print">${grid(related)}</div>
  <div class="ad-slot no-print">Advertisement</div>`;
  writePage(`/${pg.slug}/`, layout({
    title: `${pg.title} — Free Printable (PDF)`,
    desc: `${pg.blurb.split(". ")[0]}. Customize the spacing, color, and orientation, then print — or save as a PDF. Free, no signup.`,
    urlPath: `/${pg.slug}/`,
    h1: `Printable ${pg.title}`,
    body,
  }));
}

// ---- build --------------------------------------------------------------
fs.mkdirSync(OUT, { recursive: true });
for (const entry of fs.readdirSync(OUT)) {
  if (entry === ".git" || entry === "CNAME") continue;
  fs.rmSync(path.join(OUT, entry), { recursive: true, force: true });
}
for (const f of fs.readdirSync(ASSETS)) fs.copyFileSync(path.join(ASSETS, f), path.join(OUT, f));

// paper-type pages
for (const pg of DATA) paperPage(pg);

// -- homepage --
{
  const title = `Free Printable Paper — Graph, Lined, Dot Grid & More (PDF)`;
  const desc = `Free printable paper templates: graph paper, lined paper, dot grid, isometric, hexagonal, engineering, music staff, handwriting, and Cornell notes. Set the spacing and color, then print or save as a PDF. No signup.`;
  let sections = "";
  for (const cat of CATEGORIES) {
    const items = DATA.filter(pg => pg.category === cat);
    if (!items.length) continue;
    sections += `<h2 id="${CAT_ID[cat]}">${cat}</h2>\n${grid(items.map(pgLink))}\n`;
  }
  const body = `<p class="lead">Pick a paper, set the grid spacing, line color, and orientation, and print it straight from your browser at true physical scale. Every sheet also saves as a PDF from the print dialog — no downloads, no account, nothing to install.</p>
  ${sections}
  <div class="ad-slot no-print">Advertisement</div>
  <div class="prose"><p>These are working sheets, not template downloads: the paper you see on each page is exactly what prints. Adjust the spacing and it redraws instantly, so a 1/4-inch grid measures a true 1/4 inch on the page. The print stylesheet strips the header, controls, and ads, leaving a clean full-page sheet — or a PDF, if you pick "Save as PDF" in the print dialog.</p></div>`;
  writePage(`/`, layout({ title, desc, urlPath: `/`, h1: `Free Printable Paper`, body }));
}

// -- sitemap + robots + meta files --
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${DOMAIN}${BASE}${u}</loc></url>`).join("\n")}
</urlset>`;
fs.writeFileSync(path.join(OUT, "sitemap.xml"), sitemap);
fs.writeFileSync(path.join(OUT, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${DOMAIN}${BASE}/sitemap.xml\n`);
fs.writeFileSync(path.join(OUT, ".nojekyll"), "");
fs.writeFileSync(path.join(OUT, "CNAME"), "paper.elevatedprogress.com\n");
fs.writeFileSync(path.join(OUT, "ads.txt"), "google.com, pub-5580575158570188, DIRECT, f08c47fec0942fa0\n");

console.log(`Generated ${urls.length} pages into ./public`);
