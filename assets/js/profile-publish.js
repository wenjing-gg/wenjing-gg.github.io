(function () {
  var site = window.ProfileSite;
  if (!site) return;

  var config = site.config.github || {};
  var tokenKey = site.config.tokenSessionKey || "profileGithubToken.v1";
  var util = site.util;

  function getSession(key) {
    try {
      return window.sessionStorage.getItem(key) || "";
    } catch (error) {
      return "";
    }
  }

  function setSession(key, value) {
    try {
      if (value) window.sessionStorage.setItem(key, value);
      else window.sessionStorage.removeItem(key);
    } catch (error) {}
  }

  function isDataUrl(value) {
    return /^data:/i.test(util.trim(value));
  }

  function stripLeadingSlash(value) {
    return util.text(value).replace(/^\/+/, "");
  }

  function nowStamp() {
    var date = new Date();
    var pad = function (num) {
      return String(num).padStart(2, "0");
    };
    return [
      date.getFullYear(),
      pad(date.getMonth() + 1),
      pad(date.getDate()),
      "-",
      pad(date.getHours()),
      pad(date.getMinutes()),
      pad(date.getSeconds())
    ].join("");
  }

  function toBase64Utf8(value) {
    var bytes = new TextEncoder().encode(util.text(value));
    var chunk = 0x8000;
    var index = 0;
    var binary = "";

    while (index < bytes.length) {
      binary += String.fromCharCode.apply(null, bytes.subarray(index, index + chunk));
      index += chunk;
    }

    return window.btoa(binary);
  }

  function dataUrlToBase64(dataUrl) {
    var match = util.text(dataUrl).match(/^data:([^;,]+)?(?:;charset=[^;,]+)?;base64,(.+)$/i);
    if (match) {
      return {
        contentType: match[1] || "image/jpeg",
        base64: match[2]
      };
    }

    throw new Error("不支持的图片数据格式。");
  }

  function assetPath(sectionDir, index) {
    var stamp = nowStamp();
    return sectionDir.replace(/\/+$/, "") + "/" + stamp + "-" + String(index + 1).padStart(2, "0") + ".jpg";
  }

  function preparePublishState() {
    var next = util.normalize(util.clone(site.state));
    var uploads = [];

    [
      { path: "hobbies.images", dir: config.hobbyDir || "images/admin-hobbies" },
      { path: "love.images", dir: config.loveDir || "love/admin" }
    ].forEach(function (group) {
      var list = util.ensureList(next, group.path);
      list.forEach(function (item, index) {
        if (isDataUrl(item.src)) {
          var filePath = assetPath(group.dir, index);
          var imageData = dataUrlToBase64(item.src);
          uploads.push({
            path: filePath,
            base64: imageData.base64
          });
          item.repoPath = filePath;
          item.src = "/" + filePath;
        } else if (util.trim(item.repoPath)) {
          item.src = "/" + stripLeadingSlash(item.repoPath);
        } else if (/^\//.test(util.trim(item.src))) {
          item.repoPath = stripLeadingSlash(item.src);
        }

        delete item.uploadName;
      });
    });

    return {
      data: next,
      uploads: uploads
    };
  }

  function api(path, options, token) {
    return window.fetch("https://api.github.com" + path, Object.assign(
      {
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: "Bearer " + token,
          "X-GitHub-Api-Version": "2022-11-28"
        }
      },
      options || {}
    )).then(function (response) {
      return response.text().then(function (text) {
        var payload = {};
        try {
          payload = text ? JSON.parse(text) : {};
        } catch (error) {
          payload = { message: text };
        }

        if (!response.ok) {
          var reason = payload && payload.message ? payload.message : "GitHub API 请求失败";
          throw new Error(reason);
        }

        return payload;
      });
    });
  }

  function createBlob(owner, repo, token, base64) {
    return api("/repos/" + owner + "/" + repo + "/git/blobs", {
      method: "POST",
      body: JSON.stringify({
        content: base64,
        encoding: "base64"
      })
    }, token).then(function (result) {
      return result.sha;
    });
  }

  async function publishToGithub(options) {
    var token = util.trim(options && options.token);
    var message = util.trim(options && options.message) || "chore: update profile content";
    var owner = util.trim(config.owner);
    var repo = util.trim(config.repo);
    var branch = util.trim(config.branch) || "master";

    if (!token) {
      throw new Error("请先输入 GitHub Token。");
    }

    var prepared = preparePublishState();
    var ref = await api("/repos/" + owner + "/" + repo + "/git/ref/heads/" + encodeURIComponent(branch), { method: "GET" }, token);
    var parentSha = ref.object.sha;
    var commit = await api("/repos/" + owner + "/" + repo + "/git/commits/" + parentSha, { method: "GET" }, token);
    var baseTreeSha = commit.tree.sha;

    var treeEntries = [];
    for (var index = 0; index < prepared.uploads.length; index += 1) {
      var upload = prepared.uploads[index];
      var uploadBlobSha = await createBlob(owner, repo, token, upload.base64);
      treeEntries.push({
        path: upload.path,
        mode: "100644",
        type: "blob",
        sha: uploadBlobSha
      });
    }

    var dataBlobSha = await createBlob(owner, repo, token, toBase64Utf8(JSON.stringify(prepared.data, null, 2) + "\n"));
    treeEntries.push({
      path: config.dataPath || "_data/profile_content.json",
      mode: "100644",
      type: "blob",
      sha: dataBlobSha
    });

    var tree = await api("/repos/" + owner + "/" + repo + "/git/trees", {
      method: "POST",
      body: JSON.stringify({
        base_tree: baseTreeSha,
        tree: treeEntries
      })
    }, token);

    var newCommit = await api("/repos/" + owner + "/" + repo + "/git/commits", {
      method: "POST",
      body: JSON.stringify({
        message: message,
        tree: tree.sha,
        parents: [parentSha]
      })
    }, token);

    await api("/repos/" + owner + "/" + repo + "/git/refs/heads/" + encodeURIComponent(branch), {
      method: "PATCH",
      body: JSON.stringify({
        sha: newCommit.sha,
        force: false
      })
    }, token);

    site.state = util.normalize(prepared.data);
    site.persist();

    return {
      commitSha: newCommit.sha,
      commitUrl: "https://github.com/" + owner + "/" + repo + "/commit/" + newCommit.sha,
      branch: branch
    };
  }

  site.publish = {
    getToken: function () {
      return getSession(tokenKey);
    },
    setToken: function (value) {
      setSession(tokenKey, util.trim(value));
    },
    clearToken: function () {
      setSession(tokenKey, "");
    },
    publishToGithub: publishToGithub
  };
})();
