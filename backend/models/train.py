"""
Train groundwater LSTM forecasting model on Madhya Pradesh DWLR observation sequences.

- Reads chronological readings from MongoDB (or clean MP dataset).
- Scales data using MinMaxScaler fitted with current scikit-learn version (eliminates InconsistentVersionWarning).
- Builds sequential windows of lookback=15 per station without crossing station boundaries.
- Trains an LSTM network to forecast the next groundwater observation.
- Evaluates on a held-out test split (MAE, RMSE, R²).
- Saves model to backend/models/groundwater_lstm.keras and scaler to backend/models/scaler.gz.
"""

import os
import sys
import numpy as np
import joblib
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import mean_absolute_error, root_mean_squared_error, r2_score
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Input, LSTM, Dense, Dropout
import pymongo
from dotenv import load_dotenv

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Ensure backend/.env is loaded
ENV_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
load_dotenv(ENV_PATH)

MODEL_DIR = os.path.dirname(__file__)
MODEL_PATH = os.path.join(MODEL_DIR, "groundwater_lstm.keras")
SCALER_PATH = os.path.join(MODEL_DIR, "scaler.gz")
LOOKBACK = 15

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://127.0.0.1:27017/")
MONGODB_DB = os.getenv("MONGODB_DB", "dwlr")


def train_groundwater_model(lookback: int = LOOKBACK, epochs: int = 10, batch_size: int = 64):
    print("=" * 60)
    print("🌊 JalDrishti LSTM Groundwater Model Training & Validation")
    print("=" * 60)

    client = pymongo.MongoClient(MONGODB_URI, serverSelectionTimeoutMS=5000)
    db = client[MONGODB_DB]

    # Verify MongoDB connection
    client.admin.command("ping")
    print(f"Connected to MongoDB: {MONGODB_URI} (db: {MONGODB_DB})")

    # 1. Fit scaler on all groundwater levels
    print("Fitting MinMaxScaler on MP groundwater levels...")
    sample_levels = [
        doc["gw_level"]
        for doc in db.readings.find({}, {"gw_level": 1, "_id": 0}).limit(50000)
    ]

    if not sample_levels:
        raise RuntimeError("No readings found in MongoDB. Run import_mp_data.py first.")

    levels_arr = np.array(sample_levels).reshape(-1, 1)
    scaler = MinMaxScaler(feature_range=(0, 1))
    scaler.fit(levels_arr)
    print(f"Scaler range: min={scaler.data_min_[0]:.2f}m, max={scaler.data_max_[0]:.2f}m")

    # 2. Select eligible stations (records_count >= lookback + 1)
    query = {"records_count": {"$gte": lookback + 1}}
    stations = list(db.stations.find(query, {"station_id": 1, "records_count": 1}).sort("records_count", -1))
    print(f"Found {len(stations)} stations eligible for training (>= {lookback + 1} observations).")

    # 3. Build sliding window sequences per station
    X_list, y_list = [], []
    # Train on top 400 richest stations for high quality + fast convergence
    selected_stations = stations[:400]
    print(f"Building training sequences from top {len(selected_stations)} stations...")

    for st in selected_stations:
        sid = st["station_id"]
        docs = list(db.readings.find({"station_id": sid}, {"gw_level": 1, "ts": 1, "_id": 0}).sort("ts", 1))
        if len(docs) < lookback + 1:
            continue

        raw_vals = np.array([float(d["gw_level"]) for d in docs]).reshape(-1, 1)
        scaled_vals = scaler.transform(raw_vals).flatten()

        for i in range(lookback, len(scaled_vals)):
            X_list.append(scaled_vals[i - lookback : i])
            y_list.append(scaled_vals[i])

    X = np.array(X_list).reshape(-1, lookback, 1)
    y = np.array(y_list)
    print(f"Total training sequences generated: {X.shape[0]} (Lookback={lookback}, Features=1)")

    if len(X) < 100:
        raise RuntimeError(f"Insufficient sequences ({len(X)}) to train model reliably.")

    # 4. Train / Test Split (Chronological 80% train, 20% test)
    split_idx = int(0.8 * len(X))
    X_train, X_test = X[:split_idx], X[split_idx:]
    y_train, y_test = y[:split_idx], y[split_idx:]
    print(f"Dataset split: {X_train.shape[0]} train samples, {X_test.shape[0]} test samples")

    # 5. Build LSTM Architecture
    model = Sequential([
        Input(shape=(lookback, 1)),
        LSTM(64, activation="tanh", return_sequences=False),
        Dense(32, activation="relu"),
        Dense(1),
    ])

    model.compile(optimizer="adam", loss="mse", metrics=["mae"])
    model.summary()

    # 6. Fit Model
    print(f"\nStarting training for {epochs} epochs...")
    history = model.fit(
        X_train,
        y_train,
        epochs=epochs,
        batch_size=batch_size,
        validation_split=0.1,
        verbose=1,
    )

    # 7. Evaluate on held-out Test Set
    print("\nEvaluating model on held-out test data...")
    y_pred_scaled = model.predict(X_test, verbose=0)
    y_pred = scaler.inverse_transform(y_pred_scaled).flatten()
    y_true = scaler.inverse_transform(y_test.reshape(-1, 1)).flatten()

    mae = mean_absolute_error(y_true, y_pred)
    rmse = root_mean_squared_error(y_true, y_pred)
    r2 = r2_score(y_true, y_pred)

    print("\n" + "=" * 50)
    print("📈 Model Performance on Held-Out Test Set:")
    print(f"   • Mean Absolute Error (MAE):    {mae:.3f} meters")
    print(f"   • Root Mean Squared Error (RMSE): {rmse:.3f} meters")
    print(f"   • R² Score:                     {r2:.3f}")
    print("=" * 50)

    # 8. Save model and scaler
    os.makedirs(MODEL_DIR, exist_ok=True)
    model.save(MODEL_PATH)
    joblib.dump(scaler, SCALER_PATH)

    print(f"✅ Model saved to: {MODEL_PATH}")
    print(f"✅ Scaler saved to: {SCALER_PATH}")
    print("🎉 Model training and validation complete!")


if __name__ == "__main__":
    train_groundwater_model()
