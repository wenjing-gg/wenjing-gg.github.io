/*
 * Pointer glow adapted from guanmo-ai/guanmo-studio, web/atlas/pointer-glow.js.
 * Copyright (c) 2026 Guanmo (观默), MIT.
 * Source and license: docs/guanmo-components.md.
 */
(function () {
  var instances = [];

  /* Delegated listeners also cover cards replaced by profile rendering. */
  function bindPointerGlow(root) {
    var fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    var motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    var active = null, rect, x = 0, y = 0, scrollX = 0, scrollY = 0, raf = 0;

    function clear() {
      if (active) active.classList.remove("is-pointer-active");
      active = null;
      window.cancelAnimationFrame(raf);
      raf = 0;
    }

    function draw() {
      raf = 0;
      if (!active) return;
      active.style.setProperty("--mx", (x - rect.left + window.scrollX - scrollX) + "px");
      active.style.setProperty("--my", (y - rect.top + window.scrollY - scrollY) + "px");
    }

    function enter(event) {
      if (!fine.matches || motion.matches || !(event.target instanceof Element)) return;
      var element = event.target.closest("[data-magic-bento-card]");
      if (!element || !root.contains(element) || active === element) return;
      clear();
      active = element;
      rect = element.getBoundingClientRect();
      scrollX = window.scrollX;
      scrollY = window.scrollY;
      x = event.clientX;
      y = event.clientY;
      draw();
      element.classList.add("is-pointer-active");
    }

    function move(event) {
      if (!active) return;
      x = event.clientX;
      y = event.clientY;
      if (!raf) raf = window.requestAnimationFrame(draw);
    }

    function leave(event) {
      if (event.target === active) clear();
    }

    function syncMotion() {
      clear();
      var interactive = fine.matches && !motion.matches;
      root.dataset.magicBentoReady = interactive ? "interactive" : "static";
      root.dataset.magicBentoEngine = interactive ? "guanmo-pointer-glow" : "static";
    }

    root.addEventListener("pointerenter", enter, true);
    root.addEventListener("pointermove", move, { passive: true });
    root.addEventListener("pointerleave", leave, true);
    fine.addEventListener("change", syncMotion);
    motion.addEventListener("change", syncMotion);
    syncMotion();

    return function () {
      clear();
      root.removeEventListener("pointerenter", enter, true);
      root.removeEventListener("pointermove", move);
      root.removeEventListener("pointerleave", leave, true);
      fine.removeEventListener("change", syncMotion);
      motion.removeEventListener("change", syncMotion);
    };
  }

  function init() {
    instances.forEach(function (destroy) { destroy(); });
    instances = Array.prototype.map.call(document.querySelectorAll("[data-magic-bento-grid]"), bindPointerGlow);
  }

  document.addEventListener("profile:rendered", init);
  init();
})();
