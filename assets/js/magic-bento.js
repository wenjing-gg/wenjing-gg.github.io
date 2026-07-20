(function () {
  var instances = [];
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var coarsePointer = window.matchMedia("(pointer: coarse)").matches;
  var mobile = window.matchMedia("(max-width: 768px)").matches;
  var animationsDisabled = reduceMotion || coarsePointer || mobile;

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function colorFor(card) {
    if (card.classList.contains("magic-bento-card--published")) return "39, 198, 180";
    if (card.classList.contains("magic-bento-card--patent")) return "233, 120, 86";
    return "120, 107, 214";
  }

  function MagicBento(grid) {
    this.grid = grid;
    this.cards = Array.prototype.slice.call(grid.querySelectorAll("[data-magic-bento-card]"));
    this.disabled = animationsDisabled;
    this.activeCard = null;
    this.activeRect = null;
    this.pointer = null;
    this.frameId = 0;
    this.onMove = this.handleMove.bind(this);
    this.onLeave = this.handleLeave.bind(this);
    this.onClick = this.handleClick.bind(this);
    this.onFrame = this.applyPointer.bind(this);

    grid.dataset.magicBentoReady = this.disabled ? "static" : "interactive";
    grid.dataset.magicBentoEngine = this.disabled ? "static" : "native-raf";

    this.cards.forEach(function (card) {
      card.style.setProperty("--magic-glow-rgb", colorFor(card));
    });

    if (this.disabled) return;
    grid.addEventListener("pointermove", this.onMove, { passive: true });
    grid.addEventListener("pointerleave", this.onLeave, { passive: true });
    grid.addEventListener("click", this.onClick);
  }

  MagicBento.prototype.resetCard = function (card) {
    if (!card) return;
    card.classList.remove("is-tracking");
    card.style.setProperty("--magic-glow-intensity", "0");
    card.style.setProperty("--magic-magnet-x", "0px");
    card.style.setProperty("--magic-magnet-y", "0px");
    card.style.setProperty("--magic-rotate-x", "0deg");
    card.style.setProperty("--magic-rotate-y", "0deg");
  };

  MagicBento.prototype.setActiveCard = function (card) {
    if (card === this.activeCard) return;
    this.resetCard(this.activeCard);
    this.activeCard = card;
    this.activeRect = card ? card.getBoundingClientRect() : null;
    if (card) card.classList.add("is-tracking");
  };

  MagicBento.prototype.handleMove = function (event) {
    var card = event.target.closest && event.target.closest("[data-magic-bento-card]");
    if (!card || !this.grid.contains(card)) {
      this.setActiveCard(null);
      return;
    }
    this.setActiveCard(card);
    this.pointer = { x: event.clientX, y: event.clientY };
    if (!this.frameId) this.frameId = window.requestAnimationFrame(this.onFrame);
  };

  MagicBento.prototype.applyPointer = function () {
    this.frameId = 0;
    if (!this.activeCard || !this.activeRect || !this.pointer) return;
    var rect = this.activeRect;
    var x = clamp(this.pointer.x - rect.left, 0, rect.width);
    var y = clamp(this.pointer.y - rect.top, 0, rect.height);
    var xRatio = x / Math.max(rect.width, 1);
    var yRatio = y / Math.max(rect.height, 1);

    this.activeCard.style.setProperty("--magic-glow-x", x.toFixed(2) + "px");
    this.activeCard.style.setProperty("--magic-glow-y", y.toFixed(2) + "px");
    this.activeCard.style.setProperty("--magic-glow-intensity", "1");
    this.activeCard.style.setProperty("--magic-rotate-x", ((yRatio - 0.5) * -2.4).toFixed(3) + "deg");
    this.activeCard.style.setProperty("--magic-rotate-y", ((xRatio - 0.5) * 2.4).toFixed(3) + "deg");
    this.activeCard.style.setProperty("--magic-magnet-x", ((x - rect.width / 2) * 0.012).toFixed(2) + "px");
    this.activeCard.style.setProperty("--magic-magnet-y", ((y - rect.height / 2) * 0.012).toFixed(2) + "px");
  };

  MagicBento.prototype.handleLeave = function () {
    if (this.frameId) window.cancelAnimationFrame(this.frameId);
    this.frameId = 0;
    this.pointer = null;
    this.setActiveCard(null);
  };

  MagicBento.prototype.addRipple = function (card, event) {
    var rect = card.getBoundingClientRect();
    var x = event.clientX - rect.left;
    var y = event.clientY - rect.top;
    var size = Math.max(rect.width, rect.height) * 1.6;
    var ripple = document.createElement("span");
    ripple.className = "magic-bento-ripple";
    ripple.style.width = size + "px";
    ripple.style.height = size + "px";
    ripple.style.left = x - size / 2 + "px";
    ripple.style.top = y - size / 2 + "px";
    ripple.style.setProperty("--ripple-rgb", colorFor(card));
    card.appendChild(ripple);
    var animation = ripple.animate(
      [{ transform: "scale(0)", opacity: 0.52 }, { transform: "scale(1)", opacity: 0 }],
      { duration: 520, easing: "cubic-bezier(0.2, 0.7, 0.2, 1)" }
    );
    animation.onfinish = function () { ripple.remove(); };
  };

  MagicBento.prototype.handleClick = function (event) {
    var card = event.target.closest && event.target.closest("[data-magic-bento-card]");
    if (card && this.grid.contains(card)) this.addRipple(card, event);
  };

  MagicBento.prototype.destroy = function () {
    if (this.frameId) window.cancelAnimationFrame(this.frameId);
    this.resetCard(this.activeCard);
    if (!this.disabled) {
      this.grid.removeEventListener("pointermove", this.onMove);
      this.grid.removeEventListener("pointerleave", this.onLeave);
      this.grid.removeEventListener("click", this.onClick);
    }
  };

  function init() {
    instances.forEach(function (instance) { instance.destroy(); });
    instances = Array.prototype.map.call(document.querySelectorAll("[data-magic-bento-grid]"), function (grid) {
      return new MagicBento(grid);
    });
  }

  document.addEventListener("profile:rendered", init);
  init();
})();
