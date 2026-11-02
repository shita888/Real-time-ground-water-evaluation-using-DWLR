"""
Groundwater LSTM Forecasting Service.
Loads trained LSTM model & scaler, validates station data availability,
and produces multi-step forecasts with classification and trend metrics.
"""

import os
import numpy as np
import joblib
from tensorflow.keras.models import load_model  # type: ignore

from backend.services.classify import classify_level, trend_alert
from backend.services.preprocess import load_and_prepare
from backend.services.db import insert_forecast, station_exists, get_station_count


class StationNotFoundError(Exception):
    """Raised when a requested station does not exist in the database."""
    pass


class InsufficientDataError(Exception):
    """Raised when a station exists but lacks enough observations for lookback window."""

    def __init__(self, message: str, available: int = 0, required: int = 15, station_id: str = ""):
        super().__init__(message)
        self.message = message
        self.available = available
        self.required = required
        self.station_id = station_id


# Paths resolved relative to this file
BASE_DIR = os.path.dirname(os.path.dirname(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "models", "groundwater_lstm.keras")
SCALER_PATH = os.path.join(BASE_DIR, "models", "scaler.gz")

_model = None
_scaler = None


def get_model_and_scaler():
    """Load model and scaler with memoization."""
    global _model, _scaler
    if _model is None or _scaler is None:
        if not os.path.exists(MODEL_PATH):
            raise RuntimeError(f"Trained model not found at {MODEL_PATH}")
        if not os.path.exists(SCALER_PATH):
            raise RuntimeError(f"Scaler not found at {SCALER_PATH}")

        _model = load_model(MODEL_PATH, compile=False)
        _scaler = joblib.load(SCALER_PATH)

    return _model, _scaler


def get_model_observation_requirement() -> int:
    """
    Dynamically verify the LSTM model's actual observation requirement from its architecture.
    Returns the required sequential lookback count expected by the model input layer.
    """
    model, _ = get_model_and_scaler()
    if hasattr(model, "input_shape") and model.input_shape:
        # Expected input shape: (batch_size, timesteps, features)
        shape = model.input_shape
        if len(shape) >= 2 and shape[1] is not None:
            return int(shape[1])
    return 15


def forecast_future(station_id: str, n_future: int = 7, lookback: int = None):
    """
    Forecast groundwater levels for the next `n_future` timesteps for a given station.
    Verifies model observation requirement, ensures sufficient valid observations,
    and returns predictions. If valid observations are insufficient, raises InsufficientDataError
    with exact available and required counts, never fabricating data.
    """
    # 1. Verify station existence
    if not station_exists(station_id):
        raise StationNotFoundError(f"Station '{station_id}' was not found in the database.")

    model, scaler = get_model_and_scaler()

    # 2. Verify model's actual observation requirement
    required_obs = get_model_observation_requirement()
    effective_lookback = required_obs if (lookback is None or lookback < required_obs) else lookback

    # 3. Load latest cleaned valid dataset from MongoDB using shared scaler
    df, _, X, y = load_and_prepare(station_id, lookback=effective_lookback, external_scaler=scaler)
    available_count = len(df) if df is not None else 0

    if df is None or available_count < effective_lookback:
        raise InsufficientDataError(
            f"Insufficient data for station '{station_id}': need at least {effective_lookback} valid observations, but only {available_count} available.",
            available=available_count,
            required=effective_lookback,
            station_id=station_id,
        )

    # Values scaled to [0, 1]
    scaled_values = df["Scaled_WL"].values
    raw_values = df["Water_Level"].values

    # Start with the last `effective_lookback` observations
    last_seq = scaled_values[-effective_lookback:].reshape((1, effective_lookback, 1))
    future_preds = []

    for _ in range(n_future):
        pred_scaled = model.predict(last_seq, verbose=0)
        pred = scaler.inverse_transform(pred_scaled)[0][0]
        # Physical lower bound safeguard (water table depth >= 0)
        pred_bounded = max(0.0, float(pred))
        future_preds.append(round(pred_bounded, 2))

        # roll window forward with scaled prediction
        last_seq = np.append(last_seq[:, 1:, :], pred_scaled.reshape(1, 1, 1), axis=1)

    # Classify average future level & detect trajectory trend
    mean_val = float(np.mean(future_preds))
    mean_category = classify_level(mean_val)
    trend = trend_alert(future_preds)

    result = {
        "station_id": station_id,
        "predictions": future_preds,
        "mean_category": mean_category,
        "trend": trend,
        "n_future": n_future,
        "lookback": effective_lookback,
        "available_observations": available_count,
        "required_observations": effective_lookback,
        "latest_level": round(float(raw_values[-1]), 2),
    }

    # Save forecast back into MongoDB
    try:
        insert_forecast(station_id, result)
    except Exception as e:
        print(f"⚠️ Failed to cache forecast in DB for {station_id}: {e}")

    return result
