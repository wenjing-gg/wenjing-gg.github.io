(function () {
  var homeRoot = document.getElementById("profile-app");
  if (!homeRoot) return;

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var coarsePointer = window.matchMedia("(pointer: coarse)").matches;
  var stage = document.createElement("div");
  var canvas = document.createElement("canvas");
  var cleanupRenderer = null;

  stage.className = "pixel-blast-stage";
  stage.setAttribute("aria-hidden", "true");
  canvas.className = "pixel-blast-canvas";
  stage.appendChild(canvas);
  document.body.insertBefore(stage, document.body.firstChild);

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
      ? new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              observer.unobserve(entry.target);
            }
          });
        }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 })
      : null;

    nodes.forEach(function (node, index) {
      if (node.dataset.profileMotionReady === "true") return;
      node.dataset.profileMotionReady = "true";
      node.style.setProperty("--motion-order", String(index % 18));
      node.style.setProperty("--hover-x", (54 + (index % 5) * 7).toFixed(1) + "%");
      node.style.setProperty("--hover-y", (12 + (index % 4) * 8).toFixed(1) + "%");
      node.classList.add("profile-motion-item");
      if (observer) observer.observe(node);
      else node.classList.add("is-visible");
    });
  }

  function createTouchTexture(THREE) {
    var size = 64;
    var textureCanvas = document.createElement("canvas");
    var context = textureCanvas.getContext("2d");
    var trail = [];
    var last = null;
    var maxAge = 64;
    var radius = size * 0.12;

    textureCanvas.width = size;
    textureCanvas.height = size;

    function clear() {
      context.fillStyle = "black";
      context.fillRect(0, 0, size, size);
    }

    function drawPoint(point) {
      var x = point.x * size;
      var y = (1 - point.y) * size;
      var age = point.age / maxAge;
      var intensity = Math.sin(Math.min(age / 0.3, 1) * Math.PI / 2);
      if (age > 0.3) intensity = Math.max(1 - (age - 0.3) / 0.7, 0);
      intensity *= point.force;

      var offset = size * 5;
      var red = ((point.vx + 1) / 2) * 255;
      var green = ((point.vy + 1) / 2) * 255;
      context.shadowOffsetX = offset;
      context.shadowOffsetY = offset;
      context.shadowBlur = radius;
      context.shadowColor = "rgba(" + red + "," + green + "," + (intensity * 255) + "," + (0.22 * intensity) + ")";
      context.beginPath();
      context.fillStyle = "rgba(255,0,0,1)";
      context.arc(x - offset, y - offset, radius, 0, Math.PI * 2);
      context.fill();
    }

    function addTouch(point) {
      var force = 0;
      var vx = 0;
      var vy = 0;
      if (last) {
        var dx = point.x - last.x;
        var dy = point.y - last.y;
        var distance = Math.sqrt(dx * dx + dy * dy);
        if (!distance) return;
        vx = dx / distance;
        vy = dy / distance;
        force = Math.min((dx * dx + dy * dy) * 10000, 1);
      }
      last = { x: point.x, y: point.y };
      trail.push({ x: point.x, y: point.y, age: 0, force: force, vx: vx, vy: vy });
    }

    function update() {
      clear();
      for (var index = trail.length - 1; index >= 0; index -= 1) {
        var point = trail[index];
        var drift = point.force / maxAge * (1 - point.age / maxAge);
        point.x += point.vx * drift;
        point.y += point.vy * drift;
        point.age += 1;
        if (point.age > maxAge) trail.splice(index, 1);
      }
      trail.forEach(drawPoint);
      texture.needsUpdate = true;
    }

    clear();
    var texture = new THREE.Texture(textureCanvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    texture.needsUpdate = true;

    return { texture: texture, addTouch: addTouch, update: update };
  }

  function createLiquidEffect(THREE, Effect, texture) {
    var fragment = [
      "uniform sampler2D uTexture;",
      "uniform float uStrength;",
      "uniform float uTime;",
      "uniform float uFreq;",
      "void mainUv(inout vec2 uv) {",
      "  vec4 tex = texture2D(uTexture, uv);",
      "  vec2 velocity = tex.rg * 2.0 - 1.0;",
      "  float intensity = tex.b;",
      "  float wave = 0.5 + 0.5 * sin(uTime * uFreq + intensity * 6.2831853);",
      "  uv += velocity * uStrength * intensity * wave;",
      "}"
    ].join("\n");

    return new Effect("PixelBlastLiquid", fragment, {
      uniforms: new Map([
        ["uTexture", new THREE.Uniform(texture)],
        ["uStrength", new THREE.Uniform(0.12)],
        ["uTime", new THREE.Uniform(0)],
        ["uFreq", new THREE.Uniform(5)]
      ])
    });
  }

  var vertexShader = [
    "void main() {",
    "  gl_Position = vec4(position, 1.0);",
    "}"
  ].join("\n");

  var fragmentShader = [
    "precision highp float;",
    "uniform vec3 uColor;",
    "uniform vec2 uResolution;",
    "uniform float uTime;",
    "uniform float uPixelSize;",
    "uniform float uScale;",
    "uniform float uDensity;",
    "uniform float uPixelJitter;",
    "uniform float uRippleSpeed;",
    "uniform float uRippleThickness;",
    "uniform float uRippleIntensity;",
    "uniform float uEdgeFade;",
    "const int MAX_CLICKS = 10;",
    "uniform vec2 uClickPos[MAX_CLICKS];",
    "uniform float uClickTimes[MAX_CLICKS];",
    "out vec4 fragColor;",
    "float bayer2(vec2 a) {",
    "  a = floor(a);",
    "  return fract(a.x / 2.0 + a.y * a.y * 0.75);",
    "}",
    "float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }",
    "float bayer8(vec2 a) { return bayer4(0.5 * a) * 0.25 + bayer2(a); }",
    "float hash11(float n) { return fract(sin(n) * 43758.5453); }",
    "float valueNoise(vec3 p) {",
    "  vec3 i = floor(p);",
    "  vec3 f = fract(p);",
    "  vec3 w = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);",
    "  float n000 = hash11(dot(i + vec3(0,0,0), vec3(1,57,113)));",
    "  float n100 = hash11(dot(i + vec3(1,0,0), vec3(1,57,113)));",
    "  float n010 = hash11(dot(i + vec3(0,1,0), vec3(1,57,113)));",
    "  float n110 = hash11(dot(i + vec3(1,1,0), vec3(1,57,113)));",
    "  float n001 = hash11(dot(i + vec3(0,0,1), vec3(1,57,113)));",
    "  float n101 = hash11(dot(i + vec3(1,0,1), vec3(1,57,113)));",
    "  float n011 = hash11(dot(i + vec3(0,1,1), vec3(1,57,113)));",
    "  float n111 = hash11(dot(i + vec3(1,1,1), vec3(1,57,113)));",
    "  float x00 = mix(n000, n100, w.x);",
    "  float x10 = mix(n010, n110, w.x);",
    "  float x01 = mix(n001, n101, w.x);",
    "  float x11 = mix(n011, n111, w.x);",
    "  return mix(mix(x00, x10, w.y), mix(x01, x11, w.y), w.z) * 2.0 - 1.0;",
    "}",
    "float fbm(vec2 uv, float time) {",
    "  vec3 p = vec3(uv * uScale, time);",
    "  float amplitude = 1.0;",
    "  float frequency = 1.0;",
    "  float sum = 1.0;",
    "  for (int i = 0; i < 5; i++) {",
    "    sum += amplitude * valueNoise(p * frequency);",
    "    frequency *= 1.25;",
    "  }",
    "  return sum * 0.5 + 0.5;",
    "}",
    "float circleMask(vec2 point, float coverage) {",
    "  float radius = sqrt(max(coverage, 0.0)) * 0.25;",
    "  float distanceToCenter = length(point - 0.5) - radius;",
    "  float aa = 0.5 * fwidth(distanceToCenter);",
    "  return coverage * (1.0 - smoothstep(-aa, aa, distanceToCenter * 2.0));",
    "}",
    "void main() {",
    "  vec2 fragCoord = gl_FragCoord.xy - uResolution * 0.5;",
    "  float aspect = uResolution.x / uResolution.y;",
    "  vec2 pixelUV = fract(fragCoord / uPixelSize);",
    "  float cellSize = 8.0 * uPixelSize;",
    "  vec2 cellCoord = floor(fragCoord / cellSize) * cellSize;",
    "  vec2 uv = cellCoord / uResolution * vec2(aspect, 1.0);",
    "  float feed = fbm(uv, uTime * 0.05) * 0.5 - 0.65 + (uDensity - 0.5) * 0.3;",
    "  for (int i = 0; i < MAX_CLICKS; i++) {",
    "    vec2 clickPos = uClickPos[i];",
    "    if (clickPos.x < 0.0) continue;",
    "    vec2 clickUV = (clickPos - uResolution * 0.5 - cellSize * 0.5) / uResolution * vec2(aspect, 1.0);",
    "    float elapsed = max(uTime - uClickTimes[i], 0.0);",
    "    float radius = distance(uv, clickUV);",
    "    float ring = exp(-pow((radius - uRippleSpeed * elapsed) / uRippleThickness, 2.0));",
    "    float attenuation = exp(-elapsed) * exp(-10.0 * radius);",
    "    feed = max(feed, ring * attenuation * uRippleIntensity);",
    "  }",
    "  float threshold = bayer8(fragCoord / uPixelSize) - 0.5;",
    "  float visible = step(0.5, feed + threshold);",
    "  float hash = fract(sin(dot(floor(fragCoord / uPixelSize), vec2(127.1, 311.7))) * 43758.5453);",
    "  float coverage = visible * (1.0 + (hash - 0.5) * uPixelJitter);",
    "  float mask = circleMask(pixelUV, coverage);",
    "  vec2 normalized = gl_FragCoord.xy / uResolution;",
    "  float edge = min(min(normalized.x, normalized.y), min(1.0 - normalized.x, 1.0 - normalized.y));",
    "  mask *= smoothstep(0.0, uEdgeFade, edge);",
    "  vec3 srgb = mix(uColor * 12.92, 1.055 * pow(uColor, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, uColor));",
    "  fragColor = vec4(srgb, mask * 0.78);",
    "}"
  ].join("\n");

  async function initWebGL() {
    var THREE = await import("three");
    var postprocessing = null;
    try {
      postprocessing = await import("https://cdn.jsdelivr.net/npm/postprocessing@6.36.6/build/index.js");
    } catch (error) {
      postprocessing = null;
    }

    var renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      alpha: true,
      antialias: true,
      powerPreference: coarsePointer ? "low-power" : "high-performance"
    });
    var pixelRatio = Math.min(window.devicePixelRatio || 1, coarsePointer ? 1.25 : 1.6);
    var uniforms = {
      uResolution: { value: new THREE.Vector2(1, 1) },
      uTime: { value: 0 },
      uColor: { value: new THREE.Color("#B497CF") },
      uClickPos: { value: Array.from({ length: 10 }, function () { return new THREE.Vector2(-1, -1); }) },
      uClickTimes: { value: new Float32Array(10) },
      uPixelSize: { value: 6 * pixelRatio },
      uScale: { value: 3 },
      uDensity: { value: 1.2 },
      uPixelJitter: { value: 0.5 },
      uRippleSpeed: { value: 0.4 },
      uRippleThickness: { value: 0.12 },
      uRippleIntensity: { value: 1.5 },
      uEdgeFade: { value: 0.25 }
    };
    var scene = new THREE.Scene();
    var camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    var material = new THREE.ShaderMaterial({
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      uniforms: uniforms,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      glslVersion: THREE.GLSL3
    });
    var geometry = new THREE.PlaneGeometry(2, 2);
    var quad = new THREE.Mesh(geometry, material);
    var clock = new THREE.Clock();
    var timeOffset = Math.random() * 1000;
    var clickIndex = 0;
    var composer = null;
    var touch = null;
    var liquidEffect = null;
    var frameId = 0;
    var lastFrame = 0;
    var stopped = false;

    scene.add(quad);
    renderer.setClearAlpha(0);
    renderer.setPixelRatio(pixelRatio);

    if (postprocessing && !reduceMotion && !coarsePointer) {
      touch = createTouchTexture(THREE);
      composer = new postprocessing.EffectComposer(renderer);
      composer.addPass(new postprocessing.RenderPass(scene, camera));
      liquidEffect = createLiquidEffect(THREE, postprocessing.Effect, touch.texture);
      var effectPass = new postprocessing.EffectPass(camera, liquidEffect);
      effectPass.renderToScreen = true;
      composer.addPass(effectPass);
    }
    stage.dataset.renderer = composer ? "webgl-liquid" : "webgl";
    stage.dataset.ripples = "0";

    function resize() {
      var width = Math.max(window.innerWidth, 1);
      var height = Math.max(window.innerHeight, 1);
      renderer.setSize(width, height, false);
      uniforms.uResolution.value.set(canvas.width, canvas.height);
      uniforms.uPixelSize.value = 6 * pixelRatio;
      if (composer) composer.setSize(width, height);
    }

    function mapPointer(event) {
      return {
        x: event.clientX * canvas.width / Math.max(window.innerWidth, 1),
        y: (window.innerHeight - event.clientY) * canvas.height / Math.max(window.innerHeight, 1)
      };
    }

    function onPointerDown(event) {
      var point = mapPointer(event);
      uniforms.uClickPos.value[clickIndex].set(point.x, point.y);
      uniforms.uClickTimes.value[clickIndex] = uniforms.uTime.value;
      clickIndex = (clickIndex + 1) % 10;
      stage.dataset.ripples = String(Number(stage.dataset.ripples || "0") + 1);
    }

    function onPointerMove(event) {
      if (!touch) return;
      touch.addTouch({
        x: event.clientX / Math.max(window.innerWidth, 1),
        y: event.clientY / Math.max(window.innerHeight, 1)
      });
    }

    function render(now) {
      frameId = 0;
      if (stopped || document.hidden) return;
      if (lastFrame && now - lastFrame < 1000 / (coarsePointer ? 22 : 30)) {
        frameId = window.requestAnimationFrame(render);
        return;
      }
      lastFrame = now;
      uniforms.uTime.value = timeOffset + clock.getElapsedTime() * 0.6;
      if (liquidEffect) liquidEffect.uniforms.get("uTime").value = uniforms.uTime.value;
      if (touch) touch.update();
      if (composer) composer.render();
      else renderer.render(scene, camera);
      if (!reduceMotion) frameId = window.requestAnimationFrame(render);
    }

    function onVisibilityChange() {
      if (!document.hidden && !reduceMotion && !frameId) frameId = window.requestAnimationFrame(render);
    }

    resize();
    window.addEventListener("resize", resize, { passive: true });
    document.addEventListener("pointerdown", onPointerDown, { passive: true });
    document.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("visibilitychange", onVisibilityChange);
    frameId = window.requestAnimationFrame(render);

    cleanupRenderer = function () {
      stopped = true;
      if (frameId) window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      geometry.dispose();
      material.dispose();
      if (touch) touch.texture.dispose();
      if (composer) composer.dispose();
      renderer.dispose();
    };
  }

  function initCanvasFallback() {
    var context = canvas.getContext("2d", { alpha: true });
    if (!context) {
      var replacement = document.createElement("canvas");
      replacement.className = "pixel-blast-canvas";
      stage.replaceChild(replacement, canvas);
      canvas = replacement;
      context = canvas.getContext("2d", { alpha: true });
    }
    var ratio = Math.min(window.devicePixelRatio || 1, 1.25);
    var width = 1;
    var height = 1;
    var ripples = [];
    var start = performance.now();
    var frameId = 0;

    stage.dataset.renderer = "canvas-2d";
    stage.dataset.ripples = "0";

    function resize() {
      width = Math.max(window.innerWidth, 1);
      height = Math.max(window.innerHeight, 1);
      canvas.width = Math.floor(width * ratio);
      canvas.height = Math.floor(height * ratio);
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    }

    function onPointerDown(event) {
      ripples.push({ x: event.clientX, y: event.clientY, born: performance.now() });
      if (ripples.length > 10) ripples.shift();
      stage.dataset.ripples = String(Number(stage.dataset.ripples || "0") + 1);
    }

    function hash(x, y) {
      return Math.abs(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
    }

    function render(now) {
      var time = (now - start) / 1000 * 0.6;
      var size = coarsePointer ? 9 : 7;
      context.clearRect(0, 0, width, height);
      context.fillStyle = "rgba(180,151,207,0.48)";

      for (var y = size; y < height; y += size) {
        for (var x = size; x < width; x += size) {
          var field = Math.sin(x * 0.012 + time) + Math.cos(y * 0.014 - time * 0.7) + hash(x, y) * 1.4;
          ripples.forEach(function (ripple) {
            var age = (now - ripple.born) / 1000;
            var distance = Math.hypot(x - ripple.x, y - ripple.y);
            field += Math.exp(-Math.pow((distance - age * 170) / 34, 2)) * Math.exp(-age * 0.9) * 3;
          });
          var edge = Math.min(x / width, y / height, 1 - x / width, 1 - y / height);
          if (field > 1.36 && edge > 0.03) {
            var radius = 1.2 + hash(y, x) * 1.2;
            context.beginPath();
            context.arc(x, y, radius, 0, Math.PI * 2);
            context.fill();
          }
        }
      }
      ripples = ripples.filter(function (ripple) { return now - ripple.born < 2600; });
      if (!reduceMotion) frameId = window.requestAnimationFrame(render);
    }

    resize();
    window.addEventListener("resize", resize, { passive: true });
    document.addEventListener("pointerdown", onPointerDown, { passive: true });
    frameId = window.requestAnimationFrame(render);
    cleanupRenderer = function () {
      if (frameId) window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }

  document.addEventListener("profile:rendered", initMotion);
  window.addEventListener("pagehide", function () {
    if (cleanupRenderer) cleanupRenderer();
  }, { once: true });
  initMotion();
  initWebGL().catch(initCanvasFallback);
})();
