(function () {
  if (window.matchMedia("(pointer: coarse)").matches) {
    return;
  }

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  var body = document.body;
  if (!body) {
    return;
  }

  var ring = document.createElement("div");
  ring.className = "cursor-fx cursor-fx--ring";

  var dot = document.createElement("div");
  dot.className = "cursor-fx cursor-fx--dot";

  body.appendChild(ring);
  body.appendChild(dot);

  var pointerX = window.innerWidth / 2;
  var pointerY = window.innerHeight / 2;
  var ringX = pointerX;
  var ringY = pointerY;
  var rafId = 0;

  function render() {
    ringX += (pointerX - ringX) * 0.18;
    ringY += (pointerY - ringY) * 0.18;

    dot.style.transform = "translate3d(" + pointerX + "px," + pointerY + "px,0)";
    ring.style.transform = "translate3d(" + ringX + "px," + ringY + "px,0)";

    rafId = window.requestAnimationFrame(render);
  }

  function movePointer(event) {
    pointerX = event.clientX;
    pointerY = event.clientY;
  }

  function burst(x, y) {
    var particle = document.createElement("span");
    particle.className = "cursor-fx-burst";
    particle.style.left = x + "px";
    particle.style.top = y + "px";
    body.appendChild(particle);

    window.setTimeout(function () {
      particle.remove();
    }, 520);
  }

  function isInteractiveTarget(target) {
    if (!target || !target.closest) {
      return false;
    }

    return Boolean(target.closest("a, button, .btn, input, textarea, select, summary, [role='button']"));
  }

  document.addEventListener("mousemove", movePointer, { passive: true });

  document.addEventListener(
    "click",
    function (event) {
      burst(event.clientX, event.clientY);
    },
    { passive: true }
  );

  document.addEventListener("mousedown", function () {
    ring.classList.add("cursor-fx--active");
  });

  document.addEventListener("mouseup", function () {
    ring.classList.remove("cursor-fx--active");
  });

  document.addEventListener("mouseover", function (event) {
    if (isInteractiveTarget(event.target)) {
      ring.classList.add("cursor-fx--interactive");
    }
  });

  document.addEventListener("mouseout", function (event) {
    if (isInteractiveTarget(event.target)) {
      ring.classList.remove("cursor-fx--interactive");
    }
  });

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      window.cancelAnimationFrame(rafId);
    } else {
      rafId = window.requestAnimationFrame(render);
    }
  });

  rafId = window.requestAnimationFrame(render);
})();

