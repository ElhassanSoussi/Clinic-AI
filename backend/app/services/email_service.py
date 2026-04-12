import resend
from html import escape

from app.errors import ExternalServiceAppError
from app.config import get_settings
from app.utils.logger import get_logger

logger = get_logger(__name__)


def _get_sender_email(settings) -> str:
    if settings.resend_from_email:
        return settings.resend_from_email
    if settings.resend_from_domain:
        return f"notifications@{settings.resend_from_domain}"
    if not settings.is_production:
        return "onboarding@resend.dev"
    return ""


def _get_dashboard_base_url(settings) -> str:
    if settings.frontend_app_url:
        return settings.frontend_app_url.rstrip("/")
    if not settings.is_production and settings.cors_origin_list:
        return settings.cors_origin_list[0]
    return ""


def send_test_notification_email(clinic: dict) -> dict:
    """Send a test notification email to verify the email integration works."""
    settings = get_settings()
    api_key = settings.resend_api_key
    sender_email = _get_sender_email(settings)

    if not api_key:
        return {"success": False, "error": "Email notifications are not configured on the server (missing API key)."}
    if not sender_email:
        return {
            "success": False,
            "error": "Email notifications are missing a sender address. Set RESEND_FROM_EMAIL or RESEND_FROM_DOMAIN.",
        }

    resend.api_key = api_key

    target_email = clinic.get("notification_email") or clinic.get("email")
    if not target_email:
        return {"success": False, "error": "No notification email address configured. Add one in Settings."}

    clinic_name = escape(clinic.get("name", "Clinic AI"))

    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; background-color: #f8fafc; border-radius: 12px;">
        <h2 style="color: #0f766e; margin-bottom: 8px;">Test Notification</h2>
        <p style="color: #334155;">Hello <strong>{clinic_name}</strong>,</p>
        <p style="color: #334155;">This is a test email from your Clinic AI Front Desk.</p>
        <p style="color: #334155;">If you received this, your email notifications are working correctly.</p>
        <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">
            This is an automated test from the Clinic AI platform.
        </p>
    </div>
    """

    try:
        resend.Emails.send({
            "from": f"{clinic_name} <{sender_email}>",
            "to": [target_email],
            "subject": f"Test notification from {clinic_name}",
            "html": html_content,
        })
        return {"success": True, "email": target_email}
    except Exception as e:
        logger.error(f"Test email failed for clinic {clinic.get('id')}: {e}")
        return {"success": False, "error": f"Failed to send: {str(e)[:200]}"}


def send_new_lead_email(clinic: dict, lead: dict, *, raise_on_error: bool = False) -> dict:
    settings = get_settings()
    api_key = settings.resend_api_key
    sender_email = _get_sender_email(settings)
    dashboard_base_url = _get_dashboard_base_url(settings)
    
    if not api_key:
        message = f"Skipping email notification for lead {lead.get('id')} because RESEND_API_KEY is not set."
        logger.warning(message)
        if raise_on_error:
            raise ExternalServiceAppError("Email notifications are not configured on the server.")
        return {"success": False, "error": message}
    if not sender_email:
        message = (
            f"Skipping email notification for lead {lead.get('id')} because "
            "RESEND_FROM_EMAIL/RESEND_FROM_DOMAIN is not configured."
        )
        logger.warning(message)
        if raise_on_error:
            raise ExternalServiceAppError(
                "Email notifications are missing a verified sender identity."
            )
        return {"success": False, "error": message}
        
    resend.api_key = api_key
    
    clinic_name = escape(clinic.get("name", "Clinic AI"))
    target_email = clinic.get("notification_email") or clinic.get("email")
    
    if not target_email:
        message = f"Skipping email notification for lead {lead.get('id')} because no target email is configured."
        logger.warning(message)
        if raise_on_error:
            raise ExternalServiceAppError("Clinic notification email is not configured.")
        return {"success": False, "error": message}
        
    subject = f"New appointment request — {lead.get('patient_name', 'A patient')}"

    safe_patient_name = escape(lead.get('patient_name', 'N/A'))
    safe_phone = escape(lead.get('patient_phone', 'N/A'))
    safe_email = escape(lead.get('patient_email', 'N/A'))
    safe_reason = escape(lead.get('reason_for_visit', 'N/A'))
    safe_datetime = escape(lead.get('preferred_datetime_text', 'N/A'))
    safe_lead_id = escape(str(lead.get('id', '')))
    lead_url = f"{dashboard_base_url}/app/leads/{safe_lead_id}" if dashboard_base_url else ""
    lead_button_html = ""

    if lead_url:
        lead_button_html = f"""
        <p style="margin-top: 20px;">
            <a href="{lead_url}" style="background-color: #0f766e; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: 500;">View in Dashboard</a>
        </p>
        """

    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-w-2xl mx-auto p-4 bg-gray-50 rounded-lg">
        <h2 style="color: #0f766e;">New Lead Notification</h2>
        <p>Hello <strong>{clinic_name}</strong>,</p>
        <p>You have received a new appointment request via your AI Front Desk widget.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 20px; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px;">
            <tr>
                <th style="text-align: left; padding: 12px; border-bottom: 1px solid #e5e7eb; color: #4b5563; width: 30%;">Patient Name</th>
                <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #111827; font-weight: 500;">{safe_patient_name}</td>
            </tr>
            <tr>
                <th style="text-align: left; padding: 12px; border-bottom: 1px solid #e5e7eb; color: #4b5563;">Phone Number</th>
                <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #111827;">{safe_phone}</td>
            </tr>
            <tr>
                <th style="text-align: left; padding: 12px; border-bottom: 1px solid #e5e7eb; color: #4b5563;">Email Address</th>
                <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #111827;">{safe_email}</td>
            </tr>
            <tr>
                <th style="text-align: left; padding: 12px; border-bottom: 1px solid #e5e7eb; color: #4b5563;">Reason for Visit</th>
                <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #111827;">{safe_reason}</td>
            </tr>
            <tr>
                <th style="text-align: left; padding: 12px; color: #4b5563;">Preferred Time</th>
                <td style="padding: 12px; color: #111827;">{safe_datetime}</td>
            </tr>
        </table>
        
        {lead_button_html}
        
        <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
            This is an automated message from the Clinic AI Front Desk platform.
        </p>
    </div>
    """
    
    try:
        r = resend.Emails.send({
            "from": f"Clinic AI <{sender_email}>",
            "to": target_email,
            "subject": subject,
            "html": html_content
        })
        logger.info(
            "lead_email_sent clinic_id=%s lead_id=%s target_email=%s resend_id=%s",
            clinic.get("id"),
            lead.get("id"),
            target_email,
            r.get("id"),
        )
        return {"success": True, "provider_id": r.get("id", ""), "target_email": target_email}
    except Exception as e:
        logger.error(
            "lead_email_failed clinic_id=%s lead_id=%s target_email=%s error=%s",
            clinic.get("id"),
            lead.get("id"),
            target_email,
            e,
        )
        if raise_on_error:
            raise ExternalServiceAppError("Lead notification email could not be sent.") from e
        return {"success": False, "error": str(e)[:200]}
