"""
routes/farmer_routes.py — Farmer crop details API.
"""
import json
import os
from fastapi import APIRouter  # pyre-ignore[21]
from pydantic import BaseModel  # pyre-ignore[21]
from typing import Optional

router = APIRouter(prefix="/api/farmer")

USERS_FILE = os.path.join(os.path.dirname(__file__), "..", "users.json")
CROPS_FILE = os.path.join(os.path.dirname(__file__), "..", "crops.json")


def _load_crops():
    if os.path.exists(CROPS_FILE):
        with open(CROPS_FILE, "r") as f:
            data = json.load(f)
            import uuid
            modified = False
            for c in data:
                if "id" not in c or not c["id"]:
                    c["id"] = str(uuid.uuid4())
                    modified = True
            if modified:
                with open(CROPS_FILE, "w") as fw:
                    json.dump(data, fw, indent=2)
            return data
    return []


def _save_crops(data):
    with open(CROPS_FILE, "w") as f:
        json.dump(data, f, indent=2)


class FarmerDetailsRequest(BaseModel):
    farmer_id: str
    name: str = ""
    mobile: str = ""
    district: str
    vegetable: str
    quantity: float
    price: float = 0.0  # Added farmer price field
    unit: str = "kg"
    lat: Optional[float] = None
    lon: Optional[float] = None


@router.post("/details")
def submit_farmer_details(req: FarmerDetailsRequest):
    if req.price <= 0 or req.quantity <= 0 or not req.vegetable or not req.district:
        return {"success": False, "message": "Invalid listing data. Price and quantity must be positive, and crop/location required."}
        
    crops = _load_crops()
    entry = req.dict()
    
    import uuid
    entry["id"] = entry.get("id") or str(uuid.uuid4())

    # Backend fallback: Look up name/mobile if frontend didn't send them
    if not entry.get("name") or not entry.get("mobile"):
        try:
            with open(USERS_FILE, "r") as f:
                users = json.load(f)
            # Find the farmer by ID
            for email, profile in users.get("farmers", {}).items():
                if profile.get("id") == req.farmer_id:
                    if not entry.get("name"): entry["name"] = profile.get("name", "")
                    if not entry.get("mobile"): entry["mobile"] = profile.get("mobile", "")
                    break
        except Exception as e:
            print(f"Auth lookup error: {e}")

    crops.append(entry)
    _save_crops(crops)
    return {"success": True, "message": "Crop details saved successfully", "entry": entry}

@router.put("/crops/{crop_id}")
def update_crop(crop_id: str, req: FarmerDetailsRequest):
    if req.price <= 0 or req.quantity <= 0 or not req.vegetable or not req.district:
        return {"success": False, "message": "Invalid listing data. Price and quantity must be positive, and crop/location required."}

    crops = _load_crops()
    for i, c in enumerate(crops):
        if c.get("id", "") == crop_id and c.get("farmer_id") == req.farmer_id:
            updated_entry = req.dict()
            updated_entry["id"] = crop_id
            updated_entry["name"] = c.get("name", "")
            updated_entry["mobile"] = c.get("mobile", "")
            crops[i] = updated_entry
            _save_crops(crops)
            return {"success": True, "message": "Crop updated", "entry": updated_entry}
    return {"success": False, "message": "Crop not found or unauthorized"}

@router.delete("/crops/{crop_id}")
def delete_crop(crop_id: str, farmer_id: str):
    crops = _load_crops()
    filtered_crops = [c for c in crops if not (c.get("id", "") == crop_id and c.get("farmer_id") == farmer_id)]
    if len(crops) == len(filtered_crops):
        return {"success": False, "message": "Crop not found or unauthorized"}
    _save_crops(filtered_crops)
    return {"success": True, "message": "Crop deleted"}


@router.get("/crops")
def get_farmer_crops(farmer_id: str):
    crops = _load_crops()
    farmer_crops = [c for c in crops if c.get("farmer_id") == farmer_id]
    return {"success": True, "crops": farmer_crops}
@router.get("/all-crops")
def get_all_crops():
    """Return all farmer-submitted crops (used by recommendations)."""
    crops = _load_crops()
    return {"success": True, "crops": crops}

class CheckoutItem(BaseModel):
    product_id: str
    farmer_id: str
    quantity: float
    price_per_kg: float

class CheckoutRequest(BaseModel):
    user_id: Optional[str] = "guest"
    items: list[CheckoutItem]
    delivery_type: str = "delivery"

@router.post("/checkout/validate")
def checkout_validate(req: CheckoutRequest):
    print(f"\n[DEBUG] Validation Checkout Payload: {req.dict()}")
    if not req.items:
        print("[DEBUG] Validation failed: Cart is empty")
        return {"success": False, "message": "Cart is empty"}
        
    crops = _load_crops()
    crop_map = {str(c.get("id")): c for c in crops}
    
    for item in req.items:
        c = crop_map.get(str(item.product_id))
        print(f"[DEBUG] Checking item {item.product_id}: requested {item.quantity}, available {c.get('quantity') if c else 'None'}")
        
        if not c: 
            print(f"[DEBUG] Failure: Item {item.product_id} not found.")
            return {"success": False, "message": "Product not found"}
            
        # Strict Farmer validation
        db_farmer_id = str(c.get("farmer_id", "") or "").strip()
        req_farmer_id = str(item.farmer_id or "").strip()
        
        print(f"[DEBUG] Comparison -> DB farmer_id: '{db_farmer_id}', Req farmer_id: '{req_farmer_id}'")
        
        if db_farmer_id != req_farmer_id:
            print(f"[DEBUG] Failure: Farmer ID mismatch. DB: {db_farmer_id} vs Req: {req_farmer_id}")
            return {"success": False, "message": "Farmer mismatch"}
            
        if float(c.get("quantity", 0)) < item.quantity:
            print(f"[DEBUG] Failure: Insufficient stock for {item.product_id}")
            return {"success": False, "message": f"Insufficient stock for {c.get('vegetable', 'selected item')}."}
            
    print("[DEBUG] Validation successful!")
    return {"success": True}

@router.post("/checkout/confirm")
def checkout_confirm(req: CheckoutRequest):
    print(f"\n[DEBUG] Confirmation Checkout Payload: {req.dict()}")
    # Atomic deduction
    crops = _load_crops()
    crop_map = {str(c.get("id")): c for c in crops}
    
    # 1. Strict Validation pass
    for item in req.items:
        c = crop_map.get(str(item.product_id))
        if not c:
            print(f"[DEBUG] Confirmation failed: Item {item.product_id} not found.")
            return {"success": False, "message": "Product not found"}
            
        db_farmer_id = str(c.get("farmer_id", "") or "").strip()
        req_farmer_id = str(item.farmer_id or "").strip()
        
        if db_farmer_id != req_farmer_id:
            print(f"[DEBUG] Confirmation failed: Farmer ID mismatch.")
            return {"success": False, "message": "Farmer mismatch"}
            
        if float(c.get("quantity", 0)) < item.quantity:
            print(f"[DEBUG] Confirmation failed: Insufficient stock.")
            return {"success": False, "message": f"Insufficient stock for {c.get('vegetable', 'this item')}."}
            
    # 2. Deduction pass
    for item in req.items:
        c = crop_map.get(str(item.product_id))
        new_qty = float(c.get("quantity", 0)) - float(item.quantity)
        c["quantity"] = max(0.0, new_qty)
        print(f"[DEBUG] Deducted qty for {item.product_id}. New stock: {c['quantity']}")
            
    _save_crops(crops)
    print("[DEBUG] Checkout confirmed. Database updated.")
    return {"success": True, "message": "Transaction complete. Stock updated safely."}
