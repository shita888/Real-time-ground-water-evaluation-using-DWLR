 # JalDrishti — Real-Time Groundwater Monitoring & Forecasting

JalDrishti is a Smart India Hackathon project focused on **groundwater monitoring, historical analysis, forecasting, and alert notifications** using DWLR (Digital Water Level Recorder) data.

The platform provides groundwater insights for Madhya Pradesh through interactive dashboards, station-level visualizations, district-wise analysis, and machine learning-based forecasting. It aims to support researchers, planners, and communities in making informed decisions for sustainable groundwater management.

## Core Features

- **Groundwater Monitoring:** Monitor groundwater levels across DWLR stations.
- **Historical Analysis:** Analyze groundwater level trends using historical observations.
- **Future Forecasting:** Generate 7-day groundwater level forecasts using LSTM.
- **Interactive Map:** Visualize groundwater monitoring stations across Madhya Pradesh.
- **District Insights:** Explore district-wise groundwater conditions.
- **Station Search:** Search stations, districts, and groundwater monitoring locations.
- **Nearby Stations:** Find nearby monitoring stations using location-based functionality.
- **Groundwater Classification:** Categorize stations as Safe, Semi-Critical, Critical, or Over-Exploited.
- **Alert Subscription:** Subscribe to groundwater notifications through Email, SMS, or both.
- **User Authentication:** Create accounts and sign in to the platform.
- **Data Visualization:** Display historical trends and future groundwater predictions through interactive charts.

## Technology Stack

| Component | Technology |
|---|---|
| Frontend | React, TypeScript, Vite |
| UI / Styling | Bootstrap, Tailwind CSS |
| Backend | Python, FastAPI |
| Machine Learning | TensorFlow, LSTM |
| Data Processing | Pandas, NumPy, Scikit-learn |
| Database | MongoDB Atlas |
| Maps | Leaflet, OpenStreetMap |
| Charts | Interactive chart visualizations |
| Development Tools | VS Code, Git, GitHub |

## Project Architecture

The JalDrishti application follows a frontend-backend architecture.

1. **Data Collection:** Groundwater observations are obtained from DWLR datasets and monitoring data sources.
2. **Data Preprocessing:** Data is cleaned and prepared using Python and Pandas.
3. **Database Storage:** Groundwater station information and observations are stored in the database.
4. **Machine Learning:** LSTM models process historical water-level observations to generate forecasts.
5. **Backend API:** FastAPI provides endpoints for groundwater history, station information, and forecasting.
6. **Frontend Dashboard:** React displays groundwater statistics, maps, historical charts, and forecast results.
7. **Alert System:** Users can subscribe to notifications regarding groundwater conditions.

## Repository Structure

```text
JalDrishti/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── assets/
│   │   └── services/
│   ├── public/
│   ├── package.json
│   └── vite.config.ts
│
├── backend/
│   ├── app.py
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── data/
│   └── requirements.txt
│
├── data/
│   └── groundwater_dataset.csv
│
├── screenshots/
│
├── README.md
└── .gitignore
```

*Note: Update the directory structure according to the actual repository.*

## Dataset

The project uses DWLR groundwater monitoring data for Madhya Pradesh.

The dataset includes the following attributes:

- State
- District
- Block
- Village
- Latitude
- Longitude
- Date
- Water Level
- Status
- Year
- Trend

### Data Processing

- Data cleaning and preprocessing
- Handling duplicate observations
- Station-level data organization
- Historical groundwater trend analysis
- Preparation of time-series data for LSTM forecasting

## Machine Learning Model

### LSTM — Long Short-Term Memory

JalDrishti uses an LSTM-based time-series forecasting approach to predict future groundwater levels.

The model analyzes historical groundwater observations and learns temporal patterns in water-level changes.

### Forecasting Workflow

1. Collect historical groundwater observations.
2. Preprocess and normalize the dataset.
3. Prepare time-series sequences.
4. Train the LSTM model.
5. Generate 7-day groundwater level predictions.
6. Visualize the forecast through the dashboard.

### Model Output

- Predicted groundwater levels
- 7-day forecast visualization
- Groundwater trend analysis
- Forecast-based station insights

## Local Setup

### Prerequisites

- Python 3.10+
- Node.js 18+
- npm
- MongoDB Atlas account
- Visual Studio Code

### 1. Clone the Repository

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd JalDrishti
```

### 2. Backend Setup

Open a terminal:

```bash
cd backend
```

Create a virtual environment:

```bash
python -m venv .venv
```

Activate the virtual environment on Windows:

```bash
.venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Run the FastAPI backend:

```bash
python -m uvicorn app:app --reload --host 127.0.0.1 --port 8000
```

Backend API:

```text
http://127.0.0.1:8000
```

API documentation:

```text
http://127.0.0.1:8000/docs
```

### 3. Frontend Setup

Open another terminal:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start the frontend:

```bash
npm run dev
```

Open the application in your browser using the URL displayed by Vite.

## API Highlights

The backend provides APIs for groundwater monitoring and forecasting.

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Check backend health |
| GET | `/stations` | Retrieve groundwater station information |
| GET | `/history/{station_id}` | Retrieve historical groundwater observations |
| GET | `/forecast/{station_id}` | Generate groundwater forecasts |
| GET | `/latest/{station_id}` | Retrieve latest station water level |
| POST | `/api/subscribe` | Register alert subscription |

*Note: Verify the API routes against the actual FastAPI implementation.*

## Application Modules

### 1. Home Page
Provides an introduction to JalDrishti and its groundwater monitoring capabilities.

### 2. Dashboard
Displays groundwater statistics, historical trends, forecast data, and station updates.

### 3. Interactive Map
Shows monitoring station locations with groundwater status filters.

### 4. Historical Analysis
Visualizes past groundwater level observations for selected stations.

### 5. Forecast Module
Predicts groundwater levels for the next seven days using LSTM.

### 6. Authentication Module
Provides user registration and sign-in functionality.

### 7. Alert Subscription Module
Allows users to subscribe to groundwater notifications using Email, SMS, or both.

## Future Scope

- Integration with live DWLR sensor data streams
- Improved forecasting accuracy using advanced time-series models
- Mobile application for groundwater monitoring
- Automated SMS and email alert delivery
- Rainfall and recharge estimation integration
- District-wise groundwater risk analysis
- Advanced decision-support tools for water resource management

## Impact

JalDrishti aims to provide accessible groundwater information to researchers, planners, and communities.

By combining historical groundwater data, machine learning forecasts, and interactive visualization, the platform supports sustainable groundwater management and informed decision-making.

## Contributors

Developed as part of the Smart India Hackathon project.

## License

This project is intended for academic and research purposes. Add an appropriate license before public distribution.
