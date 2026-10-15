/* 语言切换：masthead 里的 中/EN 圆形按钮。
   locale 存 localStorage（profileLocale.v1，默认 en），切换后整页重载。
   本文件同时负责把 Jekyll 静态渲染的部分（导航、侧栏、弹层）按字典换成
   当前语言；#profile-app 由 profile-render.js 按 locale 自行渲染，跳过。 */
(function () {
  "use strict";

  var LOCALE_KEY = "profileLocale.v1";
  var locale = "en";
  try {
    var saved = window.localStorage.getItem(LOCALE_KEY);
    if (saved === "zh" || saved === "en") locale = saved;
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
      "The dragon lies hid, appears in the field, stays vigilant all day, leaps from the deep, flies in the sky — and knows when to stop."
  };

  function toEn(zh) { return DICT[zh]; }
  function toZh(en) {
    for (var k in DICT) if (DICT[k] === en) return k;
    return undefined;
  }
  function translate(value) {
    if (!value) return value;
    var key = value.split("\n").map(function (s) { return s.trim(); }).filter(Boolean).join("");
    if (!key) return value;
    var hit = locale === "en" ? toEn(key) : toZh(key);
    return hit === undefined ? value : hit;
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
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "admin-entry locale-toggle";
    /* 按钮上显示「要切换到的语言」：中文界面显示 EN，英文界面显示 中 */
    btn.textContent = locale === "zh" ? "EN" : "中";
    btn.setAttribute("aria-label", locale === "zh" ? "Switch to English" : "切换到中文");
    btn.setAttribute("title", locale === "zh" ? "Switch to English" : "切换到中文");
    btn.addEventListener("click", function () {
      try {
        window.localStorage.setItem(LOCALE_KEY, locale === "zh" ? "en" : "zh");
      } catch (e) {}
      window.location.reload();
    });
    item.appendChild(btn);
    var gear = links.querySelector("[data-admin-entry]");
    if (gear) links.insertBefore(item, gear);
    else links.appendChild(item);
  }

  applyChrome();
  ensureToggle();
})();
