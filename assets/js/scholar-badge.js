/* Sidebar citation badge — refreshed from published Google Scholar snapshots.
   Snapshots are produced by the scheduled GitHub Action and fetched via CDN,
   never scraped from the visitor's browser. */
(async function updateCitationBadge() {
  const total = document.getElementById('citation-total');
  /* 数字已并入 Google Scholar 链接行（span.link-stat），链接本身即徽章 */
  const badge = total && total.closest('a');
  if (!badge || !total) return;
  const base = 'https://cdn.jsdelivr.net/gh/wenjing-gg/wenjing-gg.github.io@google-scholar-stats/';
  const validate = data => data && data.scholar_id === 'xeFx7LQAAAAJ' &&
    Number.isSafeInteger(data.citedby) && data.citedby >= 0 && Number.isFinite(Date.parse(data.updated));
  function apply(data) {
    total.textContent = String(data.citedby);
    badge.title = `${data.citedby} total citations (Google Scholar)`;
  }
  // 1) Seed snapshot shipped with the site.
  let seedTime = 0;
  try {
    const local = await fetch('/data/scholar.json', { cache: 'no-cache' }).then(r => r.json());
    if (validate(local)) { apply(local); seedTime = Date.parse(local.updated); }
  } catch (_) { /* Keep the built-in placeholder. */ }
  // 2) Cached value from the newest completed snapshot.
  try {
    const saved = JSON.parse(localStorage.getItem('wenjing-scholar') || 'null');
    if (saved && validate(saved) && Date.parse(saved.updated) >= seedTime) apply(saved);
  } catch (_) { /* ignore */ }
  // 3) Live snapshot produced by the scheduled GitHub Action.
  if (['127.0.0.1', 'localhost'].includes(location.hostname) || location.protocol === 'file:') return;
  try {
    const response = await fetch(base + 'gs_data.json', { signal: AbortSignal.timeout(6000) });
    if (!response.ok) return;
    const data = await response.json();
    if (!validate(data)) return;
    apply(data);
    try { localStorage.setItem('wenjing-scholar', JSON.stringify(data)); } catch (_) {}
  } catch (_) { /* Keep the last verified value if the CDN is unavailable. */ }
})();
