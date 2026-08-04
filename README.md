# Visor RT — Alertes Rodalies i AMB

Aquest treball s'emmarca en l'activitat del Centre de Gestió d'Informació de Mobilitat (CGIM) de l'Autoritat del Transport Metropolità (ATM), i té per objectiu el disseny i la implementació d'un visor web que permeti representar, en temps real, les alteracions del servei de transport públic, centrat en l'operador Rodalies de Catalunya i en el servei de busos de l'entitat supramunicipal Àrea Metropolitana de Barcelona (AMB).
 
Concebut com una eina interna de suport a la gestió, el visor permet visualitzar sobre mapa les alteracions actives del servei mitjançant l'especificació *General Transit Feed Specification Realtime* (GTFS-RT).
 
El desenvolupament del projecte ha requerit la implementació de processos de tractament i enriquiment de dades, entre els quals destaca la integració d'informació procedent del GTFS estàtic, amb l'objectiu d'identificar els elements afectats per cada alteració i d'incorporar-ne la representació geogràfica corresponent. El resultat és una eina funcional i intuïtiva, orientada a la consulta i el seguiment de les incidències del transport públic, que facilita les tasques de monitoratge i anàlisi que es duen a terme al CGIM.

---

## 🔗 Accés públic

El visor està disponible directament al següent enllaç, sense necessitat d'instal·lació:

**👉 [https://visor-rt-rod-amb.onrender.com](https://visor-rt-rod-amb.onrender.com)**

> ⚠️ Actualitzar aquest enllaç si la URL final de producció canvia (per exemple migració a un domini propi).
>
> El servei corre en un pla gratuït de Render: si fa un temps que ningú l'ha visitat, pot trigar entre 30 i 60 segons a "despertar-se" en la primera càrrega.

---

## Funcionalitats principals

### 🗺️ Visualització sobre mapa
- Mapa interactiu basat en **MapLibre GL JS**, amb navegació fluida (zoom, desplaçament, rotació)
- Representació de les alertes actives com a punts geolocalitzats sobre el mapa
- Dos modes de visualització: per **clústers** (agrupació d'alertes properes) i per **efecte** (colorat segons el tipus d'alteració)
- Simbolització per línia de transport (color i nom curt de la ruta afectada)

### 🚨 Gestió d'alertes en temps real
- Consum de dades **GTFS-RT** des de l'endpoint oficial de T-mobilitat (ATM)
- Actualització automàtica i silenciosa cada **60 segons**, preservant l'estat del mapa (posició, zoom, filtres actius) sense recarregar la pàgina
- Enriquiment de cada alerta amb informació de parades, línies i geometries (traçat de la ruta o punt de la parada afectada)
- Panell de detall per alerta, amb descripció completa, causa, efecte i enllaç a la font original quan està disponible

### 🔍 Filtres i cerca
- Filtres dinàmics per **operador** (Rodalies / AMB)
- Filtre per **data de creació** de l'alerta, amb selector de calendari i entrada manual (format dd/mm/aaaa)
- Cercador de parades i línies integrat al mapa

### 📊 Panell d'indicadors (KPI)
- Gràfic de barres (ECharts) amb el recompte d'alertes actives, actualitzat en temps real
- Disseny responsiu, adaptat a diferents mides de pantalla

### 📍 Punts crítics
- Capa addicional amb els punts crítics de la xarxa, generada amb **FME**
- Simbolització segons nivell de criticitat: **Alt / Moderat / Baix / No crític**
- Intersecció automàtica entre alertes actives i punts crítics (per `stop_id`) per identificar quines zones sensibles estan afectades en cada moment

### 🌍 Suport multilingüe
- Interfície disponible en **català, castellà i anglès**
- Selector d'idioma accessible des de la interfície principal

### 🎛️ Controls de mapa
- Control unificat de capes, mapa base i llegenda
- Banner d'informació general a la part superior

---

## Arquitectura tècnica (resum)

| Component | Tecnologia |
|---|---|
| Frontend | MapLibre GL JS, HTML/CSS/JS natiu, ECharts |
| Backend | Python (Flask), servit amb Waitress en producció |
| Dades en temps real | GTFS-RT (T-mobilitat / ATM) |
| Dades estàtiques | GTFS (rutes, parades, traçats) |
| Processament ETL | FME (índex de criticitat, integració GTFS) |

---

## Contacte

Projecte desenvolupat per Julia Ferrer Bernad — Tècnica del CGIM.

---
# Instal·lació en local (Windows)

Guia pas a pas per instal·lar i executar el visor en local, en un ordinador Windows.

---

## Estructura del projecte

```
visor-rt-rod-amb/
├── PYTHON/
│   ├── backend.py       # API Flask
│   └── serve.py         # arrencada del servidor (Waitress)
├── HTML/
│   └── index.html
├── css/
├── js/
├── GTFS_TMOB/
│   └── routes.txt
├── stops_rod.txt
├── stops_amb.txt
├── shapes_rod.txt
├── shapes_amb.txt
└── requirements.txt
```

---

## Requisits previs

- **Python 3.10+** instal·lat ([python.org/downloads](https://www.python.org/downloads/))
- **Git** instal·lat ([git-scm.com/download/win](https://git-scm.com/download/win))
- Accés al repositori de GitHub (és privat — cal usuari/token si Git ho demana)

---

## 1. Clonar el repositori

Obre una terminal (PowerShell o CMD) i ves a la carpeta on vulguis desar el projecte:

```powershell
cd C:\Projectes
git clone https://github.com/jferrerbernad-jpg/visor-rt-rod-amb.git
cd visor-rt-rod-amb
```

> Si la ruta té espais (per exemple `Desktop\Visor`), posa-la sempre entre cometes: `cd "C:\Users\usuari\Desktop\Visor\visor-rt-rod-amb"`

---

## 2. Crear i activar l'entorn virtual

Des de l'arrel del repositori (`visor-rt-rod-amb`):

```powershell
python -m venv venv
venv\Scripts\activate
```

El prompt de la terminal ha de començar ara amb `(venv)`. **Cal repetir `venv\Scripts\activate` cada vegada que obris una terminal nova** per treballar amb el projecte.

---

## 3. Instal·lar les dependències

```powershell
pip install -r requirements.txt
```

Si el fitxer `requirements.txt` no existeix o no està actualitzat, instal·la-les manualment:

```powershell
pip install flask flask-cors requests ftfy waitress
```

---

## 4. Col·locar les dades GTFS

Aquests fitxers **no van per GitHub** (per pes/sensibilitat) i cal copiar-los manualment a l'arrel del projecte:

- `stops_rod.txt`
- `stops_amb.txt`
- `shapes_rod.txt`
- `shapes_amb.txt`
- `GTFS_TMOB/routes.txt` (dins la carpeta `GTFS_TMOB/`, crea-la si no existeix)

---

## 5. Arrencar el servidor

Entra a la carpeta `PYTHON/` i executa `serve.py`:

```powershell
cd PYTHON
python serve.py
```

A la terminal hauries de veure missatges informatius, per exemple:

```
BASE_DIR: C:\Projectes\visor-rt-rod-amb
  stops_rod.txt: encoding=utf-8-sig, delimiter=COMMA
  stops_amb.txt: encoding=utf-8-sig, delimiter=COMMA
Stops ROD: 180 | AMB: 4821 | Total: 5001
Shapes cargados — ROD+AMB: 265418 puntos | Total shapes: 839
Routes cargadas: ...
```

La terminal es queda "penjada" — és normal, vol dir que el servidor està escoltant peticions. **No la tanquis** mentre vulguis fer servir el visor.

---

## 6. Obrir el visor

Amb el servidor arrencat, obre el navegador i ves a:

```
http://localhost:2000
```

Hauries de veure el mapa amb les alertes de Rodalies i AMB carregades.

---

## Aturar el servidor

Torna a la terminal on està corrent i prem:

```
Ctrl + C
```

---

## Tornar a arrencar-ho més endavant

Cada vegada que vulguis tornar a fer servir el visor en local:

```powershell
cd C:\Projectes\visor-rt-rod-amb
venv\Scripts\activate
cd PYTHON
python serve.py
```

I obre `http://localhost:2000` al navegador.

---

## Resolució de problemes habituals

| Símptoma | Causa probable | Solució |
|---|---|---|
| `'git' is not recognized` | Git no instal·lat o terminal no reiniciada | Instal·la Git i obre una terminal nova |
| `routes.txt no encontrado` | Falta `GTFS_TMOB/routes.txt` | Copia el fitxer al lloc indicat al pas 4 |
| Error 404 en `.css`/`.js`/imatges al navegador | Fitxers estàtics no trobats per Flask | Comprova que `backend.py` serveixi `static_folder=".."` i que `index.html` faci servir les rutes correctes (`../css/...`, `../js/...`) |
| La pàgina no carrega res | El servidor no s'ha arrencat correctament | Revisa els missatges de la terminal per errors abans de `python serve.py` |
| Port 2000 ja en ús | Ja hi ha un altre `serve.py` corrent | Tanca l'altra terminal, o canvia el port a `serve.py` |
