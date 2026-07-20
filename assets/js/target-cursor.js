(function () {
  var finePointer = window.matchMedia("(pointer: fine)").matches;
  var coarsePointer = window.matchMedia("(pointer: coarse)").matches;
  var mobile = window.matchMedia("(max-width: 768px)").matches;
  if (!finePointer || coarsePointer || mobile) return;

  var SCOPE_SELECTOR = ".love-window";
  var TARGET_SELECTOR = ".dome-gallery__image, .love-days__calendar";
  var CORNER_SIZE = 12;
  var BORDER_WIDTH = 3;

  var cursor = document.createElement("div");
  var dot = document.createElement("span");
  var frame = document.createElement("span");
  var corners = ["tl", "tr", "br", "bl"].map(function (position) {
    var corner = document.createElement("span");
    corner.className = "target-cursor-corner target-cursor-corner--" + position;
    frame.appendChild(corner);
    return corner;
  });

  cursor.className = "target-cursor-wrapper";
  cursor.setAttribute("aria-hidden", "true");
  cursor.dataset.targetCursorReady = "true";
  cursor.dataset.targetCursorScope = "love-window";
  dot.className = "target-cursor-dot";
  frame.className = "target-cursor-frame";
  cursor.appendChild(dot);
  cursor.appendChild(frame);
  document.body.appendChild(cursor);

  var pointerX = window.innerWidth / 2;
  var pointerY = window.innerHeight / 2;
  var cursorX = pointerX;
  var cursorY = pointerY;
  var activeTarget = null;
  var activeRect = null;
  var frameId = 0;
  var syncFrameId = 0;
  var scopeTimer = 0;
  var scopeActive = false;

  function findTarget(node) {
    if (!node || node.nodeType !== 1 || !node.closest) return null;
    var target = node.closest(TARGET_SELECTOR);
    return target && target.closest(SCOPE_SELECTOR) ? target : null;
  }

  function measureTarget() {
    if (!activeTarget || !activeTarget.isConnected) {
      setTarget(null);
      return;
    }
    activeRect = activeTarget.getBoundingClientRect();
    scheduleFrame();
  }

  function setTarget(target) {
    if (target === activeTarget) return;
    activeTarget = target;
    activeRect = target ? target.getBoundingClientRect() : null;
    cursor.classList.toggle("is-targeting", Boolean(target));
    if (target) {
      cursor.dataset.targeting = target.className || target.tagName.toLowerCase();
    } else {
      cursor.removeAttribute("data-targeting");
      corners.forEach(function (corner) { corner.style.transform = ""; });
    }
    scheduleFrame();
  }

  function applyTargetCorners() {
    if (!activeRect) return;
    var points = [
      { x: activeRect.left - BORDER_WIDTH, y: activeRect.top - BORDER_WIDTH },
      { x: activeRect.right + BORDER_WIDTH - CORNER_SIZE, y: activeRect.top - BORDER_WIDTH },
      { x: activeRect.right + BORDER_WIDTH - CORNER_SIZE, y: activeRect.bottom + BORDER_WIDTH - CORNER_SIZE },
      { x: activeRect.left - BORDER_WIDTH, y: activeRect.bottom + BORDER_WIDTH - CORNER_SIZE }
    ];
    corners.forEach(function (corner, index) {
      corner.style.transform = "translate3d(" + (points[index].x - cursorX).toFixed(2) + "px," + (points[index].y - cursorY).toFixed(2) + "px,0)";
    });
  }

  function render() {
    frameId = 0;
    var easing = activeTarget ? 0.58 : 0.42;
    cursorX += (pointerX - cursorX) * easing;
    cursorY += (pointerY - cursorY) * easing;
    cursor.style.transform = "translate3d(" + cursorX.toFixed(2) + "px," + cursorY.toFixed(2) + "px,0)";
    if (activeTarget) applyTargetCorners();
    if (Math.abs(pointerX - cursorX) > 0.08 || Math.abs(pointerY - cursorY) > 0.08) scheduleFrame();
  }

  function scheduleFrame() {
    if (!frameId) frameId = window.requestAnimationFrame(render);
  }

  function syncTargetUnderPointer() {
    syncFrameId = 0;
    var node = document.elementFromPoint(pointerX, pointerY);
    var insideScope = Boolean(node && node.closest && node.closest(SCOPE_SELECTOR));
    setScopeActive(insideScope);
    if (!insideScope) return;
    var target = findTarget(node);
    if (target === activeTarget) {
      if (activeTarget) measureTarget();
      return;
    }
    setTarget(target);
  }

  function scheduleSync() {
    if (!syncFrameId) syncFrameId = window.requestAnimationFrame(syncTargetUnderPointer);
  }

  function scheduleScopeSync() {
    if (!scopeActive || scopeTimer) return;
    scopeTimer = window.setTimeout(function () {
      scopeTimer = 0;
      if (!scopeActive) return;
      syncTargetUnderPointer();
      scheduleScopeSync();
    }, 90);
  }

  function setScopeActive(active) {
    if (active === scopeActive) return;
    scopeActive = active;
    document.body.classList.toggle("target-cursor-enabled", active);
    cursor.classList.toggle("is-visible", active);
    if (active) {
      scheduleFrame();
      scheduleScopeSync();
      return;
    }
    window.clearTimeout(scopeTimer);
    scopeTimer = 0;
    cursor.classList.remove("is-pressed");
    setTarget(null);
  }

  function handlePointerMove(event) {
    pointerX = event.clientX;
    pointerY = event.clientY;
    var insideScope = Boolean(event.target.closest && event.target.closest(SCOPE_SELECTOR));
    setScopeActive(insideScope);
    if (!insideScope) return;
    setTarget(findTarget(event.target));
    scheduleFrame();
  }

  function handlePointerLeave() {
    if (syncFrameId) window.cancelAnimationFrame(syncFrameId);
    syncFrameId = 0;
    setScopeActive(false);
  }

  function handleScroll() {
    scheduleSync();
  }

  window.addEventListener("pointermove", handlePointerMove, { passive: true });
  window.addEventListener("pointerdown", function () {
    if (scopeActive) cursor.classList.add("is-pressed");
  }, { passive: true });
  window.addEventListener("pointerup", function () { cursor.classList.remove("is-pressed"); }, { passive: true });
  window.addEventListener("blur", handlePointerLeave);
  document.documentElement.addEventListener("mouseleave", handlePointerLeave, { passive: true });
  window.addEventListener("scroll", handleScroll, { passive: true });
  window.addEventListener("resize", scheduleSync, { passive: true });
  document.addEventListener("profile:rendered", scheduleSync);
})();
