(function () {
  var site = window.ProfileSite;
  var root = document.getElementById("profile-admin-app");
  if (!site || !root) return;

  var util = site.util;
  var bound = false;
  var errorText = "";
  var publishError = "";
  var publishMessage = "";
  var publishBusy = false;
  var publishToken = site.publish ? site.publish.getToken() : "";
  var rememberToken = true;
  var commitMessage = "chore: update profile content";
  var modalState = null;

  function field(label, path, value, placeholder, type) {
    return '<label class="admin-field"><span>' + util.escapeHtml(label) + '</span><input class="admin-input" type="' + util.escapeHtml(type || "text") + '" data-bind="' + util.escapeHtml(path) + '" value="' + util.escapeHtml(util.text(value)) + '" placeholder="' + util.escapeHtml(placeholder || "") + '"></label>';
  }

  function area(label, path, value, placeholder) {
    return '<label class="admin-field"><span>' + util.escapeHtml(label) + '</span><textarea class="admin-textarea" rows="4" data-bind="' + util.escapeHtml(path) + '" placeholder="' + util.escapeHtml(placeholder || "") + '">' + util.escapeHtml(util.text(value)) + "</textarea></label>";
  }

  function metaField(label, fieldName, value, placeholder, type) {
    return '<label class="admin-field"><span>' + util.escapeHtml(label) + '</span><input class="admin-input" type="' + util.escapeHtml(type || "text") + '" data-publish-field="' + util.escapeHtml(fieldName) + '" value="' + util.escapeHtml(util.text(value)) + '" placeholder="' + util.escapeHtml(placeholder || "") + '"' + (publishBusy ? " disabled" : "") + "></label>";
  }

  function cards(path, items, label, placeholder) {
    if (!Array.isArray(items) || !items.length) return '<p class="admin-empty-note">当前暂无内容。</p>';
    return '<div class="admin-card-list">' + items.map(function (item, index) {
      return '<article class="admin-editor-card admin-editor-card--compact"><div class="admin-editor-card__top"><strong>' + util.escapeHtml(label) + " " + (index + 1) + '</strong><button class="admin-button admin-button--danger" type="button" data-delete-item="' + util.escapeHtml(path) + '" data-index="' + index + '">删除</button></div><label class="admin-field"><span>内容</span><input class="admin-input" type="text" data-bind="' + util.escapeHtml(path + "." + index) + '" value="' + util.escapeHtml(item) + '" placeholder="' + util.escapeHtml(placeholder) + '"></label></article>';
    }).join("") + "</div>";
  }

  function papers(path, items, title) {
    return '<section class="admin-subsection"><div class="admin-subsection__header"><h4>' + util.escapeHtml(title) + '</h4><button class="admin-button" type="button" data-open-modal="paper" data-modal-path="' + util.escapeHtml(path) + '" data-modal-title="' + util.escapeHtml(title) + '">新增论文</button></div>' + ((items || []).length ? '<div class="admin-card-list">' + items.map(function (item, index) {
      return '<article class="admin-editor-card"><div class="admin-editor-card__top"><strong>论文 ' + (index + 1) + '</strong><button class="admin-button admin-button--danger" type="button" data-delete-item="' + util.escapeHtml(path) + '" data-index="' + index + '">删除</button></div><div class="admin-form-grid admin-form-grid--single">' + field("备注", path + "." + index + ".note", item.note, "例如：学生一作 · MICCAI 2025 Early Accept") + area("题目", path + "." + index + ".title", item.title, "请输入论文题目") + area("Authors", path + "." + index + ".authors", item.authors, "请输入完整作者信息") + field("链接文字", path + "." + index + ".linkText", item.linkText, "例如：DOI: ... / arXiv: ...") + field("链接地址", path + "." + index + ".linkUrl", item.linkUrl, "https://...") + "</div></article>";
    }).join("") + "</div>" : '<p class="admin-empty-note">当前分类暂无论文。</p>') + "</section>";
  }

  function patents(path, items) {
    return '<div class="admin-block"><div class="admin-block__header"><h3>专利</h3><button class="admin-button" type="button" data-open-modal="patent" data-modal-path="' + util.escapeHtml(path) + '" data-modal-title="专利">新增专利</button></div>' + ((items || []).length ? '<div class="admin-card-list">' + items.map(function (item, index) {
      return '<article class="admin-editor-card"><div class="admin-editor-card__top"><strong>专利 ' + (index + 1) + '</strong><button class="admin-button admin-button--danger" type="button" data-delete-item="' + util.escapeHtml(path) + '" data-index="' + index + '">删除</button></div><div class="admin-form-grid admin-form-grid--single">' + area("专利名称", path + "." + index + ".title", item.title, "请输入专利名称") + field("备注", path + "." + index + ".note", item.note, "例如：第一发明人") + "</div></article>";
    }).join("") + "</div>" : '<p class="admin-empty-note">当前暂无专利。</p>') + "</div>";
  }

  function images(title, path, items) {
    return '<div class="admin-block"><div class="admin-block__header"><h3>' + util.escapeHtml(title) + '</h3><label class="admin-upload-trigger">上传图片<input type="file" accept="image/*" multiple data-upload-path="' + util.escapeHtml(path) + '"></label></div>' + ((items || []).length ? '<div class="admin-image-grid">' + items.map(function (item, index) {
      return '<article class="admin-image-card"><img src="' + util.escapeHtml(item.src) + '" alt="' + util.escapeHtml(util.trim(item.alt) || ("图片 " + (index + 1))) + '"><label class="admin-field"><span>图片说明</span><input class="admin-input" type="text" data-bind="' + util.escapeHtml(path + "." + index + ".alt") + '" value="' + util.escapeHtml(item.alt) + '" placeholder="请输入图片说明"></label><p class="admin-image-card__meta">' + util.escapeHtml(/^data:/i.test(util.trim(item.src)) ? "待发布到 GitHub" : "已引用仓库图片") + '</p><button class="admin-button admin-button--danger" type="button" data-delete-item="' + util.escapeHtml(path) + '" data-index="' + index + '">删除图片</button></article>';
    }).join("") + "</div>" : '<p class="admin-empty-note">当前暂无图片。</p>') + "</div>";
  }

  function publishPanel() {
    return [
      '<section class="admin-section">',
      '<div class="admin-section__header"><h2>发布到 GitHub</h2></div>',
      '<div class="admin-block admin-block--publish">',
      '<div class="admin-publish-meta"><span class="admin-publish-pill">仓库：' + util.escapeHtml((site.config.github && site.config.github.owner) || "") + "/" + util.escapeHtml((site.config.github && site.config.github.repo) || "") + '</span><span class="admin-publish-pill">分支：' + util.escapeHtml((site.config.github && site.config.github.branch) || "master") + "</span></div>",
      '<div class="admin-form-grid">',
      metaField("GitHub Token", "token", publishToken, "请输入你自己的 GitHub Token", "password"),
      metaField("提交说明", "commitMessage", commitMessage, "例如：chore: update homepage content"),
      "</div>",
      '<label class="admin-check"><input type="checkbox" data-publish-field="rememberToken"' + (rememberToken ? " checked" : "") + (publishBusy ? " disabled" : "") + '>默认记住 Token（仅保存在当前浏览器）</label>',
      '<div class="admin-publish-actions"><button class="admin-button" type="button" data-admin-action="publish"' + (publishBusy ? " disabled" : "") + ">" + (publishBusy ? "发布中..." : "提交到 GitHub 并发布") + '</button><button class="admin-button admin-button--ghost" type="button" data-admin-action="clear-token"' + (publishBusy ? " disabled" : "") + '>清除 Token</button></div>',
      '<p class="admin-tip">不会把 Token 写进公开网页或仓库，只保存在你当前浏览器本地。</p>',
      publishMessage ? '<p class="admin-success">' + util.escapeHtml(publishMessage) + "</p>" : "",
      publishError ? '<p class="admin-error">' + util.escapeHtml(publishError) + "</p>" : "",
      "</div>",
      "</section>"
    ].join("");
  }

  function introSection(data) {
    return [
      '<section class="admin-section">',
      '<div class="admin-section__header"><h2>个人介绍</h2></div>',
      '<div class="admin-block">',
      '<div class="admin-intro-grid">',
      '<div class="admin-intro-grid__wide">' + area("主要介绍", "intro.lead", data.intro.lead, "请输入个人介绍主文案") + "</div>",
      field("导师名称", "intro.mentorName", data.intro.mentorName, "例如：秦飞巍教授"),
      field("导师主页", "intro.mentorUrl", data.intro.mentorUrl, "https://..."),
      field("联系电话", "intro.phone", data.intro.phone, "请输入联系电话"),
      '<div class="admin-intro-grid__wide">' + area("研究概述", "intro.mentorSummary", data.intro.mentorSummary, "请输入导师或研究方向介绍") + "</div>",
      "</div>",
      '<div class="admin-section__inline-head admin-section__inline-head--tight"><h3>邮箱</h3><button class="admin-button" type="button" data-add-item="intro.emails" data-template="text">新增邮箱</button></div>',
      cards("intro.emails", data.intro.emails, "邮箱", "请输入邮箱地址"),
      "</div>",
      "</section>"
    ].join("");
  }

  function modalTemplate(kind) {
    if (kind === "patent") return { title: "", note: "" };
    return { note: "", title: "", authors: "", linkText: "", linkUrl: "" };
  }

  function openModal(kind, path, title) {
    modalState = {
      kind: kind,
      path: path,
      title: title || "",
      error: "",
      form: modalTemplate(kind)
    };
    render();
  }

  function modalField(label, key, value, placeholder, multiline) {
    return multiline
      ? '<label class="admin-field"><span>' + util.escapeHtml(label) + '</span><textarea class="admin-textarea" rows="4" data-modal-field="' + util.escapeHtml(key) + '" placeholder="' + util.escapeHtml(placeholder || "") + '">' + util.escapeHtml(util.text(value)) + "</textarea></label>"
      : '<label class="admin-field"><span>' + util.escapeHtml(label) + '</span><input class="admin-input" type="text" data-modal-field="' + util.escapeHtml(key) + '" value="' + util.escapeHtml(util.text(value)) + '" placeholder="' + util.escapeHtml(placeholder || "") + '"></label>';
  }

  function modalHtml() {
    if (!modalState) return "";
    var content = modalState.kind === "patent"
      ? modalField("专利名称", "title", modalState.form.title, "请输入专利名称", true) + modalField("备注", "note", modalState.form.note, "例如：第一发明人", false)
      : modalField("备注", "note", modalState.form.note, "例如：学生一作 · MICCAI 2025 Early Accept", false) + modalField("题目", "title", modalState.form.title, "请输入论文题目", true) + modalField("Authors", "authors", modalState.form.authors, "请输入完整作者信息", true) + modalField("链接文字", "linkText", modalState.form.linkText, "例如：DOI: ... / arXiv: ...", false) + modalField("链接地址", "linkUrl", modalState.form.linkUrl, "https://...", false);
    return '<div class="admin-modal" role="dialog" aria-modal="true"><div class="admin-modal__backdrop" data-admin-action="close-modal"></div><div class="admin-modal__dialog"><div class="admin-modal__header"><h3>新增' + util.escapeHtml(modalState.kind === "patent" ? "专利" : ("论文 · " + modalState.title)) + '</h3><button class="admin-button admin-button--ghost" type="button" data-admin-action="close-modal">关闭</button></div><div class="admin-form-grid admin-form-grid--single">' + content + '</div>' + (modalState.error ? '<p class="admin-error">' + util.escapeHtml(modalState.error) + "</p>" : "") + '<div class="admin-modal__actions"><button class="admin-button admin-button--ghost" type="button" data-admin-action="close-modal">取消</button><button class="admin-button" type="button" data-admin-action="confirm-modal">确认新增</button></div></div></div>';
  }

  function loginHtml() {
    return '<section class="admin-login"><div class="admin-login__card"><h1>管理员修改页面</h1><p class="admin-login__note">输入管理员密码后，可视化修改个人介绍、研究方向、成果、项目与荣誉、爱好图片及恋爱小窗图片。</p><p class="admin-login__tip">页面不再显示主页预览，专注于内容编辑和发布。</p><form class="admin-login__form" data-admin-login><label class="admin-field"><span>管理员密码</span><input class="admin-input" type="password" name="password" autocomplete="current-password" placeholder="请输入密码"></label>' + (errorText ? '<p class="admin-error">' + util.escapeHtml(errorText) + "</p>" : "") + '<div class="admin-login__actions"><button class="admin-button" type="submit">进入管理页</button><a class="admin-button admin-button--ghost" href="' + util.escapeHtml(site.config.homePath) + '">返回主页</a></div></form></div></section>';
  }

  function shellHtml(data) {
    return [
      '<div class="admin-shell admin-shell--single">',
      '<section class="admin-shell__panel">',
      '<div class="admin-hero"><div><h1>管理员修改页面</h1><p>单栏编辑，不显示主页预览；新增论文和专利使用弹窗填写并确认。</p></div><div class="admin-hero__actions"><button class="admin-button admin-button--ghost" type="button" data-admin-action="reset">恢复站点默认</button><button class="admin-button admin-button--ghost" type="button" data-admin-action="logout">退出管理员</button></div></div>',
      '<p class="admin-tip">图片上传后会自动压缩。未发布前只保存在当前浏览器；发布后会写入仓库并触发 GitHub Pages 自动部署。</p>',
      publishPanel(),
      introSection(data),
      '<section class="admin-section"><div class="admin-section__header"><h2>研究方向</h2><button class="admin-button" type="button" data-add-item="research" data-template="text">新增方向</button></div>' + cards("research", data.research, "方向", "请输入研究方向") + "</section>",
      '<section class="admin-section"><div class="admin-section__header"><h2>成果</h2></div><div class="admin-composition admin-composition--single"><section class="admin-block admin-block--paper"><div class="admin-block__header"><h3>论文</h3></div>' + papers("achievements.papers.published", data.achievements.papers.published, "Published") + papers("achievements.papers.review", data.achievements.papers.review, "Under Review") + "</section>" + patents("achievements.patents", data.achievements.patents) + "</div></section>",
      '<section class="admin-section"><div class="admin-section__header"><h2>项目与荣誉</h2><button class="admin-button" type="button" data-add-item="honors" data-template="text">新增条目</button></div>' + cards("honors", data.honors, "条目", "请输入项目或荣誉内容") + "</section>",
      '<section class="admin-section"><div class="admin-section__header"><h2>爱好</h2></div><div class="admin-block"><div class="admin-block__header"><h3>文字条目</h3><button class="admin-button" type="button" data-add-item="hobbies.items" data-template="text">新增爱好</button></div>' + cards("hobbies.items", data.hobbies.items, "爱好", "请输入爱好内容") + "</div>" + images("爱好图片", "hobbies.images", data.hobbies.images) + "</section>",
      '<section class="admin-section"><div class="admin-section__header"><h2>恋爱小窗</h2></div><div class="admin-block"><div class="admin-form-grid">' + field("相恋起始日期", "love.startDate", data.love.startDate, "YYYY-MM-DD", "date") + "</div></div>" + images("恋爱照片", "love.images", data.love.images) + "</section>",
      "</section>",
      "</div>",
      modalHtml()
    ].join("");
  }

  function render() {
    root.innerHTML = site.isUnlocked() ? shellHtml(site.state) : loginHtml();
    site.setPreviewRoot(null);
  }

  function setDefaultState() {
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
          resolve({
            src: canvas.toDataURL("image/jpeg", 0.82),
            alt: file.name.replace(/\.[^.]+$/, ""),
            repoPath: "",
            uploadName: file.name
          });
        };
        image.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function updatePublishField(target) {
    var key = target.getAttribute("data-publish-field");
    if (!key) return;
    if (key === "token") {
      publishToken = target.value;
      if (rememberToken && site.publish) site.publish.setToken(publishToken);
    }
    if (key === "commitMessage") commitMessage = target.value;
    if (key === "rememberToken") {
      rememberToken = Boolean(target.checked);
      if (!rememberToken && site.publish) site.publish.clearToken();
      if (rememberToken && site.publish && publishToken) site.publish.setToken(publishToken);
    }
  }

  function closeModal() {
    modalState = null;
    render();
  }

  function confirmModal() {
    if (!modalState) return;
    if (!util.trim(modalState.form.title)) {
      modalState.error = modalState.kind === "patent" ? "请先填写专利名称。" : "请先填写论文题目。";
      render();
      return;
    }
    util.ensureList(site.state, modalState.path).push(util.clone(modalState.form));
    if (!site.persist()) window.alert("当前浏览器本地存储空间不足，无法继续保存。");
    modalState = null;
    render();
  }

  function handlePublish() {
    if (!site.publish) {
      publishError = "当前页面未加载发布模块。";
      render();
      return;
    }
    if (!window.confirm("确认将当前修改提交到 GitHub 并自动发布吗？")) return;
    publishBusy = true;
    publishError = "";
    publishMessage = "";
    render();
    site.publish.publishToGithub({
      token: publishToken,
      message: commitMessage
    }).then(function (result) {
      publishBusy = false;
      publishError = "";
      publishMessage = "已提交到 GitHub：" + result.commitSha.slice(0, 7) + "，GitHub Pages 将自动发布。";
      if (rememberToken) site.publish.setToken(publishToken);
      else site.publish.clearToken();
      render();
    }).catch(function (error) {
      publishBusy = false;
      publishError = error && error.message ? error.message : "发布失败。";
      render();
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
      var publishField = event.target && event.target.getAttribute("data-publish-field");
      if (publishField) {
        updatePublishField(event.target);
        return;
      }
      var modalFieldKey = event.target && event.target.getAttribute("data-modal-field");
      if (modalFieldKey && modalState) {
        modalState.form[modalFieldKey] = event.target.value;
        return;
      }
      var path = event.target && event.target.getAttribute("data-bind");
      if (!path) return;
      util.setByPath(site.state, path, event.target.value);
      site.scheduleRender();
    });

    root.addEventListener("change", function (event) {
      var publishField = event.target && event.target.getAttribute("data-publish-field");
      if (publishField) {
        updatePublishField(event.target);
        return;
      }
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
          publishError = "";
          publishMessage = "";
          render();
        } else if (type === "publish") {
          handlePublish();
        } else if (type === "clear-token" && site.publish) {
          publishToken = "";
          rememberToken = true;
          site.publish.clearToken();
          publishMessage = "";
          publishError = "";
          render();
        } else if (type === "close-modal") {
          closeModal();
        } else if (type === "confirm-modal") {
          confirmModal();
        }
        return;
      }

      var modalOpen = event.target.closest("[data-open-modal]");
      if (modalOpen) {
        openModal(modalOpen.getAttribute("data-open-modal"), modalOpen.getAttribute("data-modal-path"), modalOpen.getAttribute("data-modal-title"));
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

