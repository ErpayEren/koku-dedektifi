(function initBootstrapGuard(global) {
const BUILD_QUERY = '?v=20260329r12';
  const REQUIRED = [
    { fn: 'renderShelf', src: `/lib/app/wardrobe.js${BUILD_QUERY}` },
    { fn: 'toggleAuthPanel', src: `/lib/app/auth.js${BUILD_QUERY}` },
    { fn: 'renderFeed', src: `/lib/app/labs-core.js${BUILD_QUERY}` },
  ];

  const loaded = new Set();

  function loadScript(src) {
    if (!src || loaded.has(src) || document.querySelector(`script[data-guard-src="${src}"]`)) return;
    loaded.add(src);
    const script = document.createElement('script');
    script.src = src;
    script.defer = true;
    script.dataset.guardSrc = src;
    document.head.appendChild(script);
  }

  function runGuard() {
    REQUIRED.forEach((entry) => {
      if (typeof global[entry.fn] !== 'function') {
        loadScript(entry.src);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runGuard, { once: true });
  } else {
    runGuard();
  }
})(window);
