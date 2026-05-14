"""
ml_model/train.py — Train a Random Forest price predictor and save to disk.
"""
import os
import joblib  # pyre-ignore[21]
import numpy as np  # pyre-ignore[21]
import pandas as pd  # pyre-ignore[21]
from sklearn.ensemble import RandomForestRegressor  # pyre-ignore[21]
from sklearn.preprocessing import LabelEncoder  # pyre-ignore[21]
from sklearn.model_selection import train_test_split  # pyre-ignore[21]
from sklearn.metrics import mean_absolute_error  # pyre-ignore[21]

MODEL_DIR = os.path.dirname(__file__)
MODEL_PATH = os.path.join(MODEL_DIR, "price_model.pkl")
ENC_PATH = os.path.join(MODEL_DIR, "encoders.pkl")
INFO_PATH = os.path.join(MODEL_DIR, "model_info.json")

FEATURES = ["vegetable_enc", "district_enc", "month", "year", "avg_yield", "avg_area"]


def train_model(prices_df: pd.DataFrame, production_df: pd.DataFrame):
    """
    Merge price + production data, encode categoricals, train RandomForest.
    Saves model + encoders to disk.
    Returns: model, encoders dict, mae
    """
    # Aggregate production stats per (vegetable, district)
    prod = (
        production_df.groupby(["vegetable", "district"])
        .agg(avg_yield=("yield_tons_per_hectare", "mean"), avg_area=("area_hectares", "mean"))
        .reset_index()
    )

    # Prepare prices data with month/year extracted from date_updated if available
    prices = prices_df.copy()
    if "date_updated" in prices.columns:
        prices["date_updated"] = pd.to_datetime(prices["date_updated"])
        prices["month"] = prices["date_updated"].dt.month
        prices["year"] = prices["date_updated"].dt.year

    df = prices.merge(prod, on=["vegetable", "district"], how="left")
    df["avg_yield"] = df["avg_yield"].fillna(df["avg_yield"].median() if not df["avg_yield"].isna().all() else 20.0)
    df["avg_area"] = df["avg_area"].fillna(df["avg_area"].median() if not df["avg_area"].isna().all() else 2000.0)
    
    # Ensure month/year exist (even if filled with defaults) if columns were missing
    if "month" not in df.columns: df["month"] = 6
    if "year" not in df.columns: df["year"] = 2025
    
    df = df.dropna(subset=["price_per_kg_inr", "month", "year"])

    # Encode categoricals
    veg_enc = LabelEncoder()
    dist_enc = LabelEncoder()
    df["vegetable_enc"] = veg_enc.fit_transform(df["vegetable"].astype(str))
    df["district_enc"] = dist_enc.fit_transform(df["district"].astype(str))

    X = df[FEATURES]
    y = df["price_per_kg_inr"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    model = RandomForestRegressor(n_estimators=150, n_jobs=-1, random_state=42)
    model.fit(X_train, y_train)

    preds = model.predict(X_test)
    mae = mean_absolute_error(y_test, preds)
    print(f"[ML] Training complete. MAE = ₹{mae:.2f}/kg")

    encoders = {"vegetable": veg_enc, "district": dist_enc}
    joblib.dump(model, MODEL_PATH)
    joblib.dump(encoders, ENC_PATH)
    
    # Save model info
    import json
    from datetime import datetime
    info = {
        "mae": round(float(mae), 4),
        "accuracy_score": round(float(100 - (mae / (df["price_per_kg_inr"].mean() or 1) * 100)), 2),
        "last_trained": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "samples": len(df)
    }
    with open(INFO_PATH, "w") as f:
        json.dump(info, f, indent=2)
        
    print(f"[ML) Model saved to {MODEL_PATH}")

    return model, encoders, mae


def load_model():
    """Load saved model and encoders from disk."""
    if not os.path.exists(MODEL_PATH):
        return None, None
    model = joblib.load(MODEL_PATH)
    encoders = joblib.load(ENC_PATH)
    return model, encoders


def predict_price(
    model,
    encoders,
    vegetable: str,
    district: str,
    month: int,
    year: int,
    avg_yield: float = 20.0,
    avg_area: float = 2000.0,
) -> float:
    """Predict price for a given vegetable/district/month/year."""
    veg_enc = encoders["vegetable"]
    dist_enc = encoders["district"]

    # Handle unseen labels gracefully
    try:
        v = veg_enc.transform([vegetable])[0]
    except ValueError:
        v = 0
    try:
        d = dist_enc.transform([district])[0]
    except ValueError:
        d = 0

    X = np.array([[v, d, month, year, avg_yield, avg_area]])
    price = model.predict(X)[0]
    return round(float(price), 2)
