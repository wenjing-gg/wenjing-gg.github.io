/* Sidebar GitHub stars badge — total stargazers across the author's public
   repositories via the unauthenticated GitHub REST API (60 req/h per visitor
   IP is plenty). Cached in localStorage for 6 hours; the cached value also
   survives API hiccups and rate limits. */
(async function updateGithubStars() {
  const total = document.getElementById('github-stars');
  /* 星数已并入 GitHub 链接行，data-github-user 跟着链接走 */
  const link = total && total.closest('a');
  if (!total || !link) return;
  const user = link.dataset.githubUser;
  if (!user) return;

  const key = 'wenjing-github-stars';
  const ttl = 6 * 60 * 60 * 1000;
  const apply = n => {
    total.textContent = String(n);
    link.title = `${n} stars across public repositories (GitHub)`;
  };

  let cached = null;
  try { cached = JSON.parse(localStorage.getItem(key) || 'null'); } catch (_) { /* ignore */ }
  if (cached && Number.isSafeInteger(cached.stars) && cached.stars >= 0) apply(cached.stars);
  if (cached && cached.fetched && Date.now() - cached.fetched < ttl) return;

  try {
    const repos = [];
    for (let page = 1; page <= 3; page += 1) {
      const response = await fetch(`https://api.github.com/users/${user}/repos?per_page=100&page=${page}`, {
        headers: { Accept: 'application/vnd.github+json' },
        signal: AbortSignal.timeout(6000)
      });
      if (!response.ok) return; // rate-limited or gone — keep cached/ellipsis
      const chunk = await response.json();
      repos.push(...chunk);
      if (chunk.length < 100) break;
    }
    const stars = repos.reduce(
      (sum, repo) => sum + (repo && Number.isSafeInteger(repo.stargazers_count) ? repo.stargazers_count : 0),
      0
    );
    apply(stars);
    try { localStorage.setItem(key, JSON.stringify({ stars, fetched: Date.now() })); } catch (_) { /* ignore */ }
  } catch (_) { /* keep the last verified value */ }
})();
