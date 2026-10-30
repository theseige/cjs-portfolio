/* Aurora hero: a 96px-wide gradient mesh of drifting blobs (canvas .aura, blurred and scaled up by CSS) plus
   flow-field light trails on canvas .field that bend around the pointer (260 trails on mobile, 650 on desktop). */
(() => {
  "use strict";
  const doc = document.documentElement;
  const reduceMQ = matchMedia("(prefers-reduced-motion: reduce)");
  const cv = document.querySelector("canvas.field");
  if (!cv || !cv.getContext) return;
  const hero = cv.parentElement, ctx = cv.getContext("2d");
  const cv2 = document.createElement("canvas"); cv2.className = "aura"; cv2.setAttribute("aria-hidden", "true"); hero.insertBefore(cv2, cv);
  const ctx2 = cv2.getContext("2d");
  const css = (n) => getComputedStyle(doc).getPropertyValue(n).trim();
  const hexA = (hex, a) => { const n = parseInt(hex.replace("#", ""), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; };
  const rnd = (s) => () => (s = (s * 16807) % 2147483647) / 2147483647;
  const ptr = { x: -9999, y: -9999, last: -1e9 };
  let W = 1, H = 1, fx = null, raf = 0, visible = !document.hidden, onScreen = true, t0 = 0;

  function make() {
    cv2.width = 96; cv2.height = Math.max(32, Math.round(96 * H / W));
    const r = rnd(3), n = W < 700 ? 260 : 650, bg = css("--bg") || "#07071a";
    const P = Array.from({ length: n }, () => ({ x: r() * W, y: r() * H, l: r() * 200 }));
    let first = true;
    return (t, still) => {
      const acc = css("--accent") || "#ff5b1f", c2 = css("--c2") || "#2de2e6", c3 = css("--c3") || "#ff4fd8";
      const w = cv2.width, h = cv2.height;
      ctx2.globalCompositeOperation = "source-over"; ctx2.fillStyle = bg; ctx2.fillRect(0, 0, w, h); ctx2.globalCompositeOperation = "lighter";
      [[acc, .3, .35, .55], [c2, .75, .3, .5], [c3, .55, .8, .45], [acc, .15, .85, .4], ["#3b2bff", .9, .75, .5]].forEach(([c, bx, by, rr], i) => {
        const x = (bx + Math.sin(t * .18 + i * 1.7) * .18) * w, y = (by + Math.cos(t * .14 + i * 2.3) * .16) * h, rad = rr * w;
        const g = ctx2.createRadialGradient(x, y, 0, x, y, rad); g.addColorStop(0, hexA(c, .34)); g.addColorStop(1, hexA(c, 0));
        ctx2.fillStyle = g; ctx2.fillRect(0, 0, w, h);
      });
      ctx2.globalCompositeOperation = "source-over";
      const steps = still ? 120 : 1;
      if (still || first) ctx.clearRect(0, 0, W, H);
      first = false;
      const act = performance.now() - ptr.last < 2500;
      for (let k = 0; k < steps; k++) {
        if (!still) { ctx.globalCompositeOperation = "destination-out"; ctx.fillStyle = "rgba(0,0,0,.06)"; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = "source-over"; }
        ctx.lineWidth = 1.1; ctx.strokeStyle = "rgba(238,240,255,.35)"; ctx.beginPath();
        const tt = still ? 0 : t;
        for (const p of P) {
          let a = (Math.sin(p.x * .0032 + tt * .2) + Math.cos(p.y * .0041 - tt * .15)) * 1.6;
          if (act && !still) { const d = Math.hypot(p.x - ptr.x, p.y - ptr.y); if (d < 160) a += (1 - d / 160) * 2.2; }
          const nx = p.x + Math.cos(a) * 1.6, ny = p.y + Math.sin(a) * 1.6;
          ctx.moveTo(p.x, p.y); ctx.lineTo(nx, ny); p.x = nx; p.y = ny;
          if (--p.l < 0 || nx < 0 || nx > W || ny < 0 || ny > H) { p.x = r() * W; p.y = r() * H; p.l = 80 + r() * 200; }
        }
        ctx.stroke();
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
    fx = make(); t0 = performance.now(); if (reduceMQ.matches) fx(0, true); sync();
  }
  function boot() {
    build();
    let rt, lw = innerWidth; addEventListener("resize", () => { if (innerWidth === lw) return; lw = innerWidth; clearTimeout(rt); rt = setTimeout(build, 160); });
    document.addEventListener("visibilitychange", () => { visible = !document.hidden; sync(); });
    if ("IntersectionObserver" in window) new IntersectionObserver((e) => { onScreen = e[0].isIntersecting; sync(); }).observe(hero);
    reduceMQ.addEventListener?.("change", build);
    addEventListener("pointermove", (e) => { const b = cv.getBoundingClientRect(); ptr.x = e.clientX - b.left; ptr.y = e.clientY - b.top; ptr.last = performance.now(); }, { passive: true });
  }
  requestAnimationFrame(() => ("requestIdleCallback" in window ? requestIdleCallback(boot, { timeout: 500 }) : setTimeout(boot, 1)));
})();
