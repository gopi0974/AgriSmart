"""
app.py — FastAPI main application entry point.
Run with: uvicorn app:app --reload --port 8000
"""
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI  # pyre-ignore[21]
from fastapi.middleware.cors import CORSMiddleware  # pyre-ignore[21]

from data_loader import (  # pyre-ignore[21]
    prices_df, production_df, vegs_df, districts_df,
    get_vegetable_locations, get_recommendations, get_all_veg_locations,
    get_farmers_by_vegetable,
    DISTRICTS, VEGETABLES,
)
from ml_model.train import load_model, train_model, predict_price  # pyre-ignore[21]
from routes.auth_routes import router as auth_router  # pyre-ignore[21]
from routes.farmer_routes import router as farmer_router  # pyre-ignore[21]
from routes.data_routes import router as data_router, set_state  # pyre-ignore[21]
from routes.ai_routes import router as ai_router # pyre-ignore[21]


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Auto-train model if missing ──────────────────────────────────────
    print("[Startup] Loading data and ML model...")
    model, encoders = load_model()
    if model is None:
        print("[Startup] No saved model found — training now (this may take a moment)...")
        model, encoders, mae = train_model(prices_df, production_df)
        print(f"[Startup] Training done. MAE = ₹{mae:.2f}/kg")
    else:
        print("[Startup] Loaded existing model from disk.")

    # Inject state into data_routes
    set_state(
        prices_df=prices_df,
        production_df=production_df,
        vegs_df=vegs_df,
        model=model,
        encoders=encoders,
        get_veg_locations_fn=get_vegetable_locations,
        get_recommendations_fn=get_recommendations,
        predict_price_fn=predict_price,
        get_all_veg_locations_fn=get_all_veg_locations,
        get_farmers_by_vegetable_fn=get_farmers_by_vegetable,
        districts_df=districts_df,
        DISTRICTS=DISTRICTS,
        VEGETABLES=VEGETABLES,
    )
    print("[Startup] System ready.")
    yield
    print("[Shutdown] Goodbye.")


app = FastAPI(
    title="Smart Vegetable Availability & Price Transparency API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(farmer_router)
app.include_router(data_router)
app.include_router(ai_router)


@app.get("/")
def root():
    return {
        "message": "Smart Vegetable Availability & Price Transparency API",
        "docs": "/docs",
        "status": "running",
    }


@app.get("/health")
def health():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn  # pyre-ignore[21]
    uvicorn.run(app, host="0.0.0.0", port=8000)
