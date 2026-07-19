(function () {
  var instances = [];
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var coarsePointer = window.matchMedia("(pointer: coarse)").matches;
  var mobile = window.matchMedia("(max-width: 768px)").matches;
  var animationsDisabled = reduceMotion || coarsePointer || mobile;
  var gsapPromise = animationsDisabled
    ? Promise.resolve(null)
    : import("gsap").then(function (module) {
        return module.gsap || module.default || null;
      }).catch(function () {
        return null;
      });

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function colorFor(card) {
    if (card.classList.contains("magic-bento-card--published")) return "39, 198, 180";
    if (card.classList.contains("magic-bento-card--patent")) return "233, 120, 86";
    return "120, 107, 214";
  }

  function MagicBento(grid, gsap) {
    this.grid = grid;
    this.gsap = gsap;
    this.cards = Array.prototype.slice.call(grid.querySelectorAll("[data-magic-bento-card]"));
    this.disabled = animationsDisabled;
    this.spotlight = null;
    this.cardHandlers = [];
    this.inside = false;
    this.onGridMove = this.handleGridMove.bind(this);
    this.onGridLeave = this.handleGridLeave.bind(this);
    grid.dataset.magicBentoReady = this.disabled ? "static" : "interactive";
    grid.dataset.magicBentoEngine = gsap ? "gsap" : "native";

    this.cards.forEach(function (card) {
      card.style.setProperty("--magic-glow-rgb", colorFor(card));
    });

    if (this.disabled) return;
    this.createSpotlight();
    document.addEventListener("pointermove", this.onGridMove, { passive: true });
    document.addEventListener("pointerleave", this.onGridLeave, { passive: true });
    this.bindCards();
  }

  MagicBento.prototype.createSpotlight = function () {
    var spotlight = document.createElement("span");
    spotlight.className = "magic-bento-spotlight";
    spotlight.setAttribute("aria-hidden", "true");
    document.body.appendChild(spotlight);
    this.spotlight = spotlight;
  };

  MagicBento.prototype.animate = function (element, values) {
    if (this.gsap) {
      this.gsap.to(element, Object.assign({ overwrite: true }, values));
      return;
    }
    if (values.x !== undefined) element.style.setProperty("--magic-magnet-x", values.x + "px");
    if (values.y !== undefined) element.style.setProperty("--magic-magnet-y", values.y + "px");
    if (values.rotateX !== undefined) element.style.setProperty("--magic-rotate-x", values.rotateX + "deg");
    if (values.rotateY !== undefined) element.style.setProperty("--magic-rotate-y", values.rotateY + "deg");
    if (values.opacity !== undefined) element.style.opacity = values.opacity;
  };

  MagicBento.prototype.handleGridMove = function (event) {
    var gridRect = this.grid.getBoundingClientRect();
    if (event.clientX < gridRect.left || event.clientX > gridRect.right || event.clientY < gridRect.top || event.clientY > gridRect.bottom) {
      if (this.inside) this.handleGridLeave();
      return;
    }
    this.inside = true;

    if (this.spotlight) {
      this.animate(this.spotlight, {
        x: event.clientX,
        y: event.clientY,
        opacity: 0.48,
        duration: 0.18,
        ease: "power2.out"
      });
    }

    this.cards.forEach(function (card) {
      var rect = card.getBoundingClientRect();
      var centerX = rect.left + rect.width / 2;
      var centerY = rect.top + rect.height / 2;
      var distance = Math.max(0, Math.hypot(event.clientX - centerX, event.clientY - centerY) - Math.max(rect.width, rect.height) / 2);
      var intensity = clamp(1 - distance / 230, 0, 1);
      var x = (event.clientX - rect.left) / Math.max(rect.width, 1) * 100;
      var y = (event.clientY - rect.top) / Math.max(rect.height, 1) * 100;
      card.style.setProperty("--magic-glow-x", x.toFixed(2) + "%");
      card.style.setProperty("--magic-glow-y", y.toFixed(2) + "%");
      card.style.setProperty("--magic-glow-intensity", intensity.toFixed(3));
    });
  };

  MagicBento.prototype.handleGridLeave = function () {
    if (!this.inside) return;
    this.inside = false;
    if (this.spotlight) this.animate(this.spotlight, { opacity: 0, duration: 0.28, ease: "power2.out" });
    var self = this;
    this.cards.forEach(function (card) {
      card.style.setProperty("--magic-glow-intensity", "0");
      self.clearParticles(card);
      self.animate(card, { rotateX: 0, rotateY: 0, x: 0, y: 0, duration: 0.3, ease: "power2.out" });
    });
  };

  MagicBento.prototype.createParticles = function (card) {
    if (card.querySelector(".magic-bento-particle")) return;
    var color = colorFor(card);
    var gsap = this.gsap;
    for (var index = 0; index < 8; index += 1) {
      var particle = document.createElement("span");
      particle.className = "magic-bento-particle";
      particle.style.left = (12 + Math.random() * 76).toFixed(2) + "%";
      particle.style.top = (12 + Math.random() * 76).toFixed(2) + "%";
      particle.style.setProperty("--particle-rgb", color);
      card.appendChild(particle);
      if (gsap) {
        gsap.fromTo(particle,
          { scale: 0, opacity: 0 },
          { scale: 1, opacity: 0.82, duration: 0.26, delay: index * 0.045, ease: "back.out(1.7)" }
        );
        gsap.to(particle, {
          x: (Math.random() - 0.5) * 56,
          y: (Math.random() - 0.5) * 56,
          opacity: 0.25,
          duration: 1.7 + Math.random() * 1.2,
          delay: index * 0.045,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut"
        });
      }
    }
  };

  MagicBento.prototype.clearParticles = function (card) {
    var particles = Array.prototype.slice.call(card.querySelectorAll(".magic-bento-particle"));
    var gsap = this.gsap;
    particles.forEach(function (particle) {
      if (gsap) {
        gsap.killTweensOf(particle);
        gsap.to(particle, { scale: 0, opacity: 0, duration: 0.2, onComplete: function () { particle.remove(); } });
      } else particle.remove();
    });
  };

  MagicBento.prototype.addRipple = function (card, event) {
    var rect = card.getBoundingClientRect();
    var x = event.clientX - rect.left;
    var y = event.clientY - rect.top;
    var size = Math.max(rect.width, rect.height) * 1.8;
    var ripple = document.createElement("span");
    ripple.className = "magic-bento-ripple";
    ripple.style.width = size + "px";
    ripple.style.height = size + "px";
    ripple.style.left = x - size / 2 + "px";
    ripple.style.top = y - size / 2 + "px";
    ripple.style.setProperty("--ripple-rgb", colorFor(card));
    card.appendChild(ripple);
    if (this.gsap) {
      this.gsap.fromTo(ripple, { scale: 0, opacity: 0.62 }, { scale: 1, opacity: 0, duration: 0.7, ease: "power2.out", onComplete: function () { ripple.remove(); } });
    } else {
      var animation = ripple.animate([{ transform: "scale(0)", opacity: 0.62 }, { transform: "scale(1)", opacity: 0 }], { duration: 700, easing: "ease-out" });
      animation.onfinish = function () { ripple.remove(); };
    }
  };

  MagicBento.prototype.bindCards = function () {
    var self = this;
    this.cards.forEach(function (card) {
      var enter = function () { self.createParticles(card); };
      var move = function (event) {
        self.createParticles(card);
        var rect = card.getBoundingClientRect();
        var x = event.clientX - rect.left;
        var y = event.clientY - rect.top;
        var rotateX = (y / Math.max(rect.height, 1) - 0.5) * -4;
        var rotateY = (x / Math.max(rect.width, 1) - 0.5) * 4;
        self.animate(card, {
          rotateX: rotateX,
          rotateY: rotateY,
          x: (x - rect.width / 2) * 0.025,
          y: (y - rect.height / 2) * 0.025,
          transformPerspective: 900,
          duration: 0.2,
          ease: "power2.out"
        });
      };
      var leave = function () {
        self.clearParticles(card);
        self.animate(card, { rotateX: 0, rotateY: 0, x: 0, y: 0, duration: 0.3, ease: "power2.out" });
      };
      var click = function (event) { self.addRipple(card, event); };
      card.addEventListener("mouseenter", enter, { passive: true });
      card.addEventListener("mousemove", move, { passive: true });
      card.addEventListener("mouseleave", leave, { passive: true });
      card.addEventListener("click", click);
      self.cardHandlers.push({ card: card, enter: enter, move: move, leave: leave, click: click });
    });
  };

  MagicBento.prototype.destroy = function () {
    document.removeEventListener("pointermove", this.onGridMove);
    document.removeEventListener("pointerleave", this.onGridLeave);
    this.cardHandlers.forEach(function (handlers) {
      handlers.card.removeEventListener("mouseenter", handlers.enter);
      handlers.card.removeEventListener("mousemove", handlers.move);
      handlers.card.removeEventListener("mouseleave", handlers.leave);
      handlers.card.removeEventListener("click", handlers.click);
    });
    if (this.gsap) {
      this.gsap.killTweensOf(this.cards);
      if (this.spotlight) this.gsap.killTweensOf(this.spotlight);
    }
    if (this.spotlight) this.spotlight.remove();
  };

  function init(gsap) {
    instances.forEach(function (instance) { instance.destroy(); });
    instances = Array.prototype.map.call(document.querySelectorAll("[data-magic-bento-grid]"), function (grid) {
      return new MagicBento(grid, gsap);
    });
  }

  gsapPromise.then(function (gsap) {
    document.addEventListener("profile:rendered", function () { init(gsap); });
    init(gsap);
  });
})();
