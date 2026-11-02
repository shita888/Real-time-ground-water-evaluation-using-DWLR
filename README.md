

# JalStar — Groundwater Level Forecasting (Smart India Hackathon 2025)


JalStar is a Smart India Hackathon project focused on **real-time groundwater monitoring, forecasting, and alerts** using DWLR (Digital Water Level Recorder) style data pipelines.

The project combines data ingestion, centralized storage, ML forecasting, and a web dashboard to support data-driven water management.

## Demo Video

🎥 [Watch the JalStar demo video](./demo.mp4)

## Screenshots

<img src="https://github.com/user-attachments/assets/3d1e8466-142a-4073-9310-6772bbe85d74" alt="JalStar subscribe page screenshot" />

<img src="https://github.com/user-attachments/assets/65f6c76f-9473-42c7-be12-d558d3f061f5" alt="JalStar application screenshot 2" />

<img src="https://github.com/user-attachments/assets/921f5618-0354-4ba5-935b-5c4e0c32b54c" alt="JalStar application screenshot 3" />

<img src="https://github.com/user-attachments/assets/a5878363-3957-4642-96c8-b79dd09489aa" alt="JalStar application screenshot 4" />

## Smart India Hackathon Context

- SIH 2025 project: **JalStar: Groundwater Level Forecasting**
- Built as an end-to-end platform for groundwater resource evaluation
- Includes realtime ingestion, time-series forecasting, and public-facing visualization
- Project cleared internal college rounds of Smart India Hackathon

## Core Capabilities

- Ingest groundwater readings into a centralized datastore
- Maintain historical and latest station-level records
- Forecast future groundwater trends using LSTM
- Serve history/forecast APIs for UI integration
- Provide subscription-based alerting workflows

## Tech Stack

- **Backend / ML:** Python, FastAPI, TensorFlow (LSTM), scikit-learn
- **Database:** MongoDB Atlas (time-series style storage patterns), SQLite (subscriber/alert metadata)
- **Frontend:** React, TypeScript, Vite, Bootstrap/Tailwind ecosystem
- **Realtime / Ingestion Prototype:** Node.js, Express, Socket.IO

## Repository Structure

- `/backend` — FastAPI app, ML forecasting, notifications, DB service layer
- `/frontend` — React + TypeScript UI for dashboards/maps/workflows
- `/dwlr-proto` — Node-based ingestion and realtime prototype server
- `/data` — project data assets

## High-Level Architecture

1. Sensor/API readings are ingested through the Node ingestion prototype (`/dwlr-proto`).
2. Groundwater readings are stored in MongoDB collections (`readings`, `latest`).
3. Python backend (`/backend`) preprocesses station data and runs LSTM forecasting.
4. Forecast and history endpoints are exposed via FastAPI.
5. React frontend (`/frontend`) consumes APIs for dashboards, maps, and user features.

## Local Setup

### Prerequisites

- Python 3.10+
- Node.js 18+
- MongoDB Atlas connection string

### 1) Backend (FastAPI + ML)

```bash
cd /home/runner/work/JalStar/JalStar/backend
pip install -r requirements.txt
uvicorn backend.app:app --reload --host 127.0.0.1 --port 8000
```

### 2) Frontend (React + Vite)

```bash
cd /home/runner/work/JalStar/JalStar/frontend
npm install
npm run dev
```

### 3) Ingestion/Realtime Prototype (Optional)

```bash
cd /home/runner/work/JalStar/JalStar/dwlr-proto
npm install
npm start
```

## Important Environment Variables

### Backend (`/backend/.env`)

- `MONGODB_URI`
- `MONGODB_DB` (default: `dwlr`)
- `DATABASE_URL` (default SQLite path)
- `DEV_TRIGGER_TOKEN`
- Notification-related: `SENDGRID_API_KEY`, `SMTP_*`, `TWILIO_*`, `ALERT_COOLDOWN_SECONDS`

### Ingestion Prototype (`/dwlr-proto/.env`)

- `MONGODB_URI`
- `MONGODB_DB`
- `PORT`
- `INGEST_TOKEN`

## API Highlights (Backend)

- `GET /health` — service health
- `GET /forecast/{station_id}` — forecast for station
- `GET /history/{station_id}` — recent station history
- `GET /stations` — station list
- `GET /latest/{station_id}` — latest station level
- `POST /api/subscribe` — alert subscription

## Status

This repository contains active hackathon-era code and prototypes. Some modules are exploratory, but the full pipeline (ingestion → storage → forecasting → UI) is represented in this codebase.
