/* Signal hero ("Assembly"): the initials assembled from particles with spring physics, pointer swirl,
   an idle ghost autopilot and a tap shockwave. The accent (#ff5b1f / 255,91,31) is swapped at build time. */
(() => {
  "use strict";
  const doc = document.documentElement;
  const reduceMQ = matchMedia("(prefers-reduced-motion: reduce)");
  const ACCENT = "#ff5b1f", INK = "rgba(244,241,234,0.88)", DIM = "rgba(244,241,234,0.28)";

  const canvas = document.querySelector("canvas.field");
  if (canvas && canvas.getContext) {
    const ctx = canvas.getContext("2d");
    const word = canvas.dataset.word || "YN";
    const hero = canvas.parentElement;
    doc.classList.add("js-field");

    let W = 0, H = 0, dpr = 1, N = 0, size = 2;
    let hx, hy, x, y, vx, vy, seed; // typed arrays
    let AMB = 0, ax, ay, avx, avy;  // ambient dust
    let raf = 0, visible = true, onScreen = true, t0 = performance.now();
    const ptr = { x: -9999, y: -9999, active: false, last: 0 };
    const rings = [];

    function sample() {
      const rect = hero.getBoundingClientRect();
      W = Math.max(1, rect.width); H = Math.max(1, rect.height);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const off = document.createElement("canvas");
      off.width = Math.ceil(W); off.height = Math.ceil(H);
      const o = off.getContext("2d", { willReadFrequently: true });
      const font = (s) => `900 ${s}px system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif`;
      o.font = font(100);
      const m = o.measureText(word);
      const mobile = W < 700;
      let fs = Math.min((W * (mobile ? 0.9 : 0.72)) / (m.width / 100), H * (mobile ? 0.42 : 0.66));
      o.font = font(fs);
      o.textAlign = "center"; o.textBaseline = "middle";
      o.fillStyle = "#fff";
      const cy = H * (mobile ? 0.36 : 0.42);
      o.fillText(word, W / 2, cy);
      const data = o.getImageData(0, 0, off.width, off.height).data;
      const gap = W < 500 ? 4.5 : W < 1000 ? 5 : 6;
      size = W < 500 ? 1.9 : 2.2;
      const pts = [];
      for (let yy = 0; yy < off.height; yy += gap)
        for (let xx = 0; xx < off.width; xx += gap)
          if (data[((yy | 0) * off.width + (xx | 0)) * 4 + 3] > 128) pts.push(xx, yy);
      const n = pts.length / 2;
      const oldN = N, ox = x, oy = y;
      N = n;
      hx = new Float32Array(n); hy = new Float32Array(n);
      x = new Float32Array(n); y = new Float32Array(n);
      vx = new Float32Array(n); vy = new Float32Array(n);
      seed = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        hx[i] = pts[i * 2] + (Math.random() - 0.5) * gap * 0.6;
        hy[i] = pts[i * 2 + 1] + (Math.random() - 0.5) * gap * 0.6;
        seed[i] = Math.random();
        if (oldN && i < oldN) { x[i] = ox[i]; y[i] = oy[i]; }
        else { // start scattered so it assembles on load
          const a = Math.random() * Math.PI * 2, r = Math.max(W, H) * (0.4 + Math.random() * 0.6);
          x[i] = W / 2 + Math.cos(a) * r; y[i] = H / 2 + Math.sin(a) * r;
        }
      }
      AMB = mobile ? 40 : 90;
      ax = new Float32Array(AMB); ay = new Float32Array(AMB); avx = new Float32Array(AMB); avy = new Float32Array(AMB);
      for (let i = 0; i < AMB; i++) {
        ax[i] = Math.random() * W; ay[i] = Math.random() * H;
        avx[i] = (Math.random() - 0.5) * 0.25; avy[i] = (Math.random() - 0.5) * 0.25;
      }
    }

    function drawStatic() {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = INK;
      for (let i = 0; i < N; i++) ctx.fillRect(hx[i], hy[i], size, size);
      ctx.fillStyle = ACCENT;
      for (let i = 0; i < N; i += 23) ctx.fillRect(hx[i], hy[i], size, size);
    }

    const excited = [];
    function frame(now) {
      raf = requestAnimationFrame(frame);
      const t = (now - t0) / 1000;
      // autopilot: a slow ghost pointer wanders through the letters when nobody is interacting
      let px = ptr.x, py = ptr.y, R = W < 700 ? 90 : 130, S = 2.4;
      if (!ptr.active || now - ptr.last > 2600) {
        px = W / 2 + Math.sin(t * 0.55) * W * 0.3;
        py = H * (W < 700 ? 0.36 : 0.42) + Math.sin(t * 0.9 + 1) * H * 0.16;
        R *= 0.75; S = 1.5;
      }
      const R2 = R * R;
      const k = Math.min(0.03, 0.006 + t * 0.012); // spring ramps up for a smooth assembly
      ctx.clearRect(0, 0, W, H);

      // ambient dust
      ctx.fillStyle = DIM;
      for (let i = 0; i < AMB; i++) {
        ax[i] += avx[i]; ay[i] += avy[i];
        if (ax[i] < 0) ax[i] += W; else if (ax[i] > W) ax[i] -= W;
        if (ay[i] < 0) ay[i] += H; else if (ay[i] > H) ay[i] -= H;
        ctx.fillRect(ax[i], ay[i], 1.2, 1.2);
      }

      excited.length = 0;
      ctx.fillStyle = INK;
      for (let i = 0; i < N; i++) {
        const s = seed[i];
        const tx = hx[i] + Math.sin(t * 1.3 + s * 40) * 0.8;
        const ty = hy[i] + Math.cos(t * 1.1 + s * 30) * 0.8;
        let ix = vx[i] + (tx - x[i]) * k, iy = vy[i] + (ty - y[i]) * k;
        const dx = x[i] - px, dy = y[i] - py, d2 = dx * dx + dy * dy;
        if (d2 < R2 && d2 > 0.01) {
          const d = Math.sqrt(d2), f = (1 - d / R) * S;
          ix += (dx / d) * f * 2.2 - (dy / d) * f * 0.9; // push out with a little swirl
          iy += (dy / d) * f * 2.2 + (dx / d) * f * 0.9;
        }
        ix *= 0.86; iy *= 0.86;
        vx[i] = ix; vy[i] = iy;
        x[i] += ix; y[i] += iy;
        const ex = x[i] - hx[i], ey = y[i] - hy[i];
        if (ex * ex + ey * ey > 30 || s > 0.965) excited.push(i);
        else ctx.fillRect(x[i], y[i], size, size);
      }
      ctx.fillStyle = ACCENT;
      for (let j = 0; j < excited.length; j++) { const i = excited[j]; ctx.fillRect(x[i], y[i], size, size); }

      // shockwave rings
      for (let r = rings.length - 1; r >= 0; r--) {
        const g = rings[r]; g.r += 9; g.a *= 0.94;
        if (g.a < 0.02) { rings.splice(r, 1); continue; }
        ctx.strokeStyle = `rgba(255,91,31,${g.a})`; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(g.x, g.y, g.r, 0, Math.PI * 2); ctx.stroke();
      }
    }

    function shock(cx, cy) {
      const RR = Math.max(W, H) * 0.45;
      for (let i = 0; i < N; i++) {
        const dx = x[i] - cx, dy = y[i] - cy, d = Math.sqrt(dx * dx + dy * dy) || 1;
        if (d < RR) { const f = (1 - d / RR) * 26 * (0.6 + seed[i] * 0.8); vx[i] += (dx / d) * f; vy[i] += (dy / d) * f; }
      }
      rings.push({ x: cx, y: cy, r: 8, a: 0.8 });
    }

    const running = () => !reduceMQ.matches && visible && onScreen;
    function sync() {
      if (!booted) return;
      if (running()) { if (!raf) raf = requestAnimationFrame(frame); }
      else { cancelAnimationFrame(raf); raf = 0; if (reduceMQ.matches) drawStatic(); }
    }

    // start after first paint so the text (not the canvas) is the LCP and the main thread stays free
    let booted = false;
    const boot = () => { if (booted) return; booted = true; sample(); if (reduceMQ.matches) drawStatic(); sync(); };
    requestAnimationFrame(() => {
      if ("requestIdleCallback" in window) requestIdleCallback(boot, { timeout: 500 });
      else setTimeout(boot, 60);
    });

    let rt;
    let lastW = W;
    addEventListener("resize", () => {
      clearTimeout(rt);
      rt = setTimeout(() => {
        const w = hero.getBoundingClientRect().width;
        // ignore height-only jitter from mobile browser toolbars
        if (Math.abs(w - lastW) < 2 && Math.abs(hero.getBoundingClientRect().height - H) < 120) return;
        if (!booted) return;
        lastW = w; sample(); if (reduceMQ.matches) drawStatic();
      }, 150);
    });
    document.addEventListener("visibilitychange", () => { visible = !document.hidden; sync(); });
    if ("IntersectionObserver" in window)
      new IntersectionObserver((e) => { onScreen = e[0].isIntersecting; sync(); }).observe(hero);
    reduceMQ.addEventListener?.("change", sync);

    const local = (e) => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    addEventListener("pointermove", (e) => {
      const [lx, ly] = local(e);
      ptr.x = lx; ptr.y = ly; ptr.active = true; ptr.last = performance.now();
    }, { passive: true });
    document.addEventListener("pointerleave", () => { ptr.active = false; ptr.x = ptr.y = -9999; });
    hero.addEventListener("pointerdown", (e) => {
      if (reduceMQ.matches || e.target.closest("a,button")) return;
      const [lx, ly] = local(e);
      ptr.x = lx; ptr.y = ly; ptr.active = true; ptr.last = performance.now();
      shock(lx, ly);
    });
  }

})();
