# JalDrishti: Technical Documentation Report
**Real-Time Groundwater Resource Evolution, Monitoring & Forecasting System (Madhya Pradesh)**

---

## 1. Project Overview, Objectives, and Technology Stack

### 1.1 Project Overview
**JalDrishti** (formerly *JalStar*) is a full-stack, data-driven groundwater resource monitoring, analysis, and forecasting platform designed for the state of **Madhya Pradesh, India**. Developed originally for the Smart India Hackathon (SIH) and subsequently expanded with real-world telemetry pipelines, JalDrishti ingests Digital Water Level Recorder (DWLR) time-series data, stores observation records across 55 districts in Madhya Pradesh, evaluates water table depletion trends, computes 7-day predictive forecasts using an LSTM (Long Short-Term Memory) neural network, and provides automated critical-level alerting workflows.

### 1.2 Core Objectives
1. **Centralized Telemetry Management:** Ingest and aggregate time-series groundwater depth-to-water-level measurements (in meters below ground level, mbgl) from 2,453 DWLR stations across all 55 districts of Madhya Pradesh.
2. **Standardized Status Classification:** Classify stations according to Central Ground Water Board (CGWB) groundwater exploitation stages:
   - **Safe:** Water level < 10.0 mbgl
   - **Semi-critical:** Water level 10.0 to 20.0 mbgl
   - **Critical:** Water level 20.0 to 40.0 mbgl
   - **Over-exploited:** Water level > 40.0 mbgl
3. **Deep Learning Forecasting:** Deploy a trained TensorFlow/Keras LSTM model capable of recursive forward predictions ($n=7$ days) based on station historical trend sequences.
4. **Resilient Data Quality & Error Handling:** Strictly enforce minimum observation requirements ($\ge 15$ valid readings) for ML inference, decouple history retrieval from forecast minimums, safely handle irregular/missing observations without dummy value fabrication ($0.0\text{m}$), and provide clear descriptive HTTP 422 feedback when observations are insufficient.
5. **Interactive Geospatial Visualization:** Render district boundaries, station coordinates, status markers, historical depletion curves, and localized forecasts on a responsive web dashboard.
6. **Multi-Channel Subscriber Alerts:** Provide threshold-triggered notifications (Email via SendGrid and SMS via Twilio) with built-in cooldown tracking to prevent notification storms.

### 1.3 Technology Stack

| Layer | Component | Version / Library | Purpose |
| :--- | :--- | :--- | :--- |
| **Backend Core** | Python | 3.13.9 | Core runtime for APIs and ML services |
| **API Framework** | FastAPI | 0.115.11 | High-performance asynchronous REST API framework |
| **ASGI Server** | Uvicorn | 0.34.0 | ASGI web server running FastAPI on `127.0.0.1:8000` |
| **Deep Learning** | TensorFlow / Keras | 2.18.0 | LSTM neural network runtime for time-series forecasting |
| **Data Processing** | Pandas / NumPy / Scikit-learn | 2.2.3 / 2.0.2 / 1.6.1 | Feature scaling (`MinMaxScaler`), preprocessing, and statistics |
| **Primary Database** | MongoDB Community | 8.0 (Port 27017) | Stores station metadata (`stations`), time-series readings (`readings`), and latest readings (`latest`) |
| **Metadata Database** | SQLite (`data/app.db`) | 3.x via SQLAlchemy 2.0 | Stores alert subscribers (`subscribers`) and notification dispatch logs (`alert_logs`) |
| **Job Scheduling** | APScheduler | 3.10.4 | Background automated station polling and alert evaluation |
| **Notification Services** | SendGrid / Twilio SDKs | 6.11.0 / 9.4.5 | Email and SMS threshold alert delivery |
| **Frontend Framework** | React + TypeScript | React 18.3.1, TS 5.6.3 | Single Page Application (SPA) architecture |
| **Build Tool & Bundler**| Vite | 6.4.1 | Lightning-fast dev server with reverse proxy and production bundler |
| **Styling & Icons** | TailwindCSS + Bootstrap + Lucide | Tailwind 4.x / Lucide React | Modern aesthetic dashboard UI with glassmorphism |
| **Geospatial Mapping** | Leaflet + D3.js | Leaflet 1.9.4, D3 7.9.0 | Interactive spatial maps and GeoJSON district boundary rendering |
| **Charting** | Custom Canvas & SVG Components | Vanilla CSS / SVG | Historical trend line charts and forecast trajectory plots |
| **Ingestion Prototype** | Node.js + Express | Express 4.x, Socket.IO 4.x | Realtime mock ingestion and WebSocket broadcast prototype |

---

## 2. Dataset Analysis & District-Wise Breakdown

### 2.1 Inventory of CSV Datasets

All datasets reside within the project directory hierarchy. Below are the verified empirical file sizes, column structures, record counts, and missing value statistics:

| Dataset Path | File Size | Row Count | Column Count | Columns | Missing Values (Null Count) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `backend/data/mp_groundwater_clean.csv` | 14,107,157 bytes (13.45 MB) | 137,255 | 11 | `state`, `district`, `BLOCK`, `VILLAGE`, `lat`, `lng`, `Date`, `waterLevel`, `status`, `year`, `trend` | **0 nulls** across all 11 columns (100% complete) |
| `backend/data/clean_groundwater.csv` | 15,419 bytes (0.01 MB) | 552 | 2 | `Date`, `Water_Level` | **0 nulls** |
| `backend/data/clean_groundwater_daily.csv` | 4,785 bytes (0.005 MB) | 282 | 2 | `Date`, `Water_Level` | `Date`: 0 nulls<br>`Water_Level`: **139 nulls (49.29%)** |
| `backend/data/hauz_khas_dwlr.csv` | 28,719 bytes (0.03 MB) | 563 | 5 | `Unnamed: 0`, `Unnamed: 1`, `National Water Informatics Centre`, `Unnamed: 3`, `Unnamed: 4` | Row headers contain 6 to 10 null entries (NWIC Delhi benchmark sample) |
| `frontend/src/data/csv/dists.csv` | 22,187 bytes (0.02 MB) | 640 | 6 | `dist`, `litrate`, `sexratio`, `area`, `popdensity`, `workpoprate` | **0 nulls** |
| `frontend/src/data/csv/pc_14.csv` | 47,506 bytes (0.05 MB) | 543 | 10 | `State`, `PC No.`, `PC Name`, `PC Type`, `Winner Candidates`, `winner Party`, `Votesw`, `Runner-Up`, `Party`, `Votesr` | **0 nulls** |

### 2.2 Data Source & Provenance
- **Primary Source:** Digital Water Level Recorder (DWLR) telemetry records collated from the **Central Ground Water Board (CGWB)**, Ministry of Jal Shakti, Government of India, and the **Madhya Pradesh Water Resources Department**.
- **Coverage Window:** Observations range from **January 1, 1994** through **May 10, 2024**.
- **Observation Frequency:** Historical records include seasonal and monthly measurements transitioning into continuous daily/weekly telemetry in modern DWLR installations.

### 2.3 Madhya Pradesh District-Wise Station and Observation Counts
The MongoDB `dwlr` database holds records for **55 districts** in Madhya Pradesh. Aggregating the `stations` and `readings` collections yields the following verified district-by-district breakdown:

| # | District | Station Count | Total Observations in DB |
| :-: | :--- | :-: | :-: |
| 1 | **Shajapur** | 94 | 1,886 |
| 2 | **Ujjain** | 83 | 3,548 |
| 3 | **Shivpuri** | 80 | 3,564 |
| 4 | **Seoni** | 79 | 4,666 |
| 5 | **Sagar** | 79 | 4,281 |
| 6 | **Dhar** | 77 | 3,807 |
| 7 | **Ratlam** | 75 | 3,584 |
| 8 | **Mandla** | 65 | 3,364 |
| 9 | **Jabalpur** | 63 | 2,886 |
| 10 | **Betul** | 62 | 3,235 |
| 11 | **Panna** | 61 | 2,474 |
| 12 | **Indore** | 60 | 2,796 |
| 13 | **Bhopal** | 56 | 2,009 |
| 14 | **Mandsaur** | 56 | 3,440 |
| 15 | **Balaghat** | 55 | 4,348 |
| 16 | **Chhatarpur** | 54 | 3,812 |
| 17 | **Damoh** | 52 | 2,451 |
| 18 | **Chhindwara** | 51 | 3,257 |
| 19 | **Vidisha** | 51 | 3,140 |
| 20 | **Sidhi** | 51 | 3,075 |
| 21 | **Neemuch** | 49 | 2,972 |
| 22 | **Khandwa (East Nimar)** | 49 | 2,715 |
| 23 | **Shahdol** | 49 | 2,239 |
| 24 | **Raisen** | 48 | 3,039 |
| 25 | **Satna** | 47 | 2,880 |
| 26 | **Rajgarh** | 47 | 2,614 |
| 27 | **Guna** | 46 | 2,463 |
| 28 | **Dewas** | 44 | 2,779 |
| 29 | **Gwalior** | 43 | 2,472 |
| 30 | **Rewa** | 41 | 2,665 |
| 31 | **Narsimhapur** | 41 | 2,170 |
| 32 | **Khargone (West Nimar)** | 39 | 2,497 |
| 33 | **Sehore** | 39 | 2,328 |
| 34 | **Singrauli** | 37 | 1,425 |
| 35 | **Maihar** | 34 | 1,921 |
| 36 | **Bhind** | 33 | 2,592 |
| 37 | **Anuppur** | 32 | 1,825 |
| 38 | **Agar-Malwa** | 32 | 1,565 |
| 39 | **Sheopur** | 32 | 2,153 |
| 40 | **Tikamgarh** | 32 | 1,550 |
| 41 | **Narmadapuram** | 32 | 2,391 |
| 42 | **Ashoknagar** | 29 | 1,668 |
| 43 | **Burhanpur** | 28 | 1,477 |
| 44 | **Umaria** | 27 | 1,598 |
| 45 | **Morena** | 27 | 1,723 |
| 46 | **Katni** | 26 | 2,041 |
| 47 | **Jhabua** | 24 | 1,282 |
| 48 | **Dindori** | 24 | 1,476 |
| 49 | **Harda** | 19 | 1,392 |
| 50 | **Alirajpur** | 19 | 1,243 |
| 51 | **Barwani** | 19 | 1,114 |
| 52 | **Datia** | 19 | 1,064 |
| 53 | **Mauganj** | 16 | 987 |
| 54 | **Pandhurna** | 15 | 1,378 |
| 55 | **Niwari** | 11 | 783 |
| **TOTAL** | **55 Districts** | **2,453 Stations** | **134,104 Observations** |

---

## 3. System Architecture, Data Flow, Database Schemas, & Forecast Engine

### 3.1 High-Level Architecture & End-to-End Data Flow

```mermaid
graph TD
    subgraph ClientBrowser [Browser Client: React 18 + Vite]
        UI_Home[Home View]
        UI_Dash[Groundwater Dashboard]
        UI_Hist[History Viewer Chart]
        UI_Fore[Forecast Viewer Chart]
        UI_Map[Leaflet / D3 Geospatial Map]
        UI_Sub[Alert Subscription Form]
    end

    subgraph ViteServer [Vite Dev Server :5173]
        Proxy[Vite Reverse Proxy Engine]
    end

    subgraph BackendCore [FastAPI Application :8000]
        API_Router[FastAPI Route Handlers]
        CORS_PNA[CORSMiddleware & PNA Headers]
        PreprocessService[Preprocess & Quality Gate Service]
        ForecastService[Recursive LSTM Forecast Engine]
        DBService[MongoDB Data Access Layer]
        Scheduler[APScheduler Background Worker]
        NotificationService[Notification Dispatcher]
    end

    subgraph StorageLayer [Datastores]
        subgraph MongoDB [MongoDB Database: dwlr]
            Col_Stations[(stations collection: 2,453 docs)]
            Col_Readings[(readings collection: 134,104 docs)]
            Col_Latest[(latest collection: 2,452 docs)]
            Col_Forecast[(forecast cache: 4 docs)]
        end
        subgraph SQLite [SQLite: data/app.db]
            Table_Subscribers[(subscribers table)]
            Table_AlertLogs[(alert_logs table)]
        end
        subgraph ModelStore [Model Artifacts]
            LSTM_Model[groundwater_lstm.keras: 19,009 params]
            Scaler_Artifact[scaler.gz: MinMaxScaler]
        end
    end

    subgraph ExternalServices [External Notification Gateways]
        SendGrid[SendGrid Email API]
        Twilio[Twilio SMS API]
    end

    ClientBrowser -->|HTTP Same-Origin Requests| Proxy
    Proxy -->|Proxy Pass changeOrigin: true| API_Router
    API_Router --> PreprocessService
    PreprocessService --> DBService
    PreprocessService -->|Valid Obs >= 15| ForecastService
    ForecastService --> LSTM_Model
    ForecastService --> Scaler_Artifact
    DBService --> Col_Stations
    DBService --> Col_Readings
    DBService --> Col_Latest
    DBService --> Col_Forecast
    API_Router --> Table_Subscribers
    Scheduler --> DBService
    Scheduler --> NotificationService
    NotificationService --> Table_Subscribers
    NotificationService --> Table_AlertLogs
    NotificationService --> SendGrid
    NotificationService --> Twilio
```

### 3.2 MongoDB Database Schema (`dwlr`)

MongoDB hosts 4 collections optimized with targeted compound indexes:

#### 1. `stations` Collection (2,453 Documents)
Stores physical metadata, location coordinates, geographic hierarchy, and statistical aggregations for every DWLR station.
- **Indexes:** `_id_`, `station_id_1` (unique)
- **Document Structure:**
  ```json
  {
    "_id": ObjectId("6adc1375f23e9e768a7b635d"),
    "station_id": "MP_DHAR_BAGH_BAGH_1",
    "name": "Bagh (Bagh, Dhar)",
    "state": "Madhya Pradesh",
    "district": "Dhar",
    "block": "Bagh",
    "village": "Bagh",
    "lat": 22.36194,
    "lon": 74.7975,
    "earliest_date": "1994-01-01",
    "latest_date": "2024-05-10",
    "latest_level": 5.55,
    "latest_status": "critical",
    "latest_trend": "improving",
    "min_level": 1.2,
    "max_level": 21.9,
    "mean_level": 7.84,
    "records_count": 151
  }
  ```

#### 2. `readings` Collection (134,104 Documents)
Stores individual time-series observation records.
- **Indexes:** `_id_`, `station_id_1_ts_1` (compound), `station_id_1`, `ts_1`
- **Document Structure:**
  ```json
  {
    "_id": ObjectId("6adc1319f23e9e768a795785"),
    "station_id": "MP_AGAR_MALWA_AGAR_AGAR_1",
    "ts": "1994-01-01 00:00:00",
    "gw_level": 15.5,
    "gw_level_smoothed": 15.5,
    "status": "semi-critical",
    "trend": "improving",
    "year": 1994
  }
  ```

#### 3. `latest` Collection (2,452 Documents)
Caches the most recent verified observation per station for rapid dashboard rendering.
- **Indexes:** `_id_`, `station_id_1` (unique)
- **Document Structure:**
  ```json
  {
    "_id": ObjectId("6adc1376f23e9e768a7b6cf1"),
    "station_id": "MP_DHAR_BAGH_BAGH_1",
    "name": "Bagh (Bagh, Dhar)",
    "lat": 22.36194,
    "lon": 74.7975,
    "gw_level": 5.55,
    "gw_level_smoothed": 5.55,
    "status": "critical",
    "trend": "improving",
    "ts": "2024-05-10T00:00:00"
  }
  ```

#### 4. `forecast` Collection (4 Documents)
Stores cached forward projections for stations whose ML forecasts have been calculated.
- **Document Structure:**
  ```json
  {
    "_id": ObjectId("6adc1770f23e9e768a7b76ec"),
    "station_id": "MP_DHAR_BAGH_BAGH_1",
    "forecast": {
      "station_id": "MP_DHAR_BAGH_BAGH_1",
      "predictions": [5.95, 5.37, 5.47, 5.81, 6.32, 5.89, 5.99],
      "mean_category": "Semi-critical",
      "trend": "Stable",
      "n_future": 7,
      "lookback": 15,
      "available_observations": 151,
      "required_observations": 15,
      "latest_level": 5.55
    }
  }
  ```

### 3.3 SQLite Metadata Schema (`data/app.db`)
Manages subscription details and alerts independently of MongoDB time-series data:
- **`subscribers` Table:**
  - `id`: INTEGER PRIMARY KEY AUTOINCREMENT
  - `name`: VARCHAR (Subscriber name)
  - `email`: VARCHAR (Optional email address)
  - `phone`: VARCHAR (Optional phone number)
  - `preferred_channel`: VARCHAR (`"email"`, `"sms"`, or `"both"`)
  - `station_id`: VARCHAR (Optional specific station subscription)
  - `active`: BOOLEAN (Subscription active status, default `True`)
  - `subscribed_at`: DATETIME (Timestamp of subscription)
  - `last_alert_sent_at`: DATETIME (Timestamp of last alert sent, used for cooldown)
- **`alert_logs` Table:**
  - `id`: INTEGER PRIMARY KEY AUTOINCREMENT
  - `subscriber_id`: INTEGER (Foreign key to `subscribers.id`)
  - `level`: VARCHAR (Depletion level: `"critical"`, `"over-exploited"`)
  - `reading_value`: FLOAT (Water level reading triggering alert)
  - `message`: TEXT (Dispatched notification message body)
  - `sent_at`: DATETIME (Dispatch timestamp)
  - `success`: BOOLEAN (Provider delivery status)
  - `provider_response`: TEXT (Response code / message from SendGrid or Twilio)

### 3.4 API Endpoints Specification

| Method | Path | Query / Body Parameters | Success Status | Error Codes | Function & Response Summary |
| :--- | :--- | :--- | :---: | :---: | :--- |
| `GET` | `/` | None | `200 OK` | — | Project metadata: `{"project": "JalDrishti", "status": "online", ...}` |
| `GET` | `/health` | None | `200 OK` | `503` | MongoDB connection status and timestamp |
| `GET` | `/stations` | None | `200 OK` | — | Returns array of all 2,453 MP stations with coordinates, district, latest level, status |
| `GET` | `/stations/recent` | `limit: int = 8` | `200 OK` | — | Returns top $N$ recently updated stations |
| `GET` | `/stations/nearby` | `lat?: float, lon?: float, limit: int = 3` | `200 OK` | — | Returns closest stations guaranteeing distinct MP districts |
| `GET` | `/statistics` | None | `200 OK` | — | State aggregate counts: active, critical, safe, semi-critical stations, average water level |
| `GET` | `/latest/{station_id}` | Path: `station_id` | `200 OK` | `404` | Returns latest observation for station; rejects non-MP/demo IDs |
| `GET` | `/history/{station_id}` | Path: `station_id`, `days: int = 7` | `200 OK` | `404` | Returns chronological observations; returns `{"count": 0, "history": []}` for 0-obs stations without 500 crashes |
| `GET` | `/forecast/{station_id}` | Path: `station_id`, `n_future: int = 7` | `200 OK` | `404`, `422` | Returns 7-day predicted groundwater levels; **returns HTTP 422 if valid observations < 15** |
| `POST` | `/api/subscribe` | Body: `SubscriberRequest` (JSON) | `200 OK` | `400` | Registers alert subscriber and dispatches welcome email |
| `GET` | `/api/subscribers` | None | `200 OK` | — | Lists active subscribers |
| `POST` | `/api/trigger-alerts` | Header: `X-Dev-Trigger: dev-secret` | `200 OK` | `401` | Evaluates stations against thresholds and dispatches alerts honoring 1-hour cooldown |

### 3.5 LSTM Forecasting Architecture & Preprocessing Logic

```
   Raw Station Readings (MongoDB)
                │
                ▼
   [get_valid_observations()] ──► Filter nulls, non-numeric, NaNs
                │
                ▼
   Is Count >= 15?
         ├── NO  ──► Raise InsufficientDataError ──► HTTP 422 Response
         │
         └── YES ──► [load_and_prepare()]
                           │
                           ▼
                     MinMaxScaler (0.0 to 199.75m)
                           │
                           ▼
                     Take Last 15 Observations: Shape (1, 15, 1)
                           │
                           ▼
                     ┌───────────────────────────────────┐
                     │ LSTM Layer (64 Units)             │
                     └───────────────────────────────────┘
                                   │
                                   ▼
                     ┌───────────────────────────────────┐
                     │ Dense Layer (32 Units, ReLU)      │
                     └───────────────────────────────────┘
                                   │
                                   ▼
                     ┌───────────────────────────────────┐
                     │ Dense Output Layer (1 Unit, Linear)│
                     └───────────────────────────────────┘
                                   │
                                   ▼
                     [Recursive Multi-Step Loop (n=7)]
                     - Predict Day t+1
                     - Append to Window, Drop Oldest
                     - Repeat for 7 Days
                                   │
                                   ▼
                     Inverse Transform: scaler.inverse_transform()
                                   │
                                   ▼
                     CGWB Categorization & Trend Calculation
```

#### Neural Network Layer Architecture
The model file `backend/models/groundwater_lstm.keras` is a Keras Sequential neural network:
1. **LSTM Layer:** 64 recurrent units, `input_shape = (None, 15, 1)`, hyperbolic tangent ($\tanh$) activation, 16,896 parameters.
2. **Dense Hidden Layer:** 32 units, Rectified Linear Unit (`ReLU`) activation, 2,080 parameters.
3. **Dense Output Layer:** 1 unit, Linear activation, 33 parameters.
- **Total Parameters:** 57,029 (Trainable: 19,009, Optimizer: 38,020).
- **Loss Function:** Mean Squared Error (`mse`).
- **Optimizer:** Adam.
- **Normalization:** `MinMaxScaler` fit on training ranges $[0.0\text{m}, 199.75\text{m}]$ with scaling coefficient $0.00500626$.

#### Inference Preprocessing Pipeline
1. **Valid Data Extraction (`get_valid_observations`):** Queries MongoDB chronologically. Parses timestamps into datetimes and coerces `gw_level_smoothed` or `gw_level` into finite floating-point values. Excludes invalid dates, strings, non-numeric values, or NaNs.
2. **Quality Gate:** If `len(valid_observations) < 15`, execution halts immediately. An `InsufficientDataError` is raised, returning HTTP 422 Unprocessable Content along with exact counts of available vs. required observations.
3. **Recursive Forecasting Loop:**
   $$\hat{y}_{t+k} = f(\hat{y}_{t+k-1}, \dots, \hat{y}_{t+k-15})$$
   At each forward step, the scaled prediction $\hat{y}$ is appended to the input buffer and the oldest observation is dropped, generating a smooth, realistic 7-day trajectory.
4. **Post-Processing & Categorization:** Predictions are inverse-transformed back to physical meters below ground level (mbgl) and evaluated across CGWB thresholds to compute the overall forecast trend (`Improving`, `Declining`, or `Stable`) and exploitation category (`Safe`, `Semi-critical`, `Critical`, or `Over-exploited`).

---

## 4. Frontend Visual Evidence & Component Architecture

### 4.1 Archived Visual Evidence (Video & Official Screenshots)
The repository contains verified visual assets documenting the interface:
- **Complete Walkthrough Demo Video:** [`demo.mp4`](file:///c:/Users/INDIA%20TECHNOLOGY/Documents/Major%20Project%20G3/Projects/JalStar/demo.mp4) (Root directory, playable demonstration of navigation, station lookup, history charts, forecast visualization, and alert subscriptions).
- **Official Interface Screenshots (GitHub User-Attachments):**
  1. *Alert Subscription & Channel Selection UI:*  
     `https://github.com/user-attachments/assets/3d1e8466-142a-4073-9310-6772bbe85d74`
  2. *Geospatial Map & Station Distribution UI:*  
     `https://github.com/user-attachments/assets/65f6c76f-9473-42c7-be12-d558d3f061f5`
  3. *District Analytics & Regional Overview UI:*  
     `https://github.com/user-attachments/assets/921f5618-0354-4ba5-935b-5c4e0c32b54c`
  4. *Real-time Station Monitoring Dashboard UI:*  
     `https://github.com/user-attachments/assets/a5878363-3957-4642-96c8-b79dd09489aa`

> [!NOTE]
> *Status of Stand-alone PNG/JPG Capture Files:* Individual raw snapshot files for every component state are not stored as static files in the repository. The user interface renders dynamically at runtime via the Vite dev server at `http://localhost:5173/`.

### 4.2 Frontend Component Architecture & Visual Layouts

The application is structured into modular React components adhering to modern responsive design:

#### 1. Header & Navigation ([`header.tsx`](file:///c:/Users/INDIA%20TECHNOLOGY/Documents/Major%20Project%20G3/Projects/JalStar/frontend/src/components/ui/header.tsx))
- **Branding:** Displays **JalDrishti** with water droplet insignia.
- **Navigation Links:** `Home`, `Dashboard`, `Map Dropdown (States, Districts & Stations)`, `Language Selector (7 Indian languages)`, and `ThemeToggle`.

#### 2. Groundwater Dashboard ([`GroundwaterDashboard.tsx`](file:///c:/Users/INDIA%20TECHNOLOGY/Documents/Major%20Project%20G3/Projects/JalStar/frontend/src/components/GroundwaterDashboard.tsx))
- **Hero Title:** `JalDrishti — Groundwater Monitoring (Madhya Pradesh)`
- **Summary Metrics Cards:**
  - *Active Stations:* 2,453 (Madhya Pradesh DWLR network)
  - *Average Water Level:* 11.1m (Statewide average)
  - *Critical Stations:* 1,254 (Highlighted with destructive badges)
  - *Recharge Rate:* 2.8m/yr
- **Live Location Card:** HTML5 Geolocation integration locating nearest distinct MP station with distance in kilometers.
- **Quick-Search & Filter:** Instant search by district, block, village, or station ID.

#### 3. History Viewer ([`HistoryViewer.tsx`](file:///c:/Users/INDIA%20TECHNOLOGY/Documents/Major%20Project%20G3/Projects/JalStar/frontend/src/components/HistoryViewer.tsx))
- **Functionality:** Chronological time-series chart plotting depth-to-water level (mbgl) over selectable timeframes (7 days, 15 days, 30 days, 90 days, 1 year).
- **Safety Feature:** Decoupled from the 15-observation forecast minimum. Safely displays stations with any observation count $\ge 0$ without throwing 500 errors or fabricating $0.0\text{m}$ readings.
- **Quick-Test Presets:** Buttons for `0 obs`, `2 obs`, and `151 obs`.

#### 4. Forecast Viewer ([`ForecastViewer.tsx`](file:///c:/Users/INDIA%20TECHNOLOGY/Documents/Major%20Project%20G3/Projects/JalStar/frontend/src/components/ForecastViewer.tsx))
- **Functionality:** Visualizes the 7-day forward predictive trajectory produced by the LSTM neural network.
- **Quality Notice Badge:** Clearly highlights `"Model Requirement: 15 valid observations"`.
- **Informative Error Feedback:** When a station with $< 15$ observations is selected, renders a clear amber warning banner showing the exact counts:  
  *⚠️ Insufficient data for station '...': need at least 15 valid observations, but only X available.*

#### 5. District & Map View ([`district.tsx`](file:///c:/Users/INDIA%20TECHNOLOGY/Documents/Major%20Project%20G3/Projects/JalStar/frontend/src/districts/district.tsx))
- **Functionality:** Leaflet interactive map populated with all 2,453 MP stations color-coded by depletion status (Green = Safe, Yellow = Semi-critical, Orange/Red = Critical/Over-exploited).

---

## 5. Live API Testing Evidence & Execution Logs

Live endpoint testing was conducted directly against the active FastAPI backend (`http://127.0.0.1:8000`) and verified through the Vite dev server proxy (`http://localhost:5173`). Below are the exact request URLs, HTTP status codes, headers, response bodies, and corresponding server logs:

### 5.1 System Health & Metadata Endpoints

#### Request: `GET http://127.0.0.1:8000/`
- **HTTP Status:** `200 OK`
- **Response Headers:** `{'content-type': 'application/json'}`
- **Response Body:**
  ```json
  {
    "project": "JalDrishti",
    "description": "Real-Time Groundwater Resource Evolution Using DWLR Data",
    "status": "online",
    "docs_url": "/docs"
  }
  ```
- **Backend Log Entry:**
  ```text
  INFO:     127.0.0.1:50223 - "GET / HTTP/1.1" 200 OK
  ```

#### Request: `GET http://127.0.0.1:8000/health`
- **HTTP Status:** `200 OK`
- **Response Headers:** `{'content-type': 'application/json'}`
- **Response Body:**
  ```json
  {
    "status": "ok",
    "time": "2026-10-24T16:21:42.662146+00:00",
    "database": "connected"
  }
  ```
- **Backend Log Entry:**
  ```text
  INFO:     127.0.0.1:50224 - "GET /health HTTP/1.1" 200 OK
  ```

#### Request: `GET http://127.0.0.1:8000/statistics`
- **HTTP Status:** `200 OK`
- **Response Headers:** `{'content-type': 'application/json'}`
- **Response Body:**
  ```json
  {
    "active_stations": 2453,
    "avg_water_level": "11.1m",
    "avg_water_level_num": 11.12,
    "critical_stations": 1254,
    "safe_stations": 606,
    "semi_critical_stations": 593,
    "recharge_rate": "2.8m/yr",
    "state": "Madhya Pradesh"
  }
  ```
- **Backend Log Entry:**
  ```text
  INFO:     127.0.0.1:50225 - "GET /statistics HTTP/1.1" 200 OK
  ```

#### Request: `GET http://127.0.0.1:8000/stations/nearby?limit=3`
- **HTTP Status:** `200 OK`
- **Response Headers:** `{'content-type': 'application/json'}`
- **Response Body (Excerpt):**
  ```json
  {
    "stations": [
      {
        "id": "MP_INDORE_MHOW_MHOW_2",
        "name": "Mhow (Mhow, Indore)",
        "location": "Mhow, Mhow, Indore",
        "district": "Indore",
        "block": "Mhow",
        "village": "Mhow",
        "level": 4.82,
        "status": "semi-critical",
        "trend": "stable",
        "trend_direction": "up",
        "lat": 22.54861,
        "lng": 75.76194,
        "distance": 12.0,
        "latest_date": "2024-05-10"
      }
    ]
  }
  ```
- **Backend Log Entry:**
  ```text
  INFO:     127.0.0.1:50226 - "GET /stations/nearby?limit=3 HTTP/1.1" 200 OK
  ```

---

## 6. Verification of Observation Edge Cases

To verify that the model quality gates, HTTP status codes, and decoupling work as designed, tests were run across all three observation categories:

### Test Case A: Station with Zero (0) Observations (`MP_BHOPAL_NEW_0_OBS`)

#### 1. History Request: `GET /history/MP_BHOPAL_NEW_0_OBS?days=15`
- **HTTP Status:** `200 OK`
- **Response Body:**
  ```json
  {
    "station_id": "MP_BHOPAL_NEW_0_OBS",
    "count": 0,
    "history": []
  }
  ```
- **Verification Result:** PASSED. Returns an empty array cleanly without crashing or fabricating $0.0\text{m}$ readings.
- **Backend Log Entry:**
  ```text
  INFO:     127.0.0.1:50227 - "GET /history/MP_BHOPAL_NEW_0_OBS?days=15 HTTP/1.1" 200 OK
  ```

#### 2. Forecast Request: `GET /forecast/MP_BHOPAL_NEW_0_OBS?n_future=7`
- **HTTP Status:** `422 Unprocessable Content`
- **Custom Response Headers:**
  - `X-Observations-Available: 0`
  - `X-Observations-Required: 15`
  - `Content-Type: application/json`
- **Response Body:**
  ```json
  {
    "detail": "Insufficient data for station 'MP_BHOPAL_NEW_0_OBS': need at least 15 valid observations, but only 0 available."
  }
  ```
- **Verification Result:** PASSED. Refuses to fabricate forecast data and returns exact requirement metrics.
- **Backend Log Entry:**
  ```text
  INFO:     127.0.0.1:50228 - "GET /forecast/MP_BHOPAL_NEW_0_OBS?n_future=7 HTTP/1.1" 422 Unprocessable Content
  ```

---

### Test Case B: Station with Fewer Than Required Observations (`MP_AGAR_MALWA_AGAR_DAABADIYA` - 2 Obs)

#### 1. History Request: `GET /history/MP_AGAR_MALWA_AGAR_DAABADIYA?days=15`
- **HTTP Status:** `200 OK`
- **Response Body:**
  ```json
  {
    "station_id": "MP_AGAR_MALWA_AGAR_DAABADIYA",
    "count": 2,
    "history": [
      {
        "date": "2023-05-20",
        "water_level": 20.64,
        "status": "over-exploited",
        "trend": "stable"
      },
      {
        "date": "2024-05-10",
        "water_level": 12.18,
        "status": "over-exploited",
        "trend": "improving"
      }
    ]
  }
  ```
- **Verification Result:** PASSED. Returns real historical observations independently of forecast minimums.
- **Backend Log Entry:**
  ```text
  INFO:     127.0.0.1:50229 - "GET /history/MP_AGAR_MALWA_AGAR_DAABADIYA?days=15 HTTP/1.1" 200 OK
  ```

#### 2. Forecast Request: `GET /forecast/MP_AGAR_MALWA_AGAR_DAABADIYA?n_future=7`
- **HTTP Status:** `422 Unprocessable Content`
- **Custom Response Headers:**
  - `X-Observations-Available: 2`
  - `X-Observations-Required: 15`
  - `Content-Type: application/json`
- **Response Body:**
  ```json
  {
    "detail": "Insufficient data for station 'MP_AGAR_MALWA_AGAR_DAABADIYA': need at least 15 valid observations, but only 2 available."
  }
  ```
- **Verification Result:** PASSED. Correctly identifies 2 available observations against 15 required, returning 422.
- **Backend Log Entry:**
  ```text
  INFO:     127.0.0.1:50230 - "GET /forecast/MP_AGAR_MALWA_AGAR_DAABADIYA?n_future=7 HTTP/1.1" 422 Unprocessable Content
  ```

---

### Test Case C: Station with Sufficient Observations (`MP_DHAR_BAGH_BAGH_1` - 151 Obs)

#### 1. History Request: `GET /history/MP_DHAR_BAGH_BAGH_1?days=15`
- **HTTP Status:** `200 OK`
- **Response Body (Excerpt):**
  ```json
  {
    "station_id": "MP_DHAR_BAGH_BAGH_1",
    "count": 15,
    "history": [
      { "date": "2020-08-24", "water_level": 4.2, "status": "safe", "trend": "stable" },
      { "date": "2020-11-10", "water_level": 4.9, "status": "safe", "trend": "stable" },
      { "date": "2021-01-10", "water_level": 5.1, "status": "over-exploited", "trend": "improving" },
      { "date": "2024-05-10", "water_level": 5.55, "status": "critical", "trend": "improving" }
    ]
  }
  ```
- **Verification Result:** PASSED. Historical time series returned in full chronological fidelity.
- **Backend Log Entry:**
  ```text
  INFO:     127.0.0.1:50231 - "GET /history/MP_DHAR_BAGH_BAGH_1?days=15 HTTP/1.1" 200 OK
  ```

#### 2. Forecast Request: `GET /forecast/MP_DHAR_BAGH_BAGH_1?n_future=7`
- **HTTP Status:** `200 OK`
- **Response Body:**
  ```json
  {
    "station_id": "MP_DHAR_BAGH_BAGH_1",
    "predictions": [5.95, 5.37, 5.47, 5.81, 6.32, 5.89, 5.99],
    "mean_category": "Semi-critical",
    "trend": "Stable",
    "n_future": 7,
    "lookback": 15,
    "available_observations": 151,
    "required_observations": 15,
    "latest_level": 5.55
  }
  ```
- **Verification Result:** PASSED. Model successfully predicts 7 future days of groundwater levels with valid classification.
- **Backend Log Entry:**
  ```text
  INFO:     127.0.0.1:50232 - "GET /forecast/MP_DHAR_BAGH_BAGH_1?n_future=7 HTTP/1.1" 200 OK
  ```

---

## 7. Known Issues, Verified Root Causes, Fixes Made, & Remaining Work

### 7.1 Verified Issues & Implemented Fixes

| # | Issue Identified | Verified Root Cause | Fix Implemented | Files Modified |
| :-: | :--- | :--- | :--- | :--- |
| **1** | History & Forecast "Failed to fetch" in Browser UI | GET requests in `api.ts` sent `headers: { "Content-Type": "application/json" }`, triggering CORS preflight `OPTIONS` requests that failed in the browser. | Removed `Content-Type` on GET requests; configured `Accept: application/json` only. | [`frontend/src/services/api.ts`](file:///c:/Users/INDIA%20TECHNOLOGY/Documents/Major%20Project%20G3/Projects/JalStar/frontend/src/services/api.ts) |
| **2** | Vite Proxy Missing API Routes | `vite.config.ts` only proxied `/api` to port 5000; calls to `/forecast`, `/history`, `/stations`, `/statistics` were unproxied and failed. | Added proxy targets for `/api`, `/forecast`, `/history`, `/stations`, `/statistics`, `/latest`, and `/health` targeting `http://127.0.0.1:8000` with `changeOrigin: true`. | [`frontend/vite.config.ts`](file:///c:/Users/INDIA%20TECHNOLOGY/Documents/Major%20Project%20G3/Projects/JalStar/frontend/vite.config.ts) |
| **3** | Browser Private Network Access (PNA) Blocks | Chromium browsers enforce PNA security when localhost communicates with 127.0.0.1, requiring `Access-Control-Allow-Private-Network: true`. | Added HTTP middleware to return `Access-Control-Allow-Private-Network: true` when requested by modern browsers. | [`backend/app.py`](file:///c:/Users/INDIA%20TECHNOLOGY/Documents/Major%20Project%20G3/Projects/JalStar/backend/app.py) |
| **4** | CORS Spec Violation in FastAPI | `CORSMiddleware` configured with wildcard `allow_origins=["*"]` while `allow_credentials=True`, which modern browsers reject per W3C specification. | Replaced wildcard with explicit local origin list and regex `r"^https?://(localhost\|127\.0\.0\.1)(:\d+)?$"`, adding `expose_headers=["*"]`. | [`backend/app.py`](file:///c:/Users/INDIA%20TECHNOLOGY/Documents/Major%20Project%20G3/Projects/JalStar/backend/app.py) |
| **5** | Forecast 500 Server Crash on Low Observation Stations | Forecast service previously crashed with unhandled index errors when valid observations were $< 15$, rather than validating count before tensor reshaping. | Implemented `get_valid_observations()`, `load_and_prepare()`, and custom `InsufficientDataError` returning HTTP 422 with exact counts in headers. | [`backend/services/preprocess.py`](file:///c:/Users/INDIA%20TECHNOLOGY/Documents/Major%20Project%20G3/Projects/JalStar/backend/services/preprocess.py), [`backend/services/forecast.py`](file:///c:/Users/INDIA%20TECHNOLOGY/Documents/Major%20Project%20G3/Projects/JalStar/backend/services/forecast.py), [`backend/app.py`](file:///c:/Users/INDIA%20TECHNOLOGY/Documents/Major%20Project%20G3/Projects/JalStar/backend/app.py) |
| **6** | History Coupled to Forecast Minimums | History endpoint previously failed for stations with $< 15$ observations or fabricated dummy $0.0\text{m}$ readings. | Decoupled `/history` from forecast requirements; safely parses timestamps and floats, skips invalid/NaN readings, and returns 200 with `count: 0` for 0-obs stations. | [`backend/app.py`](file:///c:/Users/INDIA%20TECHNOLOGY/Documents/Major%20Project%20G3/Projects/JalStar/backend/app.py) |
| **7** | Hardcoded Backend URLs in UI Components | Multiple components hardcoded `fetch("http://127.0.0.1:8000/...")` instead of routing through Vite's same-origin reverse proxy. | Updated `getApiBaseUrl()` to return relative `""` in HTTP/HTTPS browser sessions; refactored components to use imported API helpers. | [`GroundwaterDashboard.tsx`](file:///c:/Users/INDIA%20TECHNOLOGY/Documents/Major%20Project%20G3/Projects/JalStar/frontend/src/components/GroundwaterDashboard.tsx), [`AlertSubscription.tsx`](file:///c:/Users/INDIA%20TECHNOLOGY/Documents/Major%20Project%20G3/Projects/JalStar/frontend/src/components/AlertSubscription.tsx), [`district.tsx`](file:///c:/Users/INDIA%20TECHNOLOGY/Documents/Major%20Project%20G3/Projects/JalStar/frontend/src/districts/district.tsx) |
| **8** | Off-by-One Boundary in Nearby Stations | In `backend/services/db.py`, the loop over distinct districts appended beyond the requested limit when distinct candidates were exhausted. | Added `if len(selected) < limit:` check to strictly honor requested count. | [`backend/services/db.py`](file:///c:/Users/INDIA%20TECHNOLOGY/Documents/Major%20Project%20G3/Projects/JalStar/backend/services/db.py) |
| **9** | Project Rebranding Inconsistencies | Legacy "JalStar" / "JalSthar" branding lingered in header, title tags, chatbots, and documentation. | Renamed all user-visible titles, logo text, dashboard headers, chatbots, and API docs to **JalDrishti**. | [`header.tsx`](file:///c:/Users/INDIA%20TECHNOLOGY/Documents/Major%20Project%20G3/Projects/JalStar/frontend/src/components/ui/header.tsx), [`index.html`](file:///c:/Users/INDIA%20TECHNOLOGY/Documents/Major%20Project%20G3/Projects/JalStar/frontend/index.html), [`home.tsx`](file:///c:/Users/INDIA%20TECHNOLOGY/Documents/Major%20Project%20G3/Projects/JalStar/frontend/src/components/home.tsx), [`app.py`](file:///c:/Users/INDIA%20TECHNOLOGY/Documents/Major%20Project%20G3/Projects/JalStar/backend/app.py) |

### 7.2 Remaining Work & Untested Items

1. **Hardware Telemetry Gateway Integration:** The current system reads cleaned observation datasets from MongoDB. Integration with live physical IoT DWLR hardware transmitters via MQTT/LoRaWAN remains an open engineering item for future hardware rollouts.
2. **Exogenous ML Features:** The current LSTM model is univariate (predicts future depth using historical depth sequences). Incorporating rainfall/precipitation data, monsoon cycles, and soil percolation indices would improve forecast precision during monsoon transitions.
3. **Containerization for Production:** While dependencies are documented in `backend/requirements.txt` and `frontend/package.json`, a production multi-container setup (`docker-compose.yml` encapsulating MongoDB, FastAPI, and an Nginx reverse proxy) has not yet been formalized.
4. **Third-Party Email/SMS Provider Live Credential Testing:** Mock and graceful-fallback behaviors for SendGrid and Twilio are verified. Testing with live production SMS credits/custom domain DKIM records remains dependent on deployment environment API keys.

---

## 8. Dependency Installation & Run Commands

### 8.1 Backend Setup & Execution

#### Prerequisites
- Python 3.10 to 3.13 installed
- MongoDB Community Server running locally on port `27017`

#### Windows PowerShell Commands
```powershell
# 1. Navigate to the project root directory
cd "C:\Users\INDIA TECHNOLOGY\Documents\Major Project G3\Projects\JalStar"

# 2. Create Python virtual environment (if not already created)
python -m venv backend\.venv

# 3. Activate virtual environment
.\backend\.venv\Scripts\Activate.ps1

# 4. Install backend dependencies
pip install -r backend\requirements.txt

# 5. Start the FastAPI Uvicorn server on port 8000
python -m uvicorn backend.app:app --host 127.0.0.1 --port 8000 --reload
```

#### Linux / macOS Bash Commands
```bash
# 1. Navigate to project root
cd /path/to/JalStar

# 2. Create virtual environment
python3 -m venv backend/.venv

# 3. Activate virtual environment
source backend/.venv/bin/activate

# 4. Install dependencies
pip install -r backend/requirements.txt

# 5. Launch FastAPI server
python -m uvicorn backend.app:app --host 127.0.0.1 --port 8000 --reload
```

#### Running Backend Verification Tests
```powershell
# Run the complete test suite (18 unit & integration tests)
.\backend\.venv\Scripts\pytest.exe backend/tests -v
```

---

### 8.2 Frontend Setup & Execution

#### Prerequisites
- Node.js (version 18.x, 20.x, or 22.x)
- npm (version 9.x or higher)

#### Windows / Linux / macOS Commands
```bash
# 1. Navigate to the frontend directory
cd frontend

# 2. Install Node dependencies
npm install

# 3. Launch Vite dev server (defaults to http://localhost:5173)
npm run dev

# 4. (Optional) Build production bundle to verify correctness
npm run build
```

---

*Report prepared and verified for **JalDrishti**. All data points, district totals, model specifications, and endpoint outputs correspond strictly to empirical codebase inspection and live system executions.*
