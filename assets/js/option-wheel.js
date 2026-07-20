(function () {
  var instances = [];
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function OptionWheel(root) {
    this.root = root;
    this.items = Array.prototype.slice.call(root.querySelectorAll(".option-wheel__item"));
    this.count = this.items.length;
    this.selected = clamp(Number(root.dataset.defaultSelected) || 0, 0, Math.max(this.count - 1, 0));
    this.position = this.selected;
    this.target = this.selected;
    this.frameId = 0;
    this.lastFrame = performance.now();
    this.wheelTimer = 0;
    this.drag = null;
    this.dragMoved = false;
    this.selectionRoot = root.parentElement.querySelector(".research-wheel__selection");
    this.valueNode = this.selectionRoot && this.selectionRoot.querySelector("[data-option-value]");
    this.countNode = this.selectionRoot && this.selectionRoot.querySelector("[data-option-count]");
    this.rowHeight = 50;

    this.onWheel = this.handleWheel.bind(this);
    this.onPointerDown = this.handlePointerDown.bind(this);
    this.onPointerMove = this.handlePointerMove.bind(this);
    this.onPointerEnd = this.handlePointerEnd.bind(this);
    this.onKeyDown = this.handleKeyDown.bind(this);
    this.onClick = this.handleClick.bind(this);
    this.onFrame = this.runFrame.bind(this);

    root.addEventListener("wheel", this.onWheel, { passive: false });
    root.addEventListener("pointerdown", this.onPointerDown);
    root.addEventListener("pointermove", this.onPointerMove);
    root.addEventListener("pointerup", this.onPointerEnd);
    root.addEventListener("pointercancel", this.onPointerEnd);
    root.addEventListener("keydown", this.onKeyDown);
    root.addEventListener("click", this.onClick);

    this.updateMetrics();
    this.updateSelection(this.selected);
    this.layout();
  }

  OptionWheel.prototype.updateMetrics = function () {
    if (!this.items.length) return;
    var fontSize = parseFloat(window.getComputedStyle(this.items[0]).fontSize) || 18;
    this.rowHeight = Math.max(fontSize * 2.75, 1);
  };

  OptionWheel.prototype.layout = function () {
    var tilt = 12 * Math.PI / 180;
    var radius = this.rowHeight / tilt;
    var current = this.position;

    this.items.forEach(function (item, index) {
      var delta = index - current;
      var distance = Math.abs(delta);
      var angle = clamp(delta * tilt, -Math.PI / 2, Math.PI / 2);
      var y = radius * Math.sin(angle);
      var x = -radius * (1 - Math.cos(angle));
      var rotation = angle * 180 / Math.PI;
      item.style.transform = "translate(" + x.toFixed(2) + "px, calc(" + y.toFixed(2) + "px - 50%)) rotate(" + rotation.toFixed(3) + "deg)";
      item.style.opacity = String(Math.max(0.08, 1 - distance * 0.23));
      item.style.setProperty("--ow-p", Math.max(0, 1 - Math.min(distance, 1)).toFixed(4));
    });
  };

  OptionWheel.prototype.runFrame = function (now) {
    this.frameId = 0;
    var elapsed = Math.min((now - this.lastFrame) / 1000, 0.05);
    this.lastFrame = now;
    var smoothing = 0.2;
    var amount = reduceMotion ? 1 : 1 - Math.exp(-elapsed / smoothing);
    var next = this.position + (this.target - this.position) * amount;
    var settled = Math.abs(this.target - next) < 0.001;
    this.position = settled ? this.target : next;
    this.layout();
    if (!settled) this.frameId = window.requestAnimationFrame(this.onFrame);
  };

  OptionWheel.prototype.start = function () {
    if (this.frameId) return;
    this.lastFrame = performance.now();
    this.frameId = window.requestAnimationFrame(this.onFrame);
  };

  OptionWheel.prototype.updateSelection = function (index) {
    var self = this;
    this.selected = index;
    this.items.forEach(function (item, itemIndex) {
      var active = itemIndex === index;
      item.classList.toggle("option-wheel__item--selected", active);
      item.setAttribute("aria-selected", active ? "true" : "false");
      if (active && self.valueNode) self.valueNode.textContent = item.textContent.trim();
    });
    if (this.countNode) this.countNode.textContent = pad(index + 1) + " / " + pad(this.count);
    this.root.dispatchEvent(new CustomEvent("optionwheel:change", {
      bubbles: true,
      detail: { index: index, item: this.items[index] ? this.items[index].textContent.trim() : "" }
    }));
  };

  OptionWheel.prototype.applyTarget = function (value, snap) {
    var next = clamp(value, 0, Math.max(this.count - 1, 0));
    if (snap) next = Math.round(next);
    this.target = next;
    var selected = clamp(Math.round(next), 0, Math.max(this.count - 1, 0));
    if (selected !== this.selected) this.updateSelection(selected);
    this.start();
  };

  OptionWheel.prototype.handleWheel = function (event) {
    event.preventDefault();
    var delta = event.deltaMode === 1 ? event.deltaY * 24 : event.deltaY;
    var step = clamp(delta / this.rowHeight, -1, 1);
    this.applyTarget(this.target + step, false);
    window.clearTimeout(this.wheelTimer);
    var self = this;
    this.wheelTimer = window.setTimeout(function () {
      self.applyTarget(self.target, true);
    }, 140);
  };

  OptionWheel.prototype.handlePointerDown = function (event) {
    this.drag = { y: event.clientY, start: this.target, id: event.pointerId };
    this.dragMoved = false;
    this.root.classList.add("option-wheel--dragging");
  };

  OptionWheel.prototype.handlePointerMove = function (event) {
    if (!this.drag) return;
    var delta = event.clientY - this.drag.y;
    if (!this.dragMoved && Math.abs(delta) > 4) {
      this.dragMoved = true;
      this.root.setPointerCapture(this.drag.id);
    }
    if (this.dragMoved) this.applyTarget(this.drag.start - delta / this.rowHeight, false);
  };

  OptionWheel.prototype.handlePointerEnd = function () {
    if (!this.drag) return;
    this.drag = null;
    this.root.classList.remove("option-wheel--dragging");
    if (this.dragMoved) this.applyTarget(this.target, true);
  };

  OptionWheel.prototype.handleClick = function (event) {
    var item = event.target.closest(".option-wheel__item");
    if (!item || this.dragMoved) return;
    this.applyTarget(Number(item.dataset.optionIndex), true);
  };

  OptionWheel.prototype.handleKeyDown = function (event) {
    var delta = 0;
    if (event.key === "ArrowUp" || event.key === "ArrowLeft") delta = -1;
    if (event.key === "ArrowDown" || event.key === "ArrowRight") delta = 1;
    if (!delta) return;
    event.preventDefault();
    this.applyTarget(Math.round(this.target) + delta, true);
  };

  OptionWheel.prototype.destroy = function () {
    if (this.frameId) window.cancelAnimationFrame(this.frameId);
    window.clearTimeout(this.wheelTimer);
    this.root.removeEventListener("wheel", this.onWheel);
    this.root.removeEventListener("pointerdown", this.onPointerDown);
    this.root.removeEventListener("pointermove", this.onPointerMove);
    this.root.removeEventListener("pointerup", this.onPointerEnd);
    this.root.removeEventListener("pointercancel", this.onPointerEnd);
    this.root.removeEventListener("keydown", this.onKeyDown);
    this.root.removeEventListener("click", this.onClick);
  };

  function init() {
    instances.forEach(function (instance) { instance.destroy(); });
    instances = Array.prototype.map.call(document.querySelectorAll(".option-wheel"), function (root) {
      return new OptionWheel(root);
    });
  }

  document.addEventListener("profile:rendered", init);
  init();
})();
