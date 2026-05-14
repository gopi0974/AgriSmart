"""
auth.py — Simple user store supporting both MongoDB and File-based storage.
"""
import os
import json
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any

import bcrypt  # pyre-ignore[21]
from jose import JWTError, jwt  # pyre-ignore[21]

# Import the database helper
try:
    from db import get_collection
except ImportError:
    get_collection = lambda x: None

from data_config import USERS_FILE

SECRET_KEY = "ag-veg-system-secret-2025"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24


def _load_users_from_file() -> Dict[str, Dict[str, Dict[str, Any]]]:
    if os.path.exists(USERS_FILE):
        with open(USERS_FILE, "r") as f:
            return json.load(f)
    return {"farmers": {}, "consumers": {}}


def _save_users_to_file(data: Dict[str, Dict[str, Dict[str, Any]]]):
    with open(USERS_FILE, "w") as f:
        json.dump(data, f, indent=2)


def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode('utf-8'), hashed.encode('utf-8'))
    except Exception:
        return False


def create_token(data: dict) -> str:
    payload = data.copy()
    payload["exp"] = datetime.now(timezone.utc) + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None


# ── Farmer helpers ────────────────────────────────────────────────────────

def farmer_signup(name: str, email: str, password: str, mobile: str) -> dict:
    users_col = get_collection("users")
    
    # If MongoDB is connected
    if users_col is not None:
        if email and users_col.find_one({"email": email, "role": "farmer"}):
            return {"error": "Email already registered"}
        if mobile and users_col.find_one({"mobile": mobile, "role": "farmer"}):
            return {"error": "Mobile already registered"}
        
        uid = str(uuid.uuid4())
        users_col.insert_one({
            "id": uid,
            "role": "farmer",
            "name": name,
            "email": email,
            "password": hash_password(password),
            "mobile": mobile,
            "crops": [],
            "created_at": datetime.now(timezone.utc)
        })
        return {"id": uid, "name": name, "email": email}

    # Fallback to File storage
    store = _load_users_from_file()
    if not email and not mobile:
        return {"error": "Either Email or Mobile Number is required"}
    for key, user in store["farmers"].items():
        if email and (key == email or user.get("email") == email):
            return {"error": "Email already registered"}
        if mobile and user.get("mobile") == mobile:
            return {"error": "Mobile already registered"}
    uid = str(uuid.uuid4())
    primary_key = email if email else mobile
    store["farmers"][primary_key] = {
        "id": uid, "name": name, "email": email, "password": hash_password(password), "mobile": mobile, "crops": []
    }
    _save_users_to_file(store)
    return {"id": uid, "name": name, "email": email}


def farmer_login(email: str, password: str) -> dict:
    users_col = get_collection("users")
    
    if users_col is not None:
        user = users_col.find_one({"$or": [{"email": email}, {"mobile": email}], "role": "farmer"})
        if not user or not verify_password(password, user["password"]):
            return {"error": "Invalid credentials"}
        
        token = create_token({"sub": user["id"], "email": user.get("email"), "role": "farmer"})
        return {"token": token, "farmer_id": user["id"], "name": user["name"], "mobile": user.get("mobile")}

    # Fallback
    store = _load_users_from_file()
    user = store["farmers"].get(email)
    if user is None:
        for em, u in store["farmers"].items():
            if u.get("mobile") == email:
                user = u; break
    if user is None or not verify_password(password, str(user.get("password", ""))):
        return {"error": "Invalid credentials"}
    
    token = create_token({"sub": str(user["id"]), "email": user.get("email"), "role": "farmer"})
    return {"token": token, "farmer_id": user["id"], "name": user["name"], "mobile": user.get("mobile")}


# ── Consumer helpers ──────────────────────────────────────────────────────

def consumer_signup(name: str, email: str, password: str, mobile: str = "", location: str = "") -> dict:
    users_col = get_collection("users")
    
    if users_col is not None:
        if email and users_col.find_one({"email": email, "role": "consumer"}):
            return {"error": "Email already registered"}
        if mobile and users_col.find_one({"mobile": mobile, "role": "consumer"}):
            return {"error": "Mobile already registered"}
        
        uid = str(uuid.uuid4())
        users_col.insert_one({
            "id": uid,
            "role": "consumer",
            "name": name,
            "email": email,
            "password": hash_password(password),
            "mobile": mobile,
            "location": location,
            "created_at": datetime.now(timezone.utc)
        })
        return {"id": uid, "name": name, "email": email}

    # Fallback
    store = _load_users_from_file()
    for key, user in store["consumers"].items():
        if email and (key == email or user.get("email") == email):
            return {"error": "Email already registered"}
        if mobile and user.get("mobile") == mobile:
            return {"error": "Mobile already registered"}
    uid = str(uuid.uuid4())
    primary_key = email if email else mobile
    store["consumers"][primary_key] = {
        "id": uid, "name": name, "email": email, "password": hash_password(password), "mobile": mobile, "location": location
    }
    _save_users_to_file(store)
    return {"id": uid, "name": name, "email": email}


def consumer_login(email: str, password: str) -> dict:
    users_col = get_collection("users")
    
    if users_col is not None:
        user = users_col.find_one({"$or": [{"email": email}, {"mobile": email}], "role": "consumer"})
        if not user or not verify_password(password, user["password"]):
            return {"error": "Invalid credentials"}
        
        token = create_token({"sub": user["id"], "email": user.get("email"), "role": "consumer"})
        return {"token": token, "consumer_id": user["id"], "name": user["name"], "mobile": user.get("mobile"), "location": user.get("location")}

    # Fallback
    store = _load_users_from_file()
    user = store["consumers"].get(email)
    if user is None:
        for em, u in store["consumers"].items():
            if u.get("mobile") == email:
                user = u; break
    if user is None or not verify_password(password, str(user.get("password", ""))):
        return {"error": "Invalid credentials"}
    
    token = create_token({"sub": str(user["id"]), "email": user.get("email"), "role": "consumer"})
    return {"token": token, "consumer_id": user["id"], "name": user["name"], "mobile": user.get("mobile"), "location": user.get("location", "Guntur")}
