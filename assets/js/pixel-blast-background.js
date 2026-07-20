(function () {
  var homeRoot = document.getElementById("profile-app");
  if (!homeRoot) return;

  var videoUrl = "/assets/media/cinematic-background.mp4";
  var posterUrl = "/assets/media/cinematic-background-poster.jpg";
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var saveData = Boolean(navigator.connection && navigator.connection.saveData);
  var stage = document.createElement("div");
  var video = document.createElement("video");
  var fallbackTimer = 0;
  var disposed = false;

  stage.className = "pixel-blast-stage cinematic-video-stage";
  stage.setAttribute("aria-hidden", "true");
  stage.setAttribute("data-cinematic-background", "true");
  stage.dataset.renderer = "video";
  stage.dataset.state = "loading";
  video.className = "cinematic-video";
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.preload = "auto";
  video.poster = posterUrl;
  video.setAttribute("muted", "");
  video.setAttribute("playsinline", "");
  stage.appendChild(video);
  document.body.insertBefore(stage, document.body.firstChild);

  function initMotion() {
    if (reduceMotion) return;
    var selector = [
      ".profile-hero",
      ".profile-section",
      ".love-window",
      ".profile-list li",
      ".photo-grid img"
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

  function markReady(state) {
    if (disposed || stage.dataset.state === "playing" || stage.dataset.state === "fallback") return;
    window.clearTimeout(fallbackTimer);
    stage.dataset.state = state;
    stage.classList.add("cinematic-video-stage--ready");
    document.dispatchEvent(new CustomEvent("cinematic-background:ready", { detail: { state: state } }));
  }

  function useFallback(reason) {
    if (disposed) return;
    window.clearTimeout(fallbackTimer);
    stage.dataset.state = "fallback";
    stage.dataset.fallbackReason = reason || "unavailable";
    stage.classList.add("cinematic-video-stage--fallback");
    video.removeAttribute("src");
    video.load();
    document.dispatchEvent(new CustomEvent("cinematic-background:ready", { detail: { state: "fallback" } }));
  }

  function onCanPlay() {
    markReady(reduceMotion ? "paused" : "ready");
    if (reduceMotion) {
      video.pause();
      return;
    }
    var attempt = video.play();
    if (attempt && typeof attempt.catch === "function") {
      attempt.catch(function () { markReady("ready"); });
    }
  }

  function onPlaying() {
    markReady("playing");
    stage.dataset.state = "playing";
  }

  function onVisibilityChange() {
    if (reduceMotion || saveData || disposed) return;
    if (document.hidden) video.pause();
    else {
      var attempt = video.play();
      if (attempt && typeof attempt.catch === "function") attempt.catch(function () {});
    }
  }

  document.addEventListener("profile:rendered", initMotion);
  video.addEventListener("canplay", onCanPlay, { once: true });
  video.addEventListener("playing", onPlaying);
  video.addEventListener("error", function () { useFallback("media-error"); }, { once: true });
  document.addEventListener("visibilitychange", onVisibilityChange);

  initMotion();
  if (saveData) useFallback("save-data");
  else {
    video.src = videoUrl;
    video.load();
    fallbackTimer = window.setTimeout(function () { useFallback("timeout"); }, 6000);
  }

  window.addEventListener("pagehide", function () {
    disposed = true;
    window.clearTimeout(fallbackTimer);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    video.pause();
    video.removeAttribute("src");
    video.load();
  }, { once: true });
})();
