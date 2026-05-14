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
    if not name:
        rows = _state["get_all_veg_locations"]()
    else:
        rows = _state["get_veg_locations"](name)
        
    if district:
        rows = [r for r in rows if district.lower() in r.get("district", "").lower()]
    
    # Historical / Market Data
    result = []
    for r in rows:
        result.append({
            "vegetable": r.get("vegetable", ""),
            "district": r.get("district", ""),
            "lat": r.get("lat", 0),
            "lon": r.get("lon", 0),
            "avg_price": round(r.get("avg_price", 0), 2),
            "type": "Market",
            "farmer_name": "Local Market",
            "mobile": "N/A"
        })
        
    # Live Farmer Data from crops.json
    try:
        from routes.farmer_routes import CROPS_FILE  # pyre-ignore[21]
        if os.path.exists(CROPS_FILE):
            with open(CROPS_FILE, "r") as f:
                all_crops = json.load(f)
            
            districts_df = _state["districts_df"]
            
            for crop in all_crops:
                # Filter by name if provided
                if name and name.lower() not in crop["vegetable"].lower():
                    continue
                if district and district.lower() not in crop["district"].lower():
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
                    d_info = districts_df[districts_df["district"] == crop["district"]]
                    lat = float(d_info["latitude"].iloc[0]) if not d_info.empty else 16.0
                    lon = float(d_info["longitude"].iloc[0]) if not d_info.empty else 80.0
                
                result.append({
                    "vegetable": crop["vegetable"],
                    "district": crop["district"],
                    "lat": lat,
                    "lon": lon,
                    "avg_price": crop.get("price_per_kg", 0), # Pull the farmer specified pricing
                    "quantity": crop.get("quantity", 0),
                    "type": "Farmer",
                    "farmer_name": farmer_name or "Unknown Farmer",
                    "mobile": farmer_mobile or "N/A"
                })
    except Exception as e:
        print(f"Error loading farmer crops: {e}")

    # ── CSV Farmers from farmers.csv dataset ──────────────────────────────
    try:
        csv_farmers = _state["get_farmers_by_vegetable"](vegetable=name, district=district)
        result.extend(csv_farmers)
    except Exception as e:
        print(f"Error loading CSV farmers: {e}")

    # Priority sorting: Farmer > CSV Farmer > Market
    type_priority = {"Farmer": 0, "CSV Farmer": 1, "Market": 2}
    result.sort(key=lambda x: type_priority.get(x.get("type"), 3))

    return {"success": True, "results": result}


# ── Voice Command Parsing (NLP-lite) ──────────────────────────────────────

from deep_translator import MyMemoryTranslator

dict_fallback = {
    "టమాటా": "tomato", "టమాటో": "tomato", "tamata": "tomato", "tomato": "tomato",
    "బంగాళాదుంప": "potato", "ఆలూ": "potato", "alu": "potato", "potato": "potato",
    "ఉల్లిపాయ": "onion", "ఉల్లి": "onion", "ullipaya": "onion", "onion": "onion",
    "క్యారెట్": "carrot", "carrot": "carrot", "క్యాబేజీ": "cabbage", "cabbage": "cabbage",
    "మిర్చి": "chili", "పచ్చిమిర్చి": "chili", "mirchi": "chili", "chili": "chili", "chillies": "chili",
    "వెంకాయ": "brinjal", "వంకాయ": "brinjal", "vankaya": "brinjal", "brinjal": "brinjal",
    "బెండకాయ": "okra", "bhendi": "okra", "okra": "okra",
    
    # Action words and numbers
    "జోడించు": "add", "యాడ్": "add", "add": "add", "కావాలి": "add", "kavali": "add", "వెయ్యి": "add",
    "అమ్ము": "sell", "ammu": "sell", "sell": "sell",
    "కేజీలు": "kg", "కిలోలు": "kg", "kg": "kg", "kilos": "kg",
    "రూపాయలు": "rupees", "ధర": "price", "dhara": "price", "ఎంత": "price", "entha": "price",
    
    # Hindi
    "टमाटर": "tomato", "tamatar": "tomato",
    "आलू": "potato", "aalu": "potato",
    "प्याज": "onion", "pyaaj": "onion",
    "गाजर": "carrot", "gajar": "carrot",
    "मिर्च": "chili", "mirch": "chili",
    "बैंगन": "brinjal", "baingan": "brinjal",
    "भिंडी": "okra", "bhindi": "okra",
    
    "जोड़ें": "add", "ऐड": "add", "डालो": "add", "dalo": "add", "बेचना": "sell", "bechna": "sell",
    "किलो": "kg", "रुपये": "rupees", "कीमत": "price", "कितना": "price", "kitna": "price",
    
    # Numbers explicitly
    "ఒకటి": "1", "రెండు": "2", "మూడు": "3", "నాలుగు": "4", "ఐదు": "5", "పది": "10", "ఇరవై": "20", "ముప్పై": "30", "నలభై": "40", "యాభై": "50", "అరవై": "60", "డెబ్బై": "70", "ఎనభై": "80", "తొంబై": "90", "వంద": "100",
    "दस": "10", "बीस": "20", "तीस": "30", "चालीस": "40", "पचास": "50", "सौ": "100",
    "one": "1", "two": "2", "three": "3", "four": "4", "five": "5", "six": "6", "seven": "7", "eight": "8", "nine": "9", "ten": "10", "fifty": "50", "hundred": "100",
    
    # Districts explicitly
    "గుంటూరు": "guntur", "गुंटूर": "guntur", "guntder": "guntur",
    "విశాఖపట్నం": "visakhapatnam", "विशाखापत्तनम": "visakhapatnam", "vizag": "visakhapatnam",
    "కృష్ణా": "krishna", "कृष्णा": "krishna",
    "కర్నూలు": "kurnool", "कुरनूल": "kurnool",
    "అనంతపురం": "anantapuramu", "अनंतपुर": "anantapuramu",
    "తిరుపతి": "tirupati", "तिरुपति": "tirupati",
    "నెల్లూరు": "sri potti sriramulu nellore", "nellore": "sri potti sriramulu nellore",
    "కడప": "y. s. r. kadapa", "kadapa": "y. s. r. kadapa",
    "ప్రకాశం": "prakasam", "పల్నాడు": "palnadu", "బాపట్ల": "bapatla",
    "కాకినాడ": "kakinada", "శ్రీకాకుళం": "srikakulam", "విజయనగరం": "vizianagaram", "ఏలూరు": "eluru", "elru": "eluru"
}

def manual_translate(text: str) -> str:
    res = text.lower()
    for k, v in dict_fallback.items():
        # strict replace so we don't accidentally match substrings if possible, but simple replace works for now
        res = res.replace(k, v)
    return res

import difflib

def parse_voice_command(text: str, context_district: str):
    text = text.lower().strip()
    
    qty = "100"
    qty_match = re.search(r'(\d+(?:\.\d+)?)', text)
    if qty_match:
        qty = qty_match.group(1)
        
    final_veg = None
    vegs = _state.get("VEGETABLES", [])
    
    # Check exact match first
    for v in vegs:
        if v.lower() in text:
            if not final_veg or len(v) > len(final_veg):
                final_veg = v
                
    # If no exact match, try fuzzy matching across all words in transcript
    if not final_veg:
        words = text.split()
        for w in words:
            # We want to catch things like "tomto" -> "Tomato"
            matches = difflib.get_close_matches(w.lower(), [v.lower() for v in vegs], n=1, cutoff=0.6)
            if matches:
                 # find original vegetable case
                 matched_lower = matches[0]
                 for orig_v in vegs:
                     if orig_v.lower() == matched_lower:
                         final_veg = orig_v
                         break
                 if final_veg: break
                
    final_dist = context_district.capitalize()
    dists = [d.lower() for d in _state.get("DISTRICTS", [])]
    found_exact_dist = False
    
    # Exact match for district
    for d_str in dists:
        if d_str in text:
            final_dist = d_str.capitalize()
            found_exact_dist = True
            break
            
    # Fuzzy match for district typos
    if not found_exact_dist:
        words = text.split()
        for w in words:
            matches = difflib.get_close_matches(w.lower(), dists, n=1, cutoff=0.6)
            if matches:
                # Need to map back to original capitalizing precisely
                raw_match = matches[0]
                for d_orig in _state.get("DISTRICTS", []):
                    if d_orig.lower() == raw_match:
                        final_dist = d_orig
                        break
                break

    # 1. ADD CROP INTENT
    add_keywords = ["add", "have", "list", "listing", "submit", "some", "sell", "selling", "insert", "put"]
    if any(k in text for k in add_keywords) and final_veg:
        return {
            "intent": "add_crop",
            "action": "add_crop",
            "data": {"vegetable": final_veg, "quantity": qty, "base_price": "40", "district": final_dist},
            "speech": f"Great! I've selected {final_veg}. Please verify the details on the form.",
            "response_message": f"Form filled for {qty} kg of {final_veg}."
        }

    # 2. GET PRICE INTENT
    price_keywords = ["price", "cost", "much", "rate", "value", "predict", "prediction", "forecast"]
    if any(k in text for k in price_keywords) and final_veg:
        try:
            prices_df = _state["prices_df"]
            v_mask = prices_df['vegetable'].str.lower() == final_veg.lower()
            d_mask = prices_df['district'].str.lower() == final_dist.lower()
            veg_data = prices_df[v_mask & d_mask]
            
            if not veg_data.empty:
                price = int(veg_data.iloc[0]['avg_price'])
                return {
                    "intent": "get_price",
                    "action": "add_crop",
                    "data": {"vegetable": final_veg, "district": final_dist, "price": price},
                    "speech": f"The current price for {final_veg} in {final_dist} is about {price} rupees per kg.",
                    "response_message": f"{final_veg} in {final_dist} is around {price} RS."
                }
        except: pass
        return {
            "intent": "get_price",
            "action": "add_crop",
            "data": {"vegetable": final_veg, "district": final_dist},
            "speech": f"I couldn't find a price, but I've selected {final_veg} in {final_dist}.",
            "response_message": f"Selected {final_veg} in {final_dist}."
        }

    # 3. NAVIGATE INTENT
    nav_match = re.search(r'(go to|navigation|open|show|visit|take me to) (\w+)', text)
    if nav_match:
        page = nav_match.group(2).lower()
        mapping = {"home": "/", "dashboard": "/farmer/details", "details": "/farmer/details", "consumer": "/consumer/login"}
        target = mapping.get(page, "/farmer/details")
        return {
            "intent": "navigate",
            "action": "navigate",
            "data": {"path": target},
            "speech": f"Sure, opening {page}.",
            "response_message": f"Navigating to {page}."
        }

    # 4. EXTREME FALLBACK: ANY Vegetable Mention = Add Crop
    if final_veg:
        # If they literally just muttered "Tomato", or "టమాటా", we assume they want to add it!
        return {
            "intent": "add_crop",
            "action": "add_crop",
            "data": {"vegetable": final_veg, "quantity": qty, "base_price": "40", "district": final_dist},
            "speech": f"I've selected {final_veg} for you. Go ahead and list it.",
            "response_message": f"Selected {final_veg}."
        }

    return {
        "intent": "unknown",
        "action": "unknown",
        "speech": "I couldn't quite catch the vegetable name. Could you try saying: Add 100 kg Tomato?",
        "response_message": "Could not understand."
    }

class VoiceRequest(BaseModel):
    text: str
    context_district: str = "Guntur"
    language: str = "en-IN"

@router.post("/voice-command")
def api_voice_command(req: VoiceRequest):
    # Process offline translations instantly!
    text_to_parse = manual_translate(req.text)
    print(f"Final offline parsed string: {text_to_parse}")
    
    result = parse_voice_command(text_to_parse, req.context_district)
    
    intent = result.get("intent")
    veg = result.get("data", {}).get("vegetable", "పంట")
    
    if req.language.startswith("te"):
        if intent == "add_crop":
            result["speech"] = f"{veg} ఎంచుకోబడింది. దయచేసి నిర్ధారించండి."
        elif intent == "get_price":
            result["speech"] = f"{veg} ధర పై సమాచారం పొందుపరచబడింది."
        else:
            result["speech"] = "క్షమించండి, నాకు అర్థం కాలేదు. దయచేసి మరలా ప్రయత్నించండి."
            
    elif req.language.startswith("hi"):
        if intent == "add_crop":
            result["speech"] = f"मैंने {veg} चुना है. कृपया पुष्टि करें."
        elif intent == "get_price":
            result["speech"] = f"{veg} की कीमत मिल गई है."
        else:
            result["speech"] = "क्षमा करें, मुझे समझ नहीं आया। कृपया पुनः प्रयास करें।"

    return {"success": True, **result}


@router.get("/model-info")
def get_model_info():
    from ml_model.train import INFO_PATH  # pyre-ignore[21]
    if os.path.exists(INFO_PATH):
        with open(INFO_PATH, "r") as f:
            return {"success": True, "info": json.load(f)}
    return {"success": False, "message": "No model info available"}


class ChatRequest(BaseModel):
    message: str
    context: Optional[str] = None

@router.post("/chatbot")
def api_chatbot(req: ChatRequest):
    msg = req.message.lower()
    ctx = req.context or ""
    
    reply = "I'm the AgriSmart AI assistant! I can help you check expected market prices, navigate the portal, or answer basic agriculture queries."
    
    vegs = _state.get("VEGETABLES", [])
    dists = [d.lower() for d in _state.get("DISTRICTS", [])]
    
    found_veg = next((v for v in vegs if v.lower() in msg), None)
    found_dist = next((d for d in _state.get("DISTRICTS", []) if d.lower() in msg), None)
    
    # ── Contextual Page Support ───────────────────────
    if "help" in msg or "error" in msg or "problem" in msg or "how" in msg or "stuck" in msg:
        if "farmer/details" in ctx:
            reply = "Having trouble adding a crop? Make sure you select your District and Vegetable from the dropdowns first. Once you do, the AI will predict a price. You can adjust that price by a maximum of ₹10 using the + and - buttons before submitting."
            return {"success": True, "reply": reply}
        elif "home" in ctx:
            reply = "You are on the Consumer Market Map. If you are having trouble adding to cart, make sure the crop listing has a registered avg_price (only farmers who have finalized their ML price can be added to the cart). The Cart button is floating on the right side."
            return {"success": True, "reply": reply}
        elif "login" in ctx:
            reply = "If you're having trouble logging in, please verify your credentials. The system supports separate logins for Farmers and Consumers."
            return {"success": True, "reply": reply}
            
    # ── Standard NLP ──────────────────────────────────
    if "price" in msg or "cost" in msg or "rate" in msg:
        if found_veg and found_dist:
            try:
                prices_df = _state["prices_df"]
                v_mask = prices_df['vegetable'].str.lower() == found_veg.lower()
                d_mask = prices_df['district'].str.lower() == found_dist.lower()
                veg_data = prices_df[v_mask & d_mask]
                if not veg_data.empty:
                    p = int(veg_data.iloc[0]['avg_price'])
                    reply = f"The current ML-predicted average price for {found_veg} in {found_dist} is approximately ₹{p} per kg."
                else:
                    reply = f"I couldn't find specific market data for {found_veg} in {found_dist}. The average state price might hover around ₹40/kg."
            except: pass
        elif found_veg:
            reply = f"I see you're asking about {found_veg} prices. Please specify the district as well (e.g. 'What is the price of {found_veg} in Guntur?')."
        else:
            reply = "To check market prices, please mention the crop name and your district! Our ML model will fetch the live prediction."
            
    elif "sell" in msg or "list" in msg or "add crop" in msg:
        reply = "You can list your harvest directly from the Farmer Dashboard. Let me know if you need help filling out the district and quantity forms!"
        
    elif "buy" in msg or "order" in msg or "delivery" in msg or "cart" in msg:
        reply = "If you are a consumer, you can use the Live Market Map to find farms near you and add items to your cart for direct delivery checkout. Look for the floating Shopping Cart icon!"
        
    elif "hello" in msg or "hi" in msg:
        if "farmer" in ctx:
            reply = "Hello Farmer! How can I assist you with your crop listings today?"
        elif "home" in ctx:
            reply = "Hello Consumer! Are you looking for any specific produce today?"
        else:
            reply = "Hello there! Welcome to AgriSmart. I'm here to help farmers and consumers. Are you looking to buy or sell today?"

    return {"success": True, "reply": reply}


@router.get("/predict-price")
def predict_price_api(
    vegetable: str = Query(...),
    district: str = Query(...),
    month: int = Query(6),
    year: int = Query(2025),
):
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
    from ml_model.train import train_model  # pyre-ignore[21]
    prices_df = _state["prices_df"]
    production_df = _state["production_df"]
    model, encoders, mae = train_model(prices_df, production_df)
    _state["model"] = model
    _state["encoders"] = encoders
    return {"success": True, "message": f"Model trained. MAE = ₹{mae:.2f}/kg"}
