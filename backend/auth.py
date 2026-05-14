"""
auth.py — Simple file-based user store with JWT tokens.
Users are persisted to users.json next to this file.
"""
import os
import json
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any

import bcrypt  # pyre-ignore[21]
from jose import JWTError, jwt  # pyre-ignore[21]

SECRET_KEY = "ag-veg-system-secret-2025"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24



from data_config import USERS_FILE


def _load_users() -> Dict[str, Dict[str, Dict[str, Any]]]:
    if os.path.exists(USERS_FILE):
        with open(USERS_FILE, "r") as f:
            return json.load(f)
    return {"farmers": {}, "consumers": {}}


def _save_users(data: Dict[str, Dict[str, Dict[str, Any]]]):
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
    store = _load_users()
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
        "id": uid,
        "name": name,
        "email": email,
        "password": hash_password(password),
        "mobile": mobile,
        "crops": [],
    }
    _save_users(store)
    return {"id": uid, "name": name, "email": email}


def farmer_login(email: str, password: str) -> dict:
    store = _load_users()
    user = store["farmers"].get(email)
    user_email = email
    
    if user is None:
        # Search by mobile
        for em, u in store["farmers"].items():
            if u.get("mobile") == email:
                user = u
                user_email = em
                break
                
    if user is None:
        return {"error": "Invalid credentials"}
    if not verify_password(password, str(user.get("password", ""))):
        return {"error": "Invalid credentials"}
        
    user_id = str(user.get("id", ""))
    user_name = str(user.get("name", ""))
    user_mobile = str(user.get("mobile", ""))
    token = create_token({"sub": user_id, "email": user_email, "role": "farmer"})
    return {"token": token, "farmer_id": user_id, "name": user_name, "mobile": user_mobile}


# ── Consumer helpers ──────────────────────────────────────────────────────

def consumer_signup(name: str, email: str, password: str, mobile: str = "", location: str = "") -> dict:
    store = _load_users()
    if not email and not mobile:
        return {"error": "Either Email or Mobile Number is required"}
        
    for key, user in store["consumers"].items():
        if email and (key == email or user.get("email") == email):
            return {"error": "Email already registered"}
        if mobile and user.get("mobile") == mobile:
            return {"error": "Mobile already registered"}
            
    uid = str(uuid.uuid4())
    primary_key = email if email else mobile
    store["consumers"][primary_key] = {
        "id": uid,
        "name": name,
        "email": email,
        "password": hash_password(password),
        "mobile": mobile,
        "location": location,
    }
    _save_users(store)
    return {"id": uid, "name": name, "email": email}


def consumer_login(email: str, password: str) -> dict:
    store = _load_users()
    user = store["consumers"].get(email)
    user_email = email
    
    if user is None:
        # Search by mobile
        for em, u in store["consumers"].items():
            if u.get("mobile") == email:
                user = u
                user_email = em
                break
                
    if user is None:
        return {"error": "Invalid credentials"}
    if not verify_password(password, str(user.get("password", ""))):
        return {"error": "Invalid credentials"}
        
    user_id = str(user.get("id", ""))
    user_name = str(user.get("name", ""))
    user_mobile = str(user.get("mobile", ""))
    user_location = str(user.get("location", "Guntur"))
    token = create_token({"sub": user_id, "email": user_email, "role": "consumer"})
    return {"token": token, "consumer_id": user_id, "name": user_name, "mobile": user_mobile, "location": user_location}
