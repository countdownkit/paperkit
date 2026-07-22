// Paper controls: spacing/ruling, line color, orientation, margin, print.
// The sheet is server-rendered for SEO; this re-renders the same SVG (via the
// shared PAPER module) whenever a control changes, so client output matches the
// server. Orientation is applied as a real @page rule for the print dialog.
(function () {
  const wrap = document.querySelector(".paper-wrap");
  if (!wrap || !window.PAPER) return;
  const sheet = wrap.querySelector("[data-sheet]");
  const ctl = name => document.querySelector(`[data-ctl=${name}]`);

  const state = {
    type: wrap.dataset.type,
    spacing: +wrap.dataset.spacing,
    color: wrap.dataset.color,
    orient: wrap.dataset.orient,
    margin: wrap.dataset.margin === "1",
  };

  // Orientation as a real @page rule so the print dialog defaults correctly.
  const pageStyle = document.createElement("style");
  document.head.appendChild(pageStyle);
  function setOrient(o) {
    pageStyle.textContent = `@page { size: letter ${o}; margin: 0; }`;
  }

  function render() {
    sheet.innerHTML = PAPER.renderPaper(state.type, state);
  }

  // spacing and ruling both drive the same underlying spacing value
  const spacingCtl = ctl("spacing");
  if (spacingCtl) spacingCtl.addEventListener("change", e => { state.spacing = +e.target.value; render(); });
  const rulingCtl = ctl("ruling");
  if (rulingCtl) rulingCtl.addEventListener("change", e => { state.spacing = +e.target.value; render(); });
  const colorCtl = ctl("color");
  if (colorCtl) colorCtl.addEventListener("change", e => { state.color = e.target.value; render(); });
  const orientCtl = ctl("orient");
  if (orientCtl) orientCtl.addEventListener("change", e => { state.orient = e.target.value; setOrient(state.orient); render(); });
  const marginCtl = ctl("margin");
  if (marginCtl) marginCtl.addEventListener("change", e => { state.margin = e.target.value === "1"; render(); });
  ctl("print").addEventListener("click", () => window.print());

  setOrient(state.orient);
})();
