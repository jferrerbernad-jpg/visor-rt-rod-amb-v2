/* ============================================================
   GEOCODER — Nominatim (OpenStreetMap)
   S'inicialitza cridant: initGeocoder(map)
   ============================================================ */

function initGeocoder(map) {

  /* ── Crear el contenidor del widget ─────────────────────── */
  const wrapper = document.createElement('div');
  wrapper.id = 'geocoder-wrapper';
  wrapper.className = 'geocoder-wrapper';
  wrapper.innerHTML = `
    <div class="geocoder-box">
      <svg class="geocoder-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="8.5" cy="8.5" r="5.5"/>
        <line x1="13" y1="13" x2="18" y2="18"/>
      </svg>
      <input
        id="geocoder-input"
        class="geocoder-input"
        type="text"
        placeholder="Cerca un lloc…"
        autocomplete="off"
        spellcheck="false"
      />
      <button id="geocoder-clear" class="geocoder-clear" title="Netejar" style="display:none">×</button>
    </div>
    <ul id="geocoder-results" class="geocoder-results" style="display:none"></ul>
  `;

  /* Inserir al #map-wrap, a sobre del mapa */
  document.getElementById('map-wrap').appendChild(wrapper);

  /* ── Elements ────────────────────────────────────────────── */
  const input    = wrapper.querySelector('#geocoder-input');
  const clearBtn = wrapper.querySelector('#geocoder-clear');
  const results  = wrapper.querySelector('#geocoder-results');

  /* ── Marcador del resultat seleccionat ───────────────────── */
  let marker = null;

  function placeMarker(lon, lat, label) {
    if (marker) marker.remove();
    const el = document.createElement('div');
    el.className = 'geocoder-marker';
    el.innerHTML = `
      <svg viewBox="0 0 24 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 24 12 24S24 21 24 12C24 5.373 18.627 0 12 0z" fill="#23b48d"/>
        <circle cx="12" cy="12" r="5" fill="white"/>
      </svg>
    `;
    marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
      .setLngLat([lon, lat])
      .setPopup(new maplibregl.Popup({ offset: 30, closeButton: false })
        .setHTML(`<div class="geocoder-popup-label">${label}</div>`))
      .addTo(map);
    marker.togglePopup();
  }

  /* ── Tancar resultats ────────────────────────────────────── */
  function closeResults() {
    results.style.display = 'none';
    results.innerHTML = '';
  }

  /* ── Netejar tot ─────────────────────────────────────────── */
  function clearGeocoder() {
    input.value = '';
    clearBtn.style.display = 'none';
    closeResults();
    if (marker) { marker.remove(); marker = null; }
    input.focus();
  }

  clearBtn.addEventListener('click', clearGeocoder);

  /* ── Debounce ────────────────────────────────────────────── */
  let debounceTimer = null;

  input.addEventListener('input', () => {
    const q = input.value.trim();
    clearBtn.style.display = q ? 'flex' : 'none';
    clearTimeout(debounceTimer);
    if (q.length < 3) { closeResults(); return; }
    debounceTimer = setTimeout(() => fetchResults(q), 350);
  });

  /* ── Fetch Nominatim ─────────────────────────────────────── */
  async function fetchResults(query) {
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', query);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '6');
    url.searchParams.set('countrycodes', 'es');          // prioritzar Espanya
    url.searchParams.set('accept-language', 'ca,es,en');

    try {
      const res  = await fetch(url, { headers: { 'Accept-Language': 'ca,es,en' } });
      const data = await res.json();
      renderResults(data);
    } catch (err) {
      console.warn('Nominatim error:', err);
      closeResults();
    }
  }

  /* ── Renderitzar resultats ───────────────────────────────── */
  function renderResults(data) {
    results.innerHTML = '';

    if (!data.length) {
      results.innerHTML = '<li class="geocoder-no-results">Sense resultats</li>';
      results.style.display = 'block';
      return;
    }

    data.forEach(item => {
      const li = document.createElement('li');
      li.className = 'geocoder-item';

      // Nom principal + tipus
      const name = item.display_name.split(',')[0];
      const rest = item.display_name.split(',').slice(1, 3).join(',').trim();

      li.innerHTML = `
        <span class="geocoder-item-name">${name}</span>
        <span class="geocoder-item-sub">${rest}</span>
      `;

      li.addEventListener('click', () => {
        const lon = parseFloat(item.lon);
        const lat = parseFloat(item.lat);

        input.value = item.display_name.split(',').slice(0, 2).join(',');
        clearBtn.style.display = 'flex';
        closeResults();

        map.flyTo({ center: [lon, lat], zoom: 14, duration: 900 });
        placeMarker(lon, lat, name);
      });

      results.appendChild(li);
    });

    results.style.display = 'block';
  }

  /* ── Tancar en clicar fora ───────────────────────────────── */
  document.addEventListener('click', e => {
    if (!wrapper.contains(e.target)) closeResults();
  });

  /* ── Navegar amb teclat ──────────────────────────────────── */
  input.addEventListener('keydown', e => {
    const items = results.querySelectorAll('.geocoder-item');
    const active = results.querySelector('.geocoder-item.focused');
    if (!items.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = active ? active.nextElementSibling : items[0];
      if (active) active.classList.remove('focused');
      if (next) next.classList.add('focused');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = active ? active.previousElementSibling : items[items.length - 1];
      if (active) active.classList.remove('focused');
      if (prev) prev.classList.add('focused');
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const focused = results.querySelector('.geocoder-item.focused');
      if (focused) focused.click();
      else if (items[0]) items[0].click();
    } else if (e.key === 'Escape') {
      closeResults();
      input.blur();
    }
  });
}