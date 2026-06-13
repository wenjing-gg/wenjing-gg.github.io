(function () {
  var body = document.body;
  if (!body) {
    return;
  }

  var coarsePointer = window.matchMedia("(pointer: coarse)").matches;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasFinePointerFx = false;

  var pointerX = window.innerWidth * 0.5;
  var pointerY = window.innerHeight * 0.5;
  var ringX = pointerX;
  var ringY = pointerY;
  var rafId = 0;
  var renderTimer = 0;
  var lastRenderAt = 0;
  var lastParticleAt = 0;

  var ring = null;
  var dot = null;
  var canvas = null;
  var context = null;
  var particles = [];
  var deviceRatio = 1;

  var musicPanel = null;
  var musicButton = null;
  var musicNextButton = null;
  var musicHubButton = null;
  var musicActions = null;
  var musicEnabled = false;
  var activeTrackIndex = 0;
  var audioEl = null;

  var storageKeyEnabled = "ambientMusicEnabled";
  var storageKeyTrack = "ambientMusicTrackIndex";
  var cursorFrameInterval = 1000 / 30;

  var musicTracks = Array.isArray(window.__musicTracks)
    ? window.__musicTracks.filter(function (item) {
        return item && typeof item.src === "string" && item.src.length > 0;
      })
    : [];

  function initCursorFx() {
    if (!hasFinePointerFx) {
      return;
    }

    canvas = document.createElement("canvas");
    canvas.className = "cursor-fx-canvas";
    body.appendChild(canvas);

    context = canvas.getContext("2d", { alpha: true });

    ring = document.createElement("div");
    ring.className = "cursor-fx cursor-fx--ring";

    dot = document.createElement("div");
    dot.className = "cursor-fx cursor-fx--dot";

    body.appendChild(ring);
    body.appendChild(dot);

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas, { passive: true });

    document.addEventListener("pointermove", movePointer, { passive: true });

    document.addEventListener(
      "click",
      function (event) {
        burst(event.clientX, event.clientY, 10);
      },
      { passive: true }
    );

    document.addEventListener("mousedown", function () {
      ring.classList.add("cursor-fx--active");
      burst(pointerX, pointerY, 6);
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

    scheduleRender(0);
  }

  function resizeCanvas() {
    if (!canvas || !context) {
      return;
    }

    deviceRatio = Math.min(window.devicePixelRatio || 1, 1.25);
    canvas.width = Math.floor(window.innerWidth * deviceRatio);
    canvas.height = Math.floor(window.innerHeight * deviceRatio);
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
    context.setTransform(deviceRatio, 0, 0, deviceRatio, 0, 0);
  }

  function movePointer(event) {
    pointerX = event.clientX;
    pointerY = event.clientY;
    var now = performance.now();
    if (now - lastParticleAt > 100 && particles.length < 70) {
      spawnParticle(pointerX, pointerY, 0.42, 0.58);
      lastParticleAt = now;
    }
  }

  function isInteractiveTarget(target) {
    if (!target || !target.closest) {
      return false;
    }

    return Boolean(target.closest("a, button, .btn, input, textarea, select, summary, [role='button']"));
  }

  function spawnParticle(x, y, spread, scale) {
    if (!context) {
      return;
    }

    var angle = Math.random() * Math.PI * 2;
    var velocity = 0.35 + Math.random() * spread;
    particles.push({
      x: x,
      y: y,
      vx: Math.cos(angle) * velocity,
      vy: Math.sin(angle) * velocity,
      life: 10 + Math.random() * 16,
      size: (3 + Math.random() * 7) * scale,
      hue: 188 + Math.random() * 52
    });

    if (particles.length > 90) {
      particles.shift();
    }
  }

  function burst(x, y, count) {
    var index = 0;
    while (index < count) {
      spawnParticle(x, y, 2.6, 1.25);
      index += 1;
    }
  }

  function drawParticles() {
    if (!context || !canvas) {
      return;
    }

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.globalCompositeOperation = "lighter";

    var active = [];
    var index = 0;

    while (index < particles.length) {
      var point = particles[index];
      point.x += point.vx;
      point.y += point.vy;
      point.vx *= 0.98;
      point.vy *= 0.98;
      point.life -= 0.58;

      if (point.life > 0) {
        var alpha = Math.min(point.life / 20, 0.68);
        var gradient = context.createRadialGradient(point.x, point.y, 0, point.x, point.y, point.size);
        gradient.addColorStop(0, "hsla(" + point.hue + ", 92%, 66%, " + alpha + ")");
        gradient.addColorStop(0.7, "hsla(" + (point.hue + 14) + ", 95%, 60%, " + alpha * 0.4 + ")");
        gradient.addColorStop(1, "hsla(" + (point.hue + 26) + ", 100%, 52%, 0)");
        context.fillStyle = gradient;
        context.beginPath();
        context.arc(point.x, point.y, point.size, 0, Math.PI * 2);
        context.fill();
        active.push(point);
      }

      index += 1;
    }

    particles = active;
    context.globalCompositeOperation = "source-over";
  }

  function scheduleRender(delay) {
    if (!hasFinePointerFx || document.hidden || rafId || renderTimer) {
      return;
    }

    if (delay > 0) {
      renderTimer = window.setTimeout(function () {
        renderTimer = 0;
        rafId = window.requestAnimationFrame(render);
      }, delay);
      return;
    }

    rafId = window.requestAnimationFrame(render);
  }

  function render(now) {
    rafId = 0;
    if (document.hidden) {
      return;
    }

    if (lastRenderAt && now - lastRenderAt < cursorFrameInterval) {
      scheduleRender(cursorFrameInterval - (now - lastRenderAt));
      return;
    }
    lastRenderAt = now;

    if (ring && dot) {
      ringX += (pointerX - ringX) * 0.2;
      ringY += (pointerY - ringY) * 0.2;

      dot.style.transform = "translate3d(" + pointerX + "px," + pointerY + "px,0)";
      ring.style.transform = "translate3d(" + ringX + "px," + ringY + "px,0)";
    }

    drawParticles();
    scheduleRender(cursorFrameInterval);
  }

  function setStoredValue(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (error) {
      // Ignore storage failures.
    }
  }

  function getStoredValue(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (error) {
      return null;
    }
  }


  function parseLoveDate(value) {
    if (typeof value !== "string") {
      return null;
    }

    var parts = value.split("-");
    if (parts.length !== 3) {
      return null;
    }

    var year = Number(parts[0]);
    var month = Number(parts[1]);
    var day = Number(parts[2]);
    if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
      return null;
    }

    return new Date(year, month - 1, day);
  }

  function calculateLoveDays(startDate) {
    var now = new Date();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    var diffDays = Math.floor((today - start) / 86400000) + 1;
    return diffDays < 0 ? 0 : diffDays;
  }

  function updateLoveDays() {
    var dayNodes = document.querySelectorAll("[data-love-days]");
    if (!dayNodes.length) {
      return;
    }

    Array.prototype.forEach.call(dayNodes, function (daysNode) {
      var startDate = parseLoveDate(daysNode.getAttribute("data-love-start") || "2024-12-24");
      if (!startDate) {
        daysNode.textContent = "--";
        return;
      }

      var loveDays = calculateLoveDays(startDate);
      daysNode.textContent = String(loveDays);
      daysNode.setAttribute("aria-label", "相恋已" + loveDays + "天");
    });
  }

  function scheduleLoveDaysUpdate() {
    updateLoveDays();

    var now = new Date();
    var nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 1, 0, 0);
    var delay = Math.max(nextMidnight.getTime() - now.getTime(), 60000);

    window.setTimeout(function () {
      scheduleLoveDaysUpdate();
    }, delay);
  }
  function ensureAudio() {
    if (audioEl) {
      return true;
    }

    audioEl = new Audio();
    audioEl.preload = "metadata";
    audioEl.volume = 0.24;
    audioEl.addEventListener("ended", function () {
      playNextTrack();
    });

    return true;
  }

  function updateMusicControls() {
    if (!musicButton || !musicNextButton) {
      return;
    }

    musicNextButton.textContent = "⏭";

    if (musicTracks.length === 0) {
      musicButton.textContent = "⏵";
      musicButton.disabled = true;
      musicButton.setAttribute("aria-label", "暂无可播放音乐");
      musicNextButton.disabled = true;
      if (musicPanel) {
        musicPanel.classList.add("music-panel--disabled");
      }
      return;
    }

    musicButton.disabled = false;
    musicButton.textContent = musicEnabled ? "⏸" : "⏵";
    musicButton.classList.toggle("music-toggle--on", musicEnabled);
    musicButton.setAttribute("aria-label", musicEnabled ? "暂停背景音乐" : "播放背景音乐");
    musicButton.setAttribute("aria-pressed", musicEnabled ? "true" : "false");

    musicNextButton.disabled = false;
    musicNextButton.setAttribute("aria-label", "切换下一首背景音乐");

    if (musicPanel) {
      musicPanel.classList.remove("music-panel--disabled");
    }
  }
  function setTrack(index, autoPlay) {
    if (musicTracks.length === 0) {
      return;
    }

    activeTrackIndex = ((index % musicTracks.length) + musicTracks.length) % musicTracks.length;
    setStoredValue(storageKeyTrack, String(activeTrackIndex));

    ensureAudio();
    var track = musicTracks[activeTrackIndex];
    var expected = new URL(track.src, window.location.href).href;
    if (audioEl.src !== expected) {
      audioEl.src = track.src;
    }

    if (autoPlay) {
      startMusic();
    } else {
      updateMusicControls();
    }
  }

  function startMusic() {
    if (musicTracks.length === 0) {
      updateMusicControls();
      return;
    }

    ensureAudio();

    var current = musicTracks[activeTrackIndex];
    var expected = new URL(current.src, window.location.href).href;
    if (audioEl.src !== expected) {
      audioEl.src = current.src;
    }

    var playPromise = audioEl.play();
    if (playPromise && typeof playPromise.then === "function") {
      playPromise
        .then(function () {
          musicEnabled = true;
          setStoredValue(storageKeyEnabled, "1");
          updateMusicControls();
        })
        .catch(function () {
          musicEnabled = false;
          setStoredValue(storageKeyEnabled, "0");
          updateMusicControls();
        });
    }
  }

  function stopMusic() {
    if (audioEl) {
      audioEl.pause();
    }

    musicEnabled = false;
    setStoredValue(storageKeyEnabled, "0");
    updateMusicControls();
  }

  function toggleMusic() {
    if (musicTracks.length === 0) {
      return;
    }

    if (musicEnabled) {
      stopMusic();
    } else {
      startMusic();
    }
  }

  function playNextTrack() {
    if (musicTracks.length === 0) {
      return;
    }

    setTrack(activeTrackIndex + 1, true);
  }

  function initMusicPanel() {
    musicPanel = document.createElement("section");
    musicPanel.className = "music-panel";
    musicPanel.id = "music-player";

    musicHubButton = document.createElement("button");
    musicHubButton.type = "button";
    musicHubButton.className = "music-hub";
    musicHubButton.textContent = "♫";
    musicHubButton.setAttribute("aria-label", "展开背景音乐控制");
    musicHubButton.addEventListener("click", function () {
      if (!musicPanel) {
        return;
      }
      musicPanel.classList.toggle("music-panel--open");
    });

    musicActions = document.createElement("div");
    musicActions.className = "music-actions";

    musicButton = document.createElement("button");
    musicButton.type = "button";
    musicButton.className = "music-toggle";
    musicButton.textContent = "⏵";
    musicButton.setAttribute("aria-label", "播放背景音乐");
    musicButton.addEventListener("click", toggleMusic);

    musicNextButton = document.createElement("button");
    musicNextButton.type = "button";
    musicNextButton.className = "music-next";
    musicNextButton.textContent = "⏭";
    musicNextButton.setAttribute("aria-label", "切换下一首背景音乐");
    musicNextButton.addEventListener("click", playNextTrack);

    musicActions.appendChild(musicButton);
    musicActions.appendChild(musicNextButton);

    musicPanel.appendChild(musicHubButton);
    musicPanel.appendChild(musicActions);

    var masthead = document.querySelector(".masthead");
    if (masthead) {
      masthead.appendChild(musicPanel);
    } else {
      body.appendChild(musicPanel);
    }

    document.addEventListener(
      "pointerdown",
      function (event) {
        if (musicPanel && !musicPanel.contains(event.target)) {
          musicPanel.classList.remove("music-panel--open");
        }
      },
      { passive: true }
    );

    var storedIndex = Number(getStoredValue(storageKeyTrack));
    if (!Number.isNaN(storedIndex) && storedIndex >= 0 && storedIndex < musicTracks.length) {
      activeTrackIndex = storedIndex;
    }

    updateMusicControls();

    if (musicTracks.length > 0) {
      startMusic();

      document.addEventListener(
        "pointerdown",
        function () {
          if (!musicEnabled) {
            startMusic();
          }
        },
        {
          once: true,
          passive: true
        }
      );
    }
  }
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      if (rafId) {
        window.cancelAnimationFrame(rafId);
        rafId = 0;
      }
      if (renderTimer) {
        window.clearTimeout(renderTimer);
        renderTimer = 0;
      }
    } else if (hasFinePointerFx && !rafId) {
      scheduleRender(0);
    }
  });
  document.addEventListener("profile:rendered", updateLoveDays);

  initCursorFx();
  initMusicPanel();
  scheduleLoveDaysUpdate();
})();
