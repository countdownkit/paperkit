/*
 * Shared paper-drawing logic — used by BOTH generate.js (Node, server render)
 * and tool.js (browser, re-render on control change) so server + client output
 * match exactly. Draws a full US-Letter sheet as inline SVG at true physical
 * scale: coordinate units are PostScript points (1/72 in), so Letter portrait
 * is 612 x 792. CSS sizes the <svg> in inches for correct print scale.
 *
 * UMD-ish: module.exports under Node, window.PAPER in the browser.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.PAPER = factory();
})(typeof self !== "undefined" ? self : this, function () {
  // Named line colors offered by the color control (+ a couple used internally).
  const COLORS = {
    black: "#222222",
    blue: "#3358b0",
    gray: "#8a94a6",
    light: "#c9d2de",
    green: "#3a7d44",
    red: "#d98c8c",
  };

  function r(n) { return Math.round(n * 100) / 100; }
  function seg(x1, y1, x2, y2) { return `M${r(x1)} ${r(y1)}L${r(x2)} ${r(y2)}`; }
  function path(d, color, width, dash) {
    if (!d) return "";
    return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}"${dash ? ` stroke-dasharray="${dash}"` : ""}/>`;
  }

  // A family of parallel lines at `deg` degrees, perpendicular spacing `d`,
  // anchored so a line passes through the box origin (x0,y0). Long segments are
  // drawn and clipped to the page — keeps diagonals/hex trivial to place.
  function family(deg, d, bx, color, width) {
    const th = deg * Math.PI / 180;
    const dx = Math.cos(th), dy = Math.sin(th);   // direction along the line
    const nx = -Math.sin(th), ny = Math.cos(th);  // unit normal
    const corners = [[bx.x0, bx.y0], [bx.x1, bx.y0], [bx.x1, bx.y1], [bx.x0, bx.y1]];
    let cmin = Infinity, cmax = -Infinity;
    for (const [px, py] of corners) {
      const v = nx * px + ny * py;
      if (v < cmin) cmin = v;
      if (v > cmax) cmax = v;
    }
    const a0 = nx * bx.x0 + ny * bx.y0;           // anchor offset
    const L = 2000;
    let out = "";
    let k = Math.ceil((cmin - a0) / d - 1e-6);
    for (; a0 + k * d <= cmax + 1e-6; k++) {
      const cc = a0 + k * d;
      const bx0 = cc * nx, by0 = cc * ny;         // closest point on the line
      out += seg(bx0 - dx * L, by0 - dy * L, bx0 + dx * L, by0 + dy * L);
    }
    return path(out, color, width);
  }

  // Grid of dots at every spacing intersection.
  function dots(bx, sp, color) {
    let out = "";
    for (let x = bx.x0; x <= bx.x1 + 1e-6; x += sp)
      for (let y = bx.y0; y <= bx.y1 + 1e-6; y += sp)
        out += `<circle cx="${r(x)}" cy="${r(y)}" r="1.05" fill="${color}"/>`;
    return out;
  }

  // Horizontal ruled lines + a colored left margin rule (US notebook style).
  function lined(bx, sp, color) {
    let out = "";
    for (let y = bx.y0 + sp; y <= bx.y1 + 1e-6; y += sp) out += seg(bx.x0, y, bx.x1, y);
    const mx = bx.x0 + (bx.x1 - bx.x0 > 520 ? 108 : 72); // ~1.25in / 1in from edge
    return path(out, color, 0.7) + path(seg(mx, bx.y0, mx, bx.y1), COLORS.red, 0.9);
  }

  // Tiled pointy-top hexagons; R is the circumradius (= "spacing").
  function hexGrid(bx, R, color, width) {
    const hw = Math.sqrt(3) * R;   // hex width point-to-point
    const vs = 1.5 * R;            // vertical center spacing
    let out = "", row = 0;
    for (let cy = bx.y0 - R; cy <= bx.y1 + R; cy += vs, row++) {
      const off = (row % 2) ? hw / 2 : 0;
      for (let cx = bx.x0 - hw + off; cx <= bx.x1 + hw; cx += hw) {
        for (let i = 0; i < 6; i++) {
          const a = Math.PI / 180 * (60 * i - 90);
          const x = cx + R * Math.cos(a), y = cy + R * Math.sin(a);
          out += (i === 0 ? "M" : "L") + r(x) + " " + r(y);
        }
        out += "Z";
      }
    }
    return path(out, color, width);
  }

  // Music staves: groups of 5 evenly spaced lines with a gap between groups.
  function staff(bx, sp, color) {
    const staffH = sp * 4, gap = sp * 4;
    let out = "";
    for (let y = bx.y0 + sp * 2; y + staffH <= bx.y1 + 1e-6; y += staffH + gap)
      for (let i = 0; i < 5; i++) out += seg(bx.x0, y + i * sp, bx.x1, y + i * sp);
    return path(out, color, 0.8);
  }

  // Handwriting practice rows: solid top + baseline, dashed midline, then a gap.
  function handwriting(bx, sp, color) {
    const gap = sp * 0.7;
    let solid = "", dash = "";
    for (let y = bx.y0; y + sp <= bx.y1 + 1e-6; y += sp + gap) {
      solid += seg(bx.x0, y, bx.x1, y);
      dash += seg(bx.x0, y + sp / 2, bx.x1, y + sp / 2);
      solid += seg(bx.x0, y + sp, bx.x1, y + sp);
    }
    return path(solid, color, 0.8) + path(dash, color, 0.6, "3 4");
  }

  // Cornell notes: cue column, note area with light rules, summary band.
  function cornell(bx, sp, color) {
    const cue = bx.x0 + 180;      // 2.5in cue column
    const summ = bx.y1 - 144;     // 2in summary band
    const head = bx.y0 + 40;      // header strip
    let rules = "";
    for (let y = head + sp; y < summ - 1; y += sp) rules += seg(cue, y, bx.x1, y);
    let heavy = "";
    heavy += seg(bx.x0, head, bx.x1, head);
    heavy += seg(cue, head, cue, summ);
    heavy += seg(bx.x0, summ, bx.x1, summ);
    return path(rules, color, 0.5) + path(heavy, color, 1.1);
  }

  function wrapSvg(W, H, orient, bx, inner) {
    return `<svg class="paper-svg" data-orient="${orient}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet" role="img" aria-label="printable paper preview">`
      + `<rect x="0" y="0" width="${W}" height="${H}" fill="#ffffff"/>`
      + `<clipPath id="pgclip"><rect x="${r(bx.x0)}" y="${r(bx.y0)}" width="${r(bx.x1 - bx.x0)}" height="${r(bx.y1 - bx.y0)}"/></clipPath>`
      + `<g clip-path="url(#pgclip)">${inner}</g>`
      + `</svg>`;
  }

  // Main entry: renderPaper(type, {spacing, color, orient, margin}).
  function renderPaper(type, o) {
    o = o || {};
    const orient = o.orient === "landscape" ? "landscape" : "portrait";
    const W = orient === "landscape" ? 792 : 612;
    const H = orient === "landscape" ? 612 : 792;
    const m = o.margin ? 36 : 0;                 // 0.5in printable margin
    const bx = { x0: m, y0: m, x1: W - m, y1: H - m };
    const col = COLORS[o.color] || COLORS.gray;
    const sp = +o.spacing || 18;
    let inner;
    switch (type) {
      case "dot-grid-paper":
      case "dot-paper":
        inner = dots(bx, sp, col); break;
      case "lined-paper":
        inner = lined(bx, sp, col); break;
      case "isometric-paper":
        inner = family(90, sp, bx, col, 0.6) + family(30, sp, bx, col, 0.6) + family(150, sp, bx, col, 0.6); break;
      case "hexagonal-paper":
        inner = hexGrid(bx, sp, col, 0.6); break;
      case "engineering-paper":
        inner = family(0, sp, bx, COLORS.light, 0.4) + family(90, sp, bx, COLORS.light, 0.4)
          + family(0, sp * 5, bx, col, 1.0) + family(90, sp * 5, bx, col, 1.0); break;
      case "music-staff-paper":
        inner = staff(bx, sp, col); break;
      case "handwriting-paper":
        inner = handwriting(bx, sp, col); break;
      case "cornell-notes-paper":
        inner = cornell(bx, sp, col); break;
      case "graph-paper":
      case "grid-paper":
      default:
        inner = family(0, sp, bx, col, 0.6) + family(90, sp, bx, col, 0.6); break;
    }
    return wrapSvg(W, H, orient, bx, inner);
  }

  return { COLORS, renderPaper };
});
