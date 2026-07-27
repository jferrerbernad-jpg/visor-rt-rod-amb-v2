from waitress import serve
from backend import app, load_stops, load_shapes, load_routes

load_stops()
load_shapes()
load_routes()
serve(app, host="0.0.0.0", port=2000)
