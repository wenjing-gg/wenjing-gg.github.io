/* 侧栏联系方式弹层：点手机号弹出微信二维码、点邮箱弹出双邮箱面板。
   弹层内容取自 author-profile.html 里隐藏的 .sidebar-detail 模板。 */
(function () {
  "use strict";

  var box = null;
  var titleEl = null;
  var bodyEl = null;

  var TEMPLATE = [
    '<div class="sidebar-lightbox__backdrop" data-sidebar-detail-close></div>',
    '<div class="sidebar-lightbox__card">',
    '<button type="button" class="sidebar-lightbox__close" data-sidebar-detail-close aria-label="关闭">✕</button>',
    '<h3 class="sidebar-lightbox__title"></h3>',
    '<div class="sidebar-lightbox__body"></div>',
    "</div>"
  ].join("");

  function ensure() {
    if (box) return box;
    box = document.createElement("div");
    box.className = "sidebar-lightbox";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.innerHTML = TEMPLATE;
    document.body.appendChild(box);
    titleEl = box.querySelector(".sidebar-lightbox__title");
    bodyEl = box.querySelector(".sidebar-lightbox__body");
    box.addEventListener("click", function (event) {
      if (event.target.closest("[data-sidebar-detail-close]")) close();
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") close();
    });
    return box;
  }

  function open(source, trigger) {
    ensure();
    titleEl.textContent = trigger.getAttribute("data-detail-title") || "";
    bodyEl.innerHTML = source.innerHTML;
    box.classList.add("is-open");
    document.body.classList.add("sidebar-lightbox-open");
    box.querySelector(".sidebar-lightbox__close").focus();
  }

  function close() {
    if (!box || !box.classList.contains("is-open")) return;
    box.classList.remove("is-open");
    document.body.classList.remove("sidebar-lightbox-open");
  }

  document.addEventListener("click", function (event) {
    var trigger = event.target.closest("[data-sidebar-detail]");
    if (!trigger) return;
    var source = document.getElementById(trigger.getAttribute("data-sidebar-detail"));
    if (!source) return;
    event.preventDefault();
    open(source, trigger);
  });
})();
