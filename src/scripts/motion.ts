/**
 * Site-wide motion layer for "SHIZUKU".
 * - Lenis smooth scrolling synced to GSAP ScrollTrigger.
 * - Scroll-reveal batches + line-mask heading intro.
 * - All hover / interaction feedback is unified into water ripples
 *   (dispatched as "gl:drop" events consumed by water-gl.ts).
 * Skipped under prefers-reduced-motion.
 */
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger);

const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function drop(x: number, y: number, strength: number) {
  window.dispatchEvent(
    new CustomEvent("gl:drop", { detail: { x, y, strength } }),
  );
}

/** Wrap each word of a [data-split] element in a clipping mask. */
function splitToLines(el: HTMLElement): HTMLElement[] {
  const words = (el.textContent ?? "").split(/(\s+)/);
  el.textContent = "";
  const inners: HTMLElement[] = [];
  for (const w of words) {
    if (w.trim() === "") {
      el.appendChild(document.createTextNode(w));
      continue;
    }
    const mask = document.createElement("span");
    mask.className = "split-mask";
    const inner = document.createElement("span");
    inner.className = "split-inner";
    inner.textContent = w;
    mask.appendChild(inner);
    el.appendChild(mask);
    inners.push(inner);
  }
  return inners;
}

function initReveals() {
  gsap.set("[data-reveal]", { opacity: 0, y: 14 });
  ScrollTrigger.batch("[data-reveal]", {
    start: "top 90%",
    once: true,
    onEnter: (batch) =>
      gsap.to(batch, {
        opacity: 1,
        y: 0,
        duration: 0.9,
        ease: "power3.out",
        stagger: 0.08,
        overwrite: true,
      }),
  });
}

function initIntro(canvas: HTMLElement | null) {
  const tl = gsap.timeline({ defaults: { ease: "power4.out" } });

  if (canvas) {
    gsap.set(canvas, { opacity: 0 });
    tl.to(canvas, { opacity: 1, duration: 0.7 }, 0);
  }
  // The signature moment: one drop, then the title rises out of the ripple.
  tl.call(
    () => drop(window.innerWidth * 0.5, window.innerHeight * 0.42, 1),
    [],
    0.2,
  );

  const targets = document.querySelectorAll<HTMLElement>("[data-split]");
  targets.forEach((el, i) => {
    el.setAttribute("aria-label", (el.textContent ?? "").trim());
    const inners = splitToLines(el);
    gsap.set(inners, { yPercent: 110 });
    gsap.set(el, { opacity: 1 });
    tl.to(
      inners,
      { yPercent: 0, duration: 1.1, stagger: 0.06 },
      i === 0 ? 0.35 : "-=0.85",
    );
  });

  const fade = document.querySelectorAll<HTMLElement>("[data-hero-fade]");
  if (fade.length) {
    gsap.set(fade, { opacity: 0, y: 16 });
    tl.to(fade, { opacity: 1, y: 0, duration: 0.9, stagger: 0.12 }, "-=0.5");
  }
}

function initDrops() {
  if (window.matchMedia("(hover: none), (pointer: coarse)").matches) {
    // touch: ripple on tap only
    window.addEventListener(
      "pointerdown",
      (e) => drop(e.clientX, e.clientY, 1),
      { passive: true },
    );
    return;
  }
  let lx = 0,
    ly = 0,
    lt = 0;
  window.addEventListener(
    "pointermove",
    (e) => {
      const now = performance.now();
      const dx = e.clientX - lx;
      const dy = e.clientY - ly;
      if (now - lt > 90 && dx * dx + dy * dy > 1600) {
        lx = e.clientX;
        ly = e.clientY;
        lt = now;
        drop(e.clientX, e.clientY, 0.18);
      }
    },
    { passive: true },
  );
  window.addEventListener("pointerdown", (e) => drop(e.clientX, e.clientY, 1), {
    passive: true,
  });
  document.querySelectorAll<HTMLElement>("[data-drop]").forEach((el) => {
    el.addEventListener("pointerenter", () => {
      const r = el.getBoundingClientRect();
      drop(r.left + r.width / 2, r.top + r.height / 2, 0.5);
    });
  });
}

function initLenis() {
  const lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  document.querySelectorAll<HTMLAnchorElement>('a[href*="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const hash = a.hash;
      if (!hash || hash === "#") return;
      if (a.pathname !== window.location.pathname) return;
      const target = document.querySelector(hash);
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target as HTMLElement, { offset: -40 });
      history.pushState(null, "", hash);
    });
  });
}

function boot() {
  const canvas = document.getElementById("water-canvas");
  if (reduce) {
    gsap.set("[data-reveal], [data-hero-fade], [data-split]", {
      opacity: 1,
      y: 0,
    });
    if (canvas) gsap.set(canvas, { opacity: 1 });
    return;
  }
  initLenis();
  initIntro(canvas);
  initReveals();
  initDrops();
  ScrollTrigger.refresh();
  if (document.fonts?.ready) {
    document.fonts.ready.then(() => ScrollTrigger.refresh());
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}
