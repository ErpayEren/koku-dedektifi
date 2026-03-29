(function initKokuFragranceWheel(global) {
  function cleanString(value) {
    return typeof value === 'string' ? value.trim() : '';
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function esc(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function normalizeFamilies(resultLike) {
    const families = Array.isArray(resultLike?.noteOntology?.families)
      ? resultLike.noteOntology.families
      : [];
    const total = families.reduce((sum, item) => sum + Number(item?.count || 0), 0) || 1;

    const mapped = families
      .slice(0, 6)
      .map((item) => ({
        label: cleanString(item?.family) || 'Diger',
        value: clamp(Math.round((Number(item?.count || 0) / total) * 100), 0, 100),
      }));

    if (mapped.length >= 4) return mapped;

    const fallback = [
      { label: 'Tazelik', value: Number(resultLike?.scores?.freshness || 0) },
      { label: 'Tatlilik', value: Number(resultLike?.scores?.sweetness || 0) },
      { label: 'Sicaklik', value: Number(resultLike?.scores?.warmth || 0) },
      { label: cleanString(resultLike?.family) || 'Aile', value: Number(resultLike?.intensity || 0) },
    ];
    return fallback.map((item) => ({
      label: item.label,
      value: clamp(item.value, 0, 100),
    }));
  }

  function buildRadar(series, width, height) {
    const cx = width * 0.5;
    const cy = height * 0.52;
    const radius = Math.min(width, height) * 0.36;
    const count = series.length;

    function pointAt(index, factor) {
      const angle = ((Math.PI * 2) / count) * index - Math.PI / 2;
      return {
        x: cx + Math.cos(angle) * radius * factor,
        y: cy + Math.sin(angle) * radius * factor,
      };
    }

    function polygonPoints(factor) {
      return series
        .map((_, index) => {
          const p = pointAt(index, factor);
          return `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
        })
        .join(' ');
    }

    function valuePoints() {
      return series
        .map((item, index) => {
          const factor = clamp(Number(item?.value || 0), 0, 100) / 100;
          const p = pointAt(index, factor);
          return `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
        })
        .join(' ');
    }

    const axisLines = series
      .map((_, index) => {
        const p = pointAt(index, 1);
        return `<line class="wheel-axis" x1="${cx.toFixed(2)}" y1="${cy.toFixed(2)}" x2="${p.x.toFixed(2)}" y2="${p.y.toFixed(2)}"></line>`;
      })
      .join('');

    const labels = series
      .map((item, index) => {
        const p = pointAt(index, 1.14);
        const textAnchor = Math.abs(p.x - cx) < 8 ? 'middle' : (p.x < cx ? 'end' : 'start');
        return `<text class="wheel-label" x="${p.x.toFixed(2)}" y="${p.y.toFixed(2)}" text-anchor="${textAnchor}" dominant-baseline="middle">${esc(String(item?.label || '').slice(0, 18))}</text>`;
      })
      .join('');

    const nodes = series
      .map((item, index) => {
        const factor = clamp(Number(item?.value || 0), 0, 100) / 100;
        const p = pointAt(index, factor);
        return `<circle class="wheel-node" cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" r="2.8"></circle>`;
      })
      .join('');

    return {
      rings: [0.25, 0.5, 0.75, 1].map((factor) => `<polygon class="wheel-ring" points="${polygonPoints(factor)}"></polygon>`).join(''),
      axisLines,
      area: `<polygon class="wheel-area" points="${valuePoints()}"></polygon>`,
      outline: `<polygon class="wheel-outline" points="${valuePoints()}"></polygon>`,
      labels,
      nodes,
    };
  }

  function render(target, resultLike) {
    const host = typeof target === 'string' ? document.getElementById(target) : target;
    if (!host) return;

    const series = normalizeFamilies(resultLike);
    if (!Array.isArray(series) || series.length < 3) {
      host.innerHTML = '';
      return;
    }

    const width = Math.max(320, Math.round(host.clientWidth || 340));
    const height = 248;
    const radar = buildRadar(series, width, height);

    host.innerHTML = `
      <svg class="fragrance-wheel-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Koku carki" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="wheelAreaGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="rgba(111,179,160,0.44)"></stop>
            <stop offset="50%" stop-color="rgba(200,169,126,0.36)"></stop>
            <stop offset="100%" stop-color="rgba(155,111,160,0.42)"></stop>
          </linearGradient>
        </defs>
        ${radar.rings}
        ${radar.axisLines}
        ${radar.area}
        ${radar.outline}
        ${radar.nodes}
        ${radar.labels}
      </svg>
    `;
  }

  global.KokuFragranceWheel = { render };
})(window);
