# JalDrishti: Project Learning Guide

Beginner-friendly Hinglish reference, based on the code currently present in this repository. This guide separates implemented code, demo/prototype behavior, and incomplete integration. A feature mentioned in the README is not treated as working unless there is corresponding code.

## Repository reality check

The repository has several related but not fully connected parts:

- `frontend/`: React + TypeScript + Vite web UI.
- `backend/`: FastAPI endpoints, MongoDB data access, an LSTM forecast path, and SQLite subscriber/alert models.
- `dwlr-proto/`: Node.js/Express ingestion prototype, Socket.IO live updates, and a random-data simulator.
- `backend/data/`: one raw DWLR-style CSV and two cleaned CSVs.
- `data/app.db`: SQLite file used by the default SQLAlchemy URL when started from the repository root.

Important accuracy notes:

1. The Node simulator generates **random sample readings**. It is not a connection to a physical DWLR sensor.
2. The backend reads station history and forecasts from MongoDB; subscriber and alert metadata use SQLite. These are two separate storage systems.
3. The React dashboard mixes API-derived values with hard-coded mock stations and location details.
4. History and forecast components request `DWLR_001` by default. The training script selects `DWLR_01`; those IDs do not match.
5. The sample CSVs are not automatically loaded into MongoDB by the visible app startup code. `clean.py` is a separate import helper and its paths/schema do not match the other MongoDB readers.
6. The repository does not contain `.env` files. MongoDB, email and SMS credentials/configuration must be supplied locally.
7. Model files exist, but the repository code does not provide a forecast accuracy score or evidence that the model was trained on the included CSV.
8. Local running may need fixes: `backend/requirements.txt` omits packages imported by backend modules and includes `framer-motion` (a frontend JavaScript package); `frontend/src/main.tsx` calls `createRoot(...).render(...)` twice.

---

## 1. Project Introduction

### JalDrishti kya hai?

JalDrishti (formerly JalStar) ek groundwater information/monitoring project hai. Is repository ka intended goal station readings ko save karna, past readings dikhana, aage ke water-level values ka forecast karna, aur critical reading par subscribers ko alert dena hai.

Simple analogy: jaise phone ka weather app temperature ka graph aur forecast dikhata hai, waise JalDrishti groundwater station ka level/history dikhane ki koshish karta hai.

**Code mein kya present hai:** React UI, FastAPI data endpoints, MongoDB history/latest collections ke liye code, SQLite subscription tables, LSTM inference/training code, aur Node ingestion demo.

**Kya fully established nahi hai:** Physical DWLR device se live connection ya end-to-end production deployment ka proof repository mein nahi hai.

### Humne ye project kyon banaya? Real problem kya hai?

Project ka problem statement groundwater readings ko ek jagah collect karke unhe samajhne layak banana hai. Raw readings ko dekhkar trend samajhna mushkil ho sakta hai. Dashboard, history graph, forecast, aur alerts is information ko readable banane ka proposed solution hain.

Groundwater zameen ke neeche soil/rock layers mein stored water hota hai. Iska level baarish, recharge, pumping, season aur local geology se badal sakta hai. Monitoring ka matlab time ke saath level readings collect aur compare karna hai.

### DWLR kya hota hai?

DWLR ka full form **Digital Water Level Recorder** hai. Aam taur par yeh well/borewell mein water level ko electronic sensor se naap kar timestamp ke saath record karta hai. Isse manual measurement ke comparison mein readings regular intervals par mil sakti hain.

Is project repository mein **real DWLR hardware driver/protocol connection nazar nahi aata**. Node prototype ko HTTP `POST /ingest` request milti hai; demo simulator us request ko bhejta hai.

### JalStar kisko benefit de sakta hai?

Intended users mein water/resource planners, researchers, administrators, aur local communities aa sakte hain. Yeh potential use hai—repository mein user research ya real-world deployment results included nahi hain.

### Chapter 1 revision notes

- JalStar groundwater data ko collect, display, forecast aur alert karne ka project concept hai.
- DWLR device reading record karta hai; repo mein actual hardware link verify nahi hota.
- Simulator random values bhejta hai; ise real sensor data na kahein.
- Dashboard/API/model pieces hain, par poora pipeline completely connected hone ka evidence nahi hai.

### Practice questions

1. JalStar ka main purpose apne words mein kya hai?
2. DWLR ka full form kya hai?
3. Groundwater monitoring ka matlab kya hai?
4. Repo ka simulator real sensor hai ya demo data generator?
5. Project ke intended users kaun ho sakte hain?

---

## 2. Project Ka Complete Workflow

### Data kahan se aata hai?

Do data sources code mein nazar aate hain:

1. **CSV source:** `backend/data/hauz_khas_dwlr.csv` mein downloaded DWLR-style observations hain. Do cleaned CSV files mein `Date,Water_Level` columns hain.
2. **Node simulator:** `dwlr-proto/simulator.js` `DWLR_001` ke liye random values banata hai (range `-40` se `-5`) aur `POST /ingest` par bhejta hai. Pehle 50 historical demo points aur uske baad har 30 seconds ek point bhejne ka code hai. “Realtime” yahan fast demo tick hai, live sensor measurement nahi.

### CSV ke columns

Raw CSV header mein `Data Type Code`, `Data Type Description`, `Data Time`, `Data Value`, `Unit` hain. Cleaned CSV files mein `Date`, `Water_Level` hain. Import helper raw file se `Data Time` aur `Data Value` select karta hai.

Prototype API reading ka shape:

```json
{
  "station_id": "DWLR_001",
  "name": "Station 1",
  "lat": 28.6,
  "lon": 77.2,
  "gw_level": -19.4,
  "ts": "ISO date-time"
}
```

### Processing aur storage

**Prototype ingestion (`dwlr-proto/server.js`):**

1. `station_id` aur numeric `gw_level` check karta hai.
2. `ts` ko date mein convert karta hai.
3. Previous smoothed level aur new value ka exponential smoothing karta hai:
   `new_smoothed = 0.8 × previous_smoothed + 0.2 × new_reading`.
4. Reading ko MongoDB `readings` history collection mein insert karne ki koshish karta hai.
5. MongoDB `latest` collection mein station ka latest value upsert karta hai.
6. MongoDB change stream update par connected Socket.IO clients ko `latest` event emit karta hai.

**Python forecast preprocessing (`backend/services/preprocess.py`):**

1. MongoDB se selected station ke recent documents laata hai.
2. `gw_level_smoothed` ho to uska, warna `gw_level` ka use karta hai.
3. `ts` ko date/time index banata hai.
4. Bahut bade consecutive jumps (`10` se adhik) ko missing mark karta hai.
5. Rolling median aur median absolute deviation (MAD) se outlier values flag karta hai.
6. Missing values ko linear interpolation se fill karta hai.
7. MinMaxScaler values ko 0–1 range mein scale karta hai.
8. Pichhle 15 scaled points ko input window aur agle point ko target bana kar sequences banata hai.

CSV cleaner `backend/services/clean.py` alag helper hai: raw CSV header dhoondhta hai, date parse karta hai, invalid-date rows drop karta hai aur MongoDB insert karta hai. Yeh cleaning helper `Water_Level` bad values ko handle/validate nahi karta aur iske document shape doosre reader se alag hai; ise automatic, verified import pipeline na samjhein.

### Frontend, backend, database communication

```text
CSV / Node demo simulator
          |
          | POST /ingest (Node prototype)
          v
   MongoDB: readings + latest
          |                  \
          |                   \ Socket.IO initial/latest events
          v                    v
  FastAPI history/station API  dwlr-proto demo page
          |
          +--> FastAPI forecast --> preprocess --> LSTM model
          |
          +--> FastAPI subscribe --> SQLite subscribers/alert_logs
          |
          v
     React UI (Vite)
```

React `HistoryViewer` `/history/{station_id}` ko fetch karta hai. `ForecastViewer` `/forecast/{station_id}` ko request karta hai. Alert subscription component `/api/subscribe` ko POST karta hai. Dashboard browser location leta hai, `/stations` se stations aur `/latest/{station_id}` se selected nearest station ki current reading maangta hai.

Node realtime demo page FastAPI se nahi, Node Socket.IO events se connect hota hai.

### Forecast kaise banta hai?

`backend/services/forecast.py` saved LSTM model ko load karta hai. Recent MongoDB values preprocess hote hain; last 15 values se agle point ka prediction hota hai. Predicted scaled value ko saved scaler se inverse-transform kiya jata hai. Phir wahi predicted scaled point next window mein append hota hai, aur loop `n_future` baar chalta hai (default 7).

`classify.py` mean forecast ko fixed thresholds ke basis par category deta hai aur first/last prediction se simple trend label nikalta hai. Yeh machine-learning model ka output plus simple rule-based postprocessing hai.

**Important:** code mein test metric, confidence interval, scientific validation ya prediction accuracy report nahi hai. Model ko reliable forecast kehne se pehle data/model validation zaroori hai.

### Real-life example

Maan lijiye `DWLR_001` ka simulator reading `-19.4` bhejta hai. Node request check karega, pehle se reading hui ho to smoothed number nikalega, MongoDB mein record update karega. Prototype demo web page ko socket event mil sakta hai. React history API MongoDB history se records laane ki koshish karega. Forecast API past sequence ko model mein dega aur 7 predicted values return kar sakta hai—agar MongoDB, matching station data, model aur scaler sahi configured hon.

### Chapter 2 revision notes

- Node simulator → Node `/ingest` → MongoDB `readings`/`latest`.
- Python preprocessing, Node smoothing se alag step hai.
- React API calls aur Socket.IO demo alag paths hain.
- Forecast code implemented hai, par accuracy/validation sabit nahi.
- CSV import direct app startup par nahi chalta.

### Practice questions

1. Node prototype ka ingestion endpoint kaunsa hai?
2. `readings` aur `latest` collections ka difference kya hai?
3. Smoothing formula naye reading ko kaise combine karta hai?
4. Forecast ka lookback window default kitna hai?
5. React realtime Socket.IO page ke same path par data leta hai?

---

## 3. Technology Stack

| Technology | Simple meaning | Repository mein actual role |
|---|---|---|
| React | UI ko reusable components mein banana | `frontend/src` pages/components |
| TypeScript | JavaScript + types | React components aur API calls |
| Vite | Frontend dev server/build tool | `frontend/package.json`, `vite.config.ts` |
| CSS/Tailwind/Bootstrap | UI styling | frontend styles, Tailwind plugin, Bootstrap imports |
| Recharts | React charts | History/forecast graphs |
| Leaflet + D3 | Map and geographic data tools | state/district mapping pages |
| Node.js | JavaScript runtime outside browser | `dwlr-proto` ingestion server/simulator |
| Express | Node HTTP server framework | prototype `/ingest` endpoint |
| Socket.IO | two-way/live browser-server events | prototype `initial` and `latest` events |
| Python | data/backend/ML programming language | FastAPI, preprocessing, forecasting |
| FastAPI | Python HTTP API framework | `/health`, `/history`, `/forecast`, `/stations`, `/latest`, subscription routes |
| MongoDB + PyMongo/Node MongoDB driver | document database | readings, latest station data, forecast |
| SQLite + SQLAlchemy | local relational database + ORM | subscribers and alert logs |
| Pandas/NumPy | tabular/numeric data work | cleaning and forecast window preparation |
| scikit-learn | ML/data-preparation utilities | MinMaxScaler |
| TensorFlow/Keras | neural-network framework | LSTM model training/loading/inference |
| Chart.js | browser chart library | `dwlr-proto/public/index.html` demo |
| Axios/fetch | HTTP request clients | frontend-to-FastAPI requests |

### Python vs Node.js

Python yahan forecasting, preprocessing, subscription APIs ke liye hai. Node.js ingestion demo aur socket-based live display ke liye. Dono same language/runtime nahi hain aur apne-apne process/port par chal sakte hain.

### ML hai ya nahi?

Haan, code mein Keras LSTM training/inference path aur trained-model artifact maujood hai. Lekin isse scientifically accurate/production-ready kehne ke liye evaluation results repository mein nahi mile.

### Chapter 3 revision notes

- Frontend: React/TypeScript/Vite; Python backend: FastAPI; Node: ingestion prototype.
- MongoDB station readings, SQLite subscribers/alerts.
- LSTM code present hai; score/accuracy claim available nahi.

### Practice questions

1. Vite ka role kya hai?
2. Python aur Node.js ke project roles kya hain?
3. SQLite aur MongoDB dono kyon nazar aate hain?
4. Recharts kis kaam aata hai?
5. LSTM ke baare mein kaunsa claim code se supported nahi hai?

---

## 4. Folder and File Explanation

### Beginner-friendly start order

1. **`frontend/index.html`** — page par `root` element aur `/src/main.tsx` entry point deta hai.
2. **`frontend/src/main.tsx`** — React app ko DOM mein render karne ka intended entry point. Current code mein `createRoot` do baar chalaya gaya hai; ise single root tak simplify karna chahiye.
3. **`frontend/src/App.tsx`** — router, providers aur URL-to-page mapping.
4. **`frontend/src/pages/Index.tsx`** — home component return karta hai.
5. **`frontend/src/components/home.tsx`** — landing page. Is file ke promotional cards mein kuch statements aspirational hain, backend proof nahi.
6. **`frontend/src/components/GroundwaterDashboard.tsx`** — location permission, station/latest API request, mock cards aur history/forecast components.
7. **`frontend/src/components/HistoryViewer.tsx`** — `/history` fetch aur Recharts line graph.
8. **`frontend/src/components/ForecastViewer.tsx`** — forecast service call, labels/trend/category aur graph.
9. **`frontend/src/services/api.ts`** — frontend forecast URL helper.
10. **`frontend/src/components/AlertSubscription.tsx`** — subscription form aur FastAPI POST.
11. **`backend/app.py`** — FastAPI routes; startup DB/scheduler wiring.
12. **`backend/services/preprocess.py`** — Mongo data → cleaned/scaled LSTM input.
13. **`backend/services/forecast.py`** — model load, rolling predictions and Mongo save.
14. **`backend/models/train.py`** — selected Mongo station se LSTM train karne ka script.
15. **`backend/services/classify.py`** — hard-coded level categories/trend rule.
16. **`backend/services/db.py`** — Mongo connection and read/write helpers.
17. **`backend/db.py`, `backend/models/subscriber.py`, `backend/models/alert_log.py`** — SQLite/SQLAlchemy tables.
18. **`dwlr-proto/server.js`** — Mongo connection, `/ingest`, Socket.IO events.
19. **`dwlr-proto/simulator.js`** — synthetic readings generator.
20. **`dwlr-proto/public/index.html`** — standalone Socket.IO + Chart.js live demo page.

### Connection overview

```text
frontend/src/main.tsx -> App.tsx -> pages/components
HistoryViewer -> FastAPI /history -> services.db -> Mongo readings
ForecastViewer -> services/api.ts -> FastAPI /forecast
  -> preprocess.py -> Mongo readings -> forecast.py -> saved Keras model
AlertSubscription -> FastAPI /api/subscribe -> SQLAlchemy -> SQLite
simulator.js -> Node server.js /ingest -> MongoDB
Node server.js change stream -> Socket.IO -> public/index.html
```

### Code ko line-by-line padhne ka example: API helper

`frontend/src/services/api.ts` mein:

1. `getForecast(stationId, n_future=7)` function station aur number of future points leta hai.
2. `fetch(...)` FastAPI ke port `8000` par GET request bhejta hai.
3. URL mein station ID path ka hissa aur `n_future` query parameter hota hai.
4. `res.ok` false ho to error throw hota hai.
5. `res.json()` response body ko JavaScript object banata hai.
6. `catch` error log karta hai aur dobara throw karta hai—caller ko bhi failure pata chalta hai.

### Less-used/exploratory items

- `frontend/src/data/geojson` aur `frontend/src/data/csv` geographic/state/district assets hain; yeh automatically groundwater readings nahi hain.
- `backend/server.js` alag Express chat prototype hai; ismein realtime context ka sample placeholder hai. Ise main FastAPI pipeline na samjhein.
- `frontend/src/components/ai-assistance` mein chat/voice UI code hai; actual model/provider behavior ko separately verify karna hoga.
- `demo.mp4` ek demo artifact hai; video apne aap code integration ka proof nahi hota.

### Chapter 4 revision notes

- Pehle `main.tsx` → `App.tsx` → page/component chain samjhein.
- `services/api.ts` frontend se forecast API tak bridge hai.
- Backend modules alag-alag responsibilities rakhte hain.
- GeoJSON assets ko sensor data ke saath confuse nahi karna.
- `main.tsx` mein double `createRoot` ek actual issue hai.

### Practice questions

1. React app ka entry file kaunsa hai?
2. History graph fetch ka code kis component mein hai?
3. Forecast API helper ka kaam kya hai?
4. MongoDB access ka Python helper kaunsa hai?
5. `backend/server.js` aur `backend/app.py` same service hain?

---

## 5. Every Implemented Module Explained

### A. Dashboard and location lookup

- **User sees:** `/GroundWaterDashboard` route, location permission prompt, station/latest summary, charts and cards.
- **Backend:** browser `/stations` fetch karta hai; Haversine distance formula se closest returned station chunta hai; `/latest/{station_id}` fetch karta hai.
- **Data source:** station list/latest value MongoDB `latest` collection se FastAPI deta hai.
- **Output:** nearest station/current level summary, agar APIs data de paayen.
- **Limitations:** nearby-station cards aur several station/chart values hard-coded mock data hain. `altitude: 14` hard-coded hai. Permission denied path “general area” bolta hai, lekin shown nearby stations mock hain.
- **Possible errors:** FastAPI down, MongoDB config absent, empty station list, browser geolocation denied, or station documents missing coordinates.

### B. History viewer

- **User sees:** line chart and station/period selectors inside dashboard.
- **Backend:** `/history/{station_id}?days=n` calls `get_station_data`.
- **Output:** dates and water-level points.
- **Limitations:** default IDs `DWLR_001/002/003`; query `limit=days` records return karta hai, days-based date filtering nahi. Empty result UI “Loading history…” hi dikhata hai.
- **Possible errors:** backend unreachable, MongoDB unavailable, station ID mismatch, or empty collection.

### C. Forecast viewer

- **User sees:** 7-day graph, trend and mean category.
- **Backend:** `/forecast/{station_id}` → preprocessing → LSTM → classifications → `forecast` collection upsert.
- **Output:** prediction array, `mean_category`, `trend`.
- **Limitations:** no visible metric/accuracy validation; default frontend station `DWLR_001`, training script station `DWLR_01`; API errors are not handled in the component and it can remain at “Loading forecast…”.
- **Possible errors:** missing Mongo URI, insufficient station records, model/scaler load failure, station mismatch, or model/library incompatibility.

### D. Node ingestion + Socket.IO demo

- **User sees:** separate `dwlr-proto` web page with station text and line chart.
- **Backend:** `/ingest` checks request, smooths reading, writes Mongo history/latest; Socket.IO sends initial/latest documents.
- **Output:** latest station display and chart points.
- **Limitations:** simulator is random data; the `readings.insertOne` error is logged but ingestion continues to update `latest`; MongoDB change streams may require a replica-set-capable deployment such as Atlas.
- **Possible errors:** missing `MONGODB_URI`, wrong ingest token, no MongoDB network access, change stream unavailable, or invalid payload.

### E. Subscription and alert records

- **User sees:** `/subscribe` form.
- **Backend:** `/api/subscribe` validates name and requires email or phone, inserts/updates `subscribers` in SQLite. New email subscribers may receive welcome email.
- **Alert path:** scheduler checks every 60 seconds. If `INGEST_URL` is absent it uses a hard-coded dev reading (`DWLR_DEV`, `-35.0`). If level meets configured threshold, active subscribers may receive email/SMS; attempts go to `alert_logs`.
- **Limitations:** scheduler expects GET JSON keys `station_id`, `level`, `timestamp`; the prototype server code exposes POST `/ingest`, not a matching GET latest-reading route. Therefore the default integration is not end-to-end without a compatible external endpoint. Without notification provider credentials, a send is not successful. Subscriber `station_id` field exists but notify code selects all active subscribers without filtering by station.
- **Possible errors:** SQLite/table setup, wrong/missing `INGEST_URL`, provider credentials, invalid phone number, or network failures.

### F. LSTM training

- **User sees:** no training page; this is a Python script.
- **Backend/data:** selects `DWLR_01`, prepares Mongo data, chronological 80/20 split, creates one-layer 50-unit LSTM + Dense(1), trains 50 epochs, saves model/scaler files.
- **Output:** `groundwater_lstm.keras` and `scaler.gz`.
- **Limitations:** no saved test metrics or documented experiment results; training needs enough MongoDB data.

### Incomplete or disconnected modules

- CSVs exist, but no startup loader imports them automatically.
- `clean.py` produces nested `meta/raw/processed` records while readers query top-level `station_id`, `gw_level` and `gw_level_smoothed`. Its relative default file path also does not point to `backend/data/hauz_khas_dwlr.csv` when run from repository root.
- The browser's history/forecast station IDs differ from training's default station ID.
- Main UI mock metrics/stations are not API-backed.
- Alert scheduler's expected GET format does not match the Node prototype's routes.
- README describes capabilities (maps, alerts, forecasts) broadly; the actual code has partial/demo wiring and should be presented with the limitations above.

### Chapter 5 revision notes

- Dashboard has both live API values and mock values.
- History/forecast/subscription have API code but depend on services and correctly configured databases.
- Node live demo works on a separate websocket flow if Mongo is available.
- Alerts are conditional and the scheduler ingestion interface currently mismatches the prototype API.

### Practice questions

1. Dashboard ke kaun-se values mock hain?
2. History `days` parameter actually date filter karta hai?
3. Alert scheduler fallback reading kahan se aati hai?
4. Training aur frontend station IDs kya hain?
5. Forecast “accurate” hai, yeh prove karne ke liye kaunsa evidence missing hai?

---

## 6. Database and Dataset

### Database basics

Database data store karne ka organized system hai. JalStar code do databases use karta hai:

#### MongoDB (station/time-series-like documents)

- `readings`: individual historical observations. Prototype document has `ts`, `station_id`, `name`, `lat`, `lon`, `gw_level`, `gw_level_smoothed`.
- `latest`: one current/latest document per station; unique index on `station_id`; `last` object stores raw and smoothed values.
- `forecast`: forecast service station ID ke basis par latest forecast result upsert karta hai.

#### SQLite (subscriber and alert information)

`backend/db.py` default URL `sqlite:///data/app.db` hai. SQLAlchemy models:

- `subscribers`: `id`, `name`, `email`, `phone`, `preferred_channel`, `station_id`, `active`, `subscribed_at`, `last_alert_sent_at`.
- `alert_logs`: `id`, `subscriber_id`, `level`, `reading_value`, `message`, `sent_at`, `success`, `provider_response`.
- `alert_logs.subscriber_id` foreign key se subscriber record ko reference karta hai.

Default DB path current working directory par relative hai. Repository root se run karne par intended local file `data/app.db` banti hai.

### Dataset columns ka meaning

Raw CSV header:

- `Data Type Code`: data type ka code.
- `Data Type Description`: measured data ka description.
- `Data Time`: observation ka date/time.
- `Data Value`: measured water-level number.
- `Unit`: source-provided unit.

Cleaned CSV:

- `Date`: observation timestamp/date.
- `Water_Level`: numerical water-level value.

Prototype Mongo/API fields:

- `station_id`: unique station identifier.
- `ts`: reading ka timestamp.
- `gw_level`: raw groundwater value.
- `gw_level_smoothed`: smoothing ke baad value.
- `lat`, `lon`: station map coordinates.
- `name`: station display name.

### Missing values and duplicates

Missing value ka matlab cell mein usable reading/date nahi hona; duplicate row ka matlab same record do ya zyada baar hona. Cleaning code invalid dates (`Date` parse na ho) drop karta hai; preprocessing jumps/outliers ko missing mark karke interpolate karta hai. Visible code duplicate-row removal nahi karta. Is guide ne CSV rows ka full statistical audit nahi kiya, isliye missing/duplicate counts claim nahi kiye ja rahe.

### Latitude, longitude, date and level

- `lat` latitude (north/south position), `lon` longitude (east/west position); dashboard closest station ka distance calculate karta hai.
- `Date`/`ts` readings ka chronological order aur chart x-axis banate hain.
- `Water_Level`/`gw_level` measured value hai; CSV mein source `Unit` column hai. UI ka `m` label code mein dikhaya gaya hai, lekin input sources/units ko consistent verify karna zaroori hai.
- Negative values ko code directly category thresholds ke against compare karta hai. Code threshold rule batata hai, lekin number convention/source unit ka scientific meaning independently validate nahi karta.

### Sample record

```text
Date=2024-09-17 00:00:00, Water_Level=-20.707
```

Iska seedha matlab: 17 September 2024 ke timestamp par CSV mein water-level field ka value `-20.707` record hai. Is value ko meters below ground bolne se pehle original source ka `Unit` aur reference convention verify karein.

### Chapter 6 revision notes

- MongoDB: groundwater readings/latest/forecast; SQLite: subscriptions/alerts.
- Raw CSV has five columns; cleaned CSV has two.
- Preprocessing invalid dates/jumps/outliers handle karta hai, duplicates remove nahi karta.
- Coordinates proximity lookup ke liye hain; date ordering ke liye; level forecast/graph ke liye.

### Practice questions

1. `readings` aur `latest` mein kya difference hai?
2. SQLite mein kaun-se do primary tables hain?
3. `lat` aur `lon` ka use kya hai?
4. Code missing values kaise fill karta hai?
5. Duplicate removal implemented hai?

---

## 7. Architecture and Diagrams

### System architecture

```text
                       +---------------------------+
                       | React + TypeScript UI     |
                       | dashboard/history/alerts |
                       +-------------+-------------+
                                     |
                     HTTP GET/POST   |   (port 8000)
                                     v
                       +---------------------------+
                       | FastAPI Python backend    |
                       +----+------------------+---+
                            |                  |
                     MongoDB reads        SQLite ORM
                     history/latest       subscribers/logs
                            |
                       forecast.py
                            |
                    preprocessing + LSTM

Simulator --HTTP POST--> Node/Express ingestion --> MongoDB
                                     |
                               Socket.IO events
                                     v
                           standalone demo page
```

Bolne ka tarika: “Frontend API ke through FastAPI se baat karta hai. FastAPI groundwater records ke liye MongoDB aur subscription/alert records ke liye SQLite use karta hai. Alag Node prototype simulator se readings MongoDB mein daalta hai aur Socket.IO demo ko updates bhejta hai.”

### Data flow

```text
Sample CSV                 Random demo simulator
    |                              |
    | (manual helper; not auto)    | POST /ingest
    +--------------?               v
                              Node Express
                                   |
                                   v
                      MongoDB readings + latest
                         |                  |
                 FastAPI history       FastAPI stations/latest
                         |
                         +--> preprocessing --> LSTM --> forecast
                                   |
React UI <-------------------------+
```

Question mark ka matlab CSV-to-database automatic pipeline code se established nahi.

### Frontend-to-backend request

```text
HistoryViewer (browser)
    -- GET /history/DWLR_001?days=7 -->
FastAPI
    --> MongoDB readings query
    <-- { station_id, count, history: [...] }
    <-- browser creates Recharts line graph
```

### Database relationship diagram

```text
MongoDB
  readings: many documents per station_id
  latest:   one document per station_id
  forecast: one saved forecast document per station_id

SQLite
  subscribers (1) ---- (many) alert_logs
            subscribers.id = alert_logs.subscriber_id
```

### User workflow

```text
Open home -> open dashboard -> allow location (optional)
 -> dashboard asks API for stations/latest -> view history/forecast
 -> open subscribe -> enter name + email or phone
 -> API saves subscriber -> later alert job may attempt notification
```

“May attempt” important hai: scheduler endpoint/provider configuration ke bina alert delivery guaranteed nahi.

### Chapter 7 revision notes

- React + FastAPI is the main web request path.
- Node + Socket.IO is a separate prototype path.
- Mongo stores station documents; SQLite stores alert users/logs.
- Diagram mein CSV import ko uncertain/manual connector dikhana chahiye.

### Practice questions

1. React forecast request ka backend endpoint kya hai?
2. Socket.IO ka role kya hai?
3. SQLite aur MongoDB architecture mein alag kaam kyon karte hain?
4. CSV arrow ko dashed/uncertain kyon dikhaya?
5. Alert flow ke “may attempt” ka kya matlab hai?

---

## 8. Project Run Karna (Windows)

### Required software

- Windows PowerShell.
- Node.js + npm (frontend and `dwlr-proto`).
- Python 3.10/3.11 recommended by project era/config; create a virtual environment.
- Reachable MongoDB instance/Atlas URI for backend and prototype.
- MongoDB change streams for the Socket.IO live updates (Atlas is a straightforward option).
- Git optional.

Conda required nahi. Python launcher `py` available ho to venv banane ke liye `py -3.10 -m venv .venv` use karein; warna installed Python ka full command/path use karein.

### Important: current dependency setup incomplete

`backend/requirements.txt` contains FastAPI/ML packages but omits imports such as `python-dotenv`, `SQLAlchemy`, `APScheduler`, `requests`, `sendgrid`, `twilio`, and `phonenumbers`. It lists `framer-motion`, which is a frontend JavaScript package, not the Python library needed by backend. Backend install may therefore need explicit missing packages and the requirements file should eventually be corrected.

### 1. Create environment files

No `.env` is included in the repository. Do not commit secrets.

Create repository-root `.env` for `backend/services/db.py` and Node if using root cwd:

```dotenv
MONGODB_URI=<your MongoDB connection URI>
MONGODB_DB=dwlr
```

Create `backend/.env` for `backend/app.py`:

```dotenv
DATABASE_URL=sqlite:///data/app.db
DEV_TRIGGER_TOKEN=<choose a local-only token>
DISABLE_SCHEDULER=true
```

`backend/services/db.py` loads the repository-root `.env`; `backend/app.py` loads `backend/.env`. The Node prototype loads `.env` from its current working directory (`dwlr-proto/.env`), so create a separate `dwlr-proto/.env`:

```dotenv
MONGODB_URI=<your MongoDB connection URI>
MONGODB_DB=dwlr
PORT=3000
INGEST_TOKEN=<choose a local-only token>
```

For simulator, add to `dwlr-proto/.env`:

```dotenv
INGEST_URL=http://localhost:3000/ingest
```

To test notifications, configure provider credentials separately; do not paste them into source code. Scheduler currently expects a compatible GET `INGEST_URL` service; the local prototype shown here only implements POST `/ingest`.

### 2. Backend setup (repository root)

```powershell
Set-Location "C:\Users\INDIA TECHNOLOGY\Documents\Major Project G3\Projects\JalStar"
py -3.10 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install fastapi "uvicorn[standard]" pandas numpy scikit-learn joblib "tensorflow>=2.10" h5py pymongo dnspython python-dotenv sqlalchemy apscheduler requests sendgrid twilio phonenumbers
python -m uvicorn backend.app:app --reload --host 127.0.0.1 --port 8000
```

PowerShell may block activation scripts. Alternative without activation:

```powershell
.\.venv\Scripts\python.exe -m pip install fastapi "uvicorn[standard]" pandas numpy scikit-learn joblib "tensorflow>=2.10" h5py pymongo dnspython python-dotenv sqlalchemy apscheduler requests sendgrid twilio phonenumbers
.\.venv\Scripts\python.exe -m uvicorn backend.app:app --reload --host 127.0.0.1 --port 8000
```

Backend current caveat: Mongo service initialization requires a valid Mongo URI. A successful server start also depends on compatible TensorFlow/model loading and installed imports. Start from repository root so package imports and relative model/scaler paths resolve as expected.

### 3. Frontend setup (new PowerShell terminal)

```powershell
Set-Location "C:\Users\INDIA TECHNOLOGY\Documents\Major Project G3\Projects\JalStar\frontend"
npm install
npm run dev
```

Open the Vite URL printed in the terminal, usually `http://localhost:5173`.

Current caveat: inspect/fix `frontend/src/main.tsx` so it creates and renders one React root, not two. Vite compile success alone would not establish correct browser runtime.

### 4. Optional Node ingestion demo (another terminal)

```powershell
Set-Location "C:\Users\INDIA TECHNOLOGY\Documents\Major Project G3\Projects\JalStar\dwlr-proto"
npm install
npm start
```

This requires a valid `dwlr-proto/.env` Mongo URI. It starts on port 3000 by default.

### 5. Optional simulator

In another terminal, from `dwlr-proto`:

```powershell
node simulator.js
```

The simulator sends generated readings to localhost, not a physical sensor. Despite a comment in its source, the configured interval call is 30,000 ms (30 seconds).

### Common errors

| Error | Likely reason / check |
|---|---|
| `MONGODB_URI missing` | `dwlr-proto/.env` absent, wrong cwd, or key missing |
| Mongo connection timeout | URI, network allowlist, credentials, DNS, or cluster unavailable |
| FastAPI import/module error | Start from repo root; install omitted Python dependencies |
| Forecast returns not enough data | Mongo has fewer than 15 usable records for requested station |
| Forecast model/scaler load error | Start from repo root; verify artifact files and TensorFlow compatibility |
| History/forecast empty | Data not imported, or station ID mismatch (`DWLR_001` vs `DWLR_01`) |
| Email/SMS not sent | Provider credentials absent/invalid; check alert log and provider response |
| Dashboard CORS/network error | Backend not running at port 8000 or origin differs from allowed origins |
| Socket.IO page stays empty | Node process/Atlas change stream unavailable; simulator not posting |
| React root warning/error | `main.tsx` initializes the same DOM root twice |

### Chapter 8 revision notes

- Node and React run in separate terminals; FastAPI another.
- Mongo URI must be configured in the correct `.env` location(s).
- Conda is optional; `py -m venv` is enough.
- README's dependency file is not currently complete for backend imports.
- Local demo data is synthetic, and CSV ingestion is not automatic.

### Practice questions

1. Backend, frontend and Node demo ke default ports kya hain?
2. Conda nahi ho to Python environment kaise banayenge?
3. Mongo URI kis file/location se backend Python load karta hai?
4. Simulator ka data real sensor se aata hai?
5. Forecast blank/error ho to pehle kaun-si do cheezen check karenge?

---

## 9. Presentation Preparation (5–10 minutes)

### Introduction

**Spoken English:**  
“Good morning. Our project is JalStar, a groundwater monitoring and forecasting prototype. It is designed to organize groundwater readings, show historical trends, and provide a basic forecast and alert workflow.”

**Hinglish:**  
Humara project groundwater readings ko organize karke dashboard par history/trend dikhane aur forecast/alert ka prototype dene ke liye banaya gaya hai.

### Problem statement

**Spoken English:**  
“Groundwater readings are useful only when they are collected with time and location information and can be understood easily. Our project explores a software pipeline that stores readings and makes them visible through a web interface.”

**Hinglish:**  
Sirf reading hona enough nahi; humein timestamp, station aur easy visualization bhi chahiye.

### Objectives

**Spoken English:**  
“The codebase includes a station-data API, history and forecast views, an ingestion prototype, and a subscription/alert module. We also keep track of important limitations, such as the use of simulated input in the demo.”

**Hinglish:**  
Objectives hain data API, graph, LSTM forecast experiment, ingestion demo aur alert workflow; demo input simulated hai.

### Proposed solution and technology stack

**Spoken English:**  
“The frontend uses React and TypeScript. FastAPI provides Python APIs. MongoDB stores station readings, while SQLite stores subscribers and alert logs. A separate Node.js prototype accepts readings and sends live updates with Socket.IO. TensorFlow/Keras is used for the LSTM forecast path.”

**Hinglish:**  
React UI hai, Python FastAPI service hai, station data MongoDB mein, subscribers SQLite mein, aur Node prototype live demo sambhalta hai.

### Architecture and working demo

**Spoken English:**  
“For the demo, the Node simulator generates sample station values and posts them to the Node ingestion endpoint. The endpoint stores readings in MongoDB. The separate realtime page can receive socket updates. In the React app, the history and forecast components call FastAPI endpoints. The location dashboard asks for browser location and then requests nearby station information.”

**Hinglish:**  
Demo mein random simulator values banata hai, Node MongoDB update karta hai; React history/forecast FastAPI se leta hai. Real device connection ka claim nahi karenge.

### Results

**Spoken English:**  
“The repository contains the UI, API paths, model artifacts, and a simulator. It does not include a verified model-accuracy report or a production deployment result, so we present the forecast as an experimental feature rather than a validated operational prediction.”

**Hinglish:**  
Artifacts aur code hain, par MAE/RMSE jaise proven metrics nahi; isliye accuracy ka unsupported number nahi bolna.

### Limitations and future scope

**Spoken English:**  
“Current limitations include simulated rather than physical sensor input, mock dashboard cards, station-ID inconsistencies, incomplete setup dependencies, and an alert scheduler that expects an endpoint shape not provided by the local ingestion prototype. Future work includes a real device adapter, consistent schemas and station IDs, automated CSV import, prediction evaluation, robust alert integration, and deployment testing.”

**Hinglish:**  
Limitations openly batayenge; future mein real sensor integration, data validation, accuracy testing, aur alert pipeline ko end-to-end connect karna.

### Conclusion

**Spoken English:**  
“JalStar is a useful prototype for learning how groundwater data can move from ingestion to storage, visualization, forecasting, and alerts. The next step is to validate each integration with real data and measured results. Thank you.”

**Hinglish:**  
JalStar end-to-end concept ka prototype hai. Agla step real data ke saath integration aur forecast evaluation hai.

### Chapter 9 revision notes

- Present only implemented or clearly labelled prototype features.
- Results means measured results; don't invent accuracy values.
- Clearly distinguish simulated demo readings from sensor readings.
- Be ready to explain limitations confidently.

### Practice questions

1. Presentation mein simulator ko kaise describe karenge?
2. Architecture ko ek sentence mein explain karein.
3. Model accuracy ke baare mein safe statement kya hai?
4. Do current limitations batayein.
5. Ek high-value future improvement kya hoga?

---

## 10. Viva Preparation: 50 Questions and Answers

### Basic project

1. **JalStar kya hai?**  
   Groundwater monitoring/forecasting prototype with a web UI, APIs, and demo data flow.

2. **Project ka main objective kya hai?**  
   Station readings ko store/display karna aur basic forecast/alert workflow demonstrate karna.

3. **Groundwater kya hai?**  
   Soil aur rock ke pores/cracks mein zameen ke neeche stored water.

4. **Groundwater monitoring kya hai?**  
   Water-level readings ko time ke saath record aur compare karna.

5. **DWLR ka full form?**  
   Digital Water Level Recorder.

6. **Kya repo real DWLR se connected hai?**  
   Visible code mein physical sensor driver/protocol nahi; demo simulator HTTP readings bhejta hai.

7. **Kaun project use kar sakta hai?**  
   Intended users researchers, planners, administrators, communities ho sakte hain; deployment evidence alag se chahiye.

8. **Project ki sabse important limitation?**  
   Real sensor-to-dashboard production pipeline aur measured forecast validation establish nahi.

### Dataset and data cleaning

9. **Raw CSV ke columns?**  
   `Data Type Code`, `Data Type Description`, `Data Time`, `Data Value`, `Unit`.

10. **Cleaned CSV ke columns?**  
    `Date` aur `Water_Level`.

11. **`station_id` kya batata hai?**  
    Reading kis monitoring station ki hai.

12. **`ts` ka matlab?**  
    Timestamp—reading ka date/time.

13. **Latitude/longitude kyon?**  
    Station ko map par rakhne aur nearest station nikalne ke liye.

14. **Missing value kya hai?**  
    Required field ka absent/invalid value.

15. **Outlier kya hai?**  
    Baaki pattern se bahut alag observation; code jump aur MAD-based rules use karta hai.

16. **Interpolation kya hai?**  
    Known points ke beech estimated value se missing gap fill karna.

17. **Duplicate rows remove hote hain?**  
    Visible cleaner/preprocessor mein duplicate-removal step nahi hai.

18. **CSV auto-import hoti hai?**  
    Nahi, visible app startup par automatic import nahi; `clean.py` separate helper hai.

### Frontend, backend and APIs

19. **Frontend technology kya hai?**  
    React, TypeScript aur Vite.

20. **Backend kya hai?**  
    Python FastAPI APIs; alag Node/Express prototype bhi hai.

21. **History endpoint?**  
    `GET /history/{station_id}`.

22. **Forecast endpoint?**  
    `GET /forecast/{station_id}?n_future=7` (default future count 7).

23. **Health endpoint?**  
    `GET /health`.

24. **Subscription endpoint?**  
    `POST /api/subscribe`.

25. **API kya hoti hai?**  
    Software components ke beech request/response ka agreed interface.

26. **React request kaise bhejta hai?**  
    `fetch` ya Axios se HTTP GET/POST.

27. **CORS kya hai?**  
    Browser security rule jo allowed web origins ko cross-origin API call karne deta hai.

28. **Recharts ka role?**  
    History/forecast values ko line chart mein render karna.

29. **Socket.IO ka role?**  
    Node prototype se browser ko initial/latest live events bhejna.

30. **`/readings` and `/latest` difference?**  
    `readings` historical documents; `latest` per-station current snapshot.

### Python, Node.js, database

31. **Python kyon hai?**  
    FastAPI, data prep aur ML code ke liye.

32. **Node.js kyon hai?**  
    Separate Express ingestion and Socket.IO realtime prototype ke liye.

33. **MongoDB kya store karta hai?**  
    Station readings, latest snapshots and saved forecast documents (when configured).

34. **SQLite kya store karta hai?**  
    Subscribers aur alert logs.

35. **SQLAlchemy kya hai?**  
    Python ORM—Python objects ko SQL tables se map karta hai.

36. **MongoDB change stream kab fail ho sakta hai?**  
    Agar deployment/change-stream configuration supported na ho ya DB connection issue ho.

37. **`.env` kyon chahiye?**  
    Mongo URI, ports/tokens/provider configuration source code ke bahar rakhne ke liye.

38. **Kya repository mein `.env` file hai?**  
    Inspection ke waqt nahi; user ko local config banana hoga.

### Machine learning

39. **LSTM kya hai?**  
    Sequence data mein past context use karne ke liye recurrent neural-network architecture.

40. **Model ka input kya hai?**  
    Code ke hisaab se 15 recent scaled water-level values, ek feature per timestep.

41. **Model ka output?**  
    Agle timestep ka ek scaled water-level estimate.

42. **MinMaxScaler kya karta hai?**  
    Values ko chosen range, yahan 0–1, mein map karta hai.

43. **Rolling forecast kya hai?**  
    Ek prediction ko next input window mein daal kar agla prediction banana.

44. **Outlier rule kya hai?**  
    Consecutive jump limit 10 aur rolling median ke MAD se 3× threshold wala code.

45. **Model accuracy kitni hai?**  
    Repository mein verified MAE/RMSE/accuracy score nahi diya gaya; number claim nahi karna.

46. **`classify_level` ML model hai?**  
    Nahi, woh hard-coded threshold-based rule hai.

### Alerts, architecture, testing, future

47. **Alerts kis threshold par trigger hote hain?**  
    Scheduler default `CRITICAL_LEVEL=-30` use karta hai, env se configurable.

48. **Email/SMS guaranteed hain?**  
    Nahi; provider credentials/network required hain, aur scheduler input endpoint integration mismatch hai.

49. **Biggest station-ID mismatch?**  
    Frontend defaults `DWLR_001`; model training script `DWLR_01` choose karta hai.

50. **Future scope kya hai?**  
    Real DWLR adapter, consistent schema/IDs, automated import, validated ML evaluation, reliable alert endpoint and end-to-end deployment tests.

### Chapter 10 revision notes

- Short answers mein “code mein present” vs “real-world proven” alag rakhein.
- APIs, two databases, LSTM input shape, and project caveats revise karein.
- Accuracy/benefits ke unsupported claims na karein.

### Practice questions

1. Viva mein kaun-se 3 endpoints yaad rakhenge?
2. LSTM aur threshold classifier mein difference kya hai?
3. SQLite vs MongoDB ka role?
4. Model score na ho to examiner ko kaise jawab denge?
5. Alert integration ki missing link kya hai?

---

## 11. Seven-Day Learning Plan

### Day 1 — Domain and project story

- **Read:** this guide sections 1 and 2; root `README.md`.
- **Learn:** groundwater, DWLR, station, timestamp, water level.
- **Practice:** 60-second intro bolkar record karein. Har statement ko “implemented / prototype / future” classify karein.

### Day 2 — Frontend fundamentals

- **Read:** `frontend/index.html`, `frontend/src/main.tsx`, `frontend/src/App.tsx`, `frontend/src/pages/Index.tsx`.
- **Learn:** React component, route, prop, state, effect.
- **Practice:** homepage se dashboard aur subscribe route ka path draw karein; `main.tsx` double-root issue identify karein.

### Day 3 — Dashboard, charts and APIs

- **Read:** `GroundwaterDashboard.tsx`, `HistoryViewer.tsx`, `ForecastViewer.tsx`, `frontend/src/services/api.ts`.
- **Learn:** `fetch`, JSON, chart data, browser location permission.
- **Practice:** mock values ko API values se distinguish karein; station IDs note karein.

### Day 4 — Backend and databases

- **Read:** `backend/app.py`, `backend/db.py`, `backend/services/db.py`, `subscriber.py`, `alert_log.py`.
- **Learn:** route, request/response, Mongo collection, relational table, ORM.
- **Practice:** draw `subscribers` → `alert_logs` relation and list each API route.

### Day 5 — Data processing and ML

- **Read:** `backend/services/preprocess.py`, `forecast.py`, `classify.py`, `backend/models/train.py`.
- **Learn:** missing values, outlier, scaling, sequence window, LSTM, train/test split.
- **Practice:** explain how 15 previous numbers are used to predict one next number; do not claim accuracy.

### Day 6 — Ingestion and alert workflow

- **Read:** `dwlr-proto/server.js`, `simulator.js`, `public/index.html`, scheduler/notification/email/SMS services.
- **Learn:** POST endpoint, smoothing, Socket.IO event, cooldown.
- **Practice:** explain why simulator data is synthetic and why scheduler needs a compatible GET source.

### Day 7 — Run, rehearse and viva

- **Read:** setup section and 50 Q&A.
- **Practice:** start services only after local credentials/dependencies are ready; test health route, then explain any unavailable integrations honestly.
- **Presentation:** rehearse the script in 5–10 minutes. Ask a friend to select 10 random viva questions.
- **Self-check:** explain architecture without reading; state three limitations and three future improvements.

### Chapter 11 revision notes

- Learn in dependency order: domain → frontend → APIs/data → ML → integration.
- Read the listed files in small groups, not all code at once.
- End each day by explaining one concept out loud.
- Practice honest limitation statements as much as feature descriptions.

### Practice questions

1. Day 1 par kis domain concept se start karenge?
2. Frontend entry-point files kis order mein padhenge?
3. Forecast understanding ke liye kaun-se files padhne hain?
4. Day 6 ka key integration limitation kya hai?
5. Day 7 ke end mein kaun-se three things explain kar paana chahiye?

---

## First chapter check-in

Chapter 1 se apni understanding test karein:

1. JalStar kis problem ko solve karne ki koshish karta hai?
2. Kya current demo reading actual DWLR sensor se aati hai?
3. DWLR ka role ek sentence mein bataiye.

Agla interactive lesson Chapter 2 (complete workflow) se continue karein.
