/* Terminal hero: phosphor glyph rain on canvas .field (30 fps, faster near the pointer) and a typed
   shell session (whoami -> your name, cat now.txt -> the tagline below it). The h1 initials stay visible. */
(() => {
  "use strict";
  const doc = document.documentElement;
  const reduceMQ = matchMedia("(prefers-reduced-motion: reduce)");
  const cv = document.querySelector("canvas.field");
  if (!cv || !cv.getContext) return;
  const hero = cv.parentElement, ctx = cv.getContext("2d");
  const css = (n) => getComputedStyle(doc).getPropertyValue(n).trim();
  const hexA = (hex, a) => { const n = parseInt(hex.replace("#", ""), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; };
  const rnd = (s) => () => (s = (s * 16807) % 2147483647) / 2147483647;
  const ptr = { x: -9999, y: -9999, last: -1e9 };
  let W = 1, H = 1, fx = null, raf = 0, visible = !document.hidden, onScreen = true, t0 = 0;

  // typed session, inserted above the tagline (decorative: screen readers get the h1 name and the tagline)
  const copy = hero.querySelector(".hero-copy"), tag = hero.querySelector(".tagline"), sr = hero.querySelector(".hero-title .sr");
  if (copy && tag && sr) {
    const term = document.createElement("pre"); term.className = "term"; term.setAttribute("aria-hidden", "true");
    copy.insertBefore(term, tag);
    const lines = [["$ ", "whoami"], ["", sr.textContent.toLowerCase()], ["$ ", "cat now.txt"]];
    const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
    if (reduceMQ.matches) term.innerHTML = lines.map(([p, s]) => (p ? "<b>" + p + "</b>" : "") + esc(s)).join("\n");
    else {
      let li = 0, ci = 0, out = "";
      const step = () => {
        if (li >= lines.length) return;
        const [p, s] = lines[li];
        if (!p) { out += esc(s) + "\n"; li++; ci = 0; term.innerHTML = out; setTimeout(step, 380); return; }
        ci++; term.innerHTML = out + "<b>" + p + "</b>" + esc(s.slice(0, ci)) + "▋";
        if (ci >= s.length) { out += "<b>" + p + "</b>" + esc(s) + (li < lines.length - 1 ? "\n" : ""); li++; ci = 0; term.innerHTML = out; setTimeout(step, 420); }
        else setTimeout(step, 70 + Math.random() * 70);
      };
      setTimeout(step, 300);
    }
  }

  function make() {
    const fs = W < 700 ? 13 : 15, cols = Math.ceil(W / fs), r = rnd(5);
    const drops = Array.from({ length: cols }, () => r() * -H / fs), speed = Array.from({ length: cols }, () => .25 + r() * .55);
    const glyphs = "01アイウエオカキクケコｱｲｳ<>/{}[]=+*#$%&ABCDEFabcdef".split("");
    let last = 0;
    return (t, still) => {
      const acc = css("--accent") || "#ff5b1f";
      ctx.font = `${fs}px ui-monospace, monospace`;
      if (still) { ctx.clearRect(0, 0, W, H); for (let c = 0; c < cols; c++) for (let k = 0; k < 6; k++) { ctx.fillStyle = hexA(acc, .05 + k * .04); ctx.fillText(glyphs[(c * 7 + k) % glyphs.length], c * fs, ((c * 37) % 40 + k) * fs); } return; }
      if (t - last < 1 / 30) return; last = t;
      ctx.globalCompositeOperation = "destination-out"; ctx.fillStyle = "rgba(0,0,0,.09)"; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = "source-over";
      const act = performance.now() - ptr.last < 1500;
      for (let c = 0; c < cols; c++) {
        const px = c * fs, near = act && Math.abs(px - ptr.x) < 60, y = drops[c] * fs;
        ctx.fillStyle = near ? css("--ink") : hexA(acc, .85); ctx.fillText(glyphs[(r() * glyphs.length) | 0], px, y);
        drops[c] += speed[c] * (near ? 3 : 1);
        if (y > H && r() > .975) drops[c] = 0;
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
  // after first paint, so the HTML text stays the LCP element
  requestAnimationFrame(() => ("requestIdleCallback" in window ? requestIdleCallback(boot, { timeout: 500 }) : setTimeout(boot, 1)));
})();
