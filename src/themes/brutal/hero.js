/* Brutal hero: the initials built from chunky square blocks, each with a black border and a hard offset shadow.
   A slow press wave rolls across them; the pointer presses blocks down into their shadows (and paints them the
   accent); a click or tap sends a shockwave that pops them up and reshuffles the colours. A few outlined stickers bob. */
(() => {
  "use strict";
  const doc = document.documentElement;
  const reduceMQ = matchMedia("(prefers-reduced-motion: reduce)");
  const cv = document.querySelector("canvas.field");
  if (!cv || !cv.getContext) return;
  const hero = cv.parentElement, ctx = cv.getContext("2d"), word = (cv.dataset.word || "YN").toUpperCase();
  const css = (n) => getComputedStyle(doc).getPropertyValue(n).trim();
  const rnd = (s) => () => (s = (s * 16807) % 2147483647) / 2147483647;
  const ptr = { x: -9999, y: -9999, last: -1e9 }, shocks = [];
  let W = 1, H = 1, fx = null, raf = 0, visible = !document.hidden, onScreen = true, t0 = 0;

  function wordMask() {
    const mob = W < 700, o = document.createElement("canvas"); o.width = Math.ceil(W); o.height = Math.ceil(H);
    const g = o.getContext("2d", { willReadFrequently: true }), font = (z) => `900 ${z}px system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif`;
    g.font = font(100); const m = g.measureText(word);
    const fs = Math.min((W * (mob ? .9 : .62)) / (m.width / 100), H * (mob ? .4 : .5) * 1.3);
    g.font = font(fs); g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#fff"; g.fillText(word, W / 2, H * (mob ? .34 : .36));
    const d = g.getImageData(0, 0, o.width, o.height).data, w = o.width, h = o.height;
    return (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : d[((y | 0) * w + (x | 0)) * 4 + 3] / 255);
  }
  function make() {
    const s = W < 700 ? 15 : 26, mask = wordMask(), r = rnd(11), B = [];
    for (let y = 0; y < H; y += s) for (let x = 0; x < W; x += s) {
      let m = 0; for (const [ox, oy] of [[.5, .5], [.25, .25], [.75, .75], [.75, .25], [.25, .75]]) m += mask(x + ox * s, y + oy * s);
      if (m / 5 > .45) B.push({ x, y, p: 0, v: 0, c: r() < .18 ? 1 : r() < .12 ? 2 : 0, hot: 0 });
    }
    const stickers = Array.from({ length: W < 700 ? 4 : 7 }, (_, i) => ({ k: i % 3, x: r() * W, y: H * (.08 + r() * .55), z: (W < 700 ? 26 : 40) + r() * 30, ph: r() * 6.28 }));
    let last = 0;
    const off = s * .24;
    return (t, still) => {
      if (!still && t - last < 1 / 50) return; const dt = still ? 0 : Math.min(.05, t - last); last = t;
      const acc = css("--accent") || "#ff5b1f", face = ["#ffffff", acc, css("--mint") || "#7cf0c5"], ink = "#111";
      ctx.clearRect(0, 0, W, H); ctx.lineJoin = "miter";
      for (const k of stickers) { // outlined stickers: circle, triangle, star
        const y = k.y + (still ? 0 : Math.sin(t * .9 + k.ph) * 8), a = still ? k.ph : k.ph + t * .25, z = k.z;
        ctx.save(); ctx.translate(k.x, y); ctx.rotate(a); ctx.lineWidth = 3; ctx.strokeStyle = ink; ctx.fillStyle = k.k === 0 ? (css("--sky") || "#8ec5ff") : k.k === 1 ? face[2] : acc;
        ctx.beginPath();
        if (k.k === 0) ctx.arc(0, 0, z / 2, 0, 6.283);
        else if (k.k === 1) { ctx.moveTo(0, -z / 2); ctx.lineTo(z / 2, z / 2.4); ctx.lineTo(-z / 2, z / 2.4); ctx.closePath(); }
        else for (let i = 0; i < 10; i++) { const rr = i % 2 ? z / 4.4 : z / 2, an = i * .628; ctx.lineTo(Math.cos(an) * rr, Math.sin(an) * rr); }
        ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
      }
      const act = !still && performance.now() - ptr.last < 2000, R = s * 2.6;
      for (let i = shocks.length - 1; i >= 0; i--) if (t - shocks[i].t > 1.6) shocks.splice(i, 1);
      ctx.fillStyle = ink;
      for (const b of B) {
        let target = still ? 0 : .22 * Math.max(0, Math.sin(t * 1.6 - b.x * .006 - b.y * .004)) ** 6;
        if (act) { const d = Math.hypot(b.x + s / 2 - ptr.x, b.y + s / 2 - ptr.y); if (d < R) { target = 1; b.hot = 1; } }
        for (const k of shocks) { const d = Math.hypot(b.x - k.x, b.y - k.y), ring = (t - k.t) * 900; if (Math.abs(d - ring) < s * 1.2) { b.v -= 30 * dt * 4; if (!k.done.has(b)) { k.done.add(b); b.c = (b.c + 1) % 3; } } }
        b.v += ((target - b.p) * 260 - b.v * 18) * dt; b.p += b.v * dt; b.p = Math.max(-1.2, Math.min(1, b.p));
        b.hot = Math.max(0, b.hot - dt * .6);
        ctx.fillRect(b.x + off, b.y + off, s - 2, s - 2);
      }
      ctx.lineWidth = 2.5; ctx.strokeStyle = ink;
      for (const b of B) {
        const o = off * Math.max(-.6, b.p), x = b.x + o, y = b.y + o;
        ctx.fillStyle = b.hot > .02 ? acc : face[b.c]; ctx.fillRect(x, y, s - 2, s - 2); ctx.strokeRect(x + 1.25, y + 1.25, s - 4.5, s - 4.5);
      }
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
    const at = (e) => { const b = cv.getBoundingClientRect(); ptr.x = e.clientX - b.left; ptr.y = e.clientY - b.top; ptr.last = performance.now(); };
    addEventListener("pointermove", at, { passive: true });
    hero.addEventListener("pointerdown", (e) => { at(e); if (!reduceMQ.matches) shocks.push({ x: ptr.x, y: ptr.y, t: (performance.now() - t0) / 1000, done: new Set() }); }, { passive: true });
  }
  requestAnimationFrame(() => ("requestIdleCallback" in window ? requestIdleCallback(boot, { timeout: 500 }) : setTimeout(boot, 1)));
})();
