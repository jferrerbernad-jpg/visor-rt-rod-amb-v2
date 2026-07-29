/* ============================================================
   INTERNACIONALITZACIÓ (hardcoded ca / es / en)
   ============================================================ */
const TRANSLATIONS = {
  ca: {
    lastUpdate:        "Última actualització",
    noRealtime:        "Sense realtime",
    serviceStatus:     "Estat del servei",
    published:         "Publicat",
    filterAll:         "↺ Veure totes les alteracions",
    filterEffect:      "Tipus incidència",
    filterCause:       "Causa",
    filterRoute:       "Ruta",
    filterOperator:    "Operador",
    filterStop:        "Parada",
    filtersTitle:      "Filtres",
    clearSelectedFilters: "Netejar filtres seleccionats",
    filterStart:       "Data de creació",
    filterDatePlaceholder: "dd/mm/aaaa",
    filterDateClear:   "Netejar data",
    filterDateApply:   "Aplicar",
    filterDateInvalid: "Format incorrecte (dd/mm/aaaa)",
    sortByDate:        "Ordenar per data",
    sortOldestFirst:   "Més antiga",
    sortNewestFirst:   "Més recent",
    filterAll_meta:    "Tots",
    filterSelected:    n => `${n} seleccionat${n !== 1 ? 's' : ''}`,
    filterSearch:      cat => `Cerca ${cat.toLowerCase()}…`,
    filterClear:       "Netejar",
    filterEmpty:       "Sense resultats",
    noName:            "Sense nom",
    effect:            "Efecte",
    cause:             "Causa",
    operator:          "Operador",
    activePeriod:      "Període actiu",
    routes:            "Rutes",
    affectedStops:     "Parades afectades",
    description:       "Descripció",
    moreInfo:          "Més informació",
    trace:             "Traçat",
    openLink:          "Obrir enllaç",
    viewDetail:        "Veure detall alteració →",
    viewSheet:         "Veure fitxa →",
    alteration:        "Alteració",
    language:          "Idioma",
    clustered:         n => `${n} alertes agrupades`,
    clusterZoom:       "Fes zoom per veure-les individualment",
    noTraceData:       "Sense dades de tipus",
    hasBadge:          "Té traçat de ruta",
    unknown:           "Desconegut",
    hoverHint:         "Passa sobre un punt",
    alerts:            n => `${n} alerta${n !== 1 ? 's' : ''}`,
  },
  es: {
    lastUpdate:        "Última actualización",
    noRealtime:        "Sin realtime",
    serviceStatus:     "Estado del servicio",
    published:         "Publicado",
    filterAll:         "↺ Ver todas las alteraciones",
    filterEffect:      "Tipo de incidencia",
    filterCause:       "Causa",
    filterRoute:       "Línea",
    filterOperator:    "Operador",
    filterStop:        "Parada",
    filtersTitle:      "Filtros",
    clearSelectedFilters: "Limpiar filtros seleccionados",
    filterStart:       "Fecha de creación",
    filterDatePlaceholder: "dd/mm/aaaa",
    filterDateClear:   "Limpiar fecha",
    filterDateApply:   "Aplicar",
    filterDateInvalid: "Formato incorrecto (dd/mm/aaaa)",
    sortByDate:        "Ordenar por fecha",
    sortOldestFirst:   "Más antigua",
    sortNewestFirst:   "Más reciente",
    filterAll_meta:    "Todos",
    filterSelected:    n => `${n} seleccionado${n !== 1 ? 's' : ''}`,
    filterSearch:      cat => `Buscar ${cat.toLowerCase()}…`,
    filterClear:       "Limpiar",
    filterEmpty:       "Sin resultados",
    noName:            "Sin nombre",
    effect:            "Efecto",
    cause:             "Causa",
    operator:          "Operador",
    activePeriod:      "Período activo",
    routes:            "Líneas",
    affectedStops:     "Paradas afectadas",
    description:       "Descripción",
    moreInfo:          "Más información",
    trace:             "Trazado",
    openLink:          "Abrir enlace",
    viewDetail:        "Ver detalle alteración →",
    viewSheet:         "Ver ficha →",
    alteration:        "Alteración",
    language:          "Idioma",
    clustered:         n => `${n} alertas agrupadas`,
    clusterZoom:       "Haz zoom para verlas individualmente",
    noTraceData:       "Sin datos de tipo",
    hasBadge:          "Tiene trazado de ruta",
    unknown:           "Desconocido",
    hoverHint:         "Pasa sobre un punto",
    alerts:            n => `${n} alerta${n !== 1 ? 's' : ''}`,
  },
  en: {
    lastUpdate:        "Last update",
    noRealtime:        "No realtime",
    serviceStatus:     "Service status",
    published:         "Published",
    filterAll:         "↺ Show all alerts",
    filterEffect:      "Incident type",
    filterCause:       "Cause",
    filterRoute:       "Route",
    filterOperator:    "Operator",
    filterStop:        "Stop",
    filtersTitle:      "Filters",
    clearSelectedFilters: "Clear selected filters",
    filterStart:       "Creation date",
    filterDatePlaceholder: "dd/mm/yyyy",
    filterDateClear:   "Clear date",
    filterDateApply:   "Apply",
    filterDateInvalid: "Invalid format (dd/mm/yyyy)",
    sortByDate:        "Sort by date",
    sortOldestFirst:   "Oldest",
    sortNewestFirst:   "Newest",
    filterAll_meta:    "All",
    filterSelected:    n => `${n} selected`,
    filterSearch:      cat => `Search ${cat.toLowerCase()}…`,
    filterClear:       "Clear",
    filterEmpty:       "No results",
    noName:            "No name",
    effect:            "Effect",
    cause:             "Cause",
    operator:          "Operator",
    activePeriod:      "Active period",
    routes:            "Routes",
    affectedStops:     "Affected stops",
    description:       "Description",
    moreInfo:          "More info",
    trace:             "Trace",
    openLink:          "Open link",
    viewDetail:        "View alert detail →",
    viewSheet:         "View sheet →",
    alteration:        "Alteration",
    language:          "Language",
    clustered:         n => `${n} grouped alerts`,
    clusterZoom:       "Zoom in to see them individually",
    noTraceData:       "No type data",
    hasBadge:          "Has route trace",
    unknown:           "Unknown",
    hoverHint:         "Hover over a point",
    alerts:            n => `${n} alert${n !== 1 ? 's' : ''}`,
  },
};

let UI_LANG = 'ca';
window.UI_LANG = UI_LANG;

// Getter/setter per mantenir sincronitzada la variable local amb window.UI_LANG
Object.defineProperty(window, 'UI_LANG', {
  get() { return UI_LANG; },
  set(v) { UI_LANG = v; },
  configurable: true,
});

const t = key => {
  const val = TRANSLATIONS[UI_LANG]?.[key] ?? TRANSLATIONS.ca[key];
  return val ?? key;
};

/* ============================================================
   EFECTES — labels i colors
   ============================================================ */
const EFFECT_LABELS = {
  ca: {
    NO_SERVICE:         "Sense servei",
    REDUCED_SERVICE:    "Servei reduït",
    SIGNIFICANT_DELAYS: "Retards significatius",
    DETOUR:             "Desviament",
    ADDITIONAL_SERVICE: "Servei addicional",
    MODIFIED_SERVICE:   "Servei modificat",
    OTHER_EFFECT:       "Altres efectes",
    UNKNOWN_EFFECT:     "Efecte desconegut",
    STOP_MOVED:         "Trasllat de parada",
    NO_EFFECT:          "Sense efecte",
  },
  es: {
    NO_SERVICE:         "Sin servicio",
    REDUCED_SERVICE:    "Servicio reducido",
    SIGNIFICANT_DELAYS: "Retrasos significativos",
    DETOUR:             "Desvío",
    ADDITIONAL_SERVICE: "Servicio adicional",
    MODIFIED_SERVICE:   "Servicio modificado",
    OTHER_EFFECT:       "Otros efectos",
    UNKNOWN_EFFECT:     "Efecto desconocido",
    STOP_MOVED:         "Traslado de parada",
    NO_EFFECT:          "Sin efecto",
  },
  en: {
    NO_SERVICE:         "No service",
    REDUCED_SERVICE:    "Reduced service",
    SIGNIFICANT_DELAYS: "Significant delays",
    DETOUR:             "Detour",
    ADDITIONAL_SERVICE: "Additional service",
    MODIFIED_SERVICE:   "Modified service",
    OTHER_EFFECT:       "Other effects",
    UNKNOWN_EFFECT:     "Unknown effect",
    STOP_MOVED:         "Stop moved",
    NO_EFFECT:          "No effect",
  },
};

const COLORS = {
  NO_SERVICE:         "#2563eb",
  REDUCED_SERVICE:    "#2563eb",
  SIGNIFICANT_DELAYS: "#2563eb",
  DETOUR:             "#2563eb",
  ADDITIONAL_SERVICE: "#2563eb",
  MODIFIED_SERVICE:   "#2563eb",
  OTHER_EFFECT:       "#2563eb",
  UNKNOWN_EFFECT:     "#2563eb",
  STOP_MOVED:         "#2563eb",
  NO_EFFECT:          "#2563eb",
};

function colorEfecto(effect) { return COLORS[effect] || COLORS.UNKNOWN_EFFECT; }

function labelEfecto(effect) {
  return EFFECT_LABELS[UI_LANG]?.[effect]
      ?? EFFECT_LABELS.ca[effect]
      ?? effect
      ?? t('unknown');
}

/* ============================================================
   CAUSES — labels
   ============================================================ */
const CAUSE_LABELS = {
  ca: {
    UNKNOWN_CAUSE:       "Causa desconeguda",
    OTHER_CAUSE:         "Altra causa",
    TECHNICAL_PROBLEM:   "Problema tècnic",
    STRIKE:              "Vaga",
    DEMONSTRATION:       "Manifestació",
    ACCIDENT:            "Accident",
    HOLIDAY:             "Festiu",
    WEATHER:             "Meteorologia",
    MAINTENANCE:         "Obres / manteniment",
    CONSTRUCTION:        "Construcció",
    POLICE_ACTIVITY:     "Activitat policial",
    MEDICAL_EMERGENCY:   "Emergència mèdica",
  },
  es: {
    UNKNOWN_CAUSE:       "Causa desconocida",
    OTHER_CAUSE:         "Otra causa",
    TECHNICAL_PROBLEM:   "Problema técnico",
    STRIKE:              "Huelga",
    DEMONSTRATION:       "Manifestación",
    ACCIDENT:            "Accidente",
    HOLIDAY:             "Festivo",
    WEATHER:             "Meteorología",
    MAINTENANCE:         "Obras / mantenimiento",
    CONSTRUCTION:        "Construcción",
    POLICE_ACTIVITY:     "Actividad policial",
    MEDICAL_EMERGENCY:   "Emergencia médica",
  },
  en: {
    UNKNOWN_CAUSE:       "Unknown cause",
    OTHER_CAUSE:         "Other cause",
    TECHNICAL_PROBLEM:   "Technical problem",
    STRIKE:              "Strike",
    DEMONSTRATION:       "Demonstration",
    ACCIDENT:            "Accident",
    HOLIDAY:             "Holiday",
    WEATHER:             "Weather",
    MAINTENANCE:         "Maintenance / works",
    CONSTRUCTION:        "Construction",
    POLICE_ACTIVITY:     "Police activity",
    MEDICAL_EMERGENCY:   "Medical emergency",
  },
};

function labelCause(cause) {
  return CAUSE_LABELS[UI_LANG]?.[cause]
      ?? CAUSE_LABELS.ca[cause]
      ?? cause
      ?? t('unknown');
}

/* ============================================================
   UTILITATS GENERALS
   ============================================================ */
function pad(v) { return String(v).padStart(2, '0'); }

function formatDateTime(date) {
  return `${pad(date.getDate())}/${pad(date.getMonth()+1)}/${date.getFullYear()} `
       + `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function formatTime(date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function centroide(coords) {
  const sum = coords.reduce((acc, c) => [acc[0] + c[0], acc[1] + c[1]], [0, 0]);
  return [sum[0] / coords.length, sum[1] / coords.length];
}

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