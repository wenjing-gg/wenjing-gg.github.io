(function () {
  var site = window.ProfileSite;
  var root = document.getElementById("profile-admin-app");
  if (!site || !root) return;

  var util = site.util;
  var errorText = "";
  var bound = false;

  function field(label, path, value, placeholder, type) {
    return '<label class="admin-field"><span>' + util.escapeHtml(label) + '</span><input class="admin-input" type="' + util.escapeHtml(type || "text") + '" data-bind="' + util.escapeHtml(path) + '" value="' + util.escapeHtml(util.text(value)) + '" placeholder="' + util.escapeHtml(placeholder || "") + '"></label>';
  }

  function area(label, path, value, placeholder) {
    return '<label class="admin-field"><span>' + util.escapeHtml(label) + '</span><textarea class="admin-textarea" rows="4" data-bind="' + util.escapeHtml(path) + '" placeholder="' + util.escapeHtml(placeholder || "") + '">' + util.escapeHtml(util.text(value)) + "</textarea></label>";
  }

  function cards(path, items, label, placeholder) {
    if (!Array.isArray(items) || !items.length) return '<p class="admin-empty-note">当前暂无内容。</p>';
    return '<div class="admin-card-list">' + items.map(function (item, index) {
      return '<article class="admin-editor-card admin-editor-card--compact"><div class="admin-editor-card__top"><strong>' + util.escapeHtml(label) + " " + (index + 1) + '</strong><button class="admin-button admin-button--danger" type="button" data-delete-item="' + util.escapeHtml(path) + '" data-index="' + index + '">删除</button></div><label class="admin-field"><span>内容</span><input class="admin-input" type="text" data-bind="' + util.escapeHtml(path + "." + index) + '" value="' + util.escapeHtml(item) + '" placeholder="' + util.escapeHtml(placeholder) + '"></label></article>';
    }).join("") + "</div>";
  }

  function papers(path, items, title) {
    return '<section class="admin-subsection"><div class="admin-subsection__header"><h4>' + util.escapeHtml(title) + '</h4><button class="admin-button" type="button" data-add-item="' + util.escapeHtml(path) + '" data-template="paper">新增论文</button></div>' + ((items || []).length ? '<div class="admin-card-list">' + items.map(function (item, index) {
      return '<article class="admin-editor-card"><div class="admin-editor-card__top"><strong>论文 ' + (index + 1) + '</strong><button class="admin-button admin-button--danger" type="button" data-delete-item="' + util.escapeHtml(path) + '" data-index="' + index + '">删除</button></div><div class="admin-form-grid admin-form-grid--single">' + field("备注", path + "." + index + ".note", item.note, "例如：学生一作 · MICCAI 2025 Early Accept") + area("题目", path + "." + index + ".title", item.title, "请输入论文题目") + area("Authors", path + "." + index + ".authors", item.authors, "请输入完整作者信息") + field("链接文字", path + "." + index + ".linkText", item.linkText, "例如：DOI: ... / arXiv: ...") + field("链接地址", path + "." + index + ".linkUrl", item.linkUrl, "https://...") + "</div></article>";
    }).join("") + "</div>" : '<p class="admin-empty-note">当前分类暂无论文。</p>') + "</section>";
  }

  function patents(path, items) {
    if (!Array.isArray(items) || !items.length) return '<p class="admin-empty-note">当前暂无专利。</p>';
    return '<div class="admin-card-list">' + items.map(function (item, index) {
      return '<article class="admin-editor-card"><div class="admin-editor-card__top"><strong>专利 ' + (index + 1) + '</strong><button class="admin-button admin-button--danger" type="button" data-delete-item="' + util.escapeHtml(path) + '" data-index="' + index + '">删除</button></div><div class="admin-form-grid admin-form-grid--single">' + area("专利名称", path + "." + index + ".title", item.title, "请输入专利名称") + field("备注", path + "." + index + ".note", item.note, "例如：第一发明人") + "</div></article>";
    }).join("") + "</div>";
  }

  function images(title, path, items) {
    return '<div class="admin-block"><div class="admin-block__header"><h3>' + util.escapeHtml(title) + '</h3><label class="admin-upload-trigger">上传图片<input type="file" accept="image/*" multiple data-upload-path="' + util.escapeHtml(path) + '"></label></div>' + ((items || []).length ? '<div class="admin-image-grid">' + items.map(function (item, index) {
      return '<article class="admin-image-card"><img src="' + util.escapeHtml(item.src) + '" alt="' + util.escapeHtml(util.trim(item.alt) || ("图片 " + (index + 1))) + '"><label class="admin-field"><span>图片说明</span><input class="admin-input" type="text" data-bind="' + util.escapeHtml(path + "." + index + ".alt") + '" value="' + util.escapeHtml(item.alt) + '" placeholder="请输入图片说明"></label><button class="admin-button admin-button--danger" type="button" data-delete-item="' + util.escapeHtml(path) + '" data-index="' + index + '">删除图片</button></article>';
    }).join("") + "</div>" : '<p class="admin-empty-note">当前暂无图片。</p>') + "</div>";
  }

  function loginHtml() {
    return '<section class="admin-login"><div class="admin-login__card"><h1>管理员修改页面</h1><p class="admin-login__note">输入管理员密码后，可视化修改个人介绍、研究方向、成果、项目与荣誉、爱好图片及恋爱小窗图片。</p><p class="admin-login__tip">当前版本保存在本机浏览器中，用于快速改稿；若要正式发布到公开网站，仍需把改动提交到仓库。</p><form class="admin-login__form" data-admin-login><label class="admin-field"><span>管理员密码</span><input class="admin-input" type="password" name="password" autocomplete="current-password" placeholder="请输入密码"></label>' + (errorText ? '<p class="admin-error">' + util.escapeHtml(errorText) + "</p>" : "") + '<div class="admin-login__actions"><button class="admin-button" type="submit">进入管理页</button><a class="admin-button admin-button--ghost" href="' + util.escapeHtml(site.config.homePath) + '">返回主页</a></div></form></div></section>';
  }

  function shellHtml(data) {
    return [
      '<div class="admin-shell">',
      '<section class="admin-shell__panel">',
      '<div class="admin-hero"><div><h1>管理员修改页面</h1><p>左侧编辑，右侧预览。所有内容保存到当前浏览器。</p></div><div class="admin-hero__actions"><button class="admin-button admin-button--ghost" type="button" data-admin-action="reset">恢复站点默认</button><button class="admin-button admin-button--ghost" type="button" data-admin-action="logout">退出管理员</button></div></div>',
      '<p class="admin-tip">图片上传后会自动压缩，适合快速更新，不适合作为长期图片仓库。</p>',
      '<section class="admin-section"><div class="admin-section__header"><h2>个人介绍</h2></div><div class="admin-block"><div class="admin-form-grid admin-form-grid--single">' + area("主要介绍", "intro.lead", data.intro.lead, "请输入个人介绍主文案") + field("导师名称", "intro.mentorName", data.intro.mentorName, "例如：秦飞巍教授") + field("导师主页", "intro.mentorUrl", data.intro.mentorUrl, "https://...") + area("导师说明 / 研究概述", "intro.mentorSummary", data.intro.mentorSummary, "请输入导师或研究方向介绍") + field("联系电话", "intro.phone", data.intro.phone, "请输入联系电话") + '</div><div class="admin-list-manager"><div class="admin-list-manager__header"><h3>邮箱</h3><button class="admin-button" type="button" data-add-item="intro.emails" data-template="text">新增邮箱</button></div>' + cards("intro.emails", data.intro.emails, "邮箱", "请输入邮箱地址") + "</div></div></section>",
      '<section class="admin-section"><div class="admin-section__header"><h2>研究方向</h2><button class="admin-button" type="button" data-add-item="research" data-template="text">新增方向</button></div>' + cards("research", data.research, "方向", "请输入研究方向") + "</section>",
      '<section class="admin-section"><div class="admin-section__header"><h2>成果</h2></div><div class="admin-composition"><section class="admin-block admin-block--paper"><div class="admin-block__header"><h3>论文</h3></div>' + papers("achievements.papers.published", data.achievements.papers.published, "Published") + papers("achievements.papers.review", data.achievements.papers.review, "Under Review") + '</section><section class="admin-block admin-block--patent"><div class="admin-block__header"><h3>专利</h3><button class="admin-button" type="button" data-add-item="achievements.patents" data-template="patent">新增专利</button></div>' + patents("achievements.patents", data.achievements.patents) + "</section></div></section>",
      '<section class="admin-section"><div class="admin-section__header"><h2>项目与荣誉</h2><button class="admin-button" type="button" data-add-item="honors" data-template="text">新增条目</button></div>' + cards("honors", data.honors, "条目", "请输入项目或荣誉内容") + "</section>",
      '<section class="admin-section"><div class="admin-section__header"><h2>爱好</h2></div><div class="admin-block"><div class="admin-block__header"><h3>文字条目</h3><button class="admin-button" type="button" data-add-item="hobbies.items" data-template="text">新增爱好</button></div>' + cards("hobbies.items", data.hobbies.items, "爱好", "请输入爱好内容") + "</div>" + images("爱好图片", "hobbies.images", data.hobbies.images) + "</section>",
      '<section class="admin-section"><div class="admin-section__header"><h2>恋爱小窗</h2></div><div class="admin-block"><div class="admin-form-grid">' + field("相恋起始日期", "love.startDate", data.love.startDate, "YYYY-MM-DD", "date") + "</div></div>" + images("恋爱照片", "love.images", data.love.images) + "</section>",
      '</section>',
      '<aside class="admin-shell__preview"><div class="admin-preview__header"><h2>主页预览</h2><a class="admin-button admin-button--ghost" href="' + util.escapeHtml(site.config.homePath) + '" target="_blank" rel="noopener noreferrer">新标签打开主页</a></div><div class="admin-preview__body" id="profile-admin-preview"></div></aside>',
      "</div>"
    ].join("");
  }

  function render() {
    root.innerHTML = site.isUnlocked() ? shellHtml(site.state) : loginHtml();
    site.setPreviewRoot(site.isUnlocked() ? root.querySelector("#profile-admin-preview") : null);
  }

  function setDefaultState() {
    site.state = util.normalize(site.defaults);
    site.reset();
  }

  function hash(text) {
    var bytes = new TextEncoder().encode(util.text(text));
    return window.crypto.subtle.digest("SHA-256", bytes).then(function (buffer) {
      return Array.prototype.map.call(new Uint8Array(buffer), function (item) {
        return item.toString(16).padStart(2, "0");
      }).join("");
    });
  }

  function compress(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onerror = reject;
      reader.onload = function () {
        var image = new Image();
        image.onerror = reject;
        image.onload = function () {
          var edge = 1400;
          var scale = Math.min(1, edge / Math.max(image.naturalWidth, image.naturalHeight));
          var width = Math.max(1, Math.round(image.naturalWidth * scale));
          var height = Math.max(1, Math.round(image.naturalHeight * scale));
          var canvas = document.createElement("canvas");
          var ctx = canvas.getContext("2d");
          canvas.width = width;
          canvas.height = height;
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(image, 0, 0, width, height);
          resolve({ src: canvas.toDataURL("image/jpeg", 0.82), alt: file.name.replace(/\.[^.]+$/, "") });
        };
        image.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function bind() {
    if (bound) return;
    bound = true;

    root.addEventListener("submit", function (event) {
      var form = event.target.closest("[data-admin-login]");
      if (!form) return;
      event.preventDefault();
      hash(form.password.value).then(function (value) {
        if (value === site.config.defaultPasswordHash) {
          errorText = "";
          site.setUnlocked(true);
        } else {
          errorText = "密码错误，请重试。";
        }
        render();
      });
    });

    root.addEventListener("input", function (event) {
      var path = event.target && event.target.getAttribute("data-bind");
      if (!path) return;
      util.setByPath(site.state, path, event.target.value);
      site.scheduleRender();
    });

    root.addEventListener("change", function (event) {
      var path = event.target && event.target.getAttribute("data-upload-path");
      if (!path) return;
      var input = event.target;
      var files = Array.prototype.slice.call(input.files || []).filter(function (file) { return /^image\//i.test(file.type); });
      if (!files.length) return;
      input.disabled = true;
      Promise.all(files.map(compress)).then(function (items) {
        var list = util.ensureList(site.state, path);
        items.forEach(function (item) { list.push(item); });
        if (!site.persist()) window.alert("当前浏览器本地存储空间不足，无法继续保存。");
        render();
      }).catch(function () {
        window.alert("图片处理失败，请重试。");
      }).finally(function () {
        input.disabled = false;
        input.value = "";
      });
    });

    root.addEventListener("click", function (event) {
      var action = event.target.closest("[data-admin-action]");
      if (action) {
        var type = action.getAttribute("data-admin-action");
        if (type === "logout") {
          site.setUnlocked(false);
          errorText = "";
          render();
        } else if (type === "reset" && window.confirm("确定恢复为站点默认内容吗？当前浏览器中的本地修改会被清空。")) {
          setDefaultState();
          render();
        }
        return;
      }

      var add = event.target.closest("[data-add-item]");
      if (add) {
        util.ensureList(site.state, add.getAttribute("data-add-item")).push(util.template(add.getAttribute("data-template") || "text"));
        if (!site.persist()) window.alert("当前浏览器本地存储空间不足，无法继续保存。");
        render();
        return;
      }

      var del = event.target.closest("[data-delete-item]");
      if (del) {
        util.ensureList(site.state, del.getAttribute("data-delete-item")).splice(Number(del.getAttribute("data-index")), 1);
        if (!site.persist()) window.alert("当前浏览器本地存储空间不足，无法继续保存。");
        render();
      }
    });
  }

  bind();
  render();
})();
