/* ============================================================
   DETAIL PANEL — fitxa completa d'una alerta
   Depèn de: i18n.js (t, labelEfecto, labelCause, formatDateTime, formatTime)
   ============================================================ */

let currentAlertTranslations = null;
let _detailPanel = null;
let _onDetailClose = null;   // callback opcional: s'executa en tancar

/* ──────────────────────────────────────────────────────────────
   Construeix i insereix el panell al DOM
   Carrega el HTML de html/detall-alerta.html via fetch.
   Crida-la UNA SOLA VEGADA des de mapa.js quan el mapa es carrega.
   ────────────────────────────────────────────────────────────── */
async function initDetailPanel(container, onClose) {
  if (_detailPanel) return _detailPanel;
  _onDetailClose = onClose || null;

  // Carregar el fragment HTML extern
  const res  = await fetch('../html/detall-alerta.html');
  const html = await res.text();
  const tmp  = document.createElement('div');
  tmp.innerHTML = html;
  const panel = tmp.querySelector('#detail-panel');
  container.appendChild(panel);
  _detailPanel = panel;

  /* Botó tancar */
  panel.querySelector('#detail-close')
    ?.addEventListener('click', closeDetailPanel);

  return panel;
}

/* ──────────────────────────────────────────────────────────────
   Obre el panell amb les dades d'un feature
   ────────────────────────────────────────────────────────────── */
function openDetailPanel(feature) {
  if (!_detailPanel) return;
  const p = feature.properties;

  /* Traduccions del contingut */
  try { currentAlertTranslations = JSON.parse(p.allTranslations || '{}'); }
  catch { currentAlertTranslations = null; }


  /* Entitats afectades */
  let entitats = [];
  try { entitats = JSON.parse(p['elements afectats'] || '[]'); } catch {}

  /* Rutes */
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

  /* Parades */
  const stops = [...new Set(entitats.map(e => e.stop_name || e.stop_id).filter(Boolean))];
  const stopsHTML = stops.length
    ? stops.map(s => `<span class="detail-tag detail-tag-stop">${s}</span>`).join(' ')
    : '—';

  /* Descripció: usa l'idioma de la UI (UI_LANG) */
  function getDesc() {
    const d = currentAlertTranslations?.descriptions;
    if (!d) return p.descripcion || '—';
    return d[UI_LANG] || d['ca'] || d['es'] || d['en']
        || Object.values(d)[0]
        || d?.ca
        || p.descripcion || '—';
  }
  const desc = getDesc();

  /* Emplenar camps */
  _detailPanel.querySelector('#detail-title').textContent    = p.nombre    || t('noName');
  _detailPanel.querySelector('#detail-subtitle').textContent = `${t('alteration')}: ${p.id || '—'}`;
  _detailPanel.querySelector('#detail-operador').textContent = p.operador  || '—';
  _detailPanel.querySelector('#detail-efecto').textContent   = labelEfecto(p.tipo);
  _detailPanel.querySelector('#detail-effect-summary').textContent =
    (p.tipo === 'ssc' && p.effectSummary) ? p.effectSummary : '';

  /* Causa */
  const causeRow = _detailPanel.querySelector('#detail-cause-row');
  if (p.causa) {
    _detailPanel.querySelector('#detail-causa').textContent = labelCause(p.causa);
    causeRow.style.display = '';
  } else {
    causeRow.style.display = 'none';
  }

  _detailPanel.querySelector('#detail-routes').innerHTML      = routesHTML;
  _detailPanel.querySelector('#detail-stops').innerHTML       = stopsHTML;
  _detailPanel.querySelector('#detail-description').textContent = desc;

  /* Període actiu */
  _detailPanel.querySelector('#detail-publish-time').textContent = p.publishTime
    ? formatDateTime(new Date(p.publishTime))
    : '—';

  /* Enllaç */
  const link = _detailPanel.querySelector('#detail-more-info');
  if (p.url) {
    link.href          = p.url.startsWith('http') ? p.url : `https://${p.url}`;
    link.textContent   = t('openLink');
    link.style.display = 'inline-block';
  } else {
    link.removeAttribute('href');
    link.textContent   = '';
    link.style.display = 'none';
  }

  /* Labels traduïts de la UI */
  _detailPanel.querySelector('#lbl-effect').textContent   = `${t('effect')}: `;
  _detailPanel.querySelector('#lbl-cause').textContent    = `${t('cause')}: `;
  _detailPanel.querySelector('#lbl-operator').textContent = `${t('operator')}: `;
  _detailPanel.querySelector('#lbl-period').textContent   = `${t('activePeriod')}: `;
  _detailPanel.querySelector('#lbl-routes').textContent   = `${t('routes')}: `;
  _detailPanel.querySelector('#lbl-stops').textContent    = `${t('affectedStops')}: `;
  _detailPanel.querySelector('#lbl-desc').textContent     = `${t('description')}: `;
  _detailPanel.querySelector('#lbl-more').textContent     = `${t('moreInfo')}: `;

  _detailPanel.classList.remove('hidden');
}

/* ──────────────────────────────────────────────────────────────
   Tanca el panell
   ────────────────────────────────────────────────────────────── */
function closeDetailPanel() {
  if (!_detailPanel) return;
  _detailPanel.classList.add('hidden');
  if (_onDetailClose) _onDetailClose();
}

function isDetailPanelOpen() {
  return _detailPanel && !_detailPanel.classList.contains('hidden');
}

function isDetailPanelElement(el) {
  return _detailPanel && _detailPanel.contains(el);
}