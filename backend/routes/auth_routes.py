"""
routes/auth_routes.py — Farmer and Consumer authentication endpoints.
"""
from fastapi import APIRouter  # pyre-ignore[21]
from pydantic import BaseModel  # pyre-ignore[21]
from ..auth import farmer_signup, farmer_login, consumer_signup, consumer_login  # pyre-ignore[21]

router = APIRouter(prefix="/api")


# ── Pydantic Models ───────────────────────────────────────────────────────

class FarmerSignupRequest(BaseModel):
    name: str
    email: str = ""
    password: str
    mobile: str = ""


class LoginRequest(BaseModel):
    email: str
    password: str


class ConsumerSignupRequest(BaseModel):
    name: str
    email: str = ""
    password: str
    mobile: str = ""
    location: str = ""


# ── Farmer Auth ───────────────────────────────────────────────────────────

@router.post("/farmer/signup")
def api_farmer_signup(req: FarmerSignupRequest):
    result = farmer_signup(req.name, req.email, req.password, req.mobile)
    if "error" in result:
        return {"success": False, "message": result["error"]}
    return {"success": True, "user": result}


@router.post("/farmer/login")
def api_farmer_login(req: LoginRequest):
    result = farmer_login(req.email, req.password)
    if "error" in result:
        return {"success": False, "message": result["error"]}
    return {"success": True, **result}


# ── Consumer Auth ─────────────────────────────────────────────────────────

@router.post("/consumer/signup")
def api_consumer_signup(req: ConsumerSignupRequest):
    result = consumer_signup(req.name, req.email, req.password, req.mobile, req.location)
    if "error" in result:
        return {"success": False, "message": result["error"]}
    return {"success": True, "user": result}


@router.post("/consumer/login")
def api_consumer_login(req: LoginRequest):
    result = consumer_login(req.email, req.password)
    if "error" in result:
        return {"success": False, "message": result["error"]}
    return {"success": True, **result}
