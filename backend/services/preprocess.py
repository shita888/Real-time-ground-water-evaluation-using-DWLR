import os
import pandas as pd
import numpy as np
import joblib
from sklearn.preprocessing import MinMaxScaler
from backend.services.db import get_station_data

SCALER_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models", "scaler.gz")


def get_valid_observations(station_id: str, limit: int = 500) -> pd.DataFrame:
    """
    Fetch raw documents for an MP station and filter strictly for valid observations.
    A valid observation requires:
    1. A valid, parseable date/timestamp.
    2. A valid, finite numeric groundwater level (non-null, non-NaN, non-inf).
    Never fabricates missing data or invents placeholder values.
    Returns DataFrame sorted chronologically with columns ['Date', 'Water_Level'].
    """
    docs = get_station_data(station_id, limit=limit)
    if not docs:
        return pd.DataFrame(columns=["Date", "Water_Level"])

    df = pd.DataFrame(docs)

    # Determine water level column safely (smoothed or raw)
    if "gw_level_smoothed" in df.columns and "gw_level" in df.columns:
        s_numeric = pd.to_numeric(df["gw_level_smoothed"], errors="coerce")
        r_numeric = pd.to_numeric(df["gw_level"], errors="coerce")
        df["Water_Level"] = s_numeric.fillna(r_numeric)
    elif "gw_level_smoothed" in df.columns:
        df["Water_Level"] = pd.to_numeric(df["gw_level_smoothed"], errors="coerce")
    elif "gw_level" in df.columns:
        df["Water_Level"] = pd.to_numeric(df["gw_level"], errors="coerce")
    else:
        return pd.DataFrame(columns=["Date", "Water_Level"])

    # Safe datetime parsing
    if "ts" in df.columns:
        df["Date"] = pd.to_datetime(df["ts"], errors="coerce")
    else:
        return pd.DataFrame(columns=["Date", "Water_Level"])

    # Drop nulls, NaNs, and non-finite numbers
    df = df.dropna(subset=["Date", "Water_Level"])
    df = df[np.isfinite(df["Water_Level"])]

    # Sort chronologically
    df = df.sort_values(by="Date").reset_index(drop=True)
    return df


def load_and_prepare(
    station_id: str,
    lookback: int = 15,
    window: int = 7,
    threshold: float = 3.5,
    jump_limit: float = 25.0,
    limit: int = 500,
    external_scaler: MinMaxScaler = None,
):
    """
    Fetch and preprocess chronological observation series for a given station.
    Returns: df (DataFrame), scaler (MinMaxScaler), X (numpy array), y (numpy array)
    If valid observations are fewer than lookback, returns (df, None, None, None)
    so that caller can inspect the exact count of available valid observations (len(df)).
    """
    df = get_valid_observations(station_id, limit=limit)
    if df is None or len(df) < lookback:
        return df, None, None, None

    # Outlier filter (detect extreme instrument jumps)
    df["Delta"] = df["Water_Level"].diff()
    df.loc[df["Delta"].abs() > jump_limit, "Water_Level"] = np.nan
    df.drop(columns="Delta", inplace=True)

    # Rolling median MAD filter
    if len(df) >= window:
        rolling_median = df["Water_Level"].rolling(window=window, center=True, min_periods=1).median()
        rolling_dev = (df["Water_Level"] - rolling_median).abs()
        mad = rolling_dev.median()
        if mad > 0:
            df.loc[rolling_dev > threshold * mad, "Water_Level"] = np.nan

    # Interpolate missing values and fill edges
    df["Water_Level"] = df["Water_Level"].interpolate(method="linear").bfill().ffill()

    # Verify that non-null values after cleaning still satisfy minimum lookback
    clean_df = df.dropna(subset=["Water_Level"])
    if len(clean_df) < lookback:
        return clean_df, None, None, None

    # Use existing trained scaler if available, else load or fit
    scaler = external_scaler
    if scaler is None and os.path.exists(SCALER_PATH):
        try:
            scaler = joblib.load(SCALER_PATH)
        except Exception:
            scaler = None

    if scaler is None:
        scaler = MinMaxScaler(feature_range=(0, 1))
        scaler.fit(df[["Water_Level"]])

    # Scaled values
    scaled_wl = scaler.transform(df[["Water_Level"]].values)
    df["Scaled_WL"] = scaled_wl.flatten()

    data = df["Scaled_WL"].values
    X, y = [], []
    for i in range(lookback, len(data)):
        X.append(data[i - lookback : i])
        y.append(data[i])

    return df, scaler, np.array(X), np.array(y)

