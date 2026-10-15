(function () {
  var site = window.ProfileSite;
  if (!site) return;

  var util = site.util;
  var homeRoot = document.getElementById("profile-app");
  var previewRoot = null;
  var renderQueued = false;

  /* 界面文案双语：locale 由 profile-core 决定（默认 en），切换后整页重载 */
  var LOCALE = site.locale === "zh" ? "zh" : "en";
  var T = {
    zh: {
      sectionPublications: "成果",
      sectionHonors: "项目与荣誉",
      sectionHobbies: "爱好",
      patentLabel: "专利",
      untitledWork: "未命名成果",
      untitledPatent: "未命名专利",
      emptyList: "暂无内容。",
      emptyTopics: "暂无研究方向。",
      emptyAchievements: "暂无成果。",
      emptyLove: "`love/` 目录暂无图片。",
      loveTitle: "恋爱小窗",
      loveLeadPrefix: "至今相恋已",
      loveLeadSuffix: "天",
      mentorPrefix: "师从 ",
      mentorJoin: "，",
      jointCoadvisor: "，合作导师为",
      jointJoin: "；同时",
      jointSuffix: "。",
      parenOpen: "（",
      parenClose: "）",
      hobbyPhotoAlt: "爱好图片 ",
      lovePhotoAlt: "恋爱小窗照片 ",
      figureAltSuffix: " 框架图",
      figureAria: "放大查看论文框架图",
      lightboxAria: "论文框架图放大查看",
      lightboxSuffix: " 框架图",
      wheelAria: "研究方向",
      galleryAria: "恋爱图片穹顶画廊，可拖拽旋转并点击照片放大",
      closeAria: "关闭"
    },
    en: {
      sectionPublications: "Publications",
      sectionHonors: "Projects & Honors",
      sectionHobbies: "Hobbies",
      patentLabel: "Patents",
      untitledWork: "Untitled work",
      untitledPatent: "Untitled patent",
      emptyList: "Nothing here yet.",
      emptyTopics: "No research directions.",
      emptyAchievements: "No achievements yet.",
      emptyLove: "No photos in `love/` yet.",
      loveTitle: "Love Notes",
      loveLeadPrefix: "In love for ",
      loveLeadSuffix: " days (since ",
      mentorPrefix: "Advised by ",
      mentorJoin: ". ",
      jointCoadvisor: ", co-advised by ",
      jointJoin: "; also ",
      jointSuffix: ".",
      parenOpen: " (",
      parenClose: ")",
      hobbyPhotoAlt: "Hobby photo ",
      lovePhotoAlt: "Love photo ",
      figureAltSuffix: " framework figure",
      figureAria: "Zoom in on the paper figure",
      lightboxAria: "Zoomed paper figure",
      lightboxSuffix: " framework figure",
      wheelAria: "Research directions",
      galleryAria: "Love photo dome gallery — drag to rotate, click a photo to zoom",
      closeAria: "Close"
    }
  }[LOCALE];

  function idAttr(id, preview) {
    return preview ? "" : ' id="' + id + '"';
  }

  function iconForText(text) {
    var value = util.trim(text);
    if (/影像|肿瘤|医学|medical|tumor|image/i.test(value)) return "fa-solid fa-brain";
    if (/多任务|协作|智能体|multitask|collab|agent/i.test(value)) return "fa-solid fa-diagram-project";
    if (/适应|鲁棒|测试|adapt|robust|test/i.test(value)) return "fa-solid fa-wave-square";
    if (/弱监督|半监督|分割|weak|semi|segment/i.test(value)) return "fa-solid fa-layer-group";
    if (/VQA|视觉问答/i.test(value)) return "fa-solid fa-comments";
    if (/投资|分析|invest|analys/i.test(value)) return "fa-solid fa-chart-line";
    if (/羽毛球|badminton/i.test(value)) return "fa-solid fa-medal";
    if (/紫微|斗数|zi\s*wei|astro/i.test(value)) return "fa-solid fa-star";
    return "fa-solid fa-atom";
  }

  function listHtml(items, emptyText) {
    if (!Array.isArray(items) || !items.length) return '<p class="profile-empty">' + util.escapeHtml(emptyText || T.emptyList) + "</p>";
    return '<ul class="profile-list">' + items.map(function (item) {
      return '<li><span class="profile-list__icon"><i class="' + iconForText(item) + '" aria-hidden="true"></i></span><span>' + util.escapeHtml(item) + "</span></li>";
    }).join("") + "</ul>";
  }

  function topicHtml(items) {
    if (!Array.isArray(items) || !items.length) return '<p class="profile-empty">' + T.emptyTopics + "</p>";
    var selected = Math.min(1, items.length - 1);
    var options = items.map(function (item, index) {
      return [
        '<button type="button" role="option" class="option-wheel__item',
        index === selected ? " option-wheel__item--selected" : "",
        '" aria-selected="', index === selected ? "true" : "false", '" data-option-index="', index, '">',
        '<i class="', iconForText(item), '" aria-hidden="true"></i>',
        '<span>', util.escapeHtml(item), "</span>",
        "</button>"
      ].join("");
    }).join("");

    return [
      '<div class="research-wheel">',
      '<div class="option-wheel" role="listbox" tabindex="0" aria-label="', T.wheelAria, '" data-default-selected="', selected, '">',
      options,
      '<span class="option-wheel__guide" aria-hidden="true"></span>',
      "</div>",
      '<div class="research-wheel__selection" aria-live="polite">',
      '<span class="research-wheel__meta">RESEARCH FOCUS <b data-option-count>', String(selected + 1).padStart(2, "0"), " / ", String(items.length).padStart(2, "0"), "</b></span>",
      '<strong data-option-value>', util.escapeHtml(items[selected]), "</strong>",
      "</div>",
      "</div>"
    ].join("");
  }

  function photoHtml(images) {
    if (!Array.isArray(images) || !images.length) return "";
    return '<div class="photo-grid">' + images.map(function (item, idx) {
      return '<img src="' + util.escapeHtml(item.src) + '" alt="' + util.escapeHtml(util.trim(item.alt) || (T.hobbyPhotoAlt + (idx + 1))) + '" loading="lazy">';
    }).join("") + "</div>";
  }

  /* 论文行：一篇一行，图左文右（figure 缺省时右侧信息占满整行） */
  function bentoPaper(item, status) {
    var link = util.cleanUrl(item.linkUrl);
    var figure = util.cleanUrl(item.figure);
    var title = util.trim(item.title);
    var titleHtml = util.escapeHtml(title || T.untitledWork);
    return [
      '<article class="magic-bento-card magic-bento-card--paper magic-bento-card--', status, '" data-magic-bento-card>',
      figure
        ? '<div class="magic-bento-card__figure"><button type="button" class="magic-bento-card__figure-btn" data-figure-zoom data-figure-src="' + util.escapeHtml(figure) + '" data-figure-title="' + util.escapeHtml(title) + '" aria-label="' + T.figureAria + '"><img src="' + util.escapeHtml(figure) + '" alt="' + titleHtml + T.figureAltSuffix + '" loading="lazy" decoding="async"></button></div>'
        : "",
      '<div class="magic-bento-card__side">',
      '<div class="magic-bento-card__content">',
      '<h3 class="magic-bento-card__title">', titleHtml, "</h3>",
      util.trim(item.authors) ? '<p class="magic-bento-card__authors"><strong>Authors:</strong> ' + util.hiAuthor(item.authors, site.state.meta && site.state.meta.selfAuthorName) + "</p>" : "",
      "</div>",
      '<footer class="magic-bento-card__meta">',
      link && util.trim(item.linkText) ? '<a class="magic-bento-card__link" href="' + util.escapeHtml(link) + '" target="_blank" rel="noopener noreferrer">' + util.escapeHtml(item.linkText) + '<i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i></a>' : "",
      '<span class="magic-bento-card__label">', status === "published" ? "PUBLISHED" : "UNDER REVIEW", "</span>",
      util.trim(item.note) ? '<span class="magic-bento-card__note">' + util.escapeHtml(item.note) + "</span>" : "",
      "</footer>",
      "</div>",
      "</article>"
    ].join("");
  }

  /* 专利卡：所有专利合并在同一张卡里，每行「标题左、备注
     （第一发明人/参与人）右」同行右端对齐 */
  function bentoPatents(items) {
    var rows = items.map(function (item) {
      return [
        '<li class="magic-bento-card__patent-row">',
        '<span class="magic-bento-card__title">', util.escapeHtml(util.trim(item.title) || T.untitledPatent), "</span>",
        util.trim(item.note) ? '<span class="magic-bento-card__note">' + util.escapeHtml(util.trim(item.note)) + "</span>" : "",
        "</li>"
      ].join("");
    });
    return [
      '<article class="magic-bento-card magic-bento-card--patent" data-magic-bento-card>',
      '<header class="magic-bento-card__header">',
      '<span class="magic-bento-card__label">', T.patentLabel, "</span>",
      "</header>",
      '<ul class="magic-bento-card__patent-list">',
      rows.join(""),
      "</ul>",
      "</article>"
    ].join("");
  }

  function achievementsHtml(achievements) {
    var papers = achievements && achievements.papers ? achievements.papers : {};
    var cards = [];
    (papers.published || []).forEach(function (item) {
      cards.push(bentoPaper(item, "published"));
    });
    (papers.review || []).forEach(function (item) {
      cards.push(bentoPaper(item, "review"));
    });
    var patents = (achievements && achievements.patents) || [];
    if (patents.length) cards.push(bentoPatents(patents));
    if (!cards.length) return '<p class="profile-empty">' + T.emptyAchievements + "</p>";
    return '<div class="magic-bento-grid" data-magic-bento-grid>' + cards.join("") + "</div>";
  }

  function loveHtml(love, preview) {
    var start = util.dateStr(love && love.startDate, "2024-12-24");
    var images = Array.isArray(love && love.images) ? love.images : [];
    var galleryItems = images.map(function (item, idx) {
      return [
        '<figure class="dome-gallery__fallback-item" data-dome-item data-dome-image="', util.escapeHtml(item.src), '" data-dome-alt="', util.escapeHtml(util.trim(item.alt) || (T.lovePhotoAlt + (idx + 1))), '">',
        '<img src="', util.escapeHtml(item.src), '" alt="', util.escapeHtml(util.trim(item.alt) || (T.lovePhotoAlt + (idx + 1))), '" loading="lazy">',
        "</figure>"
      ].join("");
    }).join("");
    var daysLead = LOCALE === "en"
      ? T.loveLeadPrefix
      : util.escapeHtml(util.cnDate(start)) + T.loveLeadPrefix;
    var daysTail = LOCALE === "en"
      ? T.loveLeadSuffix + util.escapeHtml(start) + ')"</span>'
      : T.loveLeadSuffix + "</span>";
    return [
      '<section class="love-window" aria-labelledby="love-window-title' + (preview ? "-preview" : "") + '">',
      '<div class="love-window__header">',
      '<h2 id="love-window-title' + (preview ? "-preview" : "") + '">', T.loveTitle, "</h2>",
      '<p class="love-days" aria-live="polite"><span class="love-days__text">' + daysLead + '</span><span class="love-days__calendar" data-love-days data-love-start="' + util.escapeHtml(start) + '">--</span>' + daysTail + "</p>",
      "</div>",
      images.length ? [
        '<div class="dome-gallery" tabindex="0" role="region" aria-label="', T.galleryAria, '" data-dome-gallery>',
        '<div class="dome-gallery__main" data-dome-main>',
        '<div class="dome-gallery__stage"><div class="dome-gallery__sphere" data-dome-sphere></div></div>',
        '<div class="dome-gallery__overlay"></div><div class="dome-gallery__overlay dome-gallery__overlay--blur"></div>',
        '<div class="dome-gallery__edge dome-gallery__edge--top"></div><div class="dome-gallery__edge dome-gallery__edge--bottom"></div>',
        '<div class="dome-gallery__viewer" data-dome-viewer><div class="dome-gallery__scrim" data-dome-scrim></div><div class="dome-gallery__frame"></div></div>',
        "</div>",
        '<div class="dome-gallery__fallback">', galleryItems, "</div>",
        "</div>"
      ].join("") : '<p class="love-empty">' + T.emptyLove + "</p>",
      "</section>"
    ].join("");
  }

  /* 放大加粗句首姓名：中文取首个逗号前的短片段；英文取「<Name> is/was」 */
  function leadHtml(lead) {
    var raw = util.escapeHtml(util.trim(lead));
    if (LOCALE === "en") {
      return raw.replace(
        /^([A-Z][A-Za-z .'-]{1,38}?)\s+(is|was)\b/,
        '<span class="profile-hero__lead-name">$1</span> $2'
      );
    }
    return raw.replace(
      /^([^，,]{1,12})(?=[，,])/,
      '<span class="profile-hero__lead-name">$1</span>'
    );
  }

  function markup(data, preview) {
    var intro = data.intro || {};
    var mentor = util.trim(intro.mentorName);
    var mentorUrl = util.cleanUrl(intro.mentorUrl);
    var mentorHtml = "";
    if (mentor) {
      /* zh：秦飞巍（Feiwei Qin）教授；en：Professor Feiwei Qin（不带中文括注） */
      var mentorLabel = LOCALE === "en"
        ? (util.trim(intro.mentorTitle) ? util.escapeHtml(util.trim(intro.mentorTitle)) + " " : "") + util.escapeHtml(mentor)
        : util.escapeHtml(mentor) +
          (util.trim(intro.mentorEn) ? T.parenOpen + util.escapeHtml(util.trim(intro.mentorEn)) + T.parenClose : "") +
          (util.trim(intro.mentorTitle) ? util.escapeHtml(util.trim(intro.mentorTitle)) : "");
      mentorHtml = T.mentorPrefix + (mentorUrl ? '<a href="' + util.escapeHtml(mentorUrl) + '" target="_blank" rel="noopener noreferrer">' + mentorLabel + "</a>" : mentorLabel);
      if (util.trim(intro.mentorSummary)) mentorHtml += T.mentorJoin + util.escapeHtml(util.trim(intro.mentorSummary));
    } else if (util.trim(intro.mentorSummary)) {
      mentorHtml = util.escapeHtml(util.trim(intro.mentorSummary));
    }

    var joint = (intro.jointTraining || []).filter(function (item) {
      return util.trim(item.org) && util.trim(item.name);
    });
    var jointHtml = "";
    if (joint.length) {
      var clauses = joint.map(function (item) {
        var name = LOCALE === "en"
          ? (util.trim(item.title) ? util.escapeHtml(util.trim(item.title)) + " " : "") + util.escapeHtml(util.trim(item.name))
          : util.escapeHtml(util.trim(item.name)) +
            (util.trim(item.en) ? T.parenOpen + util.escapeHtml(util.trim(item.en)) + T.parenClose : "") +
            (util.trim(item.title) ? util.escapeHtml(util.trim(item.title)) : "");
        var linked = util.cleanUrl(item.url)
          ? '<a href="' + util.escapeHtml(util.cleanUrl(item.url)) + '" target="_blank" rel="noopener noreferrer">' + name + "</a>"
          : name;
        var orgText = util.escapeHtml(util.trim(item.org));
        var orgLinked = util.cleanUrl(item.orgUrl)
          ? '<a href="' + util.escapeHtml(util.cleanUrl(item.orgUrl)) + '" target="_blank" rel="noopener noreferrer">' + orgText + "</a>"
          : orgText;
        if (LOCALE === "en") {
          var verbEn = util.escapeHtml(util.trim(item.verb) || "receiving joint research training");
          verbEn = verbEn.charAt(0).toUpperCase() + verbEn.slice(1);
          return verbEn + " at " + orgLinked + T.jointCoadvisor + linked;
        }
        return "在" + orgLinked + util.escapeHtml(util.trim(item.verb) || "接受联合科研训练") + T.jointCoadvisor + linked;
      });
      jointHtml = '<p class="profile-hero__joint">' + clauses.join(T.jointJoin) + T.jointSuffix + "</p>";
    }

    return [
      '<div class="profile-shell">',
      '<div class="profile-hero"' + idAttr("intro", preview) + '>',
      '<div class="profile-hero__shine" aria-hidden="true"></div>',
      '<p class="profile-hero__lead">' + leadHtml(intro.lead) + "</p>",
      mentorHtml ? "<p>" + mentorHtml + "</p>" : "",
      jointHtml,
      "</div>",
      '<article class="journal-profile">',
      '<section' + idAttr("publications", preview) + ' class="profile-section achievements"><div class="profile-section__heading"><h2>' + T.sectionPublications + "</h2></div>" + achievementsHtml(data.achievements) + "</section>",
      '<section class="profile-section profile-section--honors"><div class="profile-section__heading"><h2>' + T.sectionHonors + "</h2></div>" + listHtml(data.honors) + "</section>",
      '<section class="profile-section profile-section--hobbies"' + idAttr("hobbies", preview) + '><div class="profile-section__heading"><h2>' + T.sectionHobbies + "</h2></div>" + listHtml(data.hobbies.items) + photoHtml(data.hobbies.images) + "</section>",
      "</article>",
      loveHtml(data.love, preview),
      "</div>"
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

  /* ---- paper figure lightbox (shared by home page and admin preview) ---- */
  var lightboxNode = null;

  function ensureLightbox() {
    if (lightboxNode) return lightboxNode;
    lightboxNode = document.createElement("div");
    lightboxNode.className = "figure-lightbox";
    lightboxNode.setAttribute("role", "dialog");
    lightboxNode.setAttribute("aria-modal", "true");
    lightboxNode.setAttribute("aria-label", T.lightboxAria);
    lightboxNode.innerHTML = [
      '<div class="figure-lightbox__backdrop" data-figure-close></div>',
      '<figure class="figure-lightbox__stage">',
      "<img alt=\"\">",
      "<figcaption></figcaption>",
      "</figure>",
      '<button type="button" class="figure-lightbox__close" data-figure-close aria-label="', T.closeAria, '">✕</button>'
    ].join("");
    document.body.appendChild(lightboxNode);
    return lightboxNode;
  }

  function openLightbox(src, title) {
    var box = ensureLightbox();
    var img = box.querySelector("img");
    img.src = src;
    img.alt = title ? title + T.lightboxSuffix : T.lightboxSuffix.trim();
    box.querySelector("figcaption").textContent = title || "";
    box.classList.add("is-open");
    document.body.classList.add("figure-lightbox-open");
    box.querySelector(".figure-lightbox__close").focus();
  }

  function closeLightbox() {
    if (!lightboxNode || !lightboxNode.classList.contains("is-open")) return;
    lightboxNode.classList.remove("is-open");
    document.body.classList.remove("figure-lightbox-open");
  }

  document.addEventListener("click", function (event) {
    if (!(event.target && event.target.closest)) return;
    var trigger = event.target.closest("[data-figure-zoom]");
    if (trigger) {
      event.preventDefault();
      openLightbox(trigger.getAttribute("data-figure-src"), util.trim(trigger.getAttribute("data-figure-title")));
      return;
    }
    if (event.target.closest("[data-figure-close]")) closeLightbox();
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") closeLightbox();
  });

  ensureAdminEntry();
  if (homeRoot) renderAll();
})();
