# CLAUDE.md — paperkit

Project instructions for Claude Code working in this repo. Inherits the ElevatedProgress
venture playbook from the parent folder's CLAUDE.md.

## What this is

A zero-dependency static-site generator for **free printable paper** (graph, lined, dot grid,
isometric, hexagonal, engineering, music staff, handwriting, Cornell notes, and more).
`generate.js` reads `data/papers.json` + `assets/` and writes one page per paper type into
`public/`. Target: https://paper.elevatedprogress.com/. Same long-tail SEO + AdSense playbook
as the sibling tools — each paper type is a real search ("printable graph paper",
"college ruled lined paper", "isometric paper pdf").

## The product rule

**The artifact IS the page.** Each page server-renders a full US-Letter sheet as inline SVG;
`assets/tool.js` only re-draws that same SVG (spacing, color, orientation, margin) via the
shared `PAPER` module and calls `window.print()`. Never turn this into a download/builder
flow — instant-print at true physical scale is the differentiator vs the template mills.

Draw logic lives in `assets/paper.js`, a UMD module required by BOTH `generate.js` (server)
and `tool.js` (browser) so their output matches exactly. Coordinates are PostScript points
(1/72 in), so Letter portrait is a 612 x 792 viewBox; CSS sizes the `<svg>` in inches
(`8.5in x 11in`) so a 1/4-inch square prints as a true 1/4 inch. Parallel-line families are
drawn long and clipped to the page (`family()`), which keeps diagonals (isometric) and
hexagons trivial to place.

## Deploy — just push

`git push` to `main` is the deploy — GitHub Actions (`.github/workflows/deploy.yml`).

- **Never manually build and commit output.** `public/` is git-ignored build output.
- **Never hand-edit anything in `public/`.**
- Commit as the neutral identity:
  `git -c user.name="paperkit" -c user.email="paperkit@users.noreply.github.com" commit …`

## Local build / preview

```
node generate.js     # writes ./public
node server.js       # preview at http://localhost:5064
```

## Adding a paper type

Add an object to `data/papers.json` (slug/title/emoji/category/blurb/tip/controls/defaults +
spacings or rulings) and, if it needs new geometry, a `case` in `renderPaper()` in
`assets/paper.js`. The homepage groups by `category` (Grid & graph / Writing & notes /
Specialty). No other wiring needed — pages, sitemap, and related links are generated.

## Don't break these (generated, must keep serving)

- `ads.txt` + AdSense loader in `<head>` — publisher `ca-pub-5580575158570188`.
- GA4 `G-TJY4TRRKD6` (shared across all EP sites; hostname splits them).
- `sitemap.xml`, `robots.txt`, `.nojekyll`, `CNAME` (paper.elevatedprogress.com).
- GSC verification file once the property is verified.

## Config knobs

`DOMAIN` and `BASE`, same semantics as the other tools. Production values in the workflow.
