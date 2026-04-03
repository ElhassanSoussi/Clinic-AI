from pydantic import BaseModel, EmailStr
from typing import Optional


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    clinic_name: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    access_token: str
    user_id: str
    email: str
    full_name: str
    clinic_id: str
    clinic_slug: str
    requires_email_confirmation: bool = False
    message: str = ""


class UpdateProfileRequest(BaseModel):
    full_name: Optional[str] = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str
