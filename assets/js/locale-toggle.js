/* 语言切换：masthead 里的 中|EN 分段滑块开关（玻璃轨道 + 白色滑块）。
   locale 优先级：手动选择（profileLocale.v1）> 本会话网络判断结果
   （profileLocaleAuto.v1，网络来自国外 → en，国内 → zh）> 兜底 en。
   手动切换后整页重载。本文件同时负责把 Jekyll 静态渲染的部分（导航、
   侧栏、弹层）按字典换成当前语言；#profile-app 由 profile-render.js 按
   locale 自行渲染，跳过。 */
(function boot() {
  "use strict";

  /* 等网络判断落定：scripts.html 内联判断网络是否来自国外（IP 归属地） */
  if (window.__localeDetectPending && !window.__localeSettled) {
    window.addEventListener("locale:settled", boot, { once: true });
    return;
  }

  var LOCALE_KEY = "profileLocale.v1";
  var AUTO_KEY = "profileLocaleAuto.v1";
  var locale = "en";
  try {
    var saved = window.localStorage.getItem(LOCALE_KEY);
    if (saved === "zh" || saved === "en") locale = saved;
    else {
      var auto = window.sessionStorage.getItem(AUTO_KEY);
      if (auto === "zh" || auto === "en") locale = auto;
    }
  } catch (e) {}

  /* 双向字典：键值互为译文，两方向切换都能用 */
  var DICT = {
    "余文敬": "Wenjing Yu",
    "个人介绍": "About",
    "成果": "Publications",
    "爱好": "Hobbies",
    "教育经历": "Education",
    "杭州电子科技大学": "Hangzhou Dianzi University",
    "本科 · 计算机科学与技术": "B.Eng. · Computer Science & Technology",
    "博士研究生": "Ph.D. Candidate",
    "2025.9 – 至今": "2025.9 – Present",
    "13822513943（微信同号）": "13822513943 (WeChat)",
    "电子邮箱": "Email",
    "微信联系": "WeChat",
    "微信二维码": "WeChat QR code",
    "二维码图片待上传": "QR image to be uploaded",
    "微信扫一扫，或搜索手机号添加好友": "Scan on WeChat, or search this number to add me",
    "生活工作邮箱": "Email · life & work",
    "学术交流邮箱": "Email · academic",
    "Google Scholar 总引用数": "Total citations on Google Scholar",
    "GitHub 公开仓库 Stars": "Stars across public GitHub repos",
    "潜龙勿用、见龙在田、终日乾乾、或跃在渊、飞龙在天、亢龙有悔。":
      "Hope is a good thing, maybe the best of things, and no good thing ever dies. — The Shawshank Redemption"
  };

  function squash(s) { return String(s).replace(/\s+/g, ""); }
  /* 字典键也按 squash 建索引：键里的空格/换行与 DOM 文案两侧归一后匹配 */
  var DICT_BY_KEY = {};
  Object.keys(DICT).forEach(function (k) { DICT_BY_KEY[squash(k)] = DICT[k]; });
  function translate(value) {
    if (!value) return value;
    var key = squash(value);
    if (!key) return value;
    if (locale === "en") {
      if (Object.prototype.hasOwnProperty.call(DICT_BY_KEY, key)) return DICT_BY_KEY[key];
    } else {
      for (var k in DICT) if (squash(DICT[k]) === key) return k;
    }
    return value;
  }

  var SKIP_TAGS = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEMPLATE: 1, CODE: 1 };
  var ATTRS = ["title", "alt", "aria-label", "data-detail-title"];

  function inSkippedRegion(node) {
    /* TreeWalker 给的是文本节点，先跳到它的元素父级再查属性 */
    var el = node.nodeType === 1 ? node : node.parentElement;
    for (; el && el !== document.body; el = el.parentElement) {
      if (el.id === "profile-app" || el.hasAttribute("data-resource-loader") ||
          el.classList && el.classList.contains("figure-lightbox")) return true;
    }
    return false;
  }

  function applyChrome() {
    document.documentElement.lang = locale === "zh" ? "zh-CN" : "en";
    /* body 语言类：CSS 据此切换英文格言字体（衬线斜体）等 */
    document.body.classList.add(locale === "zh" ? "locale-zh" : "locale-en");
    document.body.classList.remove(locale === "zh" ? "locale-en" : "locale-zh");
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    var node;
    while ((node = walker.nextNode())) {
      if (SKIP_TAGS[node.parentElement.tagName]) continue;
      if (inSkippedRegion(node)) continue;
      var next = translate(node.nodeValue);
      if (next !== node.nodeValue) node.nodeValue = next;
    }
    var all = document.body.querySelectorAll("*");
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      if (inSkippedRegion(el)) continue;
      for (var j = 0; j < ATTRS.length; j++) {
        var v = el.getAttribute(ATTRS[j]);
        if (v === null) continue;
        var t = translate(v);
        if (t !== v) el.setAttribute(ATTRS[j], t);
      }
    }
  }

  function ensureToggle() {
    var links = document.querySelector(".masthead .visible-links");
    if (!links || links.querySelector("[data-locale-toggle]")) return;
    var item = document.createElement("li");
    item.className = "masthead__menu-item persist";
    item.setAttribute("data-locale-toggle", "true");
    /* 分段滑块开关：中 | EN 双语常显，当前语言落在白色滑块上 */
    var box = document.createElement("div");
    box.className = "locale-switch" + (locale === "en" ? " locale-switch--en" : "");
    box.setAttribute("role", "group");
    box.setAttribute("aria-label", "语言 / Language");
    ["zh", "en"].forEach(function (code) {
      var opt = document.createElement("button");
      opt.type = "button";
      opt.className = "locale-switch__opt";
      opt.setAttribute("data-loc", code);
      opt.textContent = code === "zh" ? "中" : "EN";
      opt.setAttribute("aria-pressed", locale === code ? "true" : "false");
      opt.addEventListener("click", function () {
        if (locale === code) return;
        try {
          window.localStorage.setItem(LOCALE_KEY, code);
        } catch (e) {}
        window.location.reload();
      });
      box.appendChild(opt);
    });
    item.appendChild(box);
    /* 放导航栏最左边：紧跟站点标题（--lg）之后、第一个导航项之前 */
    var anchor = null;
    var items = links.children;
    for (var i = 0; i < items.length; i++) {
      if (!items[i].classList.contains("masthead__menu-item--lg")) {
        anchor = items[i];
        break;
      }
    }
    if (anchor) links.insertBefore(item, anchor);
    else links.appendChild(item);
  }

  applyChrome();
  ensureToggle();
})();
