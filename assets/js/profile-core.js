(function () {
  var defaults = window.__profileDefaultData;
  if (!defaults) return;

  var config = Object.assign(
    {
      storageKey: "profileAdminContent.v1",
      sessionKey: "profileAdminUnlocked.v1",
      defaultPasswordHash: "",
      adminPath: "/admin/",
      homePath: "/"
    },
    window.__profileAdminConfig || {}
  );

  function isObj(v) {
    return Object.prototype.toString.call(v) === "[object Object]";
  }

  function clone(v) {
    if (Array.isArray(v)) return v.map(clone);
    if (isObj(v)) {
      var o = {};
      Object.keys(v).forEach(function (k) {
        o[k] = clone(v[k]);
      });
      return o;
    }
    return v;
  }

  function merge(base, over) {
    if (base === undefined) return clone(over);
    if (Array.isArray(base)) return Array.isArray(over) ? over.map(clone) : clone(base);
    if (isObj(base)) {
      var out = {};
      var keys = Object.keys(base);
      if (isObj(over)) {
        Object.keys(over).forEach(function (k) {
          if (keys.indexOf(k) === -1) keys.push(k);
        });
      }
      keys.forEach(function (k) {
        out[k] = merge(base[k], isObj(over) ? over[k] : undefined);
      });
      return out;
    }
    return over === undefined ? base : over;
  }

  function text(v) {
    return typeof v === "string" ? v : v == null ? "" : String(v);
  }

  function trim(v) {
    return text(v).trim();
  }

  function arr(v) {
    return Array.isArray(v) ? v.map(text) : [];
  }

  function paperArr(v) {
    return Array.isArray(v)
      ? v.map(function (item) {
          return {
            note: text(item && item.note),
            title: text(item && item.title),
            authors: text(item && item.authors),
            linkText: text(item && item.linkText),
            linkUrl: text(item && item.linkUrl)
          };
        })
      : [];
  }

  function patentArr(v) {
    return Array.isArray(v)
      ? v.map(function (item) {
          return { title: text(item && item.title), note: text(item && item.note) };
        })
      : [];
  }

  function imageArr(v) {
    return Array.isArray(v)
      ? v
          .map(function (item) {
            return { src: text(item && item.src), alt: text(item && item.alt) };
          })
          .filter(function (item) {
            return trim(item.src);
          })
      : [];
  }

  function dateStr(v, fallback) {
    var t = trim(v);
    return /^\d{4}-\d{2}-\d{2}$/.test(t) ? t : fallback;
  }

  function normalize(source) {
    var merged = merge(defaults, source || {});
    return {
      meta: {
        selfAuthorName: trim(merged.meta && merged.meta.selfAuthorName) || trim(defaults.meta && defaults.meta.selfAuthorName)
      },
      intro: {
        lead: text(merged.intro && merged.intro.lead),
        mentorName: text(merged.intro && merged.intro.mentorName),
        mentorUrl: text(merged.intro && merged.intro.mentorUrl),
        mentorSummary: text(merged.intro && merged.intro.mentorSummary),
        phone: text(merged.intro && merged.intro.phone),
        emails: arr(merged.intro && merged.intro.emails)
      },
      research: arr(merged.research),
      achievements: {
        papers: {
          published: paperArr(merged.achievements && merged.achievements.papers && merged.achievements.papers.published),
          review: paperArr(merged.achievements && merged.achievements.papers && merged.achievements.papers.review)
        },
        patents: patentArr(merged.achievements && merged.achievements.patents)
      },
      honors: arr(merged.honors),
      hobbies: {
        items: arr(merged.hobbies && merged.hobbies.items),
        images: imageArr(merged.hobbies && merged.hobbies.images)
      },
      love: {
        startDate: dateStr(merged.love && merged.love.startDate, defaults.love && defaults.love.startDate ? defaults.love.startDate : "2024-12-24"),
        images: imageArr(merged.love && merged.love.images)
      }
    };
  }

  function getStore(store, key) {
    try {
      return store.getItem(key);
    } catch (e) {
      return null;
    }
  }

  function setStore(store, key, value) {
    try {
      store.setItem(key, value);
      return true;
    } catch (e) {
      return false;
    }
  }

  function removeStore(store, key) {
    try {
      store.removeItem(key);
    } catch (e) {}
  }

  function escapeHtml(v) {
    return text(v)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escRe(v) {
    return text(v).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function cleanUrl(v) {
    var t = trim(v);
    return /^(https?:|mailto:|\/|#|\.\/|\.\.\/)/i.test(t) ? t : "";
  }

  function cnDate(v) {
    var parts = dateStr(v, "2024-12-24").split("-");
    return parts[0] + "年" + Number(parts[1]) + "月" + Number(parts[2]) + "日";
  }

  function hiAuthor(value, selfName) {
    var raw = text(value);
    var name = trim(selfName);
    if (!name) return escapeHtml(raw);
    var result = [];
    var last = 0;
    var re = new RegExp(escRe(name), "gi");
    var match = re.exec(raw);
    while (match) {
      result.push(escapeHtml(raw.slice(last, match.index)));
      result.push('<span class="author-self">' + escapeHtml(match[0]) + "</span>");
      last = match.index + match[0].length;
      match = re.exec(raw);
    }
    result.push(escapeHtml(raw.slice(last)));
    return result.join("");
  }

  function getByPath(root, path) {
    return text(path).split(".").reduce(function (cur, key) {
      return cur == null || !key ? undefined : cur[key];
    }, root);
  }

  function setByPath(root, path, value) {
    var keys = text(path).split(".");
    var cur = root;
    for (var i = 0; i < keys.length - 1; i += 1) cur = cur[keys[i]];
    cur[keys[keys.length - 1]] = value;
  }

  function ensureList(root, path) {
    var list = getByPath(root, path);
    if (!Array.isArray(list)) {
      setByPath(root, path, []);
      list = getByPath(root, path);
    }
    return list;
  }

  function template(kind) {
    if (kind === "paper") return { note: "", title: "", authors: "", linkText: "", linkUrl: "" };
    if (kind === "patent") return { title: "", note: "" };
    if (kind === "image") return { src: "", alt: "" };
    return "";
  }

  var api = window.ProfileSite || {};
  api.config = config;
  api.defaults = normalize(defaults);
  api.state = normalize((function () {
    var raw = getStore(window.localStorage, config.storageKey);
    if (!raw) return defaults;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return defaults;
    }
  })());
  api.persist = function () {
    return setStore(window.localStorage, config.storageKey, JSON.stringify(api.state));
  };
  api.reset = function () {
    api.state = normalize(defaults);
    removeStore(window.localStorage, config.storageKey);
    api.persist();
  };
  api.isUnlocked = function () {
    return getStore(window.sessionStorage, config.sessionKey) === "1";
  };
  api.setUnlocked = function (flag) {
    if (flag) setStore(window.sessionStorage, config.sessionKey, "1");
    else removeStore(window.sessionStorage, config.sessionKey);
  };
  api.util = {
    text: text,
    trim: trim,
    dateStr: dateStr,
    cnDate: cnDate,
    escapeHtml: escapeHtml,
    cleanUrl: cleanUrl,
    hiAuthor: hiAuthor,
    getByPath: getByPath,
    setByPath: setByPath,
    ensureList: ensureList,
    template: template,
    normalize: normalize
  };
  window.ProfileSite = api;
})();
