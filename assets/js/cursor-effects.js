(function () {
  var body = document.body;
  if (!body) {
    return;
  }

  var coarsePointer = window.matchMedia("(pointer: coarse)").matches;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasFinePointerFx = !coarsePointer && !reduceMotion;

  var pointerX = window.innerWidth * 0.5;
  var pointerY = window.innerHeight * 0.5;
  var ringX = pointerX;
  var ringY = pointerY;
  var rafId = 0;

  var ring = null;
  var dot = null;
  var canvas = null;
  var context = null;
  var particles = [];
  var deviceRatio = 1;

  var musicButton = null;
  var musicEnabled = false;
  var audioCtx = null;
  var masterGain = null;
  var filterNode = null;
  var modulationOsc = null;
  var modulationGain = null;
  var chordVoices = [];
  var chordStep = 0;
  var chordTimer = 0;
  var storageKey = "ambientMusicEnabled";

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

    document.addEventListener("mousemove", movePointer, { passive: true });

    document.addEventListener(
      "click",
      function (event) {
        burst(event.clientX, event.clientY, 18);
      },
      { passive: true }
    );

    document.addEventListener("mousedown", function () {
      ring.classList.add("cursor-fx--active");
      burst(pointerX, pointerY, 10);
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

    rafId = window.requestAnimationFrame(render);
  }

  function resizeCanvas() {
    if (!canvas || !context) {
      return;
    }

    deviceRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(window.innerWidth * deviceRatio);
    canvas.height = Math.floor(window.innerHeight * deviceRatio);
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
    context.setTransform(deviceRatio, 0, 0, deviceRatio, 0, 0);
  }

  function movePointer(event) {
    pointerX = event.clientX;
    pointerY = event.clientY;
    spawnParticle(pointerX, pointerY, 0.7, 0.8);
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
      life: 16 + Math.random() * 18,
      size: (5 + Math.random() * 10) * scale,
      hue: 188 + Math.random() * 52
    });

    if (particles.length > 220) {
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
      point.life -= 0.42;

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

  function render() {
    if (ring && dot) {
      ringX += (pointerX - ringX) * 0.2;
      ringY += (pointerY - ringY) * 0.2;

      dot.style.transform = "translate3d(" + pointerX + "px," + pointerY + "px,0)";
      ring.style.transform = "translate3d(" + ringX + "px," + ringY + "px,0)";

      if (Math.random() > 0.74) {
        spawnParticle(pointerX, pointerY, 0.35, 0.55);
      }
    }

    drawParticles();
    rafId = window.requestAnimationFrame(render);
  }

  function createAudioGraph() {
    if (audioCtx) {
      return;
    }

    var AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      return;
    }

    audioCtx = new AudioContextClass();

    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.0001;

    filterNode = audioCtx.createBiquadFilter();
    filterNode.type = "lowpass";
    filterNode.frequency.value = 1200;

    masterGain.connect(filterNode);
    filterNode.connect(audioCtx.destination);

    var baseFrequencies = [196.0, 246.94, 293.66];
    var idx = 0;

    while (idx < baseFrequencies.length) {
      var osc = audioCtx.createOscillator();
      osc.type = idx === 1 ? "triangle" : "sine";
      osc.frequency.value = baseFrequencies[idx];

      var gain = audioCtx.createGain();
      gain.gain.value = idx === 1 ? 0.012 : 0.008;

      osc.connect(gain);
      gain.connect(masterGain);
      osc.start();

      chordVoices.push({ osc: osc, gain: gain });
      idx += 1;
    }

    modulationOsc = audioCtx.createOscillator();
    modulationOsc.type = "sine";
    modulationOsc.frequency.value = 0.09;

    modulationGain = audioCtx.createGain();
    modulationGain.gain.value = 14;

    modulationOsc.connect(modulationGain);
    modulationGain.connect(chordVoices[0].osc.detune);
    modulationGain.connect(chordVoices[1].osc.detune);
    modulationOsc.start();

    chordTimer = window.setInterval(stepChord, 7000);
    stepChord();
  }

  function stepChord() {
    if (!audioCtx || chordVoices.length === 0) {
      return;
    }

    var chords = [
      [196.0, 246.94, 293.66],
      [220.0, 261.63, 329.63],
      [174.61, 220.0, 261.63],
      [196.0, 233.08, 293.66]
    ];

    var now = audioCtx.currentTime;
    chordStep = (chordStep + 1) % chords.length;
    var target = chords[chordStep];

    var idx = 0;
    while (idx < chordVoices.length) {
      chordVoices[idx].osc.frequency.setTargetAtTime(target[idx], now, 2.6);
      idx += 1;
    }
  }

  function setStoredMusicPreference(value) {
    try {
      window.localStorage.setItem(storageKey, value ? "1" : "0");
    } catch (error) {
      // Ignore storage failures.
    }
  }

  function getStoredMusicPreference() {
    try {
      return window.localStorage.getItem(storageKey) === "1";
    } catch (error) {
      return false;
    }
  }

  function updateMusicButton() {
    if (!musicButton) {
      return;
    }

    musicButton.textContent = musicEnabled ? "Music On" : "Music Off";
    musicButton.classList.toggle("music-toggle--on", musicEnabled);
    musicButton.setAttribute("aria-pressed", musicEnabled ? "true" : "false");
  }

  function startMusic() {
    createAudioGraph();

    if (!audioCtx || !masterGain) {
      return;
    }

    var resumePromise = audioCtx.state === "suspended" ? audioCtx.resume() : Promise.resolve();
    resumePromise
      .then(function () {
        var now = audioCtx.currentTime;
        masterGain.gain.cancelScheduledValues(now);
        masterGain.gain.setTargetAtTime(0.042, now, 1.8);
        musicEnabled = true;
        setStoredMusicPreference(true);
        updateMusicButton();
      })
      .catch(function () {
        musicEnabled = false;
        updateMusicButton();
      });
  }

  function stopMusic() {
    if (!audioCtx || !masterGain) {
      musicEnabled = false;
      setStoredMusicPreference(false);
      updateMusicButton();
      return;
    }

    var now = audioCtx.currentTime;
    masterGain.gain.cancelScheduledValues(now);
    masterGain.gain.setTargetAtTime(0.0001, now, 0.7);

    musicEnabled = false;
    setStoredMusicPreference(false);
    updateMusicButton();
  }

  function toggleMusic() {
    if (musicEnabled) {
      stopMusic();
    } else {
      startMusic();
    }
  }

  function initMusicToggle() {
    musicButton = document.createElement("button");
    musicButton.type = "button";
    musicButton.className = "music-toggle";
    musicButton.setAttribute("aria-label", "Toggle background music");
    musicButton.addEventListener("click", toggleMusic);
    body.appendChild(musicButton);

    musicEnabled = false;
    updateMusicButton();

    if (getStoredMusicPreference()) {
      var startOnFirstAction = function () {
        startMusic();
      };

      document.addEventListener("pointerdown", startOnFirstAction, {
        once: true,
        passive: true
      });
    }
  }

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      if (rafId) {
        window.cancelAnimationFrame(rafId);
        rafId = 0;
      }
    } else if (hasFinePointerFx && !rafId) {
      rafId = window.requestAnimationFrame(render);
    }
  });

  initCursorFx();
  initMusicToggle();
})();

