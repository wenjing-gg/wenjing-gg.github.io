(function () {
  var site = window.ProfileSite;
  if (!site) return;

  var util = site.util;
  var homeRoot = document.getElementById("profile-app");
  var previewRoot = null;
  var renderQueued = false;

  function idAttr(id, preview) {
    return preview ? "" : ' id="' + id + '"';
  }

  function listHtml(items, emptyText) {
    if (!Array.isArray(items) || !items.length) return '<p class="profile-empty">' + util.escapeHtml(emptyText || "暂无内容。") + "</p>";
    return '<ul class="profile-list">' + items.map(function (item) { return "<li>" + util.escapeHtml(item) + "</li>"; }).join("") + "</ul>";
  }

  function topicHtml(items) {
    if (!Array.isArray(items) || !items.length) return '<p class="profile-empty">暂无研究方向。</p>';
    return '<div class="topic-grid">' + items.map(function (item) { return "<span>" + util.escapeHtml(item) + "</span>"; }).join("") + "</div>";
  }

  function photoHtml(images) {
    if (!Array.isArray(images) || !images.length) return "";
    return '<div class="photo-grid">' + images.map(function (item, idx) {
      return '<img src="' + util.escapeHtml(item.src) + '" alt="' + util.escapeHtml(util.trim(item.alt) || ("爱好图片 " + (idx + 1))) + '" loading="lazy">';
    }).join("") + "</div>";
  }

  function paperItem(item) {
    var html = ['<article class="paper-item">'];
    if (util.trim(item.note)) html.push('<span class="paper-note">' + util.escapeHtml(item.note) + "</span>");
    html.push("<h3>" + util.escapeHtml(util.trim(item.title) || "未命名成果") + "</h3>");
    if (util.trim(item.authors)) {
      html.push('<p class="paper-authors"><strong>Authors:</strong> ' + util.hiAuthor(item.authors, site.state.meta && site.state.meta.selfAuthorName) + "</p>");
    }
    if (util.trim(item.linkText) && util.cleanUrl(item.linkUrl)) {
      html.push('<a href="' + util.escapeHtml(util.cleanUrl(item.linkUrl)) + '" target="_blank" rel="noopener noreferrer">' + util.escapeHtml(item.linkText) + "</a>");
    } else if (util.trim(item.linkText)) {
      html.push('<p class="paper-meta">' + util.escapeHtml(item.linkText) + "</p>");
    }
    html.push("</article>");
    return html.join("");
  }

  function paperBucket(title, items, kind) {
    return [
      '<div class="paper-bucket paper-bucket--' + kind + '">',
      '<h4 class="paper-group-subtitle">' + util.escapeHtml(title) + "</h4>",
      items && items.length ? '<div class="paper-list">' + items.map(paperItem).join("") + "</div>" : '<p class="profile-empty">暂无论文。</p>',
      "</div>"
    ].join("");
  }

  function patentHtml(items) {
    if (!Array.isArray(items) || !items.length) return '<p class="profile-empty">暂无专利。</p>';
    return '<ul class="profile-list">' + items.map(function (item) {
      return "<li>" + util.escapeHtml(util.trim(item.title) || "未命名专利") + (util.trim(item.note) ? "（" + util.escapeHtml(item.note) + "）" : "") + "</li>";
    }).join("") + "</ul>";
  }

  function loveHtml(love, preview) {
    var start = util.dateStr(love && love.startDate, "2024-12-24");
    var images = Array.isArray(love && love.images) ? love.images : [];
    var track = images.concat(images).map(function (item, idx) {
      var ghost = idx >= images.length;
      return '<figure class="love-card"' + (ghost ? ' aria-hidden="true"' : "") + '><img src="' + util.escapeHtml(item.src) + '" alt="' + (ghost ? "" : util.escapeHtml(util.trim(item.alt) || ("恋爱小窗照片 " + (idx + 1)))) + '" loading="lazy"></figure>';
    }).join("");
    return [
      '<section class="love-window" aria-labelledby="love-window-title' + (preview ? "-preview" : "") + '">',
      '<div class="love-window__header">',
      '<h2 id="love-window-title' + (preview ? "-preview" : "") + '">恋爱小窗</h2>',
      '<p class="love-days" aria-live="polite"><span class="love-days__text">' + util.escapeHtml(util.cnDate(start)) + '至今相恋已</span><span class="love-days__calendar" data-love-days data-love-start="' + util.escapeHtml(start) + '">--</span><span class="love-days__text">天</span></p>',
      "</div>",
      images.length ? '<div class="love-marquee" role="region" aria-label="恋爱图片滚动展示"><div class="love-track">' + track + "</div></div>" : '<p class="love-empty">`love/` 目录暂无图片。</p>',
      "</section>"
    ].join("");
  }

  function markup(data, preview) {
    var intro = data.intro || {};
    var mentor = util.trim(intro.mentorName);
    var mentorUrl = util.cleanUrl(intro.mentorUrl);
    var mentorHtml = "";
    var contacts = [];
    var emails = (intro.emails || []).filter(function (item) { return util.trim(item); }).map(function (mail) {
      var value = util.trim(mail);
      return '<a href="mailto:' + util.escapeHtml(value) + '">' + util.escapeHtml(value) + "</a>";
    });

    if (util.trim(intro.phone)) contacts.push("电话：" + util.escapeHtml(util.trim(intro.phone)));
    if (emails.length) contacts.push("邮箱：" + emails.join(" / "));
    if (mentor) {
      mentorHtml = "师从 " + (mentorUrl ? '<a href="' + util.escapeHtml(mentorUrl) + '" target="_blank" rel="noopener noreferrer">' + util.escapeHtml(mentor) + "</a>" : util.escapeHtml(mentor));
      if (util.trim(intro.mentorSummary)) mentorHtml += "，" + util.escapeHtml(util.trim(intro.mentorSummary));
    } else if (util.trim(intro.mentorSummary)) {
      mentorHtml = util.escapeHtml(util.trim(intro.mentorSummary));
    }

    return [
      '<div class="profile-hero"' + idAttr("intro", preview) + '>',
      '<p class="profile-hero__lead">' + util.escapeHtml(intro.lead) + "</p>",
      mentorHtml ? "<p>" + mentorHtml + "</p>" : "",
      contacts.length ? '<p class="profile-hero__contact"><strong>联系方式：</strong>' + contacts.join(" ｜ ") + "</p>" : "",
      "</div>",
      '<article class="journal-profile">',
      '<section' + idAttr("research", preview) + '><h2>研究方向</h2>' + topicHtml(data.research) + "</section>",
      '<section' + idAttr("publications", preview) + ' class="achievements"><h2>成果</h2><div class="achievements-composition"><section class="achievement-card achievement-card--paper"><h3 class="achievement-card__title">论文</h3>' + paperBucket("Published", data.achievements.papers.published, "published") + paperBucket("Under Review", data.achievements.papers.review, "review") + '</section><section class="achievement-card achievement-card--patent"><h3 class="achievement-card__title">专利</h3>' + patentHtml(data.achievements.patents) + "</section></div></section>",
      "<section><h2>项目与荣誉</h2>" + listHtml(data.honors) + "</section>",
      '<section' + idAttr("hobbies", preview) + '><h2>爱好</h2>' + listHtml(data.hobbies.items) + photoHtml(data.hobbies.images) + "</section>",
      "</article>",
      loveHtml(data.love, preview)
    ].join("");
  }

  function ensureAdminEntry() {
    var links = document.querySelector(".masthead .visible-links");
    if (!links || links.querySelector("[data-admin-entry]")) return;
    var item = document.createElement("li");
    item.className = "masthead__menu-item persist tail";
    item.setAttribute("data-admin-entry", "true");
    var active = window.location.pathname.replace(/\/+$/, "") === site.config.adminPath.replace(/\/+$/, "") ? " admin-entry--active" : "";
    item.innerHTML = '<a class="admin-entry' + active + '" href="' + util.escapeHtml(site.config.adminPath) + '" aria-label="管理员修改页面" title="管理员修改页面"><i class="fa-solid fa-gear" aria-hidden="true"></i></a>';
    links.appendChild(item);
  }

  function renderAll() {
    if (homeRoot) homeRoot.innerHTML = markup(site.state, false);
    if (previewRoot) previewRoot.innerHTML = markup(site.state, true);
    document.dispatchEvent(new Event("profile:rendered"));
  }

  site.renderAll = renderAll;
  site.setPreviewRoot = function (node) {
    previewRoot = node || null;
    renderAll();
  };
  site.scheduleRender = function () {
    if (renderQueued) return;
    renderQueued = true;
    window.requestAnimationFrame(function () {
      renderQueued = false;
      if (!site.persist()) {
        window.alert("当前浏览器本地存储空间不足，无法继续保存。请先删除部分图片或重置默认内容。");
        return;
      }
      renderAll();
    });
  };

  ensureAdminEntry();
  if (homeRoot) renderAll();
})();
