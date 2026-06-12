(function () {
  var hasProfileHome = document.getElementById("profile-app");
  if (!hasProfileHome) return;

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var isCoarsePointer = window.matchMedia("(pointer: coarse)").matches;
  var stage = document.createElement("div");
  var canvas = document.createElement("canvas");
  var pointer = {
    x: 0.5,
    y: 0.42,
    tx: 0.5,
    ty: 0.42
  };
  var rafId = 0;
  var pointerFrame = 0;
  var startLoop = null;

  stage.className = "profile-fluid-stage";
  stage.setAttribute("aria-hidden", "true");
  canvas.className = "profile-fluid-canvas";
  stage.appendChild(canvas);
  document.body.insertBefore(stage, document.body.firstChild);

  document.addEventListener(
    "pointermove",
    function (event) {
      if (pointerFrame) return;
      var clientX = event.clientX;
      var clientY = event.clientY;
      pointerFrame = window.requestAnimationFrame(function () {
        pointer.tx = clientX / Math.max(window.innerWidth, 1);
        pointer.ty = clientY / Math.max(window.innerHeight, 1);
        pointerFrame = 0;
      });
    },
    { passive: true }
  );

  function easeOutQuint(t) {
    return 1 - Math.pow(1 - t, 5);
  }

  function initMotion() {
    if (reduceMotion) return;

    var selector = [
      ".profile-hero",
      ".profile-section",
      ".love-window",
      ".topic-grid span",
      ".achievement-card",
      ".paper-bucket",
      ".profile-list li",
      ".photo-grid img",
      ".love-card img",
      ".paper-link"
    ].join(",");
    var nodes = Array.prototype.slice.call(document.querySelectorAll(selector));
    var observer = "IntersectionObserver" in window
      ? new IntersectionObserver(
          function (entries) {
            entries.forEach(function (entry) {
              if (entry.isIntersecting) {
                entry.target.classList.add("is-visible");
                observer.unobserve(entry.target);
              }
            });
          },
          { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
        )
      : null;

    nodes.forEach(function (node, index) {
      if (node.dataset.profileMotionReady === "true") return;
      node.dataset.profileMotionReady = "true";
      node.style.setProperty("--motion-order", String(index % 18));
      node.style.setProperty("--hover-x", (54 + (index % 5) * 7).toFixed(1) + "%");
      node.style.setProperty("--hover-y", (12 + (index % 4) * 8).toFixed(1) + "%");
      node.classList.add("profile-motion-item");

      if (observer) {
        observer.observe(node);
      } else {
        node.classList.add("is-visible");
      }
    });
  }

  async function initThreeFluid() {
    var THREE = await import("https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js");
    var renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      alpha: true,
      antialias: false,
      powerPreference: "low-power"
    });
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    var clock = new THREE.Clock();
    var uniforms = {
      uTime: { value: 0 },
      uPointer: { value: new THREE.Vector2(pointer.x, pointer.y) }
    };
    var surfaceMaterial = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: THREE.FrontSide,
        uniforms: uniforms,
        vertexShader: [
          "uniform float uTime;",
          "uniform vec2 uPointer;",
          "varying vec2 vUv;",
          "varying float vWave;",
          "float wave(vec2 p) {",
          "  return sin(p.x * 1.48 + uTime * 0.72) * 0.34 + cos(p.y * 1.15 - uTime * 0.54) * 0.25 + sin((p.x - p.y) * 0.82 + uTime * 0.38) * 0.18;",
          "}",
          "void main() {",
          "  vec3 p = position;",
          "  float d = distance(uv, uPointer);",
          "  float lift = (1.0 - smoothstep(0.0, 0.72, d)) * 0.46;",
          "  p.z += wave(position.xy) + lift * sin(uTime * 1.5 + d * 12.0) * 0.22;",
          "  p.x += sin(uTime * 0.22 + position.y * 0.72) * 0.09;",
          "  p.y += cos(uTime * 0.18 + position.x * 0.52) * 0.07;",
          "  vUv = uv;",
          "  vWave = p.z;",
          "  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);",
          "}"
        ].join("\n"),
        fragmentShader: [
          "uniform float uTime;",
          "varying vec2 vUv;",
          "varying float vWave;",
          "void main() {",
          "  vec3 mint = vec3(0.30, 0.86, 0.78);",
          "  vec3 apricot = vec3(0.98, 0.62, 0.36);",
          "  vec3 violet = vec3(0.48, 0.42, 0.88);",
          "  vec3 ink = vec3(0.04, 0.17, 0.25);",
          "  float river = smoothstep(-0.48, 0.62, sin((vUv.x + vUv.y) * 5.6 + uTime * 0.34 + vWave));",
          "  float contour = smoothstep(0.38, 0.52, abs(sin((vUv.x - vUv.y) * 18.0 + vWave * 2.2)));",
          "  float edge = smoothstep(0.72, 0.0, distance(vUv, vec2(0.5)));",
          "  vec3 color = mix(mint, apricot, river);",
          "  color = mix(color, violet, smoothstep(0.12, 0.88, vUv.x) * 0.32);",
          "  color = mix(color, ink, contour * 0.08);",
          "  float alpha = (0.28 + edge * 0.44 + abs(vWave) * 0.1) * (1.0 - contour * 0.24);",
          "  gl_FragColor = vec4(color, alpha);",
          "}"
        ].join("\n")
    });
    var surfaceGeometry = new THREE.PlaneGeometry(18, 11.5, 64, 40);
    var surfaces = [
      { x: -0.9, y: 0.1, z: -4.35, rx: -0.13, ry: 0.08, rz: 0, scale: 1, phase: 0 },
      { x: 1.8, y: -1.35, z: -5.2, rx: -0.2, ry: -0.12, rz: 0.18, scale: 0.76, phase: 1.9 }
    ].map(function (surface) {
      var mesh = new THREE.Mesh(surfaceGeometry, surfaceMaterial);
      mesh.userData.fluid = surface;
      mesh.position.set(surface.x, surface.y, surface.z);
      mesh.rotation.set(surface.rx, surface.ry, surface.rz);
      mesh.scale.setScalar(surface.scale);
      scene.add(mesh);
      return mesh;
    });

    camera.position.set(0, 0, 9.2);

    function resize() {
      var width = Math.max(window.innerWidth, 1);
      var height = Math.max(window.innerHeight, 1);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
      renderer.setSize(width, height, false);
    }

    var frameInterval = 1000 / 30;
    var lastFrame = 0;

    function frame(now) {
      rafId = 0;
      if (document.hidden || reduceMotion) return;
      if (lastFrame && now - lastFrame < frameInterval) {
        startLoop();
        return;
      }
      lastFrame = now;
      var time = clock.getElapsedTime();
      pointer.x += (pointer.tx - pointer.x) * 0.055;
      pointer.y += (pointer.ty - pointer.y) * 0.055;
      uniforms.uTime.value = time;
      uniforms.uPointer.value.set(pointer.x, 1 - pointer.y);

      surfaces.forEach(function (mesh, index) {
        var surface = mesh.userData.fluid;
        var t = time * (0.18 + index * 0.04) + surface.phase;
        mesh.position.x = surface.x + Math.sin(t * 1.25) * 0.36 + (pointer.x - 0.5) * (0.42 + index * 0.18);
        mesh.position.y = surface.y + Math.cos(t * 0.86) * 0.28 + (0.5 - pointer.y) * (0.28 + index * 0.12);
        mesh.rotation.x = surface.rx + Math.sin(t * 0.7) * 0.035;
        mesh.rotation.y = surface.ry + Math.cos(t * 0.64) * 0.042;
        mesh.rotation.z = surface.rz + Math.sin(t * 0.52) * 0.04;
      });

      renderer.render(scene, camera);
      startLoop();
    }

    resize();
    window.addEventListener("resize", resize, { passive: true });
    startLoop = function () {
      if (!rafId && !document.hidden && !reduceMotion) {
        rafId = window.requestAnimationFrame(frame);
      }
    };
    startLoop();
  }

  function initCanvasFallback() {
    var context = canvas.getContext("2d", { alpha: true });
    var ratio = 1;
    var width = 1;
    var height = 1;
    var start = performance.now();
    var bands = [
      { hue: 168, y: 0.2, thickness: 0.16, phase: 0.3, alpha: 0.2 },
      { hue: 27, y: 0.36, thickness: 0.14, phase: 1.5, alpha: 0.16 },
      { hue: 248, y: 0.62, thickness: 0.18, phase: 2.7, alpha: 0.18 }
    ];

    function resize() {
      ratio = Math.min(window.devicePixelRatio || 1, 1.18);
      width = Math.max(window.innerWidth, 1);
      height = Math.max(window.innerHeight, 1);
      canvas.width = Math.floor(width * ratio);
      canvas.height = Math.floor(height * ratio);
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    }

    function drawBand(band, t, index) {
      var gradient = context.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, "hsla(" + band.hue + ", 78%, 62%, 0)");
      gradient.addColorStop(0.28, "hsla(" + band.hue + ", 78%, 62%, " + band.alpha + ")");
      gradient.addColorStop(0.58, "hsla(" + (band.hue + 34) + ", 76%, 64%, " + band.alpha * 0.78 + ")");
      gradient.addColorStop(1, "hsla(" + (band.hue + 58) + ", 86%, 68%, 0)");
      context.fillStyle = gradient;
      context.beginPath();
      var baseY = height * (band.y + (pointer.y - 0.5) * 0.035);
      var amp = height * (0.045 + index * 0.008);
      var thickness = height * band.thickness;
      var step = Math.max(width / 12, 56);
      context.moveTo(-step, baseY);
      for (var x = -step; x <= width + step; x += step) {
        var y = baseY + Math.sin(x / width * Math.PI * 2.6 + t * (0.42 + index * 0.04) + band.phase) * amp;
        y += Math.sin(x / width * Math.PI * 5.4 - t * 0.22 - band.phase) * amp * 0.42;
        context.lineTo(x, y);
      }
      for (var x2 = width + step; x2 >= -step; x2 -= step) {
        var y2 = baseY + thickness + Math.sin(x2 / width * Math.PI * 2.4 + t * (0.34 + index * 0.03) + band.phase + 1.2) * amp;
        context.lineTo(x2, y2);
      }
      context.closePath();
      context.fill();
    }

    var frameInterval = isCoarsePointer ? 1000 / 22 : 1000 / 28;
    var lastFrame = 0;

    function frame(now) {
      rafId = 0;
      if (document.hidden || reduceMotion) return;
      if (lastFrame && now - lastFrame < frameInterval) {
        startLoop();
        return;
      }
      lastFrame = now;
      var t = (now - start) / 1000;
      pointer.x += (pointer.tx - pointer.x) * 0.06;
      pointer.y += (pointer.ty - pointer.y) * 0.06;
      context.clearRect(0, 0, width, height);
      context.globalCompositeOperation = "screen";

      bands.forEach(function (band, index) {
        drawBand(band, t + easeOutQuint((Math.sin(t * 0.18 + band.phase) + 1) / 2) * 0.4, index);
      });

      context.globalCompositeOperation = "source-over";
      startLoop();
    }

    resize();
    window.addEventListener("resize", resize, { passive: true });
    if (reduceMotion) {
      context.clearRect(0, 0, width, height);
      context.globalCompositeOperation = "screen";
      bands.forEach(function (band, index) {
        drawBand(band, 0.8 + index * 0.24, index);
      });
      context.globalCompositeOperation = "source-over";
      return;
    }
    startLoop = function () {
      if (!rafId && !document.hidden && !reduceMotion) {
        rafId = window.requestAnimationFrame(frame);
      }
    };
    startLoop();
  }

  document.addEventListener("profile:rendered", initMotion);
  initMotion();

  if (reduceMotion || isCoarsePointer || window.innerWidth < 760) {
    initCanvasFallback();
  } else {
    initThreeFluid().catch(function () {
      initCanvasFallback();
    });
  }

  document.addEventListener("visibilitychange", function () {
    if (document.hidden && rafId) {
      window.cancelAnimationFrame(rafId);
      rafId = 0;
    } else if (!document.hidden && startLoop) {
      startLoop();
    }
  });
})();
