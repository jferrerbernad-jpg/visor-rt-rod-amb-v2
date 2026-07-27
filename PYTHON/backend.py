# -- coding: utf-8 --
import os
import csv
import requests
import re
from ftfy import fix_text
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__, static_folder="../HTML", static_url_path="")
CORS(app)

@app.route("/")
def index():
    return app.send_static_file("index.html")

API_URL = "https://t-mobilitat.atm.cat/opendata/alerts/json/user/token/open"

OPERATORS = ["ROD_", "AMB_"]

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if not os.path.exists(os.path.join(BASE_DIR, "GTFS_TMOB")):
    BASE_DIR = os.path.dirname(BASE_DIR)
print(f"BASE_DIR: {BASE_DIR}")


# ─────────────────────────────────────────────────────────────────────────────
# Helpers encoding / delimitador
# ─────────────────────────────────────────────────────────────────────────────

def detect_encoding(path: str) -> str:
    for enc in ("utf-8-sig", "utf-8", "latin-1", "cp1252"):
        try:
            with open(path, "r", encoding=enc) as f:
                f.read(8192)
            return enc
        except UnicodeDecodeError:
            continue
    return "utf-8"


def detect_delimiter(path: str, encoding: str) -> str:
    with open(path, "r", encoding=encoding) as f:
        header = f.readline()
    return "\t" if "\t" in header else ","


def open_gtfs(path: str):
    enc   = detect_encoding(path)
    delim = detect_delimiter(path, enc)
    f     = open(path, "r", encoding=enc, errors="replace", newline="")
    return f, csv.DictReader(f, delimiter=delim)


TEXT_FIELDS = {
    "stop_name", "route_long_name", "route_short_name", "trip_headsign",
}

def fix_row(row: dict) -> dict:
    return {
        k: fix_text(v) if isinstance(v, str) and k in TEXT_FIELDS else v
        for k, v in row.items()
    }


from typing import Any

def fix_json_strings(obj: Any, parent_key: str = "") -> Any:
    SKIP_KEYS = {"url", "href", "link"}
    if isinstance(obj, str):
        if parent_key.lower() in SKIP_KEYS:
            return obj
        if obj.startswith("http://") or obj.startswith("https://"):
            return obj
        return fix_text(obj)
    elif isinstance(obj, dict):
        return {k: fix_json_strings(v, k) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [fix_json_strings(item, parent_key) for item in obj]
    return obj


# ─────────────────────────────────────────────────────────────────────────────
# Utilitats
# ─────────────────────────────────────────────────────────────────────────────

def strip_operator_prefix(value: str) -> str:
    for op in OPERATORS:
        if value.startswith(op):
            return value[len(op):]
    return value


def matches_any_operator(value: str, active_ops: list) -> bool:
    return any(value.startswith(op) for op in active_ops)


def normalize_route_id(route_id: str) -> str | None:
    if not route_id:
        return None
    clean = strip_operator_prefix(route_id)
    match = re.search(r"(RL\d+|R\d+|RG\d+)", clean)
    return match.group(1) if match else clean


def _centroid(coords: list[tuple[float, float]]) -> dict | None:
    """Calcula el centroide d'una llista de (lat, lon). Retorna GeoJSON Point."""
    if not coords:
        return None
    lat = sum(c[0] for c in coords) / len(coords)
    lon = sum(c[1] for c in coords) / len(coords)
    return {"type": "Point", "coordinates": [lon, lat]}


# ─────────────────────────────────────────────────────────────────────────────
# Carrega STOPS
# ─────────────────────────────────────────────────────────────────────────────
STOPS: dict[str, dict] = {}


def load_stops():
    global STOPS
    STOPS = {}

    def load_file(path: str) -> int:
        count = 0
        if not os.path.exists(path):
            print(f"  ⚠️  No encontrado: {path}")
            return count
        f, reader = open_gtfs(path)
        enc   = detect_encoding(path)
        delim = detect_delimiter(path, enc)
        print(f"  {os.path.basename(path)}: encoding={enc}, "
              f"delimiter={'TAB' if delim == chr(9) else 'COMMA'}")
        try:
            for row in reader:
                row = fix_row(row)
                stop_id = (row.get("stop_id") or "").strip()
                lat_raw = (row.get("stop_lat") or "").strip()
                lon_raw = (row.get("stop_lon") or "").strip()
                if not stop_id or not lat_raw or not lon_raw:
                    continue
                try:
                    lat = float(lat_raw)
                    lon = float(lon_raw)
                except ValueError:
                    continue
                clean_id  = strip_operator_prefix(stop_id)
                stop_name = (row.get("stop_name") or "").strip()
                STOPS[clean_id] = {"stop_name": stop_name, "lat": lat, "lon": lon}
                count += 1
        finally:
            f.close()
        return count

    base = os.path.join(os.path.dirname(__file__), "..")
    rod = load_file(os.path.join(base, "stops_rod.txt"))
    amb = load_file(os.path.join(base, "stops_amb.txt"))
    print(f"Stops ROD: {rod} | AMB: {amb} | Total: {len(STOPS)}")


# ─────────────────────────────────────────────────────────────────────────────
# Carrega SHAPES
# ─────────────────────────────────────────────────────────────────────────────
SHAPES: dict[str, list] = {}


def load_shapes():
    global SHAPES
    SHAPES = {}

    def load_shape_file(path: str) -> int:
        count = 0
        if not os.path.exists(path):
            print(f"  ⚠️  No encontrado: {path}")
            return count
        f, reader = open_gtfs(path)
        try:
            for row in reader:
                shape_id = (row.get("shape_id") or "").strip()
                lat_raw  = (row.get("shape_pt_lat") or "").strip()
                lon_raw  = (row.get("shape_pt_lon") or "").strip()
                seq_raw  = (row.get("shape_pt_sequence") or "0").strip()
                if not shape_id or not lat_raw or not lon_raw:
                    continue
                try:
                    lat = float(lat_raw)
                    lon = float(lon_raw)
                    seq = int(seq_raw) if seq_raw else 0
                except ValueError:
                    continue
                SHAPES.setdefault(shape_id, []).append((seq, lat, lon))
                count += 1
        finally:
            f.close()
        for k in SHAPES:
            SHAPES[k].sort(key=lambda x: x[0])
        return count

    base = os.path.join(os.path.dirname(__file__), "..")
    rod = load_shape_file(os.path.join(base, "shapes_rod.txt"))
    amb = load_shape_file(os.path.join(base, "shapes_amb.txt"))
    print(f"Shapes cargados — ROD+AMB: {rod + amb} puntos | Total shapes: {len(SHAPES)}")


def get_shape_from_route(route_id: str) -> list[dict]:
    route = normalize_route_id(route_id)
    if not route:
        return []
    candidates = [
        sid for sid in SHAPES
        if sid.startswith(route) or strip_operator_prefix(sid).startswith(route)
    ]
    if not candidates:
        return []
    best = sorted(candidates, key=len)[0]
    return [{"lat": lat, "lon": lon} for _, lat, lon in SHAPES[best]]


# ─────────────────────────────────────────────────────────────────────────────
# Carrega ROUTES
# ─────────────────────────────────────────────────────────────────────────────
ROUTES: dict[str, dict] = {}


def load_routes(file_path="GTFS_TMOB/routes.txt"):
    global ROUTES
    ROUTES = {}
    path = os.path.join(BASE_DIR, file_path)
    print(f"load_routes path: {path} | exists: {os.path.exists(path)}")
    if not os.path.exists(path):
        print(f"⚠️  routes.txt no encontrado en: {path}")
        return
    try:
        f, reader = open_gtfs(path)
        skipped = 0
        try:
            for row in reader:
                row      = fix_row(row)
                route_id = (row.get("route_id") or "").strip()
                if not any(route_id.startswith(op) for op in OPERATORS):
                    skipped += 1
                    continue
                ROUTES[route_id] = {
                    "route_short_name": (row.get("route_short_name") or "").strip() or None,
                    "route_long_name":  (row.get("route_long_name")  or "").strip() or None,
                    "route_color":      (row.get("route_color")      or "").strip() or None,
                    "route_text_color": (row.get("route_text_color") or "").strip() or None,
                }
        finally:
            f.close()
        print(f"Routes cargadas: {len(ROUTES)} ({skipped} descartadas)")
    except Exception as e:
        print(f"Error loading routes: {e}")


def get_route_info(route_id: str) -> dict:
    if not route_id:
        return {}
    return ROUTES.get(route_id) or ROUTES.get(strip_operator_prefix(route_id)) or {}


# ─────────────────────────────────────────────────────────────────────────────
# Enriquiment (sense canvis)
# ─────────────────────────────────────────────────────────────────────────────

def enrich_informed_entity(informed_list: list[dict]) -> list[dict]:
    enriched = []
    for e in informed_list:
        new_entity = dict(e)
        stop_id  = e.get("stop_id")
        route_id = e.get("route_id")

        if stop_id:
            clean_stop = strip_operator_prefix(stop_id)
            stop = STOPS.get(clean_stop)
            if stop:
                new_entity["stop_name"] = stop["stop_name"]
                new_entity["lat"]       = stop["lat"]
                new_entity["lon"]       = stop["lon"]
                new_entity["geometry"]  = {
                    "type": "Point",
                    "coordinates": [stop["lon"], stop["lat"]],
                }
            else:
                new_entity["stop_name"] = None
                new_entity["lat"]       = None
                new_entity["lon"]       = None
                new_entity["geometry"]  = None

        if route_id:
            route_info = get_route_info(route_id)
            if route_info:
                new_entity["route_short_name"] = route_info.get("route_short_name")
                new_entity["route_long_name"]  = route_info.get("route_long_name")
                new_entity["route_color"]      = route_info.get("route_color")
                new_entity["route_text_color"] = route_info.get("route_text_color")

            if not stop_id:
                shape = get_shape_from_route(route_id)
                if shape:
                    new_entity["geometry"] = {
                        "type": "LineString",
                        "coordinates": [[p["lon"], p["lat"]] for p in shape],
                    }

        for field in ("stop_id", "route_id", "agency_id"):
            val = e.get(field) or ""
            if val:
                for op in OPERATORS:
                    if val.startswith(op):
                        new_entity["operator"] = op.rstrip("_")
                        break

        enriched.append(new_entity)
    return enriched


# ─────────────────────────────────────────────────────────────────────────────
# Agrupació per cas → un punt per alerta (o per route_id al cas 6)
# ─────────────────────────────────────────────────────────────────────────────

def _detect_case(route_ids: list[str], stop_ids: list[str]) -> int:
    """
    Retorna el número de cas (1-6) a partir de les llistes ja deduplicades.

    Cas 1 – 1 stop, sense ruta
    Cas 2 – +1 stop, sense ruta
    Cas 3 – 1 ruta, sense stops
    Cas 4 – 1 ruta + stops
    Cas 5 – +1 rutes + stops (array net)
    Cas 6 – +1 rutes + stops (array barrejat / route_ids duplicats al raw)
    """
    n_routes = len(route_ids)
    n_stops  = len(stop_ids)

    if n_routes == 0 and n_stops == 1:
        return 1
    if n_routes == 0 and n_stops > 1:
        return 2
    if n_routes == 1 and n_stops == 0:
        return 3
    if n_routes == 1 and n_stops > 0:
        return 4
    # +1 rutes
    # Cas 6: hi ha route_ids duplicats o l'ordre és barrejat al raw
    # Ho detectem comparant la llista raw amb la deduplicada
    return 5  # el caller pot forçar cas 6 si detecta duplicats al raw


def _raw_has_mixed_or_duplicates(informed_raw: list[dict]) -> bool:
    """
    Retorna True si l'array té route_ids repetits o route/stop barrejats
    (és a dir, apareix un route_id DESPRÉS d'un stop_id).
    """
    seen_stop = False
    seen_route_ids: list[str] = []
    for item in informed_raw:
        if "stop_id" in item:
            seen_stop = True
        elif "route_id" in item:
            rid = item["route_id"]
            if seen_stop or rid in seen_route_ids:
                return True
            seen_route_ids.append(rid)
    return False


def group_alert_entities(
    alert_id: str,
    informed_enriched: list[dict],
    informed_raw: list[dict],
) -> list[dict]:
    """
    Retorna una llista de grups, cadascun amb un punt GeoJSON únic.

    - Casos 1-5: 1 sol grup per alerta (clau = alert_id)
    - Cas 6:     1 grup per route_id  (clau = route_id)

    Cada grup té:
      {
        "group_id":    str,          # alert_id o route_id
        "case":        int,          # 1-6
        "route_ids":   list[str],
        "stop_ids":    list[str],
        "centroid":    GeoJSON Point | None,
        "route_info":  dict | None,  # només cas 3/4/5/6
      }
    """
    # ── Separar i deduplicar ─────────────────────────────────────────────────
    seen_routes: set[str] = set()
    route_ids: list[str] = []
    stop_ids:  list[str] = []

    for item in informed_raw:
        if "route_id" in item:
            rid = item["route_id"]
            if rid not in seen_routes:
                seen_routes.add(rid)
                route_ids.append(rid)
        elif "stop_id" in item:
            stop_ids.append(item["stop_id"])

    # ── Detectar cas ────────────────────────────────────────────────────────
    case = _detect_case(route_ids, stop_ids)
    if case == 5 and _raw_has_mixed_or_duplicates(informed_raw):
        case = 6

    # ── Índex ràpid d'entitats enriquides ────────────────────────────────────
    enriched_by_stop:  dict[str, dict] = {}
    enriched_by_route: dict[str, dict] = {}
    for e in informed_enriched:
        if "stop_id" in e:
            enriched_by_stop[e["stop_id"]] = e
        elif "route_id" in e:
            enriched_by_route[e["route_id"]] = e

    def _stop_coords(sids: list[str]) -> list[tuple[float, float]]:
        coords = []
        for sid in sids:
            e = enriched_by_stop.get(sid, {})
            if e.get("lat") and e.get("lon"):
                coords.append((e["lat"], e["lon"]))
        return coords

    def _shape_coords(rid: str) -> list[tuple[float, float]]:
        shape = get_shape_from_route(rid)
        return [(p["lat"], p["lon"]) for p in shape]

    def _first_route_info(rids: list[str]) -> dict | None:
        for rid in rids:
            info = get_route_info(rid)
            if info:
                return info
        return None

    # ── Casos 1-5: 1 grup per alerta ─────────────────────────────────────────
    if case != 6:
        if case in (1, 2):
            # Casos sense ruta: centroide dels stops
            centroid = _centroid(_stop_coords(stop_ids))

        elif case == 3:
            # Sols ruta: centroide de la shape
            centroid = _centroid(_shape_coords(route_ids[0]))

        elif case == 4:
            # 1 ruta + stops: centroide dels stops; fallback a shape
            coords = _stop_coords(stop_ids)
            centroid = _centroid(coords) or _centroid(_shape_coords(route_ids[0]))

        else:  # cas 5: +1 rutes + stops
            # Centroide de tots els stops de l'alerta
            centroid = _centroid(_stop_coords(stop_ids))

        return [{
            "group_id":   alert_id,
            "case":       case,
            "route_ids":  route_ids,
            "stop_ids":   stop_ids,
            "centroid":   centroid,
            "route_info": _first_route_info(route_ids),
        }]

    # ── Cas 6: 1 grup per route_id ───────────────────────────────────────────
    # Assignem els stops a la ruta més propera (o a totes si no hi ha coords)
    groups = []
    for rid in route_ids:
        # Stops associats a aquesta ruta: agafem tots (no hi ha mapatge
        # explícit al feed) i calculem el centroide dels que tinguin coords
        coords = _stop_coords(stop_ids)
        centroid = _centroid(coords) or _centroid(_shape_coords(rid))
        route_info = get_route_info(rid)
        groups.append({
            "group_id":   rid,
            "case":       6,
            "route_ids":  [rid],
            "stop_ids":   stop_ids,
            "centroid":   centroid,
            "route_info": route_info or None,
        })
    return groups


# ─────────────────────────────────────────────────────────────────────────────
# Càrrega d'alertes
# ─────────────────────────────────────────────────────────────────────────────

def entity_matches(e: dict, active_ops: list) -> bool:
    if not isinstance(e, dict):
        return False
    for field in ("stop_id", "route_id", "agency_id"):
        val = e.get(field) or ""
        if matches_any_operator(val, active_ops):
            return True
    return False


def load_alerts(active_ops: list) -> list:
    try:
        res = requests.get(API_URL, timeout=10)
        res.encoding = "utf-8"
        raw = res.json()
        raw = fix_json_strings(raw)
    except Exception as e:
        print(f"❌ Error descargando alerts: {e}")
        return []

    alerts = raw.get("entity") or raw.get("entities") or []
    if not isinstance(alerts, list):
        return []

    result = []

    for item in alerts:
        if not isinstance(item, dict):
            continue
        alert = item.get("alert") or {}
        if not isinstance(alert, dict):
            continue

        informed_raw = alert.get("informed_entity") or []
        if not any(entity_matches(e, active_ops) for e in informed_raw):
            continue

        # ── URL ──────────────────────────────────────────────────────────────
        alert_url = None
        url_block = alert.get("url", {})
        for tr in url_block.get("translation", []):
            if isinstance(tr, dict):
                text_url = tr.get("text")
                if text_url and text_url.startswith("http"):
                    alert_url = text_url
                    break

        item_copy = dict(item)
        item_copy["alert"] = dict(alert)
        item_copy["alert"]["resolved_url"] = alert_url
        item_copy["alert"]["cause"]        = alert.get("cause")

        # ── Enriquiment individual (sense canvis) ─────────────────────────────
        enriched_entities = enrich_informed_entity(informed_raw)
        item_copy["alert"]["informed_entity"] = enriched_entities

        # ── Agrupació → un punt per grup ──────────────────────────────────────
        alert_id = item.get("id", "")
        groups   = group_alert_entities(alert_id, enriched_entities, informed_raw)
        item_copy["alert"]["grouped_entities"] = groups

        result.append(item_copy)

    print(f"✅ Alerts cargadas: {len(result)}")
    return result


# ─────────────────────────────────────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────────────────────────────────────

@app.route("/api/alerts")
def get_alerts():
    operator_param = request.args.get("operator")
    active_ops = [operator_param] if operator_param else OPERATORS
    result = load_alerts(active_ops)
    return jsonify({
        "operators": active_ops,
        "count":     len(result),
        "alerts":    result,
    })


@app.route("/api/alerts/map")
def get_alerts_map():
    """
    Endpoint optimitzat per al mapa: retorna únicament els grups
    amb el seu centroid i metadades mínimes. Un feature GeoJSON per grup.
    """
    operator_param = request.args.get("operator")
    active_ops = [operator_param] if operator_param else OPERATORS
    alerts = load_alerts(active_ops)

    features = []
    for item in alerts:
        alert   = item.get("alert", {})
        alert_id = item.get("id", "")
        groups  = alert.get("grouped_entities", [])

        # Textos de l'alerta
        desc   = _get_translation(alert.get("description_text"), "cat")
        header = _get_translation(alert.get("header_text"),     "cat")

        for group in groups:
            centroid = group.get("centroid")
            if not centroid:
                continue
            route_info = group.get("route_info") or {}
            features.append({
                "type": "Feature",
                "geometry": centroid,
                "properties": {
                    "alert_id":         alert_id,
                    "group_id":         group["group_id"],
                    "case":             group["case"],
                    "effect":           alert.get("effect"),
                    "cause":            alert.get("cause"),
                    "route_ids":        group["route_ids"],
                    "stop_ids":         group["stop_ids"],
                    "route_short_name": route_info.get("route_short_name"),
                    "route_color":      route_info.get("route_color"),
                    "route_text_color": route_info.get("route_text_color"),
                    "header":           header,
                    "description":      desc,
                    "url":              alert.get("resolved_url"),
                },
            })

    return jsonify({
        "type":     "FeatureCollection",
        "features": features,
    })


def _get_translation(field: dict | None, lang: str = "cat") -> str | None:
    if not field:
        return None
    translations = field.get("translation", [])
    for t in translations:
        if t.get("language") == lang:
            return t.get("text")
    return translations[0].get("text") if translations else None


@app.route("/health")
def health():
    return jsonify({"status": "ok", "operators": OPERATORS})


@app.route("/debug/routes")
def debug_routes():
    sample = dict(list(ROUTES.items())[:10])
    return jsonify({"total": len(ROUTES), "sample": sample})


@app.route("/debug/stops")
def debug_stops():
    sample = dict(list(STOPS.items())[:10])
    return jsonify({"total": len(STOPS), "sample": sample})


@app.route("/debug/routes/raw")
def debug_routes_raw():
    path = os.path.join(BASE_DIR, "GTFS_TMOB/routes.txt")
    result = {"path": path, "exists": os.path.exists(path), "rows": []}
    if not os.path.exists(path):
        return jsonify(result)
    enc   = detect_encoding(path)
    delim = detect_delimiter(path, enc)
    result["encoding"]  = enc
    result["delimiter"] = "TAB" if delim == "\t" else "COMMA"
    f, reader = open_gtfs(path)
    try:
        for row in reader:
            row = fix_row(row)
            rid = row.get("route_id", "")
            if any(rid.startswith(op) for op in ["ROD_", "AMB_"]):
                result["rows"].append({
                    "route_id": rid,
                    "short":    row.get("route_short_name"),
                    "long":     row.get("route_long_name"),
                    "color":    row.get("route_color"),
                })
            if len(result["rows"]) >= 10:
                break
    finally:
        f.close()
    return jsonify(result)


# ─────────────────────────────────────────────────────────────────────────────
# Start
# ─────────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print(f"Alert server — operators: {OPERATORS}")
    load_stops()
    load_shapes()
    load_routes()
    app.run(port=2000, debug=True)
