/* ============================================================
   DRAWER DE LA LLISTA D'ALERTES
   Carrega el fragment HTML de html/drawer-alertes.html,
   el insereix al DOM i gestiona obertura/tancament/ordenació.

   Depèn de: I18n.js  (t)
   Usat per:  mapa.js  (exposa window.drawerAlertes)
   ============================================================ */

(function () {
  /* ----------------------------------------------------------
     ESTAT (definit abans del fetch perquè mapa.js pot cridar
     getSortOrder() en qualsevol moment)
  ---------------------------------------------------------- */
  let sortOrder  = 'newest';   // 'newest' | 'oldest'
  let _renderFn  = null;

  // Referències DOM (s'omplen un cop el fragment és inserit)
  let listaDrawer, btnOpenLista, btnCloseLista,
      btnSortLista, btnSortLabel, listaBadgeEl,
      listaHeader, listaEl, appEl;

  /* ----------------------------------------------------------
     CÀRREGA DEL FRAGMENT HTML
  ---------------------------------------------------------- */
  async function init() {
    // El HTML ja és al DOM (incrustat a index.html)
    listaDrawer   = document.getElementById('lista-drawer');
    btnOpenLista  = document.getElementById('btn-open-lista');
    btnCloseLista = document.getElementById('btn-close-lista');
    btnSortLista  = document.getElementById('btn-sort-lista');
    btnSortLabel  = document.getElementById('btn-sort-label');
    listaBadgeEl  = document.getElementById('btn-lista-badge');
    listaHeader   = document.getElementById('lista-header');
    listaEl       = document.getElementById('lista');
    appEl         = document.getElementById('app');

    bindEvents();
  }

  /* ----------------------------------------------------------
     EVENTS (lligats després d'inserir el fragment)
  ---------------------------------------------------------- */
  function bindEvents() {
    btnOpenLista?.addEventListener('click', () =>
      estaObert() ? tancar() : obrir()
    );
    btnCloseLista?.addEventListener('click', tancar);

    btnSortLista?.addEventListener('click', e => {
      e.stopPropagation();
      sortOrder = sortOrder === 'newest' ? 'oldest' : 'newest';
      actualitzarBotoOrdre();
      if (typeof _renderFn === 'function') _renderFn({ silent: true });
    });
  }

  /* ----------------------------------------------------------
     OBERTURA / TANCAMENT
  ---------------------------------------------------------- */
  function obrir() {
    listaDrawer?.classList.remove('hidden');
    btnOpenLista?.classList.add('open');
    appEl?.classList.add('lista-open');
  }

  function tancar() {
    listaDrawer?.classList.add('hidden');
    btnOpenLista?.classList.remove('open');
    appEl?.classList.remove('lista-open');
  }

  function estaObert() {
    return listaDrawer ? !listaDrawer.classList.contains('hidden') : false;
  }

  /* ----------------------------------------------------------
     ORDENACIÓ
  ---------------------------------------------------------- */
  function actualitzarBotoOrdre() {
    if (!btnSortLista) return;
    const esAntic = sortOrder === 'oldest';
    btnSortLista.classList.toggle('active', esAntic);
    const label = esAntic ? t('sortOldestFirst') : t('sortNewestFirst');
    btnSortLista.setAttribute('aria-label', label);
    btnSortLista.setAttribute('title', label);
    if (btnSortLabel) btnSortLabel.textContent = label;
  }

  /* ----------------------------------------------------------
     BADGE I CAPÇALERA
  ---------------------------------------------------------- */
  function actualitzarCompte(n) {
    if (listaBadgeEl) listaBadgeEl.textContent = n;
    if (listaHeader)  listaHeader.textContent  = t('alerts')(n);
  }

  /* ----------------------------------------------------------
     API PÚBLICA  →  window.drawerAlertes
  ---------------------------------------------------------- */
  window.drawerAlertes = {
    init,
    onRender(fn)      { _renderFn = fn; },
    getSortOrder()    { return sortOrder; },
    setCompte:        actualitzarCompte,
    getLlistaEl()     { return listaEl; },
    obrir,
    tancar,
    estaObert,
  };
})();
