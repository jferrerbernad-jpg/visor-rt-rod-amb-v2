/* Banner panel loader + interactions */
(function () {
  let root = null;

  function createContainer() {
    const wrapper = document.getElementById('map-wrap') || document.body;
    const existing = document.getElementById('map-banner');
    if (existing) return existing;
    const container = document.createElement('div');
    container.id = 'map-banner';
    container.className = 'map-banner';
    wrapper.appendChild(container);
    return container;
  }

  function closeAllPanels() {
    root.querySelectorAll('.banner-panel').forEach(panel => panel.classList.remove('open'));
    root.querySelectorAll('.banner-btn').forEach(btn => btn.setAttribute('aria-expanded', 'false'));
  }

  function togglePanel(panelId, btnId) {
    const panel = root.querySelector(`#${panelId}`);
    const button = root.querySelector(`#${btnId}`);
    if (!panel || !button) return;
    const isOpen = panel.classList.contains('open');
    closeAllPanels();
    if (!isOpen) {
      panel.classList.add('open');
      button.setAttribute('aria-expanded', 'true');
    }
  }

  function setupControls() {
    root.querySelectorAll('.banner-btn').forEach(button => {
      button.addEventListener('click', event => {
        event.stopPropagation();
        const panelId = button.id.replace('banner-btn', 'banner-panel');
        togglePanel(panelId, button.id);
      });
    });

    document.addEventListener('click', event => {
      if (!root.contains(event.target)) {
        closeAllPanels();
      }
    });
  }

  function setupOptionListeners() {
    root.querySelectorAll('input[name="basemap-mode"]').forEach(radio => {
      radio.addEventListener('change', event => {
        if (typeof window.onBasemapModeChange === 'function') {
          window.onBasemapModeChange(event.target.value);
        }
      });
    });

    root.querySelectorAll('input[name="layer-mode"]').forEach(radio => {
      radio.addEventListener('change', event => {
        if (typeof window.onLayerModeChange === 'function') {
          window.onLayerModeChange(event.target.value);
        }
      });
    });
  }

  function updateLegend(effects) {
    if (!root) return;
    const items = root.querySelector('.legend-items');
    if (!items) return;
    items.innerHTML = '';

    if (!effects.length) {
      const row = document.createElement('div');
      row.className = 'legend-row legend-row-empty';
      row.textContent = 'Sense dades disponibles';
      items.appendChild(row);
      return;
    }

    effects.forEach(effect => {
      const color = typeof colorEfecto === 'function' ? colorEfecto(effect) : '#999';
      const label = typeof labelEfecto === 'function' ? labelEfecto(effect) : effect;
      const iconUrl = typeof getEffectIconUrl === 'function'
        ? getEffectIconUrl(effect)
        : null;
      const row = document.createElement('div');
      row.className = 'legend-row';
      row.innerHTML = `
        <span class="legend-icon">
          ${iconUrl ? `<img src="${iconUrl}" alt="${label}">` : `<span class="legend-dot" style="background:${color}"></span>`}
        </span>
        <span class="legend-label">${label}</span>
      `;
      items.appendChild(row);
    });
  }

  function updateLegendPuntsCritics() {
    if (!root) return;
    const items = root.querySelector('.legend-items');
    if (!items) return;
    items.innerHTML = '';

    const puntsCriticsLegend = [
      { categoria: 'Alt', color: '#ff0000', stroke: true },
      { categoria: 'Moderat', color: '#ffb455', stroke: false },
      { categoria: 'Baix', color: '#47c057', stroke: false },
      { categoria: 'No crític', color: '#ffffff', stroke: false }
    ];

    puntsCriticsLegend.forEach(pc => {
      const row = document.createElement('div');
      row.className = 'legend-row';
      const borderStyle = pc.stroke ? 'border: 2px solid #000000;' : '';
      row.innerHTML = `
        <span class="legend-icon">
          <span class="legend-dot" style="background:${pc.color};${borderStyle}"></span>
        </span>
        <span class="legend-label">${pc.categoria}</span>
      `;
      items.appendChild(row);
    });
  }

  function updateLegendTitle(title) {
    if (!root) return;
    const titleEl = root.querySelector('#banner-panel-legend .banner-panel-title');
    if (!titleEl) return;
    titleEl.textContent = title;
  }

  async function initBanner() {
    if (root) return root;
    root = createContainer();
    if (!root) return null;

    if (!root.innerHTML || !root.innerHTML.trim())
      console.warn('banner.js: `#map-banner` is empty — ensure banner markup exists in the HTML.');

    setupControls();
    setupOptionListeners();
    return root;
  }

  window.banner = {
    init: initBanner,
    updateLegend,
    updateLegendPuntsCritics,
    updateLegendTitle,
  };
})();