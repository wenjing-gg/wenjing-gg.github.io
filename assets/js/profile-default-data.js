---
layout: null
---
(function () {
  window.__profileAdminConfig = {
    storageKey: "profileAdminContent.v1",
    sessionKey: "profileAdminUnlocked.v1",
    tokenSessionKey: "profileGithubToken.v1",
    defaultPasswordHash: "3d81eaac0a509eb11b4e7d9d68c2f1f995cc38acc245e89be945f431e6f0b08e",
    adminPath: {{ "/admin/" | relative_url | jsonify }},
    homePath: {{ "/" | relative_url | jsonify }},
    github: {
      owner: "wenjing-gg",
      repo: "wenjing-gg.github.io",
      branch: "master",
      dataPath: "_data/profile_content.json",
      hobbyDir: "images/admin-hobbies",
      loveDir: "love/admin"
    }
  };

  window.__profileDefaultData = {{ site.data.profile_content | jsonify }};
})();
