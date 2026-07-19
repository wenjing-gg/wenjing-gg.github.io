(function () {
  var selector = ".magic-bento-card, .profile-list li";
  var coarsePointer = window.matchMedia("(pointer: coarse)").matches;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function edgeProximity(rect, x, y) {
    var centerX = rect.width / 2;
    var centerY = rect.height / 2;
    var dx = x - centerX;
    var dy = y - centerY;
    var scaleX = dx === 0 ? Infinity : centerX / Math.abs(dx);
    var scaleY = dy === 0 ? Infinity : centerY / Math.abs(dy);

    return clamp(1 / Math.min(scaleX, scaleY), 0, 1);
  }

  function cursorAngle(rect, x, y) {
    var dx = x - rect.width / 2;
    var dy = y - rect.height / 2;
    if (dx === 0 && dy === 0) return 0;

    var degrees = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
    return degrees < 0 ? degrees + 360 : degrees;
  }

  function addLayer(card, className) {
    var layer = document.createElement("span");
    layer.className = className;
    layer.setAttribute("aria-hidden", "true");
    card.appendChild(layer);
  }

  function addLayers(card) {
    addLayer(card, "border-glow__mesh");
    addLayer(card, "border-glow__fill");
    addLayer(card, "border-glow__edge-light");
  }

  function reset(card) {
    card.style.setProperty("--edge-proximity", "0");
  }

  function enhance(card) {
    if (card.dataset.borderGlowReady === "true") return;

    card.dataset.borderGlowReady = "true";
    card.classList.add("border-glow-card");
    addLayers(card);

    if (coarsePointer || reduceMotion) return;

    card.addEventListener("mousemove", function (event) {
      var rect = card.getBoundingClientRect();
      var x = event.clientX - rect.left;
      var y = event.clientY - rect.top;
      var proximity = edgeProximity(rect, x, y) * 100;
      var angle = cursorAngle(rect, x, y);

      card.style.setProperty("--edge-proximity", proximity.toFixed(3));
      card.style.setProperty("--cursor-angle", angle.toFixed(3) + "deg");
    }, { passive: true });

    card.addEventListener("mouseleave", function () {
      reset(card);
    }, { passive: true });

    card.addEventListener("focusin", function () {
      card.style.setProperty("--edge-proximity", "92");
      card.style.setProperty("--cursor-angle", "135deg");
    });

    card.addEventListener("focusout", function () {
      window.requestAnimationFrame(function () {
        if (!card.contains(document.activeElement)) reset(card);
      });
    });
  }

  function init() {
    var cards = document.querySelectorAll(selector);
    if (cards.length) document.documentElement.classList.add("border-glow-page");
    Array.prototype.forEach.call(cards, enhance);
  }

  document.addEventListener("profile:rendered", init);
  init();
})();
