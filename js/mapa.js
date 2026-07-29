/* ============================================================
   BARRA LATERAL MÒBIL
   ============================================================ */
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');
const btnMenu = document.getElementById('btn-menu');

function abrirSidebar()  { sidebar.classList.add('open');    overlay.classList.add('active'); }
function cerrarSidebar() { sidebar.classList.remove('open'); overlay.classList.remove('active'); }
btnMenu.addEventListener('click', () =>
  sidebar.classList.contains('open') ? cerrarSidebar() : abrirSidebar()
);
overlay.addEventListener('click', cerrarSidebar);

/* ============================================================
   DRAWER DE LA LLISTA  →  delegat a drawer-alertes.js
   Aquí només guardem la referència al badge del botó d'obertura
   i exposem cerrarSidebar perquè drawer-alertes.js no hi té accés.
   ============================================================ */
const listaBadgeEl = document.getElementById('btn-lista-badge');

/* ============================================================
   CONSTANTS
   ============================================================ */
const API_BASE = "http://localhost:2000";

const CLUSTER_EFFECT_COLORS = Object.fromEntries(
  Object.entries(COLORS).map(([k, col]) => [
    EFFECT_LABELS.ca[k] || k,
    col
  ])
);

const ICON_BASE_PATH = '../icons';
const MAPA_ZONES_PATH = '../mapa_zones_ATM_dissolt.geojson';
const MAPA_ZONES_SOURCE = 'mapa-zones';
const MAPA_ZONES_FILL_LAYER = 'mapa-zones-fill';
const MAPA_ZONES_LAYER  = 'mapa-zones-outline';
const MAPA_ZONES_FILL_STYLE = {
  'fill-color': '#009989',
  'fill-opacity': 0.2,
  'fill-outline-color': '#009989'
};
const MAPA_ZONES_STYLE = {
  'line-color': '#009989',
  'line-width': 6,
  'line-opacity': 0.5,
  'line-join': 'round',
  'line-cap': 'round'
};
const EFFECT_ICON_MAP = {
  NO_SERVICE:         'no_service',
  REDUCED_SERVICE:    'reduced_service',
  SIGNIFICANT_DELAYS: 'significant_delays',
  DETOUR:             'detour',
  ADDITIONAL_SERVICE: 'additional_service',
  MODIFIED_SERVICE:   'modified_service',
  OTHER_EFFECT:       'other_effects',
  UNKNOWN_EFFECT:     'unknown_effect',
  STOP_MOVED:         'stop_moved',
  NO_EFFECT:          'no_effect',
};

function moveMapaZonesFillBelowAlerts() {
  if (!map) return;
  const beforeLayer = map.getLayer('clusters-bg') ? 'clusters-bg'
    : map.getLayer('pois-effect') ? 'pois-effect'
    : map.getLayer('pois-high') ? 'pois-high'
    : map.getLayer('pois-low') ? 'pois-low'
    : map.getLayer('punts-critics') ? 'punts-critics'
    : null;
  if (beforeLayer && map.getLayer(MAPA_ZONES_FILL_LAYER)) {
    map.moveLayer(MAPA_ZONES_FILL_LAYER, beforeLayer);
  }
}

function moveMapaZonesLineToTop() {
  if (!map) return;
  if (map.getLayer(MAPA_ZONES_LAYER)) {
    map.moveLayer(MAPA_ZONES_LAYER);
  }
}

function getEffectIconName(effect) {
  const iconKey = EFFECT_ICON_MAP[effect] || EFFECT_ICON_MAP.UNKNOWN_EFFECT;
  return `effect-${iconKey}`;
}

function getEffectIconUrl(effect) {
  const iconKey = EFFECT_ICON_MAP[effect] || EFFECT_ICON_MAP.UNKNOWN_EFFECT;
  return `${ICON_BASE_PATH}/${iconKey}.png`;
}

/* ============================================================
   PUNTS CRÍTICS — SIMBOLOGIA PER CATEGORIA
   ============================================================ */
const PUNTS_CRITICS_COLORS = {
  'Alt':       { color: '#ff0000', radius: 4.5, strokeWidth: 2, stroke: '#000000' },
  'Moderat':   { color: '#ffb455', radius: 4.0, strokeWidth: 0, stroke: 'transparent' },
  'Baix':      { color: '#47c057', radius: 3.5, strokeWidth: 0, stroke: 'transparent' },
  'No crític': { color: '#ffffff', radius: 3.5, strokeWidth: 0, stroke: 'transparent' },
};

let puntsCriticsData = null;   // GeoJSON complet carregat de local
let mapaZonesData    = null;   // GeoJSON de zones cargat de local
let stopIdsAfectats  = new Set(); // stop_ids dels punts crítics afectats per alertes actives
let todosLosPoints   = [];         // Array global de totes les alertes carregades
let filtros          = {};         // Object global dels filtres aplicats
let filtroFecha      = null;       // Filtre de data aplicat
let activeLayer      = 'cluster';  // Capa activa: 'cluster' | 'effect' | 'punts-critics'

async function loadPuntsCritics(path = '../punts_critics.json') {
  const candidates = [path, './punts_critics.json', '../data/punts_critics.json', 'punts_critics.json'];
  for (const candidate of candidates) {
    try {
      const res = await fetch(candidate);
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      puntsCriticsData = await res.json();
      console.debug('map: punts crítics carregats', puntsCriticsData.features?.length, 'from', candidate);
      return;
    } catch (err) {
      console.warn('map: no s\'han pogut carregar els punts crítics des de', candidate, err);
    }
  }
  console.error('map: no s\'ha pogut carregar cap fitxer de punts crítics');
}

async function loadMapaZones(path = MAPA_ZONES_PATH) {
  const candidates = [path, './mapa_zones_ATM_dissolt.geojson', '../data/mapa_zones_ATM_dissolt.geojson', 'mapa_zones_ATM_dissolt.geojson'];
  for (const candidate of candidates) {
    try {
      const res = await fetch(candidate);
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      mapaZonesData = await res.json();
      console.debug('map: mapa zones carregat', mapaZonesData.features?.length, 'from', candidate);
      return;
    } catch (err) {
      console.warn('map: no s\'ha pogut carregar el mapa de zones des de', candidate, err);
    }
  }
  console.error('map: no s\'ha pogut carregar cap fitxer de mapa de zones');
}

async function ensureSenyalAlertaIcon() {
  if (map.hasImage('senyal_alerta')) return;
  return new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (!map.hasImage('senyal_alerta')) map.addImage('senyal_alerta', img);
      resolve();
    };
    img.onerror = err => {
      console.warn('map: no s\'ha pogut carregar senyal_alerta.png', err);
      resolve();
    };
    img.src = `${ICON_BASE_PATH}/senyal_alerta.png`;
  });
}

/**
 * Normalitza un stop_id eliminant prefixos d'operador (ROD_, ATM_, etc.)
 * i espais per poder comparar punts crítics ↔ alertes.
 */
function normalitzarStopId(rawId) {
  if (!rawId) return '';
  return String(rawId).replace(/^[A-Z]+_/, '').trim();
}

/**
 * Recalcula quins punts crítics estan afectats per les alertes actuals.
 * Crida desprès de cada procesarAlertas().
 */
function updatePuntsCritics() {
  if (!puntsCriticsData || !map.getSource('punts-critics')) return;

  // Recollim tots els stop_ids (normalitzats) de les alertes actives
  const stopIdsAlerta = new Set();
  todosLosPoints.forEach(f => {
    let entitats = [];
    try { entitats = JSON.parse(f.properties['elements afectats'] || '[]'); } catch {}
    entitats.forEach(e => {
      // Des de grouped_entities → stop_ids
      if (Array.isArray(e.stop_ids)) {
        e.stop_ids.forEach(sid => stopIdsAlerta.add(normalitzarStopId(sid)));
      }
      // Des d'informed_entity directa → stop_id
      if (e.stop_id) stopIdsAlerta.add(normalitzarStopId(e.stop_id));
    });
  });

  stopIdsAfectats = stopIdsAlerta;

  // Actualitzem el filtre de la capa d'alerta
  if (map.getLayer('punts-critics-alerta')) {
    const stopIdsArray = [...stopIdsAfectats];
    if (stopIdsArray.length > 0) {
      map.setFilter('punts-critics-alerta', [
        'all',
        ['==', ['get', 'categoria_norm'], 'Alt'],
        ['in', ['get', 'stop_id_norm'], ['literal', stopIdsArray]]
      ]);
    } else {
      // cap coincidència → capa buida
      map.setFilter('punts-critics-alerta', [
        'all',
        ['==', ['get', 'categoria_norm'], 'Alt'],
        ['==', 'stop_id_norm', '__cap__']
      ]);
    }
  }
}

async function ensureEffectIcons() {
  await Promise.all(Object.keys(EFFECT_ICON_MAP).map(effect => {
    const imageName = getEffectIconName(effect);
    if (map.hasImage(imageName)) return Promise.resolve();
    return new Promise(resolve => {
      const image = new Image();
      image.crossOrigin = 'anonymous';
      image.onload = () => {
        if (!map.hasImage(imageName)) map.addImage(imageName, image);
        resolve();
      };
      image.onerror = err => {
        console.warn(`map: could not load icon ${imageName} from ${getEffectIconUrl(effect)}`, err);
        resolve();
      };
      image.src = getEffectIconUrl(effect);
    });
  }));
  console.debug('map: effect icons loaded');
}

/* ============================================================
   UTILITATS GEOMÈTRIQUES
   ============================================================ */
function centroide(coords) {
  const sum = coords.reduce((acc, c) => [acc[0] + c[0], acc[1] + c[1]], [0, 0]);
  return [sum[0] / coords.length, sum[1] / coords.length];
}

/* ============================================================
   MAPES BASE
   ============================================================ */
const BASE_MAPS = {
  custom: {
    label: 'Dark',
    style: 'https://api.maptiler.com/maps/019cd78e-b73a-7215-b550-59738d05b9d5/style.json?key=PWugjwqGJtkv1gAYBrrC',
    type: 'url',
  },
  Positron: {
    label: 'Light',
    style: {
      version: 8,
      sources: { osm: { type: 'raster', tiles: ['https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png'], tileSize: 256 } },
      layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
    },
    type: 'inline',
  },
  ortofotomapa: {
    label: 'Ortofoto',
    style: {
      version: 8,
      sources: { osm: { type: 'raster', tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'], tileSize: 256 } },
      layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
    },
    type: 'inline',
  },
};
let activeBasemap = 'Positron';

const map = new maplibregl.Map({
  container: 'map',
  style: BASE_MAPS.Positron.style,
  center: [2.0, 41.6],
  zoom: 8
});


map.addControl(new maplibregl.NavigationControl(), 'bottom-right');

map.addControl(
  new maplibregl.ScaleControl({
    maxWidth: 150,
    unit: 'metric'
  }),
  'bottom-left'
);

/* ============================================================
   PRE-FETCH DE DADES
   Iniciem la petició a l'API mentre el mapa carrega en paral·lel,
   així quan map.on('load') s'executa les dades ja estan disponibles.
   ============================================================ */
let _prefetchPromise = fetch(`/api/alerts`)
  .then(r => r.json())
  .catch(() => null);

/* ============================================================
   LÒGICA PRINCIPAL
   ============================================================ */
map.on('load', async () => {
  ensureEffectIcons();

  /* ----------------------------------------------------------
     INICIALITZACIÓ DE COMPONENTS HTML EXTERNS
     Carreguem els fragments HTML en paral·lel amb la resta
     d'inicialitzacions per minimitzar el temps d'espera.
  ---------------------------------------------------------- */
  await window.drawerAlertes.init();

  /* ----------------------------------------------------------
     BANNER
  ---------------------------------------------------------- */
  while (!window.banner) await new Promise(r => setTimeout(r, 50));
  await window.banner.init();

  /* ----------------------------------------------------------
     POPUP + ESTAT
  ---------------------------------------------------------- */
  const popup               = new maplibregl.Popup({ closeButton: true, closeOnClick: false, maxWidth: '320px',  anchor: 'bottom', offset: 20 });
  const infoNombre          = document.getElementById('info-nombre');
  const headerLastUpdateEl  = document.getElementById('header-last-update');
  const headerRealtimeEl    = document.getElementById('header-realtime-status');
  let hoveredId    = null;
  let hoveredSource = null;
  let selectedId   = null;
  let selectedItemEl  = null;
  let activeAlertId   = null;

  function pad(v) { return String(v).padStart(2, '0'); }

  function formatDateTime(date) {
    return `${pad(date.getDate())}/${pad(date.getMonth()+1)}/${date.getFullYear()} `
         + `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }

  function formatTime(date) {
    return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }

  function updateHeaderTime() {
    if (!headerLastUpdateEl) return;
    const labelEl = headerLastUpdateEl.querySelector && headerLastUpdateEl.querySelector('.label');
    const valueEl = headerLastUpdateEl.querySelector && headerLastUpdateEl.querySelector('.value');
    if (labelEl) labelEl.textContent = t('lastUpdate');
    if (valueEl) valueEl.textContent = formatDateTime(new Date());
    else headerLastUpdateEl.textContent = `${t('lastUpdate')}: ${formatDateTime(new Date())}`;
  }

  function setRealtimeStatus(online) {
    if (!headerRealtimeEl) return;
    headerRealtimeEl.textContent = online ? t('serviceStatus') : t('noRealtime');
    headerRealtimeEl.classList.toggle('online',  online);
    headerRealtimeEl.classList.toggle('offline', !online);
  }

  // publish time removed from header; no-op

  function parseTimestamp(value) {
    if (value == null) return null;
    if (typeof value === 'number') return value < 10000000000 ? value * 1000 : value;
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) return parsed < 10000000000 ? parsed * 1000 : parsed;
    const d = Date.parse(value);
    return Number.isNaN(d) ? null : d;
  }

  function parsePublishTime(alert) {
    if (!alert || typeof alert !== 'object') return null;
    for (const key of ['updated', 'modified', 'created', 'timestamp']) {
      if (alert[key]) { const v = parseTimestamp(alert[key]); if (v) return v; }
    }
    if (alert.active_period?.length && alert.active_period[0].start)
      return parseTimestamp(alert.active_period[0].start);
    return null;
  }

  updateHeaderTime();
  setInterval(updateHeaderTime, 60000); // actualizar cada 60s
  setRealtimeStatus(false);

  /* ----------------------------------------------------------
     FONTS I CAPES
  ---------------------------------------------------------- */
  const clusterProps = {};
  Object.keys(EFFECT_LABELS.ca).forEach(key => {
    clusterProps[`count_${key}`] = ['+', ['case', ['==', ['get', 'tipo'], key], 1, 0]];
  });

  window.onBasemapModeChange = value => {
    activeBasemap = value;
    const bm = BASE_MAPS[activeBasemap];
    map.setStyle(bm.type === 'url' ? bm.style : bm.style);
    map.once('styledata', async () => {
      await ensureEffectIcons();
      if (!map.getSource('alerts-points')) rebuildAlertLayers();
      if (!map.getSource('alerts-lines-selected')) {
        map.addSource('alerts-lines-selected', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
        map.addLayer({ id: 'alerts-lines-layer', type: 'line', source: 'alerts-lines-selected',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-width': 4, 'line-color': ['get', 'color'], 'line-opacity': 0.85 } });
      }
      if (!map.getSource('alerts-stops-selected')) {
        map.addSource('alerts-stops-selected', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
        map.addLayer({ id: 'alerts-stops-fill', type: 'circle', source: 'alerts-stops-selected',
          paint: { 'circle-radius': 7, 'circle-color': ['get', 'color'],
            'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff', 'circle-opacity': 0.95 } });
        map.addLayer({ id: 'alerts-stops-label', type: 'symbol', source: 'alerts-stops-selected',
          layout: { 'text-field': ['get', 'stop_name'], 'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
            'text-size': 11, 'text-offset': [0, 1.4], 'text-anchor': 'top', 'text-optional': true },
          paint: { 'text-color': '#1e293b', 'text-halo-color': '#ffffff', 'text-halo-width': 1.5 } });
      }
      if (puntsCriticsData) rebuildPuntsCriticsLayers();
      rebuildMapaZonesLayer();
      const src = map.getSource('alerts-points');
      const srcFlat = map.getSource('alerts-points-flat');
      if (todosLosPoints.length) {
        if (src) src.setData({ type: 'FeatureCollection', features: todosLosPoints });
        if (srcFlat) srcFlat.setData({ type: 'FeatureCollection', features: todosLosPoints });
      }
      actualizarCapas();
    });
  };

  window.onLayerModeChange = value => {
    activeLayer = value;

    if (activeLayer === 'punts-critics' && puntsCriticsData) {
      rebuildPuntsCriticsLayers();
    }

    if (selectedId !== null) {
      map.setFeatureState({ source: 'alerts-points', id: selectedId }, { selected: false });
      selectedId = null;
    }
    activeAlertId = null;
    popup.remove();
    ocultarLines();
    if (selectedItemEl) { selectedItemEl.classList.remove('selected'); selectedItemEl = null; }

    actualizarCapas();
    actualizarLlegenda();
  };

  function rebuildAlertLayers() {
    if (!map.getSource('alerts-points')) {
      map.addSource('alerts-points', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
        generateId: true,
        cluster: true, clusterMaxZoom: 11, clusterRadius: 50, clusterProperties: clusterProps,
      });
    }
    if (!map.getSource('alerts-points-flat')) {
      map.addSource('alerts-points-flat', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
        generateId: true
      });
    }
      const circlePaint = {
      'circle-radius': ['case', ['boolean', ['feature-state', 'selected'], false], 11, 8],
      'circle-color':  ['case', ['boolean', ['feature-state', 'selected'], false], '#ff6600',
        ['boolean', ['feature-state', 'hover'], false], '#00ccff', ['get', 'color']],
      'circle-stroke-width': ['case', ['boolean', ['feature-state', 'selected'], false], 2.5, 1.5],
      'circle-stroke-color': '#fff',
    };
    [
      { id: 'clusters-bg', type: 'circle', filter: ['has', 'point_count'],
        paint: { 'circle-color': '#1e293b', 'circle-radius': ['step', ['get', 'point_count'], 18, 5, 24, 20, 30],
          'circle-opacity': 0.85, 'circle-stroke-width': 2, 'circle-stroke-color': '#fff' } },
      { id: 'clusters-count', type: 'symbol', filter: ['has', 'point_count'],
        layout: { 'text-field': ['get', 'point_count_abbreviated'],
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'], 'text-size': 13 },
        paint: { 'text-color': '#ffffff' } },
      { id: 'pois-low', type: 'circle', filter: ['!', ['has', 'point_count']],
        paint: { 'circle-radius': 7, 'circle-color': ['get', 'color'],
          'circle-stroke-width': 1.5, 'circle-stroke-color': '#fff' } },
      { id: 'pois-high',       type: 'circle', layout: { visibility: 'none' }, paint: circlePaint },
      { id: 'pois-effect', type: 'symbol', source: 'alerts-points', filter: ['!', ['has', 'point_count']], layout: {
          visibility: 'none',
          'icon-image': ['coalesce', ['get', 'icon'], 'effect-unknown_effect'],
          'icon-size': 0.1,
          'icon-allow-overlap': true,
          'icon-ignore-placement': true
        },
        paint: { 'icon-opacity': ['case', ['boolean', ['feature-state', 'selected'], false], 0.75, 1] }
      },
    ].forEach(l => {
      if (!map.getLayer(l.id)) {
        const def = { id: l.id, type: l.type, source: l.source || 'alerts-points' };
        if (l.filter) def.filter = l.filter;
        if (l.layout) def.layout = l.layout;
        if (l.paint)  def.paint  = l.paint;
        map.addLayer(def);
      }
    });
    if (map.getLayer(MAPA_ZONES_FILL_LAYER)) {
      moveMapaZonesFillBelowAlerts();
    }
    if (map.getLayer(MAPA_ZONES_LAYER)) {
      moveMapaZonesLineToTop();
    }
  }

  function rebuildPuntsCriticsLayers() {
    if (!puntsCriticsData) return;
    if (!map.getSource('punts-critics')) {
      map.addSource('punts-critics', {
        type: 'geojson',
        data: puntsCriticsData,
      });
    }
    if (!map.getLayer('punts-critics-stroke')) {
      map.addLayer({
        id: 'punts-critics-stroke',
        type: 'circle',
        source: 'punts-critics',
        filter: ['==', ['get', 'categoria_norm'], 'Alt'],
        paint: {
          'circle-radius': 4.5,
          'circle-color': 'transparent',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#000000',
        },
      });
    }
    if (!map.getLayer('punts-critics')) {
      map.addLayer({
        id: 'punts-critics',
        type: 'circle',
        source: 'punts-critics',
        paint: {
          'circle-radius': [
            'match', ['get', 'categoria_norm'],
            'Alt',       4.5,
            'Moderat',   4.0,
            'Baix',      3.5,
            'No crític', 3.5,
            3.5
          ],
          'circle-color': [
            'match', ['get', 'categoria_norm'],
            'Alt',       '#ff0000',
            'Moderat',   '#ffb455',
            'Baix',      '#47c057',
            'No crític', '#ffffff',
            '#cccccc'
          ],
          'circle-stroke-width': [
            'match', ['get', 'categoria_norm'],
            'Alt', 0.5,
            0
          ],
          'circle-stroke-color': [
            'match', ['get', 'categoria_norm'],
            'Alt', '#000000',
            'transparent'
          ],
        },
      });
    }
    if (!map.getLayer('punts-critics-alerta')) {
      map.addLayer({
        id: 'punts-critics-alerta',
        type: 'symbol',
        source: 'punts-critics',
        filter: [
          'all',
          ['==', ['get', 'categoria_norm'], 'Alt'],
          ['==', 'stop_id_norm', '__cap__']
        ],
        layout: {
          'icon-image': 'senyal_alerta',
          'icon-size': 0.08,
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
          'icon-anchor': 'bottom',
        },
      });
    }
    updatePuntsCritics();
  }
  /* ----------------------------------------------------------
     PUNTS CRÍTICS — CAPA GeoJSON LOCAL
  ---------------------------------------------------------- */
  await Promise.all([
    loadPuntsCritics(),
    loadMapaZones(),
    ensureSenyalAlertaIcon()
  ]);

  if (mapaZonesData && map.getSource(MAPA_ZONES_SOURCE)) {
    map.getSource(MAPA_ZONES_SOURCE).setData(mapaZonesData);
  }

  if (puntsCriticsData) {
    // Afegim camp normalitzat a cada feature per poder filtrar
    puntsCriticsData.features.forEach(f => {
      const sid = f.properties?.stop_id || '';
      f.properties.stop_id_norm = normalitzarStopId(sid);
      // camp 'categoria' normalitzat (per si arriba com 'alt', 'ALT', etc.)
      const cat = (f.properties?.nivell_criticitat || f.properties?.categoria || '').trim();
      f.properties.categoria_norm =
        cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase();
    });

    map.addSource('punts-critics', {
      type: 'geojson',
      data: puntsCriticsData,
    });

    // — Cercles base amb simbologia per categoria —
    map.addLayer({
      id: 'punts-critics-stroke',
      type: 'circle',
      source: 'punts-critics',
      filter: ['==', ['get', 'categoria_norm'], 'Alt'],
      paint: {
        'circle-radius': 3.5,
        'circle-color': 'transparent',
        'circle-stroke-width': 0.5,
        'circle-stroke-color': '#000000',
      },
    });

    map.addLayer({
      id: 'punts-critics',
      type: 'circle',
      source: 'punts-critics',
      paint: {
        'circle-radius': [
          'match', ['get', 'categoria_norm'],
          'Alt',       2.8,
          'Moderat',   2.4,
          'Baix',      2.0,
          'No crític', 2.0,
          2.0
        ],
        'circle-color': [
          'match', ['get', 'categoria_norm'],
          'Alt',       '#ff0000',
          'Moderat',   '#ffb455',
          'Baix',      '#47c057',
          'No crític', '#ffffff',
          '#cccccc'
        ],
        'circle-stroke-width': [
          'match', ['get', 'categoria_norm'],
          'Alt', 0.5,
          0
        ],
        'circle-stroke-color': [
          'match', ['get', 'categoria_norm'],
          'Alt', '#000000',
          'transparent'
        ],
      },
    });

    // — Icona d'alerta per als punts crítics afectats —
    map.addLayer({
      id: 'punts-critics-alerta',
      type: 'symbol',
      source: 'punts-critics',
      filter: [
        'all',
        ['==', ['get', 'categoria_norm'], 'Alt'],
        ['==', 'stop_id_norm', '__cap__']
      ],   // inicialment buit
      layout: {
        'icon-image': 'senyal_alerta',
        'icon-size': 0.08,                          // ajusta a la mida real de la PNG
        'icon-allow-overlap': true,
        'icon-ignore-placement': true,
        'icon-anchor': 'bottom',
      },
    });

    // Interactivitat bàsica: cursor + popup lleuger
    map.on('mouseenter', 'punts-critics', () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'punts-critics', () => {
      map.getCanvas().style.cursor = '';
    });
    map.on('click', 'punts-critics', e => {
      const f = e.features[0];
      if (!f) return;
      const p = f.properties;
      const afectat = stopIdsAfectats.has(p.stop_id_norm);
      const html = `
        <div class="popup-nombre">${p.stop_name || p.stop_id || '—'}</div>
        <div class="popup-row"><strong>Categoria:</strong> ${p.categoria_norm || '—'}</div>
        ${afectat ? '<div class="popup-row" style="color:#e85d24;font-weight:500">⚠ Punt crític afectat per una alerta activa</div>' : ''}
      `;
      new maplibregl.Popup({ closeButton: true, maxWidth: '260px', anchor: 'bottom', offset: 12 })
        .setLngLat(f.geometry.coordinates)
        .setHTML(html)
        .addTo(map);
      e.stopPropagation();
    });
  }

  function actualizarLlegenda() {
    if (activeLayer === 'punts-critics') {
      if (window.banner && typeof window.banner.updateLegendTitle === 'function') {
        window.banner.updateLegendTitle('Nivell criticitat');
      }
      if (window.banner && typeof window.banner.updateLegendPuntsCritics === 'function') {
        window.banner.updateLegendPuntsCritics();
      }
      return;
    }

    if (window.banner && typeof window.banner.updateLegendTitle === 'function') {
      window.banner.updateLegendTitle('Efectes');
    }

    const present = [...new Set(todosLosPoints.map(f => f.properties.tipo).filter(Boolean))];
    if (!present.length) present.push('UNKNOWN_EFFECT');
    const ordered = [...present].sort();
    window.banner?.updateLegend(ordered);
  }

  /* ----------------------------------------------------------
     FONTS I CAPES INICIALS
  ---------------------------------------------------------- */
  map.addSource('alerts-points', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
    generateId: true,
    cluster: true,
    clusterMaxZoom: 11,
    clusterRadius: 50,
    clusterProperties: clusterProps
  });
  map.addSource('alerts-points-flat', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
    generateId: true
  });

  map.addSource(MAPA_ZONES_SOURCE, {
    type: 'geojson',
    data: mapaZonesData || { type: 'FeatureCollection', features: [] }
  });

  map.addLayer({
    id: MAPA_ZONES_FILL_LAYER,
    type: 'fill',
    source: MAPA_ZONES_SOURCE,
    layout: { visibility: 'visible' },
    paint: MAPA_ZONES_FILL_STYLE
  });
  map.addLayer({
    id: MAPA_ZONES_LAYER,
    type: 'line',
    source: MAPA_ZONES_SOURCE,
    layout: { visibility: 'visible' },
    paint: MAPA_ZONES_STYLE
  });
  map.moveLayer(MAPA_ZONES_LAYER);

  function rebuildMapaZonesLayer() {
    if (!mapaZonesData) return;
    if (!map.getSource(MAPA_ZONES_SOURCE)) {
      map.addSource(MAPA_ZONES_SOURCE, {
        type: 'geojson',
        data: mapaZonesData
      });
    } else {
      map.getSource(MAPA_ZONES_SOURCE).setData(mapaZonesData);
    }

    if (!map.getLayer(MAPA_ZONES_FILL_LAYER)) {
      map.addLayer({
        id: MAPA_ZONES_FILL_LAYER,
        type: 'fill',
        source: MAPA_ZONES_SOURCE,
        layout: { visibility: 'visible' },
        paint: MAPA_ZONES_FILL_STYLE
      });
    }

    if (!map.getLayer(MAPA_ZONES_LAYER)) {
      map.addLayer({
        id: MAPA_ZONES_LAYER,
        type: 'line',
        source: MAPA_ZONES_SOURCE,
        layout: { visibility: 'visible' },
        paint: MAPA_ZONES_STYLE
      });
    }

    if (map.getLayer(MAPA_ZONES_FILL_LAYER)) {
      moveMapaZonesFillBelowAlerts();
    }
    moveMapaZonesLineToTop();
  }

  map.addLayer({ id: 'clusters-bg', type: 'circle', source: 'alerts-points',
    filter: ['has', 'point_count'],
    paint: { 'circle-color': '#1e293b',
      'circle-radius': ['step', ['get', 'point_count'], 18, 5, 24, 20, 30],
      'circle-opacity': 0.85, 'circle-stroke-width': 2, 'circle-stroke-color': '#fff' }
  });
  map.addLayer({ id: 'clusters-count', type: 'symbol', source: 'alerts-points',
    filter: ['has', 'point_count'],
    layout: { 'text-field': ['get', 'point_count_abbreviated'],
      'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'], 'text-size': 13 },
    paint: { 'text-color': '#ffffff' }
  });
  map.addLayer({ id: 'pois-low', type: 'circle', source: 'alerts-points',
    filter: ['!', ['has', 'point_count']],
    paint: { 'circle-radius': 7, 'circle-color': ['get', 'color'],
      'circle-stroke-width': 1.5, 'circle-stroke-color': '#fff' }
  });

  const circlePaintShared = {
    'circle-radius': ['case', ['boolean', ['feature-state', 'selected'], false], 11, 8],
    'circle-color': ['case',
      ['boolean', ['feature-state', 'selected'], false], '#ff6600',
      ['boolean', ['feature-state', 'hover'],    false], '#00ccff',
      ['get', 'color']],
    'circle-stroke-width': ['case', ['boolean', ['feature-state', 'selected'], false], 2.5, 1.5],
    'circle-stroke-color': '#fff'
  };

  map.addLayer({ id: 'pois-high', type: 'circle', source: 'alerts-points',
    filter: ['!', ['has', 'point_count']],
    layout: { visibility: 'none' }, paint: circlePaintShared
  });

  map.addLayer({ id: 'pois-effect', type: 'symbol', source: 'alerts-points-flat',
    layout: {
      visibility: 'none',
      'icon-image': ['coalesce', ['get', 'icon'], 'effect-unknown_effect'],
      'icon-size': 0.1,
      'icon-allow-overlap': true,
      'icon-ignore-placement': true
    },
    paint: { 'icon-opacity': ['case', ['boolean', ['feature-state', 'selected'], false], 0.75, 1] }
  });

  map.addSource('alerts-lines-selected', {
    type: 'geojson', data: { type: 'FeatureCollection', features: [] }
  });
  map.addLayer({ id: 'alerts-lines-layer', type: 'line', source: 'alerts-lines-selected',
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-width': 4, 'line-color': ['get', 'color'], 'line-opacity': 0.85 }
  });

  map.addSource('alerts-stops-selected', {
    type: 'geojson', data: { type: 'FeatureCollection', features: [] }
  });
  map.addLayer({ id: 'alerts-stops-fill', type: 'circle', source: 'alerts-stops-selected',
    paint: { 'circle-radius': 7, 'circle-color': ['get', 'color'],
      'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff', 'circle-opacity': 0.95 }
  });
  map.addLayer({ id: 'alerts-stops-label', type: 'symbol', source: 'alerts-stops-selected',
    layout: { 'text-field': ['get', 'stop_name'],
      'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
      'text-size': 11, 'text-offset': [0, 1.4], 'text-anchor': 'top', 'text-optional': true },
      minzoom: 11,
    paint: { 'text-color': '#1e293b', 'text-halo-color': '#ffffff', 'text-halo-width': 1.5, }
  });

  /* ----------------------------------------------------------
     ZOOM → ALTERNAR CAPES
  ---------------------------------------------------------- */
  function actualizarCapas() {
    const setVis = (id, v) => { if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', v); };
    if (activeLayer === 'cluster') {
      const alta = map.getZoom() >= 12;
      setVis('clusters-bg',     'visible');
      setVis('clusters-count',  'visible');
      setVis('pois-low',        alta ? 'none' : 'visible');
      setVis('pois-high',       alta ? 'visible' : 'none');
      setVis('pois-effect',     'none');
      setVis('punts-critics',        'none');
      setVis('punts-critics-stroke', 'none');
      setVis('punts-critics-alerta', 'none');
    } else if (activeLayer === 'effect') {
      setVis('clusters-bg',     'none');
      setVis('clusters-count',  'none');
      setVis('pois-low',        'none');
      setVis('pois-high',       'none');
      setVis('pois-effect',     'visible');
      setVis('punts-critics',        'none');
      setVis('punts-critics-stroke', 'none');
      setVis('punts-critics-alerta', 'none');
    } else if (activeLayer === 'punts-critics') {
      setVis('clusters-bg',     'none');
      setVis('clusters-count',  'none');
      setVis('pois-low',        'none');
      setVis('pois-high',       'none');
      setVis('pois-effect',     'none');
      setVis('punts-critics',        'visible');
      setVis('punts-critics-stroke', 'visible');
      setVis('punts-critics-alerta', 'visible');
    }
  }
  map.on('zoom', actualizarCapas);

  /* ----------------------------------------------------------
     CLUSTERS → POPUP AMB RESUM D'EFECTES
  ---------------------------------------------------------- */
  map.on('mouseenter', 'clusters-bg', () => map.getCanvas().style.cursor = 'pointer');
  map.on('mouseleave', 'clusters-bg', () => map.getCanvas().style.cursor = '');

  map.on('click', 'clusters-bg', async e => {
    const feature   = e.features[0];
    const clusterId = feature.properties.cluster_id;
    const coords    = feature.geometry.coordinates;
    const zoom = await new Promise(res =>
      map.getSource('alerts-points').getClusterExpansionZoom(
        clusterId, (err, z) => res(err ? map.getZoom() + 2 : z)
      )
    );
    if (zoom <= 11) { map.easeTo({ center: coords, zoom }); return; }
    const props = feature.properties;
    const rows = Object.keys(EFFECT_LABELS.ca)
      .map(key => {
        const count = props[`count_${key}`] || 0;
        if (!count) return '';
        const col = COLORS[key] || COLORS.UNKNOWN_EFFECT;
        return `<div class="cluster-row">
          <span class="cluster-dot" style="background:${col}"></span>
          <span class="cluster-label">${labelEfecto(key)}</span>
          <span class="cluster-count">${count}</span>
        </div>`;
      }).filter(Boolean).join('');
    popup.setLngLat(coords).setHTML(`
      <div class="popup-nombre">${t('clustered')(props.point_count)}</div>
      <div class="cluster-breakdown">${rows || `<em>${t('noTraceData')}</em>`}</div>
      <div style="margin-top:8px;font-size:11px;color:#94a3b8">${t('clusterZoom')}</div>
    `).addTo(map);
  });

  /* ----------------------------------------------------------
     HOVER I CLICK
  ---------------------------------------------------------- */
  function getActivePOILayers() {
    return ['pois-low', 'pois-high', 'pois-effect', 'punts-critics', 'punts-critics-alerta'].filter(id => {
      if (!map.getLayer(id)) return false;
      const vis = map.getLayoutProperty(id, 'visibility');
      return vis === 'visible' || vis === undefined;
    });
  }

  function positionInfo(coords) {
  const info = document.getElementById('info');

  const pos = map.project(coords);

  info.style.left = (pos.x + 16) + 'px';
  info.style.top = (pos.y - 16) + 'px';
}

  function onHoverMove(e) {
    if (!e.features.length) return;
    const f = e.features[0];
    const p = f.properties || {};
    const isCritic = f.layer?.source === 'punts-critics' || f.layer?.id === 'punts-critics-alerta';

    if (infoNombre) {
      infoNombre.textContent = isCritic
        ? (p.stop_name || p.stop_id || t('puntCritic'))
        : ((p.route_short_name || '') && (p.route_long_name || '') ? `${p.route_short_name} — ${p.route_long_name}`
          : p.route_short_name || p.route_long_name || t('noName'));
    }

    const info = document.getElementById('info');
    info.style.display = 'block';
    map.getCanvas().style.cursor = 'pointer';

    if (hoveredId !== null && hoveredSource === 'alerts-points') {
      map.setFeatureState({ source: 'alerts-points', id: hoveredId }, { hover: false });
    }

    hoveredId = p.id || f.id;
    hoveredSource = f.layer?.source || null;
    if (hoveredSource === 'alerts-points' && hoveredId != null) {
      map.setFeatureState({ source: 'alerts-points', id: hoveredId }, { hover: true });
    }

    positionInfo(f.geometry.coordinates);
  }

  function onHoverLeave() {
    if (hoveredId !== null && hoveredSource === 'alerts-points')
      map.setFeatureState({ source: 'alerts-points', id: hoveredId }, { hover: false });
    hoveredId = null;
    hoveredSource = null;
    if (infoNombre) infoNombre.textContent = t('hoverHint');
    map.getCanvas().style.cursor = '';
    document.getElementById('info').style.display = 'none';
  }

  map.on('mousemove', e => {
    const layers = getActivePOILayers();
    if (!layers.length) return;
    const features = map.queryRenderedFeatures(e.point, { layers });
    if (!features.length) { onHoverLeave(); return; }
    onHoverMove({ features });
  });
  map.on('mouseleave', () => onHoverLeave());

  /* ----------------------------------------------------------
     LÍNIES PER ALERTA
  ---------------------------------------------------------- */
  const linesByAlertId = {};
  const stopsByAlertId = {};

  function mostrarLinesDeAlerta(alertId) {
    map.getSource('alerts-lines-selected').setData({
      type: 'FeatureCollection', features: linesByAlertId[alertId] || []
    });
    map.getSource('alerts-stops-selected').setData({
      type: 'FeatureCollection', features: stopsByAlertId[alertId] || []
    });
  }

  function ocultarLines() {
    map.getSource('alerts-lines-selected').setData({ type: 'FeatureCollection', features: [] });
    map.getSource('alerts-stops-selected').setData({ type: 'FeatureCollection', features: [] });
  }

  /* ----------------------------------------------------------
     POPUP ALERTA INDIVIDUAL
  ---------------------------------------------------------- */
  function mostrarPopup(f) {
    if (selectedId !== null)
      map.setFeatureState({ source: 'alerts-points', id: selectedId }, { selected: false });
    selectedId    = f.id;
    activeAlertId = f.properties.id;
    map.setFeatureState({ source: 'alerts-points', id: selectedId }, { selected: true });

    const p = f.properties;
    mostrarLinesDeAlerta(p.id);

    let entitats = [];
    try { entitats = JSON.parse(p["elements afectats"] || "[]"); } catch {}

    const rutasVistes = new Set();
    const routesHTML = entitats
      .filter(e => e.route_id && !rutasVistes.has(e.route_id) && rutasVistes.add(e.route_id))
      .map(e => {
        const bg  = e.route_color      ? `#${e.route_color}`      : '#1d4ed8';
        const txt = e.route_text_color ? `#${e.route_text_color}` : '#ffffff';
        const label = e.route_short_name || e.route_id;
        const title = e.route_long_name ? ` title="${e.route_long_name}"` : '';
        return `<span class="tag"${title} style="background:${bg};color:${txt};">${label}</span>`;
      }).join(' ') || '—';

    const stops = [...new Set(entitats.map(e => e.stop_name || e.stop_id).filter(Boolean))];
    const stopsHTML = stops.length
      ? stops.map(s => `<span class="tag tag-stop">${s}</span>`).join(' ')
      : '—';

    const causeRow = p.causa
      ? `<div class="popup-row"><strong>${t('cause')}:</strong> ${labelCause(p.causa)}</div>` : '';

    popup.setLngLat(f.geometry.coordinates).setHTML(`
      <div class="popup-nombre">${t('Alteració ID')}: ${p.id || t('noName')}</div>
      <div class="popup-row"><strong>${t('effect')}:</strong> ${labelEfecto(p.tipo)}</div>
      ${causeRow}
      <div class="popup-row"><strong>${t('operator')}:</strong> ${p.operador || '—'}</div>
      <div class="popup-row"><strong>${t('routes')}:</strong><br>${routesHTML}</div>
      <button class="popup-link" type="button">${t('viewDetail')}</button>
    `).addTo(map);

    popup.getElement().querySelector('.popup-link')
      ?.addEventListener('click', () => openDetailPanel(f));
  }

  function mostrarPuntCriticPopup(f) {
    const p = f.properties || {};
    const afectat = stopIdsAfectats.has(p.stop_id_norm);
    const heading = p.stop_name || p.stop_id || '—';
    const category = p.categoria_norm ? `<div class="popup-row"><strong>Categoria:</strong> ${p.categoria_norm}</div>` : '';
    const affectedText = afectat ? 'Punt crític afectat per alerta activa' : 'Punt crític';

    popup.setLngLat(f.geometry.coordinates).setHTML(`
      <div class="popup-nombre">${heading}</div>
      <div class="popup-row">${affectedText}</div>
      ${category}
    `).addTo(map);
  }

  map.on('click', e => {
    const activePOI = getActivePOILayers();
    const hits = map.queryRenderedFeatures(e.point,
      { layers: [...activePOI, 'clusters-bg'].filter(id => map.getLayer(id)) });
    if (!hits.length) {
      popup.remove();
      ocultarLines();
      closeDetailPanel();
      if (selectedId !== null) {
        map.setFeatureState({ source: 'alerts-points', id: selectedId }, { selected: false });
        selectedId = null;
      }
      if (selectedItemEl) { selectedItemEl.classList.remove('selected'); selectedItemEl = null; }
      return;
    }
    const f = hits[0];
    if (f.layer.id === 'clusters-bg') {
      map.getSource('alerts-points').getClusterExpansionZoom(
        f.properties.cluster_id, (err, zoom) => {
          const z = err ? map.getZoom() + 2 : zoom;
          if (z <= 11) { map.easeTo({ center: f.geometry.coordinates, zoom: z }); return; }
          map.fire('click', { features: [f], lngLat: f.geometry.coordinates, point: e.point });
        }
      );
    } else if (f.layer?.source === 'punts-critics' || f.layer?.id === 'punts-critics-alerta') {
      popup.remove();
      ocultarLines();
      closeDetailPanel();
      mostrarPuntCriticPopup(f);
    } else {
      mostrarPopup(f);
    }
  });

  /* ----------------------------------------------------------
     PANELL DE DETALL  — HTML incrustat a index.html
  ---------------------------------------------------------- */
  const mapWrap   = document.getElementById('map-wrap');
  const detailPanel = document.getElementById('detail-panel');

  let currentAlertTranslations = null;

  function getDesc() {
    const d = currentAlertTranslations?.descriptions;
    if (!d) return '—';
    return d[UI_LANG] || d['ca'] || Object.values(d)[0] || d['es'] || d['en']
         || '—';
  }

  function openDetailPanel(feature) {
    const p = feature.properties;
    try { currentAlertTranslations = JSON.parse(p.allTranslations || '{}'); }
    catch { currentAlertTranslations = null; }

    let entitats = [];
    try { entitats = JSON.parse(p['elements afectats'] || '[]'); } catch {}

    const rutasVistes = new Set();
    const routesHTML = entitats
      .filter(e => e.route_id && !rutasVistes.has(e.route_id) && rutasVistes.add(e.route_id))
      .map(e => {
        const bg    = e.route_color      ? `#${e.route_color}`      : '#1d4ed8';
        const txt   = e.route_text_color ? `#${e.route_text_color}` : '#ffffff';
        const label = e.route_short_name || e.route_id;
        const title = e.route_long_name  ? ` title="${e.route_long_name}"` : '';
        return `<span class="detail-tag"${title} style="background:${bg};color:${txt};">${label}</span>`;
      }).join(' ') || '—';

    const stops = [...new Set(entitats.map(e => e.stop_name || e.stop_id).filter(Boolean))];
    const stopsHTML = stops.length
      ? stops.map(s => `<span class="detail-tag detail-tag-stop">${s}</span>`).join(' ')
      : '—';

    const causeRow = detailPanel.querySelector('#detail-cause-row');
    if (p.causa) {
      detailPanel.querySelector('#detail-causa').textContent = labelCause(p.causa);
      causeRow.style.display = '';
    } else {
      causeRow.style.display = 'none';
    }

    detailPanel.querySelector('#detail-title').textContent = `${t('alteration')}: ${p.id || '—'}`;
    detailPanel.querySelector('#detail-operador').textContent = p.operador || '—';
    detailPanel.querySelector('#detail-efecto').textContent   = labelEfecto(p.tipo);
    detailPanel.querySelector('#detail-effect-summary').textContent = '';
    detailPanel.querySelector('#detail-routes').innerHTML     = routesHTML;
    detailPanel.querySelector('#detail-stops').innerHTML      = stopsHTML;
    detailPanel.querySelector('#detail-description').textContent = getDesc();

    detailPanel.querySelector('#lbl-effect').textContent  = `${t('effect')}: `;
    detailPanel.querySelector('#lbl-cause').textContent   = `${t('cause')}: `;
    detailPanel.querySelector('#lbl-operator').textContent= `${t('operator')}: `;
    detailPanel.querySelector('#lbl-period').textContent  = `${t('activePeriod')}: `;
    detailPanel.querySelector('#lbl-routes').textContent  = `${t('routes')}: `;
    detailPanel.querySelector('#lbl-stops').textContent   = `${t('affectedStops')}: `;
    detailPanel.querySelector('#lbl-desc').textContent    = `${t('description')}: `;
    detailPanel.querySelector('#lbl-more').textContent    = `${t('moreInfo')}: `;

    const publishEl = detailPanel.querySelector('#detail-publish-time');
    publishEl.textContent = p.publishTime ? formatDateTime(new Date(p.publishTime)) : '—';

    const link = detailPanel.querySelector('#detail-more-info');
    if (p.url) {
      link.href          = p.url.startsWith('http') ? p.url : `https://${p.url}`;
      link.textContent   = t('openLink');
      link.style.display = 'inline-block';
    } else {
      link.removeAttribute('href');
      link.textContent   = '';
      link.style.display = 'none';
    }

    detailPanel.classList.remove('hidden');
  }

  function closeDetailPanel() { detailPanel.classList.add('hidden'); }
  function isDetailPanelOpen() { return !detailPanel.classList.contains('hidden'); }

  detailPanel.querySelector('#detail-close')?.addEventListener('click', closeDetailPanel);

  document.addEventListener('click', e => {
    if (filterPopup.contains(e.target) || e.target.closest('.filtro-trigger')) return;
    closePopup();
    if (!detailPanel.contains(e.target) &&
        !e.target.closest('.item') &&
        !e.target.closest('.popup-link'))
      closeDetailPanel();
  });

  /* ----------------------------------------------------------
     CÀRREGA DE DADES
  ---------------------------------------------------------- */
  const filtrosPanel = document.getElementById('filtros-panel');
  const listaHeader  = document.getElementById('lista-header');
  const listaEl      = document.getElementById('lista');

  // Inicialitzar filtros amb la estructura correcta
  filtros = {
    efecto:   new Set(),
    causa:    new Set(),
    ruta:     new Set(),
    parada:   new Set(),
    operador: new Set(),
  };

  const filterPopup = document.createElement('div');
  filterPopup.id = 'filtro-popup';
  filterPopup.className = 'filtro-popup';
  filterPopup.style.display = 'none';
  filtrosPanel?.appendChild(filterPopup);

  async function loadData() {
    try {
      // Primera càrrega: aprofitar el pre-fetch fet en paral·lel amb el mapa
      let data;
      if (_prefetchPromise) {
        data = await _prefetchPromise;
        _prefetchPromise = null;
      } else {
        const res = await fetch(`${API_BASE}/api/alerts`);
        data = await res.json();
      }
      if (!data) throw new Error('No data');
      procesarAlertas(data.alerts || [], { silent: activeAlertId !== null });
      setRealtimeStatus(true);
    } catch (err) {
      console.error("Error API:", err);
      setRealtimeStatus(false);
    }
  }

  function procesarAlertas(alerts, options = {}) {
    const pointFeatures = [];
    Object.keys(linesByAlertId).forEach(k => delete linesByAlertId[k]);
    Object.keys(stopsByAlertId).forEach(k => delete stopsByAlertId[k]);

    alerts.forEach(alertItem => {
      const alert    = alertItem.alert;
      const entities = alert.informed_entity || [];
      const color    = colorEfecto(alert.effect);
      const alertId  = alertItem.id || String(Math.random());
      const causa    = alert.cause || '';

      const periodoStr = alert.active_period?.length
        ? new Date(alert.active_period[0].start * 1000)
            .toLocaleDateString('ca-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
        : t('unknown');

      const operador = entities.find(e => e.operator)?.operator
                    || entities.find(e => e.agency_id)?.agency_id
                    || '';

      const routeIds = [...new Set(entities.map(e => e.route_id).filter(Boolean))];
      const publishTime = parsePublishTime(alert);

      const headerTranslations      = alert.header_text?.translation || [];
      const descriptionTranslations = alert.description_text?.translation || [];
      const allTranslations = {
        headers:      Object.fromEntries(headerTranslations.map(tr => [tr.language || 'ca', tr.text])),
        descriptions: Object.fromEntries(descriptionTranslations.map(tr => [tr.language || 'ca', tr.text]))
      };

      const base = {
        id:               alertId,
        nombre:           alert.header_text?.translation?.[0]?.text
                       || alert.description_text?.translation?.[0]?.text?.substring(0, 60)
                       || t('noName'),
        tipo:             alert.effect || t('unknown'),
        causa,
        operador,
        "periodo activo": alert.active_period
          ? `${new Date(alert.active_period[0].start * 1000).toLocaleString('ca-ES')} – `
          + (alert.active_period[0].end
              ? new Date(alert.active_period[0].end * 1000).toLocaleString('ca-ES') : '—')
          : t('unknown'),
        periodoInicio:    periodoStr,
        descripcion:      alert.description_text?.translation?.[0]?.text || '',
        "elements afectats": JSON.stringify(entities),
        url:              alert.resolved_url || alert.url?.translation?.[0]?.text || '',
        routeIds:         JSON.stringify(routeIds),
        publishTime,
        allTranslations:  JSON.stringify(allTranslations),
        color
      };

      const linesAquesta = [];
      entities.forEach(e => {
        if (e.geometry?.type === 'LineString') {
          const rc  = e.route_color      ? `#${e.route_color}`      : color;
          const rtc = e.route_text_color ? `#${e.route_text_color}` : '#ffffff';
          linesAquesta.push({
            type: 'Feature', geometry: e.geometry,
            properties: { ...base,
              nombre: e.route_short_name || e.route_id || base.nombre,
              route_short_name: e.route_short_name || '',
              route_long_name:  e.route_long_name  || '',
              color: rc, textColor: rtc }
          });
        }
      });
      if (linesAquesta.length) linesByAlertId[alertId] = linesAquesta;

      const stopsFeatures = entities
        .filter(e => e.lat && e.lon)
        .map(e => ({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [e.lon, e.lat] },
          properties: { stop_name: e.stop_name || e.stop_id || '',
            stop_id: e.stop_id || '', color: e.route_color ? `#${e.route_color}` : color }
        }));
      if (stopsFeatures.length) stopsByAlertId[alertId] = stopsFeatures;

      const groups = alert.grouped_entities || [];
      if (groups.length) {
        groups.forEach(group => {
          if (!group.centroid) return;
          const [lon, lat] = group.centroid.coordinates;
          const ri  = group.route_info || {};
          const rc  = ri.route_color      ? `#${ri.route_color}`      : color;
          const rtc = ri.route_text_color ? `#${ri.route_text_color}` : '#ffffff';
          pointFeatures.push({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [lon, lat] },
            properties: { ...base,
              icon: getEffectIconName(base.tipo),
              nombre: ri.route_short_name || base.nombre,
              route_short_name: ri.route_short_name || '',
              route_long_name:  ri.route_long_name  || '',
              color: rc, textColor: rtc, isLinePoint: false, alertCase: group.case }
          });
        });
      } else {
        if (linesAquesta.length) {
          const pl        = linesAquesta[0];
          const allCoords = linesAquesta.flatMap(f => f.geometry.coordinates);
          pointFeatures.push({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: centroide(allCoords) },
            properties: { ...base,
              icon: getEffectIconName(base.tipo),
              nombre: pl.properties.route_short_name || pl.properties.nombre || base.nombre,
              route_short_name: pl.properties.route_short_name || '',
              route_long_name:  pl.properties.route_long_name  || '',
              color: pl.properties.color, textColor: pl.properties.textColor, isLinePoint: true }
          });
        } else {
          const firstWithCoords = entities.find(e => e.lat && e.lon);
          if (firstWithCoords) {
            pointFeatures.push({
              type: 'Feature',
              geometry: { type: 'Point', coordinates: [firstWithCoords.lon, firstWithCoords.lat] },
              properties: { ...base, icon: getEffectIconName(base.tipo), color, isLinePoint: false }
            });
          }
        }
      }
    });

    todosLosPoints = pointFeatures;
    construirFiltros();
    actualizarLlegenda();
    aplicar({ silent: options.silent });
  }

  /* ----------------------------------------------------------
     FILTRES
  ---------------------------------------------------------- */
  function construirFiltros() {
    filtrosPanel.innerHTML = '';
    const efectos   = [...new Set(todosLosPoints.map(f => f.properties.tipo).filter(Boolean))].sort();
    const causes    = [...new Set(todosLosPoints.map(f => f.properties.causa).filter(Boolean))].sort();
    const rutas     = [...new Set(todosLosPoints.flatMap(f => {
      try { return JSON.parse(f.properties.routeIds); } catch { return []; }
    }))].sort();
    const operadors = [...new Set(todosLosPoints.map(f => f.properties.operador).filter(Boolean))].sort();

    const comptadorsEfecte = Object.fromEntries(
      efectos.map(e => [e, todosLosPoints.filter(f => f.properties.tipo === e).length])
    );
    const comptadorsCausa = Object.fromEntries(
      causes.map(c => [c, todosLosPoints.filter(f => f.properties.causa === c).length])
    );

    const headerRow = document.createElement('div');
    headerRow.className = 'filtros-header';
    headerRow.innerHTML = `
      <div class="filtros-title">
        <span class="filtro-icon">⚙</span>
        <span>${t('filtersTitle')}</span>
      </div>
    `;
    const clearFiltersBtn = document.createElement('button');
    clearFiltersBtn.type = 'button';
    clearFiltersBtn.className = 'clear-filters-btn';
    clearFiltersBtn.textContent = t('clearSelectedFilters');
    clearFiltersBtn.addEventListener('click', () => {
      filtros = { efecto: new Set(), causa: new Set(), ruta: new Set(), parada: new Set(), operador: new Set() };
      filtroFecha = null; aplicarResetFechaUI();
      applyTriggerSummaries();
      closePopup();
      aplicar();
    });
    headerRow.appendChild(clearFiltersBtn);
    filtrosPanel.appendChild(headerRow);

    const triggersWrap = document.createElement('div');
    triggersWrap.className = 'filtro-triggers';
    filtrosPanel.appendChild(triggersWrap);

    const parades = [...new Set(todosLosPoints.flatMap(f => {
      try {
        return JSON.parse(f.properties['elements afectats'] || '[]')
          .map(e => (e.stop_name || e.stop_id || '').trim())
          .filter(Boolean);
      } catch {
        return [];
      }
    }))].sort();

    const comptadorsParada = Object.fromEntries(
      parades.map(p => [p, todosLosPoints.filter(f => {
        try {
          return JSON.parse(f.properties['elements afectats'] || '[]')
            .map(e => (e.stop_name || e.stop_id || '').trim())
            .filter(Boolean)
            .includes(p);
        } catch {
          return false;
        }
      }).length])
    );

    const groups = [
      { titulo: t('filterEffect'), valores: efectos, clave: 'efecto',
        labelFn: v => `${labelEfecto(v)} <span class="filtro-option-count">${comptadorsEfecte[v] || ''}</span>` },
      ...(causes.length ? [{ titulo: t('filterCause'), valores: causes, clave: 'causa',
        labelFn: v => `${labelCause(v)} <span class="filtro-option-count">${comptadorsCausa[v] || ''}</span>` }] : []),
      { titulo: t('filterRoute'),    valores: rutas,     clave: 'ruta'     },
      { titulo: t('filterStop'),     valores: parades,   clave: 'parada',
        labelFn: v => `${v} <span class="filtro-option-count">${comptadorsParada[v] || ''}</span>` },
      { titulo: t('filterOperator'), valores: operadors, clave: 'operador' },
      // Data de creació — gestionat pel date picker separat
    ];

    groups.forEach(group => {
      triggersWrap.appendChild(crearGrupo(group.titulo, group.valores, group.clave, group.labelFn));
    });

    filtrosPanel.appendChild(filterPopup);
    crearFiltreFecha(filtrosPanel);
    applyTriggerSummaries();
  }


  /* ----------------------------------------------------------
     DATE PICKER — Data de creació
  ---------------------------------------------------------- */
  function aplicarResetFechaUI() {
    const trigger = document.getElementById('date-filter-trigger');
    const meta    = document.getElementById('date-filter-meta');
    const input   = document.getElementById('date-filter-input');
    if (trigger) trigger.classList.remove('active-date');
    if (meta)    { meta.textContent = t('filterAll_meta'); meta.classList.remove('active'); }
    if (input)   input.value = '';
    filtroFecha = null;
  }

  function crearFiltreFecha(parent) {
    document.getElementById('date-filter-wrap')?.remove();

    const wrap = document.createElement('div');
    wrap.id = 'date-filter-wrap';
    wrap.className = 'date-filter-wrap';

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.id   = 'date-filter-trigger';
    trigger.className = 'filtro-trigger';
    trigger.innerHTML = `
      <svg class="date-cal-icon" width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
        <rect x="3" y="4" width="14" height="14" rx="2"/>
        <line x1="7" y1="2" x2="7" y2="6"/>
        <line x1="13" y1="2" x2="13" y2="6"/>
        <line x1="3" y1="9" x2="17" y2="9"/>
      </svg>
      <span class="filtro-trigger-label">${t('filterStart')}</span>
      <span class="filtro-trigger-meta" id="date-filter-meta">${t('filterAll_meta')}</span>`;

    const popup = document.createElement('div');
    popup.id        = 'date-filter-popup';
    popup.className = 'date-filter-popup';

    const inputRow = document.createElement('div');
    inputRow.className = 'date-filter-input-row';

    const input = document.createElement('input');
    input.type        = 'text';
    input.id          = 'date-filter-input';
    input.className   = 'date-filter-input';
    input.placeholder = t('filterDatePlaceholder');
    input.maxLength   = 10;
    input.autocomplete = 'off';

    const errMsg = document.createElement('span');
    errMsg.className = 'date-filter-error';
    errMsg.id        = 'date-filter-error';

    const applyBtn = document.createElement('button');
    applyBtn.type      = 'button';
    applyBtn.className = 'date-filter-apply';
    applyBtn.textContent = t('filterDateApply');

    inputRow.appendChild(input);
    inputRow.appendChild(applyBtn);

    const calWrap = document.createElement('div');
    calWrap.className = 'date-cal-wrap';
    calWrap.id        = 'date-cal-wrap';

    const clearBtn = document.createElement('button');
    clearBtn.type      = 'button';
    clearBtn.className = 'date-filter-clear';
    clearBtn.textContent = t('filterDateClear');

    popup.appendChild(inputRow);
    popup.appendChild(errMsg);
    popup.appendChild(calWrap);
    popup.appendChild(clearBtn);

    wrap.appendChild(trigger);
    parent.appendChild(wrap);
    document.body.appendChild(popup);

    let calYear  = filtroFecha?.y ?? new Date().getFullYear();
    let calMonth = filtroFecha?.m ?? (new Date().getMonth() + 1);
    let popupOpen = false;

    function positionDatePopup() {
      const rect = trigger.getBoundingClientRect();
      const popupRect = popup.getBoundingClientRect();
      const left = Math.min(rect.left, window.innerWidth - popupRect.width - 16);
      const topBelow = rect.bottom + 6;
      const topAbove = rect.top - popupRect.height - 6;
      if (topBelow + popupRect.height <= window.innerHeight || topAbove < 0) {
        popup.style.top = `${topBelow}px`;
      } else {
        popup.style.top = `${Math.max(8, topAbove)}px`;
      }
      popup.style.left = `${Math.max(8, left)}px`;
    }

    function openPopup() {
      popupOpen = true;
      popup.classList.add('open');
      trigger.setAttribute('aria-expanded', 'true');
      renderCalendar();
      positionDatePopup();
    }
    function closePopup() {
      popupOpen = false;
      popup.classList.remove('open');
      trigger.setAttribute('aria-expanded', 'false');
      errMsg.textContent = '';
    }

    trigger.addEventListener('click', e => { e.stopPropagation(); popupOpen ? closePopup() : openPopup(); });

    // Auto-format dd/mm/yyyy
    input.addEventListener('input', () => {
      let v = input.value.replace(/[^0-9]/g, '');
      if (v.length > 2)  v = v.slice(0,2) + '/' + v.slice(2);
      if (v.length > 5)  v = v.slice(0,5) + '/' + v.slice(5);
      if (v.length > 10) v = v.slice(0,10);
      input.value = v;
      errMsg.textContent = '';
    });

    function applyFromInput() {
      const v = input.value.trim();
      if (!v) { filtroFecha = null; aplicarResetFechaUI(); closePopup(); aplicar(); return; }
      const m = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (!m) { errMsg.textContent = t('filterDateInvalid'); return; }
      const [, ds, ms, ys] = m;
      const d = Number(ds), mo = Number(ms), y = Number(ys);
      if (mo < 1 || mo > 12 || d < 1 || d > 31) { errMsg.textContent = t('filterDateInvalid'); return; }
      errMsg.textContent = '';
      filtroFecha = { d, m: mo, y };
      calYear = y; calMonth = mo;
      updateTriggerMeta();
      closePopup();
      aplicar();
    }

    applyBtn.addEventListener('click', applyFromInput);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') applyFromInput(); });
    clearBtn.addEventListener('click', () => { filtroFecha = null; aplicarResetFechaUI(); closePopup(); aplicar(); });

    const MONTHS_CA = ['Gener','Febrer','Març','Abril','Maig','Juny','Juliol','Agost','Setembre','Octubre','Novembre','Desembre'];

    function renderCalendar() {
      calWrap.innerHTML = '';

      const header = document.createElement('div');
      header.className = 'date-cal-header';

      const prevBtn = document.createElement('button');
      prevBtn.type = 'button'; prevBtn.className = 'date-cal-nav'; prevBtn.textContent = '‹';
      prevBtn.addEventListener('click', e => { e.stopPropagation(); calMonth--; if (calMonth < 1) { calMonth = 12; calYear--; } renderCalendar(); });

      const nextBtn = document.createElement('button');
      nextBtn.type = 'button'; nextBtn.className = 'date-cal-nav'; nextBtn.textContent = '›';
      nextBtn.addEventListener('click', e => { e.stopPropagation(); calMonth++; if (calMonth > 12) { calMonth = 1; calYear++; } renderCalendar(); });

      const monthSel = document.createElement('select');
      monthSel.className = 'date-cal-month-sel';
      MONTHS_CA.forEach((name, i) => {
        const opt = document.createElement('option');
        opt.value = i + 1; opt.textContent = name;
        if (i + 1 === calMonth) opt.selected = true;
        monthSel.appendChild(opt);
      });
      monthSel.addEventListener('change', e => { calMonth = Number(e.target.value); renderCalendar(); });

      const yearInput = document.createElement('input');
      yearInput.type      = 'number';
      yearInput.className = 'date-cal-year-input';
      yearInput.value     = calYear;
      yearInput.addEventListener('change', e => { const y = Number(e.target.value); if (!Number.isNaN(y) && y >= 1) { calYear = y; renderCalendar(); } });
      yearInput.addEventListener('keydown', e => e.stopPropagation());
      yearInput.addEventListener('click',   e => e.stopPropagation());

      header.appendChild(prevBtn);
      header.appendChild(monthSel);
      header.appendChild(yearInput);
      header.appendChild(nextBtn);
      calWrap.appendChild(header);

      const daysRow = document.createElement('div');
      daysRow.className = 'date-cal-days-row';
      ['Dl','Dt','Dc','Dj','Dv','Ds','Dg'].forEach(d => {
        const cell = document.createElement('span');
        cell.className = 'date-cal-dayname'; cell.textContent = d;
        daysRow.appendChild(cell);
      });
      calWrap.appendChild(daysRow);

      const grid = document.createElement('div');
      grid.className = 'date-cal-grid';

      const firstDay    = new Date(calYear, calMonth - 1, 1).getDay();
      const offset      = firstDay === 0 ? 6 : firstDay - 1;
      const daysInMonth = new Date(calYear, calMonth, 0).getDate();

      for (let i = 0; i < offset; i++) {
        const blank = document.createElement('span');
        blank.className = 'date-cal-day empty';
        grid.appendChild(blank);
      }
      for (let d = 1; d <= daysInMonth; d++) {
        const cell = document.createElement('button');
        cell.type = 'button'; cell.className = 'date-cal-day';
        cell.textContent = d;
        if (filtroFecha && filtroFecha.d === d && filtroFecha.m === calMonth && filtroFecha.y === calYear)
          cell.classList.add('selected');
        const today = new Date();
        if (d === today.getDate() && calMonth === today.getMonth() + 1 && calYear === today.getFullYear())
          cell.classList.add('today');
        cell.addEventListener('click', e => {
          e.stopPropagation();
          filtroFecha = { d, m: calMonth, y: calYear };
          input.value = `${String(d).padStart(2,'0')}/${String(calMonth).padStart(2,'0')}/${calYear}`;
          errMsg.textContent = '';
          updateTriggerMeta();
          closePopup();
          aplicar();
        });
        grid.appendChild(cell);
      }
      calWrap.appendChild(grid);
    }

    function updateTriggerMeta() {
      const meta = document.getElementById('date-filter-meta');
      if (!meta) return;
      if (filtroFecha) {
        const str = `${String(filtroFecha.d).padStart(2,'0')}/${String(filtroFecha.m).padStart(2,'0')}/${filtroFecha.y}`;
        meta.textContent = str;
        meta.classList.add('active');
        trigger.classList.add('active-date');
      } else {
        meta.textContent = t('filterAll_meta');
        meta.classList.remove('active');
        trigger.classList.remove('active-date');
      }
    }

    document.addEventListener('click', e => { if (!wrap.contains(e.target)) closePopup(); });
    updateTriggerMeta();
  }

  function crearGrupo(titulo, valores, clave, labelFn = v => v) {
    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'filtro-trigger';
    trigger.dataset.clave = clave;
    trigger.innerHTML = `<span class="filtro-trigger-label">${titulo}</span>
      <span class="filtro-trigger-meta">${t('filterAll_meta')}</span>`;
    trigger.addEventListener('click', e => {
      e.stopPropagation();
      if (filterPopup.dataset.clave === clave && filterPopup.style.display === 'block') {
        closePopup(); return;
      }
      renderFiltroPopup({ titulo, valores, clave, labelFn }, trigger);
    });
    return trigger;
  }

  function renderFiltroPopup({ titulo, valores, clave, labelFn }, anchor) {
    filterPopup.innerHTML = '';
    filterPopup.dataset.clave = clave;

    const header = document.createElement('div');
    header.className = 'filtro-popup-head';
    header.innerHTML = `<span>${titulo}</span>
      <button type="button" class="filtro-popup-close" aria-label="Tancar">×</button>`;

    const searchInput = document.createElement('input');
    searchInput.type = 'search';
    searchInput.className = 'filtro-popup-search';
    searchInput.placeholder = t('filterSearch')(titulo);
    searchInput.autocomplete = 'off';

    const list   = document.createElement('div');
    list.className = 'filtro-popup-list';

    const footer   = document.createElement('div');
    footer.className = 'filtro-popup-footer';
    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'filtro-popup-clear';
    clearBtn.textContent = t('filterClear');
    footer.appendChild(clearBtn);

    filterPopup.append(header, searchInput, list, footer);

    function renderOptions(query = '') {
      list.innerHTML = '';
      const q = query.trim().toLowerCase();
      const visible = q
        ? valores.filter(v => {
            const lbl = typeof labelFn === 'function'
              ? labelFn(v).replace(/<[^>]+>/g, '') : String(v);
            return lbl.toLowerCase().includes(q) || String(v).toLowerCase().includes(q);
          })
        : valores;

      if (!visible.length) {
        const empty = document.createElement('div');
        empty.className = 'filtro-popup-empty';
        empty.textContent = t('filterEmpty');
        list.appendChild(empty);
        return;
      }

      visible.forEach(val => {
        const item     = document.createElement('label');
        item.className = 'filtro-popup-item';
        const checkbox = document.createElement('input');
        checkbox.type    = 'checkbox';
        checkbox.checked = filtros[clave].has(val);
        checkbox.dataset.val = val;
        const text     = document.createElement('span');
        text.className = 'filtro-popup-item-text';
        text.innerHTML = typeof labelFn === 'function' ? labelFn(val) : String(val);
        checkbox.addEventListener('change', () => {
          checkbox.checked ? filtros[clave].add(val) : filtros[clave].delete(val);
          applyTriggerSummaries();
          aplicar();
        });
        item.append(checkbox, text);
        list.appendChild(item);
      });
    }

    clearBtn.addEventListener('click', () => {
      filtros[clave].clear();
      renderOptions(searchInput.value);
      applyTriggerSummaries();
      aplicar();
    });
    header.querySelector('.filtro-popup-close').addEventListener('click', closePopup);
    searchInput.addEventListener('input', () => renderOptions(searchInput.value));

    renderOptions();
    applyTriggerSummaries();
    positionPopup(anchor);
    filterPopup.style.display = 'block';
  }

  function positionPopup(anchor) {
    const panelRect  = filtrosPanel.getBoundingClientRect();
    const anchorRect = anchor.getBoundingClientRect();
    const maxWidth   = Math.min(panelRect.width - 24, 320);
    filterPopup.style.width = `${maxWidth}px`;
    filterPopup.style.left  = `${Math.max(8, anchorRect.left - panelRect.left)}px`;
    filterPopup.style.top   = `${anchorRect.bottom - panelRect.top + 8}px`;
  }

  function applyTriggerSummaries() {
    document.querySelectorAll('.filtro-trigger').forEach(trigger => {
      const clave   = trigger.dataset.clave;
      const count   = filtros[clave]?.size ?? 0;
      const summary = trigger.querySelector('.filtro-trigger-meta');
      if (summary) {
        summary.textContent = count ? t('filterSelected')(count) : t('filterAll_meta');
        summary.classList.toggle('active', count > 0);
      }
    });
  }

  function closePopup() {
    filterPopup.style.display = 'none';
    filterPopup.dataset.clave = '';
  }

  /* ----------------------------------------------------------
     APLICAR FILTRES + RENDERITZAR LLISTA
  ---------------------------------------------------------- */
  function aplicar({ silent = false } = {}) {
    if (!silent) {
      popup.remove();
      ocultarLines();
      if (selectedId !== null) {
        map.setFeatureState({ source: 'alerts-points', id: selectedId }, { selected: false });
        selectedId = null;
      }
      if (selectedItemEl) { selectedItemEl.classList.remove('selected'); selectedItemEl = null; }
    }

    const filtrado = todosLosPoints.filter(f => {
      const p = f.properties;
      const okEfecto   = filtros.efecto.size   === 0 || filtros.efecto.has(p.tipo);
      const okCausa    = filtros.causa.size    === 0 || filtros.causa.has(p.causa);
      const okOperador = filtros.operador.size === 0 || filtros.operador.has(p.operador);
      const okPeriodo = (() => {
        if (!filtroFecha) return true;
        if (!p.periodoInicio || p.periodoInicio === t('unknown')) return false;
        const parts = p.periodoInicio.split('/');
        if (parts.length !== 3) return false;
        const [pd, pm, py] = parts.map(Number);
        return pd === filtroFecha.d && pm === filtroFecha.m && py === filtroFecha.y;
      })();
      let okRuta = true;
      if (filtros.ruta.size > 0) {
        try { okRuta = JSON.parse(p.routeIds || '[]').some(r => filtros.ruta.has(r)); }
        catch { okRuta = false; }
      }
      let okParada = true;
      if (filtros.parada.size > 0) {
        try {
          const stops = JSON.parse(p['elements afectats'] || '[]')
            .map(e => (e.stop_name || e.stop_id || '').trim())
            .filter(Boolean);
          okParada = stops.some(stop => filtros.parada.has(stop));
        } catch {
          okParada = false;
        }
      }
      return okEfecto && okCausa && okRuta && okParada && okOperador && okPeriodo;
    });

    const clusterSource = map.getSource('alerts-points');
    const flatSource = map.getSource('alerts-points-flat');
    if (clusterSource) clusterSource.setData({ type: 'FeatureCollection', features: filtrado });
    if (flatSource) flatSource.setData({ type: 'FeatureCollection', features: filtrado });

    const bounds = new maplibregl.LngLatBounds();
    filtrado.forEach(f => bounds.extend(f.geometry.coordinates));
    if (!bounds.isEmpty()) map.fitBounds(bounds, { padding: 40, maxZoom: 12 });

    if (listaHeader) listaHeader.textContent = t('alerts')(filtrado.length);
    if (listaBadgeEl) listaBadgeEl.textContent = filtrado.length;

    const counts = {};
    filtrado.forEach(f => {
      const tipo = f.properties.tipo || 'UNKNOWN_EFFECT';
      counts[tipo] = (counts[tipo] || 0) + 1;
    });
    window.__latestAlertCounts__ = counts;
    actualizarLlegenda();

    if (typeof window.updateKpiAlerts === 'function') {
      window.updateKpiAlerts({ counts });
    }

    if (listaEl) {
      listaEl.innerHTML = '';
      
      // Ordenar segons l'ordre del drawer (més recent / més antic)
      const sortOrder = window.drawerAlertes ? window.drawerAlertes.getSortOrder() : 'newest';
      const filtradoOrdenado = [...filtrado].sort((a, b) => {
        const aTime = a.properties.publishTime || 0;
        const bTime = b.properties.publishTime || 0;
        return sortOrder === 'oldest' ? aTime - bTime : bTime - aTime;
      });
      
      const vistes = new Set();
      filtradoOrdenado.forEach(f => {
        const p = f.properties;
        if (vistes.has(p.id)) return;
        vistes.add(p.id);

        const col         = colorEfecto(p.tipo);
        const hasLines    = (linesByAlertId[p.id] || []).length > 0;
        const publishTime = p.publishTime ? formatTime(new Date(p.publishTime)) : '—';
        const causeText   = p.causa ? ` · ${labelCause(p.causa)}` : '';

        // Nom de l'alerta en l'idioma actiu de la UI
        const _tr = (() => { try { return JSON.parse(p.allTranslations || '{}'); } catch { return {}; } })();
        const nom = _tr.headers?.[UI_LANG]
                 || _tr.headers?.['ca']
                 || Object.values(_tr.headers || {})[0]
                 || _tr.headers?.['es']
                 || _tr.headers?.['en']
                 || p.nombre
                 || t('noName');

        const div = document.createElement('div');
        div.className = 'item';
        div.innerHTML = `
          <div class="item-nombre">
            ${nom}
            ${hasLines ? `<span class="item-lines-badge" title="${t('hasBadge')}">〰</span>` : ''}
          </div>
          <div class="item-sub">${p.operador || ''}${p.periodoInicio ? ' · ' + p.periodoInicio : ''}</div>
          <div class="item-footer">
            <span class="item-badge" style="background:${col}20;color:${col};">
              ${labelEfecto(p.tipo)}${causeText}
            </span>
            <span class="item-publish-time">${publishTime}</span>
          </div>
          <button class="btn-detalle">${t('viewSheet')}</button>
        `;

        div.querySelector('.btn-detalle').addEventListener('click', e => {
          e.stopPropagation();
          openDetailPanel(f);
        });

        div.addEventListener('click', () => {
          if (selectedItemEl) selectedItemEl.classList.remove('selected');
          div.classList.add('selected');
          selectedItemEl = div;
          map.flyTo({ center: f.geometry.coordinates, zoom: 14 });
          map.once('moveend', () => {
            if (selectedId !== null)
              map.setFeatureState({ source: 'alerts-points', id: selectedId }, { selected: false });
            selectedId = f.id;
            map.setFeatureState({ source: 'alerts-points', id: selectedId }, { selected: true });
            mostrarPopup(f);
          });
          if (window.innerWidth <= 640) cerrarSidebar();
        });

        listaEl.appendChild(div);
      });

      if (silent && activeAlertId) {
        const feature = filtrado.find(f => f.properties.id === activeAlertId);
        if (feature) {
          const idOrder = [];
          filtrado.forEach(f => { if (!idOrder.includes(f.properties.id)) idOrder.push(f.properties.id); });
          const idx   = idOrder.indexOf(activeAlertId);
          const items = listaEl.querySelectorAll('.item');
          if (idx >= 0 && items[idx]) {
            if (selectedItemEl) selectedItemEl.classList.remove('selected');
            selectedItemEl = items[idx];
            selectedItemEl.classList.add('selected');
          }
          if (selectedId !== null)
            map.setFeatureState({ source: 'alerts-points', id: selectedId }, { selected: false });
          selectedId = feature.id;
          map.setFeatureState({ source: 'alerts-points', id: selectedId }, { selected: true });
          mostrarLinesDeAlerta(activeAlertId);
          mostrarPopup(feature);
        } else {
          activeAlertId = null;
          popup.remove();
          ocultarLines();
        }
      }
    }
  }

  /* ----------------------------------------------------------
     ARRANCADA + REFRESC
  ---------------------------------------------------------- */
  // Registrar callback d'ordenació del drawer
  if (window.drawerAlertes) {
    window.drawerAlertes.onRender(opts => aplicar(opts));
  }

  // Quan canvia l'idioma, re-renderitzar tot
  document.addEventListener('langchange', () => {
    // 1. Reconstruir etiquetes dels filtres
    construirFiltros();
    // 2. Re-renderitzar la llista (silent per no moure el mapa)
    aplicar({ silent: true });
    // 3. Si hi ha un panell de detall obert, tornar-lo a renderitzar
    if (activeAlertId && isDetailPanelOpen()) {
      const feature = todosLosPoints.find(f => f.properties.id === activeAlertId);
      if (feature) openDetailPanel(feature);
    }
  });

  await loadData();
  setInterval(loadData, 60_000);

  /* ----------------------------------------------------------
     GEOCODER
  ---------------------------------------------------------- */
  initGeocoder(map);

}); // fi map.on('load')
