from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field, EmailStr

from app.dependencies import get_supabase
from app.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(tags=["contact"])


class ContactCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    clinic_name: str = Field(default="", max_length=200)
    email: EmailStr = Field(..., max_length=200)
    phone: str = Field(default="", max_length=30)
    message: str = Field(default="", max_length=2000)


@router.post("/contact", status_code=201)
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
