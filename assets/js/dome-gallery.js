(function () {
  var instances = [];
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var SEGMENTS = 24;
  var MAX_VERTICAL_ROTATION = 5;
  var DRAG_SENSITIVITY = 20;
  var AUTO_SPEED = 1.65;
  var RESUME_DELAY = 2400;

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function wrapAngle(value) {
    var angle = ((value + 180) % 360 + 360) % 360;
    return angle - 180;
  }

  function buildItems(images) {
    var coordinates = [];
    for (var column = 0; column < SEGMENTS; column += 1) {
      var x = -(SEGMENTS - 1) + column * 2;
      var ys = column % 2 === 0 ? [-4, -2, 0, 2, 4] : [-3, -1, 1, 3, 5];
      ys.forEach(function (y) { coordinates.push({ x: x, y: y }); });
    }
    return coordinates.map(function (coordinate, index) {
      return Object.assign({}, coordinate, images[index % images.length], { index: index });
    });
  }

  function DomeGallery(root) {
    this.root = root;
    this.main = root.querySelector("[data-dome-main]");
    this.sphere = root.querySelector("[data-dome-sphere]");
    this.viewer = root.querySelector("[data-dome-viewer]");
    this.scrim = root.querySelector("[data-dome-scrim]");
    this.images = Array.prototype.map.call(root.querySelectorAll("[data-dome-item]"), function (item) {
      return { src: item.dataset.domeImage, alt: item.dataset.domeAlt || "恋爱小窗照片" };
    });
    this.rotation = { x: 0, y: 0 };
    this.velocity = { x: 0, y: 0 };
    this.drag = null;
    this.moved = false;
    this.hovering = false;
    this.focused = false;
    this.visible = true;
    this.enlarged = null;
    this.lastDragEnd = 0;
    this.resumeAt = performance.now() + 900;
    this.lastFrame = performance.now();
    this.frameId = 0;

    this.onResize = this.resize.bind(this);
    this.onPointerDown = this.pointerDown.bind(this);
    this.onPointerMove = this.pointerMove.bind(this);
    this.onPointerUp = this.pointerUp.bind(this);
    this.onClick = this.click.bind(this);
    this.onKeyDown = this.keyDown.bind(this);
    this.onPointerOver = this.pointerOver.bind(this);
    this.onPointerOut = this.pointerOut.bind(this);
    this.onFocusIn = this.focusIn.bind(this);
    this.onFocusOut = this.focusOut.bind(this);
    this.onScrimClick = this.close.bind(this);
    this.onDocumentKeyDown = this.documentKeyDown.bind(this);
    this.onFrame = this.frame.bind(this);

    this.init();
  }

  DomeGallery.prototype.init = function () {
    if (!this.images.length || !this.main || !this.sphere) return;
    var fragment = document.createDocumentFragment();
    buildItems(this.images).forEach(function (item) {
      var tile = document.createElement("div");
      var imageButton = document.createElement("div");
      var image = document.createElement("img");
      var unit = 360 / SEGMENTS / 2;
      tile.className = "dome-gallery__item";
      tile.dataset.src = item.src;
      tile.dataset.alt = item.alt;
      tile.dataset.tileIndex = String(item.index);
      tile.style.setProperty("--dome-rotate-y", (unit * (item.x + 0.5)).toFixed(4) + "deg");
      tile.style.setProperty("--dome-rotate-x", (unit * (item.y - 0.5)).toFixed(4) + "deg");
      imageButton.className = "dome-gallery__image";
      imageButton.setAttribute("role", "button");
      imageButton.setAttribute("tabindex", "0");
      imageButton.setAttribute("aria-label", item.alt);
      image.src = item.src;
      image.alt = item.alt;
      image.loading = "lazy";
      image.decoding = "async";
      image.draggable = false;
      imageButton.appendChild(image);
      tile.appendChild(imageButton);
      fragment.appendChild(tile);
    });
    this.sphere.appendChild(fragment);
    this.root.classList.add("dome-gallery--enhanced");
    this.root.dataset.domeGalleryReady = "true";
    this.root.dataset.domeGalleryCount = String(this.images.length);
    this.root.dataset.domeGalleryTiles = String(this.sphere.children.length);
    this.root.dataset.autoMotion = reduceMotion ? "reduced" : "waiting";
    var fallback = this.root.querySelector(".dome-gallery__fallback");
    if (fallback) fallback.setAttribute("aria-hidden", "true");

    this.main.addEventListener("pointerdown", this.onPointerDown);
    this.main.addEventListener("pointermove", this.onPointerMove);
    this.main.addEventListener("pointerup", this.onPointerUp);
    this.main.addEventListener("pointercancel", this.onPointerUp);
    this.main.addEventListener("click", this.onClick);
    this.root.addEventListener("keydown", this.onKeyDown);
    this.main.addEventListener("pointerover", this.onPointerOver);
    this.main.addEventListener("pointerout", this.onPointerOut);
    this.root.addEventListener("focusin", this.onFocusIn);
    this.root.addEventListener("focusout", this.onFocusOut);
    this.scrim.addEventListener("click", this.onScrimClick);
    document.addEventListener("keydown", this.onDocumentKeyDown);

    if ("ResizeObserver" in window) {
      this.resizeObserver = new ResizeObserver(this.onResize);
      this.resizeObserver.observe(this.root);
    } else {
      window.addEventListener("resize", this.onResize);
    }
    if ("IntersectionObserver" in window) {
      var self = this;
      this.visibilityObserver = new IntersectionObserver(function (entries) {
        self.visible = entries[0] ? entries[0].isIntersecting : true;
        if (self.visible) self.start();
      }, { rootMargin: "120px", threshold: 0.02 });
      this.visibilityObserver.observe(this.root);
    }
    this.resize();
    this.applyTransform();
    this.start();
  };

  DomeGallery.prototype.resize = function () {
    var width = Math.max(this.root.clientWidth, 1);
    var height = Math.max(this.root.clientHeight, 1);
    var minDimension = Math.min(width, height);
    var basis = width / height >= 1.3 ? width : minDimension;
    var radius = clamp(Math.min(basis * 0.5, height * 1.35), 600, 920);
    var viewerPad = Math.max(12, Math.round(minDimension * 0.16));
    var tileSize = radius * Math.PI / SEGMENTS * 2;
    this.root.style.setProperty("--dome-radius", Math.round(radius) + "px");
    this.root.style.setProperty("--dome-viewer-pad", viewerPad + "px");
    this.root.style.setProperty("--dome-tile-size", tileSize.toFixed(2) + "px");
    this.root.dataset.domeRadius = String(Math.round(radius));
    this.applyTransform();
  };

  DomeGallery.prototype.applyTransform = function () {
    this.sphere.style.transform = "translateZ(calc(var(--dome-radius) * -1)) rotateX(" + this.rotation.x.toFixed(4) + "deg) rotateY(" + this.rotation.y.toFixed(4) + "deg)";
  };

  DomeGallery.prototype.pause = function () {
    this.resumeAt = Infinity;
    if (!reduceMotion) this.root.dataset.autoMotion = "paused";
  };

  DomeGallery.prototype.scheduleResume = function () {
    this.resumeAt = performance.now() + RESUME_DELAY;
    if (!reduceMotion) this.root.dataset.autoMotion = "waiting";
    this.start();
  };

  DomeGallery.prototype.shouldAutoRotate = function (now) {
    return !reduceMotion && this.visible && !this.drag && !this.hovering && !this.focused && !this.enlarged && now >= this.resumeAt && Math.abs(this.velocity.x) < 0.0005 && Math.abs(this.velocity.y) < 0.0005;
  };

  DomeGallery.prototype.start = function () {
    if (!this.frameId && this.visible && !reduceMotion) this.frameId = window.requestAnimationFrame(this.onFrame);
  };

  DomeGallery.prototype.frame = function (now) {
    this.frameId = 0;
    if (!this.visible || reduceMotion) return;
    var elapsed = Math.min(Math.max(now - this.lastFrame, 0), 50);
    this.lastFrame = now;
    var moving = false;
    if (!this.drag && !this.enlarged && (Math.abs(this.velocity.x) >= 0.0005 || Math.abs(this.velocity.y) >= 0.0005)) {
      this.rotation.x = clamp(this.rotation.x + this.velocity.x * elapsed, -MAX_VERTICAL_ROTATION, MAX_VERTICAL_ROTATION);
      this.rotation.y = wrapAngle(this.rotation.y + this.velocity.y * elapsed);
      var friction = Math.pow(0.94, elapsed / 16.667);
      this.velocity.x *= friction;
      this.velocity.y *= friction;
      moving = true;
      if (Math.abs(this.velocity.x) < 0.0005) this.velocity.x = 0;
      if (Math.abs(this.velocity.y) < 0.0005) this.velocity.y = 0;
      if (!this.velocity.x && !this.velocity.y) this.scheduleResume();
    } else if (this.shouldAutoRotate(now)) {
      this.rotation.y = wrapAngle(this.rotation.y + AUTO_SPEED * elapsed / 1000);
      this.root.dataset.autoMotion = "running";
      moving = true;
    }
    if (moving) this.applyTransform();
    this.start();
  };

  DomeGallery.prototype.pointerDown = function (event) {
    if (this.enlarged || (event.button !== undefined && event.button !== 0)) return;
    this.velocity.x = 0;
    this.velocity.y = 0;
    this.drag = {
      id: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      rotationX: this.rotation.x,
      rotationY: this.rotation.y,
      lastX: event.clientX,
      lastY: event.clientY,
      lastTime: performance.now()
    };
    this.moved = false;
    this.pause();
  };

  DomeGallery.prototype.pointerMove = function (event) {
    if (!this.drag || event.pointerId !== this.drag.id) return;
    var dx = event.clientX - this.drag.startX;
    var dy = event.clientY - this.drag.startY;
    if (!this.moved && dx * dx + dy * dy > 16) {
      this.moved = true;
      this.root.classList.add("dome-gallery--dragging");
      this.main.setPointerCapture(event.pointerId);
    }
    if (!this.moved) return;
    var now = performance.now();
    var deltaTime = Math.max(now - this.drag.lastTime, 8);
    this.rotation.x = clamp(this.drag.rotationX - dy / DRAG_SENSITIVITY, -MAX_VERTICAL_ROTATION, MAX_VERTICAL_ROTATION);
    this.rotation.y = wrapAngle(this.drag.rotationY + dx / DRAG_SENSITIVITY);
    this.velocity.x = clamp(-(event.clientY - this.drag.lastY) / DRAG_SENSITIVITY / deltaTime, -0.025, 0.025);
    this.velocity.y = clamp((event.clientX - this.drag.lastX) / DRAG_SENSITIVITY / deltaTime, -0.025, 0.025);
    this.drag.lastX = event.clientX;
    this.drag.lastY = event.clientY;
    this.drag.lastTime = now;
    this.applyTransform();
  };

  DomeGallery.prototype.pointerUp = function (event) {
    if (!this.drag || event.pointerId !== this.drag.id) return;
    if (this.main.hasPointerCapture(event.pointerId)) this.main.releasePointerCapture(event.pointerId);
    if (this.moved) this.lastDragEnd = performance.now();
    else {
      this.velocity.x = 0;
      this.velocity.y = 0;
    }
    this.drag = null;
    this.root.classList.remove("dome-gallery--dragging");
    this.scheduleResume();
  };

  DomeGallery.prototype.pointerOver = function (event) {
    var image = event.target.closest && event.target.closest(".dome-gallery__image");
    if (!image || this.hovering) return;
    this.hovering = true;
    this.pause();
  };

  DomeGallery.prototype.pointerOut = function (event) {
    var nextImage = event.relatedTarget && event.relatedTarget.closest && event.relatedTarget.closest(".dome-gallery__image");
    if (nextImage && this.main.contains(nextImage)) return;
    this.hovering = false;
    if (!this.drag && !this.focused && !this.enlarged) this.scheduleResume();
  };

  DomeGallery.prototype.focusIn = function () {
    this.focused = true;
    this.pause();
  };

  DomeGallery.prototype.focusOut = function () {
    var self = this;
    window.requestAnimationFrame(function () {
      self.focused = self.root.contains(document.activeElement);
      if (!self.focused && !self.hovering && !self.enlarged) self.scheduleResume();
    });
  };

  DomeGallery.prototype.click = function (event) {
    var tile = event.target.closest(".dome-gallery__image");
    if (!tile || this.moved || performance.now() - this.lastDragEnd < 100 || this.enlarged) return;
    this.open(tile);
  };

  DomeGallery.prototype.keyDown = function (event) {
    var tile = event.target.closest && event.target.closest(".dome-gallery__image");
    if ((event.key === "Enter" || event.key === " ") && tile) {
      event.preventDefault();
      this.open(tile);
      return;
    }
    if (event.key === "Escape" && this.enlarged) {
      event.preventDefault();
      this.close();
      return;
    }
    var changed = true;
    if (event.key === "ArrowRight") this.rotation.y = wrapAngle(this.rotation.y + 6);
    else if (event.key === "ArrowLeft") this.rotation.y = wrapAngle(this.rotation.y - 6);
    else if (event.key === "ArrowUp") this.rotation.x = clamp(this.rotation.x - 2, -MAX_VERTICAL_ROTATION, MAX_VERTICAL_ROTATION);
    else if (event.key === "ArrowDown") this.rotation.x = clamp(this.rotation.x + 2, -MAX_VERTICAL_ROTATION, MAX_VERTICAL_ROTATION);
    else changed = false;
    if (!changed) return;
    event.preventDefault();
    this.velocity.x = 0;
    this.velocity.y = 0;
    this.applyTransform();
    this.scheduleResume();
  };

  DomeGallery.prototype.documentKeyDown = function (event) {
    if (event.key !== "Escape" || !this.enlarged) return;
    event.preventDefault();
    this.close();
  };

  DomeGallery.prototype.open = function (imageButton) {
    if (this.enlarged) return;
    var tileRect = imageButton.getBoundingClientRect();
    var mainRect = this.main.getBoundingClientRect();
    if (!tileRect.width || !tileRect.height) return;
    var overlay = document.createElement("div");
    var image = document.createElement("img");
    var targetWidth = Math.min(250, mainRect.width - 32);
    var targetHeight = Math.min(350, mainRect.height - 32);
    var targetLeft = (mainRect.width - targetWidth) / 2;
    var targetTop = (mainRect.height - targetHeight) / 2;
    overlay.className = "dome-gallery__enlarge";
    overlay.style.left = (tileRect.left - mainRect.left) + "px";
    overlay.style.top = (tileRect.top - mainRect.top) + "px";
    overlay.style.width = tileRect.width + "px";
    overlay.style.height = tileRect.height + "px";
    image.src = imageButton.parentElement.dataset.src;
    image.alt = imageButton.parentElement.dataset.alt || "恋爱小窗照片";
    overlay.appendChild(image);
    this.viewer.appendChild(overlay);
    imageButton.style.visibility = "hidden";
    this.enlarged = { tile: imageButton, overlay: overlay };
    this.root.dataset.enlarging = "true";
    this.root.dataset.openedTile = imageButton.parentElement.dataset.tileIndex;
    document.body.classList.add("dg-scroll-lock");
    this.pause();
    void overlay.offsetWidth;
    window.requestAnimationFrame(function () {
      overlay.style.left = targetLeft + "px";
      overlay.style.top = targetTop + "px";
      overlay.style.width = targetWidth + "px";
      overlay.style.height = targetHeight + "px";
      overlay.style.opacity = "1";
    });
  };

  DomeGallery.prototype.close = function (event) {
    if (!this.enlarged) return;
    var current = this.enlarged;
    var shouldBlur = Boolean(event && event.type === "click");
    var tileRect = current.tile.getBoundingClientRect();
    var mainRect = this.main.getBoundingClientRect();
    var self = this;
    this.enlarged = null;
    this.root.removeAttribute("data-enlarging");
    this.root.removeAttribute("data-opened-tile");
    current.overlay.style.left = (tileRect.left - mainRect.left) + "px";
    current.overlay.style.top = (tileRect.top - mainRect.top) + "px";
    current.overlay.style.width = tileRect.width + "px";
    current.overlay.style.height = tileRect.height + "px";
    current.overlay.style.opacity = "0";
    var cleaned = false;
    function cleanup() {
      if (cleaned) return;
      cleaned = true;
      if (current.overlay.parentNode) current.overlay.parentNode.removeChild(current.overlay);
      current.tile.style.visibility = "";
      if (shouldBlur) {
        if (typeof current.tile.blur === "function") current.tile.blur();
        if (typeof self.root.blur === "function") self.root.blur();
        self.focused = false;
      }
      document.body.classList.remove("dg-scroll-lock");
      if (!self.hovering && !self.focused) self.scheduleResume();
    }
    current.overlay.addEventListener("transitionend", cleanup, { once: true });
    window.setTimeout(cleanup, 420);
  };

  DomeGallery.prototype.destroy = function () {
    if (this.frameId) window.cancelAnimationFrame(this.frameId);
    this.main.removeEventListener("pointerdown", this.onPointerDown);
    this.main.removeEventListener("pointermove", this.onPointerMove);
    this.main.removeEventListener("pointerup", this.onPointerUp);
    this.main.removeEventListener("pointercancel", this.onPointerUp);
    this.main.removeEventListener("click", this.onClick);
    this.root.removeEventListener("keydown", this.onKeyDown);
    this.main.removeEventListener("pointerover", this.onPointerOver);
    this.main.removeEventListener("pointerout", this.onPointerOut);
    this.root.removeEventListener("focusin", this.onFocusIn);
    this.root.removeEventListener("focusout", this.onFocusOut);
    this.scrim.removeEventListener("click", this.onScrimClick);
    document.removeEventListener("keydown", this.onDocumentKeyDown);
    if (this.resizeObserver) this.resizeObserver.disconnect();
    else window.removeEventListener("resize", this.onResize);
    if (this.visibilityObserver) this.visibilityObserver.disconnect();
    if (this.enlarged) {
      if (this.enlarged.overlay.parentNode) this.enlarged.overlay.parentNode.removeChild(this.enlarged.overlay);
      this.enlarged.tile.style.visibility = "";
    }
    document.body.classList.remove("dg-scroll-lock");
    this.sphere.innerHTML = "";
    this.root.classList.remove("dome-gallery--enhanced");
  };

  function init() {
    instances.forEach(function (instance) { instance.destroy(); });
    instances = Array.prototype.map.call(document.querySelectorAll("[data-dome-gallery]"), function (root) {
      return new DomeGallery(root);
    });
  }

  document.addEventListener("profile:rendered", init);
  init();
})();
