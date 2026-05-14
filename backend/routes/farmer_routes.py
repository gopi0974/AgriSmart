"""
routes/farmer_routes.py — Farmer crop details API with MongoDB support.
"""
import json
import os
import uuid
from fastapi import APIRouter, HTTPException  # pyre-ignore[21]
from pydantic import BaseModel  # pyre-ignore[21]
from typing import Optional, List

router = APIRouter(prefix="/api/farmer")

# Import database helper
try:
    from db import get_collection
except ImportError:
    get_collection = lambda x: None

from data_config import USERS_FILE, CROPS_FILE


def _load_crops_from_file():
    if os.path.exists(CROPS_FILE):
        try:
            with open(CROPS_FILE, "r") as f:
                return json.load(f)
        except:
            return []
    return []


def _save_crops_to_file(data):
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
    crops_col = get_collection("crops")
    entry = req.dict()
    if "id" not in entry or not entry["id"]:
        entry["id"] = uuid.uuid4().hex

    # If MongoDB is connected
    if crops_col is not None:
        # Check for existing entry to update
        query = {"farmer_id": req.farmer_id, "vegetable": req.vegetable, "district": req.district}
        existing = crops_col.find_one(query)
        
        if existing:
            entry["id"] = existing["id"]
            crops_col.update_one(query, {"$set": entry})
        else:
            crops_col.insert_one(entry.copy())
        
        # Remove MongoDB specific _id from response
        if "_id" in entry: del entry["_id"]
        return {"success": True, "message": "Crop details saved to DB", "entry": entry}

    # Fallback to File storage
    crops = _load_crops_from_file()
    existing_idx = next((i for i, c in enumerate(crops) if c.get("farmer_id") == req.farmer_id and c.get("vegetable") == req.vegetable and c.get("district") == req.district), None)
    
    if existing_idx is not None:
        entry["id"] = crops[existing_idx].get("id", entry["id"])
        crops[existing_idx] = entry
    else:
        crops.append(entry)
        
    _save_crops_to_file(crops)
    return {"success": True, "message": "Crop details saved to file", "entry": entry}


@router.put("/crops/{crop_id}")
def update_crop_quantity(crop_id: str, req: CropUpdateRequest):
    crops_col = get_collection("crops")
    
    if crops_col is not None:
        res = crops_col.update_one(
            {"id": crop_id, "farmer_id": req.farmer_id},
            {"$set": {"quantity": float(req.quantity)}}
        )
        if res.modified_count > 0:
            return {"success": True, "message": "Quantity updated in DB"}
        raise HTTPException(status_code=404, detail="Crop not found in DB")

    # Fallback
    crops = _load_crops_from_file()
    for c in crops:
        if str(c.get("id")) == crop_id and str(c.get("farmer_id")) == req.farmer_id:
            c["quantity"] = float(req.quantity)
            _save_crops_to_file(crops)
            return {"success": True, "message": "Quantity updated in file"}
            
    raise HTTPException(status_code=404, detail="Crop listing not found")


@router.delete("/crops/{crop_id}")
def delete_crop(crop_id: str, farmer_id: str):
    crops_col = get_collection("crops")
    
    if crops_col is not None:
        res = crops_col.delete_one({"id": crop_id, "farmer_id": farmer_id})
        if res.deleted_count > 0:
            return {"success": True, "message": "Crop deleted from DB"}
        return {"success": True, "message": "Nothing to delete in DB"}

    # Fallback
    crops = _load_crops_from_file()
    new_crops = [c for c in crops if not (c.get("id") == crop_id and c.get("farmer_id") == farmer_id)]
    if len(new_crops) < len(crops):
        _save_crops_to_file(new_crops)
        return {"success": True, "message": "Crop deleted from file"}
    return {"success": True, "message": "Nothing to delete"}


@router.get("/crops")
def get_farmer_crops(farmer_id: str):
    crops_col = get_collection("crops")
    
    if crops_col is not None:
        results = list(crops_col.find({"farmer_id": farmer_id}))
        for r in results: 
            if "_id" in r: del r["_id"]
        return {"success": True, "crops": results}

    # Fallback
    crops = _load_crops_from_file()
    farmer_crops = [c for c in crops if c.get("farmer_id") == farmer_id]
    return {"success": True, "crops": farmer_crops}


@router.get("/all-crops")
def get_all_crops():
    crops_col = get_collection("crops")
    
    if crops_col is not None:
        results = list(crops_col.find({}))
        for r in results: 
            if "_id" in r: del r["_id"]
        return {"success": True, "crops": results}

    # Fallback
    return {"success": True, "crops": _load_crops_from_file()}
