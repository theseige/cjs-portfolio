/* Paper hero: a halftone dot field that forms the initials (italic serif), a slow rolling ink wave,
   pointer ink bleed and an off-register accent plate drawn under the ink (30 fps). */
(() => {
  "use strict";
  const doc = document.documentElement;
  const reduceMQ = matchMedia("(prefers-reduced-motion: reduce)");
  const cv = document.querySelector("canvas.field");
  if (!cv || !cv.getContext) return;
  const hero = cv.parentElement, ctx = cv.getContext("2d"), word = cv.dataset.word || "YN";
  const css = (n) => getComputedStyle(doc).getPropertyValue(n).trim();
  const hexA = (hex, a) => { const n = parseInt(hex.replace("#", ""), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; };
  const ptr = { x: -9999, y: -9999, last: -1e9 };
  let W = 1, H = 1, fx = null, raf = 0, visible = !document.hidden, onScreen = true, t0 = 0;

  // alpha mask of the word: 72% of the width (90% on mobile), capped at 66% (42%) of the height, centred at 42% (36%)
  function wordMask() {
    const mob = W < 700, o = document.createElement("canvas"); o.width = Math.ceil(W); o.height = Math.ceil(H);
    const g = o.getContext("2d", { willReadFrequently: true });
    const font = (z) => `italic 700 ${z}px "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif`;
    g.font = font(100); const m = g.measureText(word);
    const fs = Math.min((W * (mob ? .9 : .72)) / (m.width / 100), H * (mob ? .42 : .66) * 1.25);
    g.font = font(fs); g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#fff"; g.fillText(word, W / 2, H * (mob ? .36 : .42));
    const d = g.getImageData(0, 0, o.width, o.height).data, w = o.width, h = o.height;
    return (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : d[((y | 0) * w + (x | 0)) * 4 + 3] / 255);
  }
  function make() {
    const s = W < 700 ? 10 : 13, mask = wordMask(), cells = [];
    for (let y = s / 2; y < H; y += s) for (let x = s / 2; x < W; x += s) {
      let m = 0; for (const [ox, oy] of [[0, 0], [-s / 3, -s / 3], [s / 3, s / 3], [s / 3, -s / 3], [-s / 3, s / 3]]) m += mask(x + ox, y + oy);
      cells.push(x, y, m / 5);
    }
    let last = 0;
    const plate = (t, still, col, off, gain, isAccent) => {
      ctx.fillStyle = col; ctx.beginPath();
      const R = W < 700 ? 90 : 150, act = performance.now() - ptr.last < 2500;
      for (let i = 0; i < cells.length; i += 3) {
        const x = cells[i], y = cells[i + 1], m = cells[i + 2];
        const wave = still ? .3 : .5 + .5 * Math.sin(x * .011 + y * .007 - t * 1.4) * Math.cos(y * .013 - t * .6);
        let v = isAccent ? (m > .5 ? 0 : wave * wave * .38 * (1 - m)) : Math.max(m * .92, wave * .13 * (1 - m));
        if (act && !still) { const d = Math.hypot(x - ptr.x, y - ptr.y); if (d < R) v = Math.min(1, v + (1 - d / R) * (isAccent ? .5 : .7)); }
        const rad = Math.sqrt(v) * s * .62 * gain;
        if (rad > .35) { ctx.moveTo(x + off + rad, y + off); ctx.arc(x + off, y + off, rad, 0, 6.283); }
      }
      ctx.fill();
    };
    return (t, still) => {
      if (!still && t - last < 1 / 30) return; last = t;
      ctx.clearRect(0, 0, W, H);
      plate(t + .25, still, hexA(css("--accent") || "#ff5b1f", .9), 2.5, .9, true); // off-register accent plate under the ink
      plate(t, still, css("--ink") || "#161412", 0, 1, false);
    };
  }
  const running = () => !reduceMQ.matches && visible && onScreen;
  function loop(now) { raf = requestAnimationFrame(loop); fx((now - t0) / 1000, false); }
  function sync() { if (running()) { if (!raf) raf = requestAnimationFrame(loop); } else { cancelAnimationFrame(raf); raf = 0; if (reduceMQ.matches && fx) fx(0, true); } }
  function build() {
    const r = hero.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    fx = make(); t0 = performance.now(); fx(0, true); sync();
  }
  function boot() {
    doc.classList.add("js-field"); // the canvas draws the initials now; the h1 text stays for screen readers
    build();
    let rt, lw = innerWidth; addEventListener("resize", () => { if (innerWidth === lw) return; lw = innerWidth; clearTimeout(rt); rt = setTimeout(build, 160); });
    document.addEventListener("visibilitychange", () => { visible = !document.hidden; sync(); });
    if ("IntersectionObserver" in window) new IntersectionObserver((e) => { onScreen = e[0].isIntersecting; sync(); }).observe(hero);
    reduceMQ.addEventListener?.("change", build);
    addEventListener("pointermove", (e) => { const b = cv.getBoundingClientRect(); ptr.x = e.clientX - b.left; ptr.y = e.clientY - b.top; ptr.last = performance.now(); }, { passive: true });
  }
  requestAnimationFrame(() => ("requestIdleCallback" in window ? requestIdleCallback(boot, { timeout: 500 }) : setTimeout(boot, 1)));
})();
