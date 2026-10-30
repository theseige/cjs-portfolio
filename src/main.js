/* CJS Portfolio: behaviour shared by every theme (top bar, decode text, sparks, reveals, pointer glow).
   The hero effect lives in src/themes/<theme>/hero.js and is appended by the build. Vanilla JS, no dependencies.
   The accent (#ff5b1f / 255,91,31) is swapped for site.config.json "accent" at build time. */
(() => {
  "use strict";
  const doc = document.documentElement;
  doc.classList.add("js");
  const reduceMQ = matchMedia("(prefers-reduced-motion: reduce)");
  const fineMQ = matchMedia("(hover: hover) and (pointer: fine)");
  const INK = getComputedStyle(doc).getPropertyValue("--ink").trim() || "#f4f1ea";

  const bar = document.querySelector(".bar");
  if (bar) { const onScroll = () => bar.classList.toggle("scrolled", scrollY > 40); addEventListener("scroll", onScroll, { passive: true }); onScroll(); }

  document.querySelectorAll(".year").forEach((el) => (el.textContent = new Date().getFullYear()));

  /* ---------- cursor glow (themes that render .glow), magnetic elements, card spotlight (fine pointers only) ---------- */
  const glow = document.querySelector(".glow");
  if (fineMQ.matches && !reduceMQ.matches) {
    let gx = innerWidth / 2, gy = innerHeight / 2, tx = gx, ty = gy, gr = 0;
    addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse") return;
      tx = e.clientX; ty = e.clientY; doc.classList.add("has-pointer");
      if (!gr) gr = requestAnimationFrame(moveGlow);
    }, { passive: true });
    function moveGlow() {
      gx += (tx - gx) * 0.18; gy += (ty - gy) * 0.18;
      if (glow) glow.style.transform = `translate3d(${gx}px,${gy}px,0)`;
      gr = Math.abs(tx - gx) + Math.abs(ty - gy) > 0.5 ? requestAnimationFrame(moveGlow) : 0;
    }
    document.addEventListener("pointerleave", () => doc.classList.remove("has-pointer"));

    document.querySelectorAll(".magnetic").forEach((el) => {
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        el.style.transform = `translate(${dx * 0.3}px, ${dy * 0.4}px)`;
      });
      el.addEventListener("pointerleave", () => (el.style.transform = ""));
    });
    document.querySelectorAll(".card").forEach((el) => {
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty("--mx", `${e.clientX - r.left}px`);
        el.style.setProperty("--my", `${e.clientY - r.top}px`);
      });
    });
  }

  /* ---------- scramble / decode text ---------- */
  const GLYPHS = "!<>-_/[]{}=+*^?#%&ABCDEFGHJKLMNPQRSTUVWXYZ0123456789";
  const esc = (c) => (c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === "&" ? "&amp;" : c);
  function scramble(el, duration = 900) {
    if (reduceMQ.matches || el._busy) return;
    const target = el._text || (el._text = el.textContent);
    let vis = el.querySelector(".scr-vis");
    if (!vis) {
      if (el.tagName === "A") el.setAttribute("aria-label", target);
      el.innerHTML = el.tagName === "A" ? `<span class="scr-vis" aria-hidden="true"></span>` : `<span class="sr"></span><span class="scr-vis" aria-hidden="true"></span>`;
      const sr = el.querySelector(".sr"); if (sr) sr.textContent = target;
      vis = el.querySelector(".scr-vis");
    }
    el._busy = true;
    const start = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const reveal = Math.floor(p * target.length);
      let out = "";
      for (let i = 0; i < target.length; i++) {
        const c = target[i];
        if (i < reveal || c === " ") out += esc(c);
        else out += `<span class="scr">${esc(GLYPHS[(Math.random() * GLYPHS.length) | 0])}</span>`;
      }
      vis.innerHTML = out;
      if (p < 1) requestAnimationFrame(step); else { vis.textContent = target; el._busy = false; }
    };
    requestAnimationFrame(step);
  }
  document.querySelectorAll("[data-scramble-load]").forEach((el) => setTimeout(() => scramble(el, 1400), 350));
  document.querySelectorAll("[data-scramble]").forEach((el) => {
    el.addEventListener("pointerenter", () => scramble(el, 500));
    el.addEventListener("focus", () => scramble(el, 500));
  });

  /* ---------- socials: spark bursts + decoding handles ---------- */
  if (!reduceMQ.matches) {
    const sc = document.createElement("canvas");
    sc.className = "sparks"; sc.setAttribute("aria-hidden", "true");
    document.body.appendChild(sc);
    const sx = sc.getContext("2d");
    let sw = 0, sh = 0, sd = 1, sraf = 0, lastEmit = 0;
    const sparks = [];
    const fit = () => { sd = Math.min(devicePixelRatio || 1, 2); sw = innerWidth; sh = innerHeight; sc.width = sw * sd; sc.height = sh * sd; sx.setTransform(sd, 0, 0, sd, 0, 0); };
    fit(); addEventListener("resize", fit);
    const emit = (x, y, n, power) => {
      for (let i = 0; i < n && sparks.length < 600; i++) {
        const a = Math.random() * Math.PI * 2, v = (0.4 + Math.random()) * power;
        sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, decay: 0.012 + Math.random() * 0.02, s: 1.2 + Math.random() * 2, hot: Math.random() < 0.75 });
      }
      if (!sraf) sraf = requestAnimationFrame(tick);
    };
    function tick() {
      sx.clearRect(0, 0, sw, sh);
      for (let i = sparks.length - 1; i >= 0; i--) {
        const p = sparks[i];
        p.vx *= 0.95; p.vy = p.vy * 0.95 + 0.05; p.x += p.vx; p.y += p.vy; p.life -= p.decay;
        if (p.life <= 0) { sparks.splice(i, 1); continue; }
        sx.globalAlpha = p.life;
        sx.fillStyle = p.hot ? "#ff5b1f" : INK;
        sx.fillRect(p.x, p.y, p.s, p.s);
      }
      sx.globalAlpha = 1;
      sraf = sparks.length ? requestAnimationFrame(tick) : 0;
      if (!sraf) sx.clearRect(0, 0, sw, sh);
    }
    document.addEventListener("visibilitychange", () => { if (document.hidden) { sparks.length = 0; } });
    const center = (el) => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };

    document.querySelectorAll(".social").forEach((tile) => {
      const ico = tile.querySelector(".social-ico");
      const handle = tile.querySelector(".social-handle");
      const enter = (x, y) => { emit(x, y, 46, 5); if (handle) scramble(handle, 650); };
      tile.addEventListener("pointerenter", (e) => enter(e.clientX, e.clientY));
      tile.addEventListener("focus", () => enter(...center(ico)));
      tile.addEventListener("pointermove", (e) => {
        const now = performance.now();
        if (now - lastEmit > 28) { lastEmit = now; emit(e.clientX, e.clientY, 2, 1.6); }
      });
      tile.addEventListener("pointerdown", (e) => emit(e.clientX, e.clientY, 90, 8));
    });
    document.querySelectorAll(".bar-social a, .foot-social a").forEach((a) => {
      const go = () => emit(...center(a), 18, 2.6);
      a.addEventListener("pointerenter", go);
      a.addEventListener("focus", go);
    });
  }

  /* ---------- scroll reveals ---------- */
  const reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !reduceMQ.matches) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    reveals.forEach((el) => io.observe(el));
  } else reveals.forEach((el) => el.classList.add("in"));
})();
