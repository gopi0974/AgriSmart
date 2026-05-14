"""
routes/farmer_routes.py — Farmer crop details API.
"""
import json
import os
import uuid
from fastapi import APIRouter, HTTPException  # pyre-ignore[21]
from pydantic import BaseModel  # pyre-ignore[21]
from typing import Optional

router = APIRouter(prefix="/api/farmer")

from data_config import USERS_FILE, CROPS_FILE


def _load_crops():
    if os.path.exists(CROPS_FILE):
        try:
            with open(CROPS_FILE, "r") as f:
                return json.load(f)
        except:
            return []
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
    price_per_kg: Optional[float] = None
    unit: str = "kg"
    lat: Optional[float] = None
    lon: Optional[float] = None

class CropUpdateRequest(BaseModel):
    farmer_id: str
    quantity: float


@router.post("/details")
def submit_farmer_details(req: FarmerDetailsRequest):
    crops = _load_crops()
    entry = req.dict()
    
    # Check if this exact crop listing by this farmer already exists, if so update it
    existing_idx = next((i for i, c in enumerate(crops) if c.get("farmer_id") == req.farmer_id and c.get("vegetable") == req.vegetable and c.get("district") == req.district), None)
    
    if "id" not in entry:
        entry["id"] = uuid.uuid4().hex
        
    # Backend fallback: Look up name/mobile if frontend didn't send them
    if not entry.get("name") or not entry.get("mobile"):
        try:
            with open(USERS_FILE, "r") as f:
                users = json.load(f)
            for email, profile in users.get("farmers", {}).items():
                if profile.get("id") == req.farmer_id:
                    if not entry.get("name"): entry["name"] = profile.get("name", "")
                    if not entry.get("mobile"): entry["mobile"] = profile.get("mobile", "")
                    break
        except Exception as e:
            print(f"Auth lookup error: {e}")

    if existing_idx is not None:
        if "id" in crops[existing_idx] and crops[existing_idx]["id"]:
            entry["id"] = crops[existing_idx]["id"]
        crops[existing_idx] = entry
    else:
        crops.append(entry)
        
    _save_crops(crops)
    return {"success": True, "message": "Crop details saved successfully", "entry": entry}

@router.put("/crops/{crop_id}")
def update_crop_quantity(crop_id: str, req: CropUpdateRequest):
    crops = _load_crops()
    c_id = crop_id.strip()
    f_id = req.farmer_id.strip()
    
    # Direct match by UUID
    for c in crops:
        if str(c.get("id")).strip() == c_id and str(c.get("farmer_id")).strip() == f_id:
            c["quantity"] = float(req.quantity)
            _save_crops(crops)
            return {"success": True, "message": "Quantity updated successfully"}
            
    # Fallback to index if legacy
    if "legacy-" in c_id:
        try:
            idx = int(c_id.replace("legacy-", ""))
            if 0 <= idx < len(crops) and str(crops[idx].get("farmer_id")).strip() == f_id:
                crops[idx]["quantity"] = float(req.quantity)
                _save_crops(crops)
                return {"success": True, "message": "Quantity updated successfully"}
        except: pass
            
    raise HTTPException(status_code=404, detail="Crop listing not found")

@router.delete("/crops/{crop_id}")
def delete_crop(crop_id: str, farmer_id: str):
    crops = _load_crops()
    print(f"[DEBUG] DELETE /crops/{crop_id} by {farmer_id}")
    
    # Direct filter by UUID
    before_len = len(crops)
    new_crops = [c for c in crops if not (c.get("id") == crop_id and c.get("farmer_id") == farmer_id)]
    
    if len(new_crops) < before_len:
        _save_crops(new_crops)
        print(f"[DEBUG] Deleted UUID match {crop_id}")
        return {"success": True, "message": "Crop deleted successfully"}

    # If no items removed, try legacy index
    if "legacy-" in crop_id:
        try:
            idx = int(crop_id.replace("legacy-", ""))
            if 0 <= idx < len(crops) and crops[idx].get("farmer_id") == farmer_id:
                new_crops = crops[:idx] + crops[idx+1:]
                _save_crops(new_crops)
                print(f"[DEBUG] Deleted legacy index {idx}")
                return {"success": True, "message": "Crop deleted successfully"}
        except: pass

    print(f"[DEBUG] DELETE NOT FOUND {crop_id}")
    return {"success": True, "message": "Nothing to delete"}


@router.get("/crops")
def get_farmer_crops(farmer_id: str):
    crops = _load_crops()
    farmer_crops = []
    for idx, c in enumerate(crops):
        if c.get("farmer_id") == farmer_id:
            c_copy = c.copy()
            if "id" not in c_copy or not c_copy["id"]:
                c_copy["id"] = f"legacy-{idx}"
            farmer_crops.append(c_copy)
    return {"success": True, "crops": farmer_crops}


@router.get("/all-crops")
def get_all_crops():
    """Return all farmer-submitted crops (used by recommendations)."""
    crops = _load_crops()
    return {"success": True, "crops": crops}
