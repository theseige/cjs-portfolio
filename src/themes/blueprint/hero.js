/* Blueprint hero: the initials drafted on canvas.field like a technical drawing. Construction lines run out,
   the letter outlines are plotted stroke by stroke, hatching sweeps in, then dimension callouts appear.
   The pointer is a measuring crosshair with live coordinates and an accent hatch lens; click or tap redraws. */
(() => {
  "use strict";
  const doc = document.documentElement;
  const reduceMQ = matchMedia("(prefers-reduced-motion: reduce)");
  const cv = document.querySelector("canvas.field");
  if (!cv || !cv.getContext) return;
  const hero = cv.parentElement, ctx = cv.getContext("2d"), word = cv.dataset.word || "YN";
  const css = (n) => getComputedStyle(doc).getPropertyValue(n).trim();
  const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';
  const ptr = { x: -9999, y: -9999, last: -1e9 };
  let W = 1, H = 1, fx = null, raf = 0, visible = !document.hidden, onScreen = true, t0 = 0, start = 0;
  const clamp = (v) => Math.max(0, Math.min(1, v)), ease = (v) => 1 - (1 - clamp(v)) ** 3;

  function make() {
    const mob = W < 700, font = (z) => `800 ${z}px system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif`;
    ctx.font = font(100); const m0 = ctx.measureText(word);
    const fs = Math.min((W * (mob ? .84 : .6)) / (m0.width / 100), H * (mob ? .36 : .5) * 1.35);
    ctx.font = font(fs); ctx.textAlign = "center"; const m = ctx.measureText(word);
    const cx = W / 2, base = H * (mob ? .34 : .4) + m.actualBoundingBoxAscent / 2, cap = base - m.actualBoundingBoxAscent;
    const left = cx - m.actualBoundingBoxLeft, right = cx + m.actualBoundingBoxRight;
    const edges = [left]; let acc = cx - m.width / 2; // per-letter extents for the vertical construction lines
    for (const ch of word) { const w = ctx.measureText(ch).width; edges.push(acc + w); acc += w; }
    edges[edges.length - 1] = right;
    const layer = (col, step) => { // diagonal hatching masked to the letters
      const o = document.createElement("canvas"), dpr = cv.width / W; o.width = cv.width; o.height = cv.height;
      const g = o.getContext("2d"); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.strokeStyle = col; g.lineWidth = 1; g.beginPath();
      for (let x = -H; x < W; x += step) { g.moveTo(x, H); g.lineTo(x + H, 0); } g.stroke();
      g.globalCompositeOperation = "destination-in"; g.font = font(fs); g.textAlign = "center"; g.textBaseline = "alphabetic"; g.fillText(word, cx, base);
      return o;
    };
    const ink = css("--ink") || "#eef5ff", hatch = layer("rgba(238,245,255,.42)", mob ? 6 : 8), lens = layer(css("--accent") || "#ff5b1f", mob ? 4 : 5);
    let last = -1;
    const arrow = (x, y, dir) => { ctx.moveTo(x, y); ctx.lineTo(x + dir * 8, y - 4); ctx.moveTo(x, y); ctx.lineTo(x + dir * 8, y + 4); };
    const varrow = (x, y, dir) => { ctx.moveTo(x, y); ctx.lineTo(x - 4, y + dir * 8); ctx.moveTo(x, y); ctx.lineTo(x + 4, y + dir * 8); };
    return (t, still) => {
      if (!still && t - last < 1 / 30) return; last = t;
      const c = still ? 99 : t - start, a = css("--accent") || "#ff5b1f";
      ctx.clearRect(0, 0, W, H); ctx.textBaseline = "alphabetic";
      // 1. construction lines (marching dashes)
      const pc = ease(c / 1.2);
      ctx.save(); ctx.strokeStyle = "rgba(238,245,255,.38)"; ctx.lineWidth = 1; ctx.setLineDash([6, 6]); ctx.lineDashOffset = still ? 0 : -t * 14; ctx.beginPath();
      for (const y of [base, cap, (base + cap) / 2]) { ctx.moveTo(cx - W / 2 * pc, y); ctx.lineTo(cx + W / 2 * pc, y); }
      for (const x of edges) { ctx.moveTo(x, base + 50); ctx.lineTo(x, base + 50 - (base + 50 - cap + 50) * pc); }
      ctx.stroke(); ctx.restore();
      // 2. hatching sweep, 3. plotted outline
      const ph = ease((c - 2.6) / 1.3);
      if (ph > 0) { ctx.save(); ctx.beginPath(); ctx.rect(left - 4, 0, (right - left + 8) * ph, H); ctx.clip(); ctx.drawImage(hatch, 0, 0, W, H); ctx.restore(); }
      const po = ease((c - .5) / 2.4);
      if (po > 0) {
        ctx.save(); ctx.font = font(fs); ctx.textAlign = "center"; ctx.strokeStyle = ink; ctx.lineWidth = mob ? 1.6 : 2; ctx.lineJoin = "round";
        if (po < 1) ctx.setLineDash([po * fs * 4.2, 1e5]); ctx.strokeText(word, cx, base); ctx.restore();
      }
      // 4. dimension callouts
      const pd = ease((c - 3.6) / .8);
      if (pd > 0) {
        ctx.save(); ctx.globalAlpha = pd; ctx.strokeStyle = a; ctx.fillStyle = a; ctx.lineWidth = 1; ctx.font = `500 ${mob ? 10 : 12}px ${MONO}`;
        const dy = base + (mob ? 26 : 38), dx = left - (mob ? 14 : 30);
        ctx.beginPath(); ctx.moveTo(left, dy); ctx.lineTo(right, dy); arrow(left, dy, 1); arrow(right, dy, -1);
        ctx.moveTo(dx, cap); ctx.lineTo(dx, base); varrow(dx, cap, 1); varrow(dx, base, -1);
        const ccx = (left + right) / 2, ccy = (cap + base) / 2; ctx.moveTo(ccx - 10, ccy); ctx.lineTo(ccx + 10, ccy); ctx.moveTo(ccx, ccy - 10); ctx.lineTo(ccx, ccy + 10);
        ctx.stroke(); ctx.beginPath(); ctx.arc(ccx, ccy, 6, 0, 6.283); ctx.stroke();
        const wl = `W ${(right - left).toFixed(1)}`, hl = `H ${(base - cap).toFixed(1)}`, tw = ctx.measureText(wl).width + 12;
        ctx.fillStyle = css("--bg") || "#0d3b73"; ctx.fillRect(ccx - tw / 2, dy - 9, tw, 18); ctx.fillStyle = a; ctx.textAlign = "center"; ctx.fillText(wl, ccx, dy + 4);
        ctx.save(); ctx.translate(dx - 8, (cap + base) / 2); ctx.rotate(-Math.PI / 2); ctx.fillText(hl, 0, 0); ctx.restore();
        ctx.textAlign = "left"; ctx.fillText(`SCALE 1:1  ·  ${word.split("").join(" · ")}`, left, cap - (mob ? 14 : 20));
        ctx.restore();
      }
      // pointer: crosshair, coordinates and an accent hatch lens
      if (!still && performance.now() - ptr.last < 3000) {
        const x = ptr.x, y = ptr.y, R = mob ? 54 : 78;
        ctx.save(); ctx.beginPath(); ctx.arc(x, y, R, 0, 6.283); ctx.clip(); ctx.drawImage(lens, 0, 0, W, H); ctx.restore();
        ctx.save(); ctx.strokeStyle = "rgba(238,245,255,.4)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
        ctx.strokeStyle = a; ctx.beginPath(); ctx.arc(x, y, R, 0, 6.283);
        for (let i = 0; i < 24; i++) { const an = i * Math.PI / 12, l = i % 6 ? 5 : 11; ctx.moveTo(x + Math.cos(an) * R, y + Math.sin(an) * R); ctx.lineTo(x + Math.cos(an) * (R - l), y + Math.sin(an) * (R - l)); }
        ctx.stroke(); ctx.fillStyle = a; ctx.font = `500 11px ${MONO}`;
        ctx.fillText(`X ${String(Math.round(x)).padStart(4, "0")}  Y ${String(Math.round(y)).padStart(4, "0")}`, x + 10, y - 10); ctx.restore();
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
    fx = make(); t0 = performance.now(); start = 0; fx(0, true); sync();
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
    hero.addEventListener("pointerdown", (e) => { at(e); if (!reduceMQ.matches) start = (performance.now() - t0) / 1000; }, { passive: true });
  }
  requestAnimationFrame(() => ("requestIdleCallback" in window ? requestIdleCallback(boot, { timeout: 500 }) : setTimeout(boot, 1)));
})();
