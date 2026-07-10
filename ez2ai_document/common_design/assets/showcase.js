// 쇼케이스 페이지 공통 스크립트 — 테마 토글 + URL ?theme= 동기화
(function () {
  const root = document.documentElement;
  const STORAGE_KEY = 'ez2ai-design-theme';

  function applyTheme(t) {
    if (t === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    try { localStorage.setItem(STORAGE_KEY, t); } catch (_) {}
    const btn = document.querySelector('[data-theme-toggle]');
    if (btn) btn.textContent = t === 'dark' ? '☼ Light' : '☽ Dark';
  }

  function initialTheme() {
    const fromUrl = new URLSearchParams(location.search).get('theme');
    if (fromUrl === 'dark' || fromUrl === 'light') return fromUrl;
    try { return localStorage.getItem(STORAGE_KEY) || 'light'; }
    catch (_) { return 'light'; }
  }

  document.addEventListener('DOMContentLoaded', function () {
    applyTheme(initialTheme());
    const btn = document.querySelector('[data-theme-toggle]');
    if (btn) {
      btn.addEventListener('click', function () {
        const next = root.classList.contains('dark') ? 'light' : 'dark';
        applyTheme(next);
        // 부모 index.html 이 있으면 알려준다 (iframe 안일 때).
        try { parent.postMessage({ type: 'design-theme', value: next }, '*'); } catch (_) {}
      });
    }

    // 부모에서 테마 변경 메시지 → 적용
    window.addEventListener('message', function (e) {
      if (e.data && e.data.type === 'design-theme') applyTheme(e.data.value);
    });
  });
})();
