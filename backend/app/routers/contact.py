from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, EmailStr

from app.config import get_settings
from app.dependencies import get_supabase
from app.rate_limit import create_rate_limit_dependency
from app.utils.logger import get_logger

logger = get_logger(__name__)
settings = get_settings()
router = APIRouter(tags=["contact"])
contact_rate_limit = create_rate_limit_dependency("contact", settings.rate_limit_contact_per_minute)


class ContactCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    clinic_name: str = Field(default="", max_length=200)
    email: EmailStr = Field(..., max_length=200)
    phone: str = Field(default="", max_length=30)
    message: str = Field(default="", max_length=2000)


@router.post("/contact", status_code=201, dependencies=[Depends(contact_rate_limit)])
async def submit_contact(body: ContactCreate):
    try:
        db = get_supabase()
        db.table("sales_leads").insert(
            {
                "name": body.name.strip(),
                "clinic_name": body.clinic_name.strip(),
                "email": body.email.strip().lower(),
                "phone": body.phone.strip(),
                "message": body.message.strip(),
                "source": "contact_form",
            }
        ).execute()
        logger.info(f"New sales lead from contact form: {body.email}")
    except Exception as e:
        logger.error(f"Failed to save contact form: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save your request. Please try again.",
        )

    return {"success": True, "message": "Thank you! We'll be in touch shortly."}
