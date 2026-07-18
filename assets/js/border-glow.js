(function () {
  var selector = ".profile-hero, .profile-section, .love-window, .sidebar.sticky";
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function edgeProximity(rect, x, y) {
    var centerX = rect.width / 2;
    var centerY = rect.height / 2;
    var horizontal = centerX ? Math.abs(x - centerX) / centerX : 0;
    var vertical = centerY ? Math.abs(y - centerY) / centerY : 0;
    return clamp(Math.max(horizontal, vertical), 0, 1);
  }

  function cursorAngle(rect, x, y) {
    var dx = x - rect.width / 2;
    var dy = y - rect.height / 2;
    var degrees = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
    return degrees < 0 ? degrees + 360 : degrees;
  }

  function addLayers(card) {
    var mesh = document.createElement("span");
    var edge = document.createElement("span");

    mesh.className = "border-glow__mesh";
    edge.className = "border-glow__edge";
    mesh.setAttribute("aria-hidden", "true");
    edge.setAttribute("aria-hidden", "true");
    card.appendChild(mesh);
    card.appendChild(edge);
  }

  function enhance(card) {
    if (card.dataset.borderGlowReady === "true") return;

    card.dataset.borderGlowReady = "true";
    card.classList.add("border-glow-card");
    addLayers(card);

    if (!finePointer || reduceMotion) return;

    card.addEventListener("pointermove", function (event) {
      var rect = card.getBoundingClientRect();
      var x = event.clientX - rect.left;
      var y = event.clientY - rect.top;
      var proximity = edgeProximity(rect, x, y) * 100;
      var angle = cursorAngle(rect, x, y);

      card.style.setProperty("--edge-proximity", proximity.toFixed(2));
      card.style.setProperty("--cursor-angle", angle.toFixed(2) + "deg");
    }, { passive: true });

    card.addEventListener("pointerleave", function () {
      card.style.setProperty("--edge-proximity", "0");
    }, { passive: true });

    card.addEventListener("focusin", function () {
      card.style.setProperty("--edge-proximity", "92");
      card.style.setProperty("--cursor-angle", "135deg");
    });

    card.addEventListener("focusout", function () {
      window.requestAnimationFrame(function () {
        if (!card.contains(document.activeElement)) {
          card.style.setProperty("--edge-proximity", "0");
        }
      });
    });
  }

  function init() {
    Array.prototype.forEach.call(document.querySelectorAll(selector), enhance);
  }

  document.addEventListener("profile:rendered", init);
  init();
})();
