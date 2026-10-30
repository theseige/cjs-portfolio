/* Synth hero: a synthwave sunset drawn on canvas.field (the chrome initials are CSS, above it): starfield sky,
   a striped sun sinking into the horizon, parallax wireframe mountains and a neon perspective grid rushing
   toward you. The pointer steers the vanishing point; holding the pointer down hits the boost. */
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
  const ptr = { x: null, down: false };
  let W = 1, H = 1, fx = null, raf = 0, visible = !document.hidden, onScreen = true, t0 = 0;

  function make() {
    const r = rnd(5), mob = W < 700, hz = H * (mob ? .56 : .62);
    const stars = Array.from({ length: mob ? 70 : 140 }, () => [r() * W, r() * hz * .95, r() * 1.4 + .3, r() * 6.28]);
    const ridge = (n, amp, seed) => { const q = rnd(seed); let y = 0; return Array.from({ length: n + 1 }, (_, i) => (y = i === 0 || i === n ? 0 : Math.max(0, Math.min(1, y + (q() - .45) * .7)), y * amp * (.35 + .65 * Math.sin(Math.PI * i / n) ** .5))); };
    const far = ridge(28, Math.min(H * .13, W * .13), 7), near = ridge(18, Math.min(H * .09, W * .09), 9);
    let vx = W / 2, z = 0, speed = 1, last = 0;
    return (t, still) => {
      const dt = still ? 0 : Math.min(.05, t - last); last = t;
      const acc = css("--accent") || "#ff5b1f", c2 = css("--c2") || "#2de8ff", sun = css("--sun") || "#ffd23f";
      vx += ((ptr.x == null ? W / 2 : W / 2 + (ptr.x - W / 2) * .45) - vx) * Math.min(1, dt * 3);
      speed += ((ptr.down ? 4.5 : 1) - speed) * Math.min(1, dt * 2.5); z = (z + dt * speed * .9) % 1;
      ctx.globalCompositeOperation = "source-over"; ctx.clearRect(0, 0, W, H);
      // sun: gradient disc with scrolling cut-out stripes in its lower half
      const R = Math.min(W * (mob ? .36 : .2), H * .3), sx = W / 2 + (W / 2 - vx) * .08, sy = hz - R * .35;
      const g = ctx.createLinearGradient(0, sy - R, 0, sy + R); g.addColorStop(0, sun); g.addColorStop(.55, acc); g.addColorStop(1, "#8a2bff");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, R, 0, 6.283); ctx.fill();
      ctx.globalCompositeOperation = "destination-out";
      for (let i = 0; i < 9; i++) { const f = (i + (still ? .5 : (t * .35) % 1)) / 9, y = sy - R * .1 + f * R * 1.1, h = 1 + f * R * .09; ctx.fillRect(sx - R, y, R * 2, h); }
      // sky behind everything drawn so far
      ctx.globalCompositeOperation = "destination-over";
      for (const [x, y, s, p] of stars) { ctx.fillStyle = `rgba(255,240,255,${still ? .6 : .35 + .35 * Math.sin(t * 2 + p)})`; ctx.fillRect(x, y, s, s); }
      const sky = ctx.createLinearGradient(0, 0, 0, hz); sky.addColorStop(0, "#0c0420"); sky.addColorStop(.6, "#2a0b4d"); sky.addColorStop(1, "#5c1460");
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, hz);
      ctx.globalCompositeOperation = "source-over";
      // mountains (parallax against the steering)
      const mtn = (pts, shift, fill, line) => {
        const step = (W * 1.3) / (pts.length - 1), x0 = -W * .15 + shift;
        ctx.beginPath(); ctx.moveTo(x0, hz); pts.forEach((h, i) => ctx.lineTo(x0 + i * step, hz - h)); ctx.lineTo(x0 + W * 1.3, hz); ctx.closePath();
        ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = line; ctx.lineWidth = 1.2; ctx.stroke();
      };
      mtn(far, (W / 2 - vx) * .12, "#1c0838", hexA(c2, .45)); mtn(near, (W / 2 - vx) * .25, "#14052b", hexA(acc, .6));
      // floor
      const fl = ctx.createLinearGradient(0, hz, 0, H); fl.addColorStop(0, "#1b0533"); fl.addColorStop(1, "#090218");
      ctx.fillStyle = fl; ctx.fillRect(0, hz, W, H - hz);
      const lines = (wide) => {
        ctx.beginPath();
        for (let i = 1; i < 26; i++) { const f = ((i - z) / 26) ** 2.2, y = hz + (H - hz) * f; if (f > 0) { ctx.moveTo(0, y); ctx.lineTo(W, y); } }
        const n = mob ? 14 : 22;
        for (let i = -n; i <= n; i++) { const bx = W / 2 + i * (W / n) * 1.6; ctx.moveTo(vx + i * 6, hz); ctx.lineTo(bx + (W / 2 - vx) * 1.4, H); }
        ctx.lineWidth = wide ? 4 : 1.3; ctx.strokeStyle = wide ? hexA(acc, .18) : hexA(acc, .85); ctx.stroke();
      };
      lines(true); lines(false);
      const hg = ctx.createLinearGradient(0, hz - 2, 0, hz + 40); hg.addColorStop(0, hexA(c2, .9)); hg.addColorStop(.06, hexA(acc, .45)); hg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = hg; ctx.fillRect(0, hz - 1, W, 41);
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
    build();
    let rt, lw = innerWidth; addEventListener("resize", () => { if (innerWidth === lw) return; lw = innerWidth; clearTimeout(rt); rt = setTimeout(build, 160); });
    document.addEventListener("visibilitychange", () => { visible = !document.hidden; sync(); });
    if ("IntersectionObserver" in window) new IntersectionObserver((e) => { onScreen = e[0].isIntersecting; sync(); }).observe(hero);
    reduceMQ.addEventListener?.("change", build);
    addEventListener("pointermove", (e) => { ptr.x = e.clientX - cv.getBoundingClientRect().left; }, { passive: true });
    hero.addEventListener("pointerdown", (e) => { ptr.down = true; ptr.x = e.clientX - cv.getBoundingClientRect().left; }, { passive: true });
    for (const ev of ["pointerup", "pointercancel", "blur"]) addEventListener(ev, () => { ptr.down = false; });
  }
  requestAnimationFrame(() => ("requestIdleCallback" in window ? requestIdleCallback(boot, { timeout: 500 }) : setTimeout(boot, 1)));
})();
