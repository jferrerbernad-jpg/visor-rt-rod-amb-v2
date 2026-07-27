/* ============================================================
   SELECTOR D'IDIOMA AL HEADER
   Gestiona els botons CA / ES / EN del header.
   Depèn de: I18n.js (UI_LANG, t, TRANSLATIONS)
   ============================================================ */

(function () {
  const LANGS = [
    { code: 'ca', label: 'CA' },
    { code: 'es', label: 'ES' },
    { code: 'en', label: 'EN' },
  ];

  /* ----------------------------------------------------------
     Crea el bloc de botons i l'insereix al header-status
  ---------------------------------------------------------- */
  function injectLangButtons() {
    const statusEl = document.querySelector('.header-status');
    if (!statusEl) return;

    const wrap = document.createElement('div');
    wrap.className = 'header-lang';
    wrap.setAttribute('aria-label', "Selecció d'idioma");

    LANGS.forEach(({ code, label }) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn-lang' + (code === UI_LANG ? ' active' : '');
      btn.dataset.lang = code;
      btn.textContent = label;
      btn.setAttribute('aria-label', label);
      btn.addEventListener('click', () => setLang(code));
      wrap.appendChild(btn);
    });

    statusEl.appendChild(wrap);
  }

  /* ----------------------------------------------------------
     Canvia l'idioma global i actualitza la UI
  ---------------------------------------------------------- */
  function setLang(code) {
    if (!TRANSLATIONS[code] || code === UI_LANG) return;
    UI_LANG = code;  // variable global definida a I18n.js

    // Actualitzar botons actius
    document.querySelectorAll('.btn-lang').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === code);
    });

    // Disparar event — mapa.js escolta 'langchange' i actualitza tot
    document.dispatchEvent(new CustomEvent('langchange', { detail: { lang: code } }));
  }

  /* ----------------------------------------------------------
     Inicialitzar un cop el DOM estigui llest
  ---------------------------------------------------------- */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectLangButtons);
  } else {
    injectLangButtons();
  }

  window.langSwitcher = { setLang };
})();
