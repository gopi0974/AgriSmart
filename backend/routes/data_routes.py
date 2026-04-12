"""
routes/data_routes.py — Vegetable search, price prediction, recommendations, districts.
"""
from fastapi import APIRouter, Query  # pyre-ignore[21]
from pydantic import BaseModel
import re
from typing import Optional
import os
import json

router = APIRouter(prefix="/api")

# Loaded lazily from app state (injected after startup)
_state = {}


def set_state(prices_df, production_df, vegs_df, model, encoders,
              get_veg_locations_fn, get_recommendations_fn, predict_price_fn,
              get_all_veg_locations_fn, get_farmers_by_vegetable_fn,
              districts_df, DISTRICTS, VEGETABLES):
    _state.update(
        prices_df=prices_df, production_df=production_df, vegs_df=vegs_df,
        model=model, encoders=encoders,
        get_veg_locations=get_veg_locations_fn,
        get_recommendations=get_recommendations_fn,
        predict_price=predict_price_fn,
        get_all_veg_locations=get_all_veg_locations_fn,
        get_farmers_by_vegetable=get_farmers_by_vegetable_fn,
        districts_df=districts_df,
        DISTRICTS=DISTRICTS,
        VEGETABLES=VEGETABLES,
    )


@router.get("/vegetables")
def search_vegetables(
    name: str = Query("", description="Vegetable name (partial match)"),
    district: str = Query("", description="District name (partial match)")
):
    result = []
        
    # Live Farmer Data from crops.json strictly validated
    try:
        from .farmer_routes import CROPS_FILE  # pyre-ignore[21]
        if os.path.exists(CROPS_FILE):
            with open(CROPS_FILE, "r") as f:
                all_crops = json.load(f)
            
            districts_df = _state["districts_df"]
            
            for crop in all_crops:
                price = float(crop.get("price", 0) or 0)
                quantity = float(crop.get("quantity", 0) or 0)
                
                # Strict validation: price & quantity must be > 0 and farmer_id exists
                if price <= 0 or quantity <= 0 or not crop.get("farmer_id"):
                    continue
                    
                # Filter by name if provided
                if name and name.lower() not in crop.get("vegetable", "").lower():
                    continue
                if district and district.lower() not in crop.get("district", "").lower():
                    continue
                
                # Dynamic Lookup for contact info if missing
                farmer_name = crop.get("name")
                farmer_mobile = crop.get("mobile")
                
                if not farmer_name or not farmer_mobile:
                    try:
                        with open(os.path.join(os.path.dirname(__file__), "..", "users.json"), "r") as uf:
                            users_data = json.load(uf)
                            for _, prof in users_data.get("farmers", {}).items():
                                if prof.get("id") == crop.get("farmer_id"):
                                    if not farmer_name: farmer_name = prof.get("name", "Unknown")
                                    if not farmer_mobile: farmer_mobile = prof.get("mobile", "N/A")
                                    break
                    except: pass

                # Get exact lat/lon or fallback to district
                if crop.get("lat") is not None and crop.get("lon") is not None:
                    lat = float(crop["lat"])
                    lon = float(crop["lon"])
                else:
                    d_info = districts_df[districts_df["district"] == crop.get("district", "")]
                    lat = float(d_info["latitude"].iloc[0]) if not d_info.empty else 16.0
                    lon = float(d_info["longitude"].iloc[0]) if not d_info.empty else 80.0
                
                result.append({
                    "id": crop.get("id", ""),
                    "farmer_id": crop.get("farmer_id", ""),
                    "vegetable": crop.get("vegetable", ""),
                    "district": crop.get("district", ""),
                    "lat": lat,
                    "lon": lon,
                    "avg_price": price, # Real price
                    "quantity": quantity,
                    "type": "Farmer",
                    "farmer_name": farmer_name or "Unknown Farmer",
                    "mobile": farmer_mobile or "N/A"
                })
    except Exception as e:
        print(f"Error loading farmer crops: {e}")

    return {"success": True, "results": result}


# ── Voice Command Parsing (NLP-lite) ──────────────────────────────────────

class VoiceRequest(BaseModel):
    text: str
    context_district: str = "Guntur"

def parse_voice_command(text: str, context_district: str):
    from .ai_routes import translate_to_english, translate_from_english
    english_text, detected_lang = translate_to_english(text)
    text = english_text.lower().strip()
    
    # 1. Add Crop: "Add 500kg tomato in Guntur" or "I have some 10 kg of Onions in Guntur"
    # Patterns: (add|have|list|listing|submit|sell|selling|some) ... (qty) ... (veg) in (dist)
    add_match = re.search(r'(?:add|have|list|listing|submit|sell|selling|some)\s*(?:about|around)?\s*(\d+(?:\.\d+)?)\s*(?:kg|kgs|kilos|kilograms|k g)?\s*(?:of)?\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)\s+(?:in|at|from)\s+([A-Za-z]+)', text)
    if add_match and "cart" not in text:
        qty, veg_name, dist_name = add_match.groups()
        
        # Strip trailing s for simplistic plural handling
        veg_name = veg_name.strip()
        if veg_name.endswith('s') and veg_name not in ["beans", "peas"]: 
            veg_name = veg_name[:-1]
            
        # Match against actual database lists
        final_veg = veg_name.capitalize()
        final_dist = dist_name.capitalize()
        
        for v in _state.get("VEGETABLES", []):
            if v.lower() == veg_name.lower():
                final_veg = v
                break
            # substring matching for robustness
            elif veg_name.lower() in v.lower():
                final_veg = v
                
        for d in _state.get("DISTRICTS", []):
            if d.lower() == dist_name.lower():
                final_dist = d
                break
            elif dist_name.lower() in d.lower():
                final_dist = d

        speech = f"Great! I've filled the form for {qty} kg of {final_veg} in {final_dist}. Go ahead and list it."
        return {
            "intent": "add_crop",
            "data": {"vegetable": final_veg, "quantity": qty, "district": final_dist},
            "speech": translate_from_english(speech, detected_lang) if detected_lang != 'en' else speech
        }

    # 2. Get Price: "Price of onion in Guntur"
    price_match = re.search(r'(price|cost|how much) of (\w+)(?: in (\w+))?', text)
    if price_match:
        veg_name = price_match.group(2).lower()
        dist_name = (price_match.group(3) or context_district).lower()
        
        final_veg = veg_name.capitalize()
        final_dist = dist_name.capitalize()
        for v in _state.get("VEGETABLES", []):
            if v.lower() == veg_name:
                final_veg = v
                break
        
        # Find price in csv
        try:
            prices_df = _state["prices_df"]
            v_mask = prices_df['vegetable'].str.lower() == final_veg.lower()
            d_mask = prices_df['district'].str.lower() == final_dist.lower()
            veg_data = prices_df[v_mask & d_mask]
            
            if not veg_data.empty:
                price = int(veg_data.iloc[0]['avg_price'])
                speech = f"The current price for {final_veg} in {final_dist} is about {price} rupees per kg."
                return {
                    "intent": "get_price",
                    "data": {"vegetable": final_veg, "district": final_dist, "price": price},
                    "speech": translate_from_english(speech, detected_lang) if detected_lang != 'en' else speech
                }
        except: pass
        fail_speech = f"I couldn't find a recent price for {final_veg} in {final_dist}."
        return {
            "intent": "get_price",
            "speech": translate_from_english(fail_speech, detected_lang) if detected_lang != 'en' else fail_speech
        }

    # 3. Navigate: "Go to settings"
    nav_match = re.search(r'(go to|navigation|open|show|visit) (\w+)', text)
    if nav_match:
        page = nav_match.group(2).lower()
        mapping = {"home": "/", "dashboard": "/farmer/details", "details": "/farmer/details", "settings": "/settings", "profile": "/settings", "market": "/home"}
        target = mapping.get(page, "/farmer/details")
        speech = f"Sure, opening {page}."
        return {
            "intent": "navigate",
            "data": {"path": target},
            "speech": translate_from_english(speech, detected_lang) if detected_lang != 'en' else speech
        }
        
    # 4. Add to Cart: "Add tomato to cart"
    if "cart" in text or "buy" in text or "purchase" in text:
        veg_match = re.search(r'(?:buy|purchase|add)\s*(?:\d+)?\s*(?:kg)?\s*(?:of)?\s+([A-Za-z]+)', text)
        found_veg = "vegetable"
        if veg_match: found_veg = veg_match.group(1).capitalize()
        speech = f"Opened cart for {found_veg}."
        return {
            "intent": "add_to_cart",
            "data": {"vegetable": found_veg},
            "speech": translate_from_english(speech, detected_lang) if detected_lang != 'en' else speech
        }
    
    # Fallback
    speech = "I didn't quite catch that. You can say: 'Add 50 kg Tomato in Guntur'."
    return {
        "intent": "unknown",
        "speech": translate_from_english(speech, detected_lang) if detected_lang != 'en' else speech
    }

@router.post("/voice-command")
def api_voice_command(req: VoiceRequest):
    result = parse_voice_command(req.text, req.context_district)
    return {"success": True, **result}


@router.get("/model-info")
def get_model_info():
    from ..ml_model.train import INFO_PATH  # pyre-ignore[21]
    if os.path.exists(INFO_PATH):
        with open(INFO_PATH, "r") as f:
            return {"success": True, "info": json.load(f)}
    return {"success": False, "message": "No model info available"}


class PredictRequest(BaseModel):
    vegetable: str
    district: str
    month: int = 6
    year: int = 2025
    quantity: Optional[float] = 0

@router.post("/predict-price")
def predict_price_api(req: PredictRequest):
    vegetable = req.vegetable
    district = req.district
    month = req.month
    year = req.year
    model = _state.get("model")
    encoders = _state.get("encoders")
    if model is None:
        return {"success": False, "message": "Model not trained yet. POST /api/train-model first."}

    # Get avg production stats for this vegetable/district
    vegs_df = _state["vegs_df"]
    mask = (
        (vegs_df["vegetable"].str.lower() == vegetable.lower()) &
        (vegs_df["district"].str.lower() == district.lower())
    )
    row = vegs_df[mask]
    avg_yield = float(row["avg_yield"].iloc[0]) if not row.empty else 20.0
    avg_area = float(row["avg_area"].iloc[0]) if not row.empty else 2000.0

    price = _state["predict_price"](
        model, encoders, vegetable, district, month, year, avg_yield, avg_area
    )
    return {"success": True, "predicted_price": price, "vegetable": vegetable, "district": district}


@router.get("/recommendations")
def get_recommendations(district: str = Query("Guntur")):
    recs = _state["get_recommendations"](district, top_n=8)

    model = _state.get("model")
    encoders = _state.get("encoders")
    import datetime
    current_month = datetime.datetime.now().month
    current_year = datetime.datetime.now().year

    result = []
    for r in recs:
        predicted_price = r.get("avg_price", 0)
        if model and encoders:
            try:
                predicted_price = _state["predict_price"](
                    model, encoders,
                    r["vegetable"], r["district"],
                    current_month, current_year,
                    r.get("avg_yield", 20), r.get("avg_area", 2000)
                )
            except Exception:
                pass
        result.append({
            "vegetable": r.get("vegetable", ""),
            "district": r.get("district", ""),
            "lat": r.get("lat", 0),
            "lon": r.get("lon", 0),
            "avg_price": round(r.get("avg_price", 0), 2),
            "predicted_price": round(predicted_price, 2),
        })
    return {"success": True, "recommendations": result}


@router.get("/districts")
def get_districts():
    districts_df = _state["districts_df"]
    rows = districts_df[["district", "latitude", "longitude", "region"]].to_dict("records")
    return {"success": True, "districts": rows}


@router.get("/vegetables-list")
def list_vegetables():
    return {"success": True, "vegetables": _state.get("VEGETABLES", [])}


@router.post("/train-model")
def trigger_training():
    from ..ml_model.train import train_model  # pyre-ignore[21]
    prices_df = _state["prices_df"]
    production_df = _state["production_df"]
    model, encoders, mae = train_model(prices_df, production_df)
    _state["model"] = model
    _state["encoders"] = encoders
    return {"success": True, "message": f"Model trained. MAE = ₹{mae:.2f}/kg"}
