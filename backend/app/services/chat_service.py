"""
Clinic AI Front Desk — Chat Service

Implements a structured conversation state machine so the AI behaves like
a trained clinic receptionist, not a generic chatbot.

Conversation States
───────────────────
  general          Initial / unknown state
  greeting         First contact — AI greets and asks how to help
  faq              Answering clinic questions
  booking_reason   Booking step 1: reason for visit
    booking_slot_offer       Booking step 2a: offer available slots
    booking_slot_selection   Booking step 2b: parse selected slot
    booking_datetime_fallback Booking step 2c: manual preferred date / time
  booking_name     Booking step 3: patient full name
  booking_phone    Booking step 4: patient phone number
  booking_email    Booking step 5: patient email (optional)
  booking_confirm  Booking step 6: show summary, await yes/no
  booking_complete Lead saved — wrap up or handle new queries
  fallback         Did not understand — offer clear options
"""

import json
import re
from dataclasses import dataclass, asdict
from typing import Optional, Dict, Any

from app.services.openai_service import OpenAIService
from app.services.lead_service import create_lead
from app.services.google_sheets import get_available_slots
from app.dependencies import get_supabase
from app.utils.logger import get_logger

logger = get_logger(__name__)
ai = OpenAIService()

# ─────────────────────────────────────────────────────────────────────────────
# CONSTANTS
# ─────────────────────────────────────────────────────────────────────────────

BOOKING_INTENT_KEYWORDS = [
    "book", "appointment", "schedule", "visit", "see a doctor", "see the doctor",
    "come in", "reserve", "slot", "consult", "consultation", "make an appointment",
    "set up an appointment", "need to see", "want to see", "i'd like to",
]

FAQ_INTENT_KEYWORDS = [
    "hours", "open", "close", "location", "address", "phone", "cost", "price",
    "insurance", "accept", "service", "offer", "parking", "directions", "email",
    "contact", "how much", "do you", "can you", "where are", "when are",
    "what are", "what is", "tell me about",
]

CONFIRMATION_KEYWORDS = [
    "yes", "yeah", "yep", "correct", "right", "confirm", "sure", "that's right",
    "looks good", "go ahead", "proceed", "ok", "okay", "perfect", "sounds good",
    "that's correct", "all correct", "absolutely", "definitely",
]

DENIAL_KEYWORDS = [
    "no", "nope", "wrong", "not right", "incorrect", "change", "edit", "fix",
    "that's wrong", "not correct", "not accurate", "wait", "actually",
]

EMAIL_SKIP_PHRASES = [
    "skip", "no email", "don't have", "none", "no thanks", "nope", "n/a", "-",
    "no", "nothing", "pass", "i don't", "i do not",
]

DEFAULT_CLINIC_NAME = "our clinic"


# ─────────────────────────────────────────────────────────────────────────────
# BOOKING DATA  (persisted in conversations.summary as JSON)
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class BookingData:
    reason: str = ""
    datetime: str = ""
    name: str = ""
    phone: str = ""
    email: str = ""
    slot_row_index: Optional[int] = None
    slot_source: str = "manual"
    correction_mode: bool = False
    correction_field: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict) -> "BookingData":
        return cls(
            reason=data.get("reason", ""),
            datetime=data.get("datetime", ""),
            name=data.get("name", ""),
            phone=data.get("phone", ""),
            email=data.get("email", ""),
            slot_row_index=data.get("slot_row_index"),
            slot_source=data.get("slot_source", "manual"),
            correction_mode=bool(data.get("correction_mode", False)),
            correction_field=data.get("correction_field", ""),
        )


# ─────────────────────────────────────────────────────────────────────────────
# STATE MANAGEMENT
# ─────────────────────────────────────────────────────────────────────────────

def load_state(conversation: dict) -> tuple[str, BookingData]:
    """Read current state and any previously collected booking data from DB."""
    state = conversation.get("last_intent") or "general"
    raw_summary = conversation.get("summary") or ""
    booking_data = BookingData()
    if raw_summary:
        try:
            booking_data = BookingData.from_dict(json.loads(raw_summary))
        except ValueError:
            pass
    return state, booking_data


def save_state(db, conversation_id: str, state: str, booking_data: BookingData) -> None:
    """Persist current state and collected booking fields back to DB."""
    db.table("conversations").update({
        "last_intent": state,
        "summary": json.dumps(booking_data.to_dict()),
    }).eq("id", conversation_id).execute()


# ─────────────────────────────────────────────────────────────────────────────
# INTENT DETECTION
# ─────────────────────────────────────────────────────────────────────────────

def detect_intent(message: str) -> str:
    """Classify user message as 'booking', 'faq', or 'unclear'."""
    text = message.lower().strip()
    if any(kw in text for kw in BOOKING_INTENT_KEYWORDS):
        return "booking"
    if any(kw in text for kw in FAQ_INTENT_KEYWORDS):
        return "faq"
    return "unclear"


def is_simple_greeting(message: str) -> bool:
    text = message.lower().strip()
    return any(g in text for g in ["hi", "hello", "hey", "good morning", "good afternoon", "good evening"])


def is_confirmation(message: str) -> bool:
    text = message.lower().strip()
    return any(kw in text for kw in CONFIRMATION_KEYWORDS)


def is_denial(message: str) -> bool:
    text = message.lower().strip()
    return any(kw in text for kw in DENIAL_KEYWORDS)


def detect_field_to_change(message: str) -> Optional[str]:
    """After a denial, detect which booking field the user wants to correct."""
    text = message.lower()
    if any(w in text for w in ["name", "my name"]):
        return "name"
    if any(w in text for w in ["reason", "purpose", "why", "visit"]):
        return "reason"
    if any(w in text for w in ["time", "date", "when", "day", "schedule", "slot"]):
        return "datetime"
    if any(w in text for w in ["phone", "number", "call"]):
        return "phone"
    if any(w in text for w in ["email", "mail"]):
        return "email"
    return None


def extract_corrected_value(field: str, message: str) -> str:
    """Extract a likely replacement value when user corrects a field in confirmation."""
    text = message.strip()

    if field == "phone":
        return extract_phone(text)
    if field == "email":
        return extract_email(text)
    if field == "name":
        return extract_name(text)

    if field == "reason":
        m = re.search(r"reason\s+(?:is|to)\s+(.+)", text, re.IGNORECASE)
        if m:
            candidate = m.group(1).strip()
            # Keep only the updated part before contrast terms.
            candidate = re.split(r",\s*not\s+|\s+not\s+", candidate, maxsplit=1, flags=re.IGNORECASE)[0].strip()
            return candidate
        m = re.search(r"(?:change|update)\s+(?:the\s+)?reason\s+(?:to\s+)?(.+)", text, re.IGNORECASE)
        if m:
            return m.group(1).strip()

    if field == "datetime":
        # Example: "Not tomorrow, Friday instead" -> keep phrase after comma
        if "," in text:
            tail = text.split(",")[-1].strip()
            tail = re.sub(r"\binstead\b", "", tail, flags=re.IGNORECASE).strip(" ,")
            if tail:
                return tail
        m = re.search(r"(?:instead\s+)?(?:to\s+)?(.+)\s+instead", text, re.IGNORECASE)
        if m:
            return m.group(1).strip(" ,")
        m = re.search(r"(?:change|update)\s+(?:the\s+)?(?:date|time|day)\s+(?:to\s+)?(.+)", text, re.IGNORECASE)
        if m:
            return m.group(1).strip()
        m = re.search(r"not\s+.+?,\s*(.+)", text, re.IGNORECASE)
        if m:
            return m.group(1).strip(" ,")

    lowered = text.lower()
    # Remove common correction prefixes so we keep the updated value.
    prefixes = [
        "no,", "actually", "change", "the", "my", "is", "to", "not", "wrong",
        "instead", "please",
    ]
    tokens = [t for t in re.split(r"\s+", lowered) if t]
    cleaned_tokens = [t for t in tokens if t not in prefixes]
    cleaned = " ".join(cleaned_tokens).strip()
    return cleaned if cleaned else text


def find_matching_slot(user_message: str, available_slots: list) -> Optional[int]:
    """Return slot row_index if the user's message clearly refers to an offered slot."""
    if not available_slots:
        return None
    msg = user_message.lower()
    for slot in available_slots:
        date_str = str(slot.get("date", "")).lower()
        time_str = str(slot.get("time", "")).lower()
        if date_str and date_str in msg:
            return slot.get("row_index")
        if time_str and time_str in msg:
            return slot.get("row_index")
    return None


def _normalize_text(text: str) -> str:
    return re.sub(r"\s+", " ", text.lower().strip())


def _contains_phrase(text: str, phrase: str) -> bool:
    """Match phrase with soft token boundaries to avoid substring collisions (e.g. 2:00 in 12:00)."""
    if not phrase:
        return False
    pattern = rf"(?<![a-z0-9]){re.escape(phrase)}(?![a-z0-9])"
    return re.search(pattern, text) is not None


def slot_label(slot: dict) -> str:
    date = str(slot.get("date", "")).strip()
    time = str(slot.get("time", "")).strip()
    if date and time:
        return f"{date} at {time}"
    return date or time or "time slot"


def format_slot_options(available_slots: list, max_slots: int = 5) -> list[dict]:
    """Return a compact list of readable slot options for patient-facing prompts."""
    options = []
    for slot in available_slots[:max_slots]:
        date = str(slot.get("date", "")).strip()
        time = str(slot.get("time", "")).strip()
        row_index = slot.get("row_index")
        if not date or not time or row_index is None:
            continue
        options.append(
            {
                "date": date,
                "time": time,
                "row_index": int(row_index),
                "label": slot_label(slot),
            }
        )
    return options


def match_slot_choice(user_message: str, slot_options: list[dict]) -> Optional[dict]:
    """Best-effort matching for partial or natural slot selections."""
    msg = _normalize_text(user_message)
    if not msg:
        return None

    # Direct ordinal choices: prioritize explicit order references.
    ordinal_patterns = [
        (r"\b(first|1st|option\s*1|#1)\b", 0),
        (r"\b(second|2nd|option\s*2|#2)\b", 1),
        (r"\b(third|3rd|option\s*3|#3)\b", 2),
        (r"\b(fourth|4th|option\s*4|#4)\b", 3),
        (r"\b(fifth|5th|option\s*5|#5)\b", 4),
    ]
    for pattern, idx in ordinal_patterns:
        if re.search(pattern, msg) and idx < len(slot_options):
            return slot_options[idx]

    # Bare numeric/word answers are common in chat widgets.
    bare_ordinal = {
        "1": 0,
        "one": 0,
        "2": 1,
        "two": 1,
        "3": 2,
        "three": 2,
        "4": 3,
        "four": 3,
        "5": 4,
        "five": 4,
    }
    if msg in bare_ordinal and bare_ordinal[msg] < len(slot_options):
        return slot_options[bare_ordinal[msg]]

    best_match = None
    best_score = 0
    for option in slot_options:
        date_txt = _normalize_text(option["date"])
        time_txt = _normalize_text(option["time"])
        label_txt = _normalize_text(option["label"])

        score = 0
        if date_txt and _contains_phrase(msg, date_txt):
            score += 2
        if time_txt and _contains_phrase(msg, time_txt):
            score += 2
        if label_txt and _contains_phrase(msg, label_txt):
            score += 3

        # Token overlap for close phrasing.
        tokens = [t for t in re.split(r"[^a-z0-9]+", label_txt) if t and len(t) > 2]
        score += sum(1 for t in tokens if t in msg)

        if score > best_score:
            best_score = score
            best_match = option

    return best_match if best_score >= 2 else None


def looks_like_custom_datetime(text: str) -> bool:
    msg = text.lower()
    markers = [
        "am", "pm", "tomorrow", "today", "monday", "tuesday", "wednesday",
        "thursday", "friday", "saturday", "sunday", "next", "at", ":",
        "morning", "afternoon", "evening",
    ]
    return any(m in msg for m in markers)


def wants_manual_time(text: str) -> bool:
    msg = text.lower()
    phrases = [
        "none", "another time", "different time", "something else", "not those",
        "no slot", "no thanks", "other time", "different day",
    ]
    return any(p in msg for p in phrases)


# ─────────────────────────────────────────────────────────────────────────────
# FIELD EXTRACTION HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def extract_name(raw: str) -> str:
    """Strip common introductory phrases and return a clean capitalised name."""
    patterns = [
        r"(?:my name is|i'?m|i am|it'?s|call me|name:)\s+(.+)",
    ]
    for pattern in patterns:
        m = re.search(pattern, raw.strip(), re.IGNORECASE)
        if m:
            return m.group(1).strip().title()
    return raw.strip()


def extract_phone(raw: str) -> str:
    """Extract a phone number from a natural language string."""
    m = re.search(r"[\d\s\-\(\)\+]{7,}", raw)
    return m.group(0).strip() if m else raw.strip()


def extract_email(raw: str) -> str:
    """Extract an email address from a natural language string."""
    m = re.search(r"[\w.+\-]+@[\w\-]+\.[a-zA-Z]{2,}", raw)
    return m.group(0).strip() if m else raw.strip()


# ─────────────────────────────────────────────────────────────────────────────
# CLINIC CONTEXT BLOCK (shared across all prompts)
# ─────────────────────────────────────────────────────────────────────────────

def _parse_json_field(clinic: dict, key: str, default):
    """Parse a clinic field that may be stored as a JSON string."""
    value = clinic.get(key, default)
    if isinstance(value, str):
        try:
            value = json.loads(value)
        except Exception:
            value = default
    return value


def _clinic_context_block(clinic: dict) -> str:
    services = _parse_json_field(clinic, "services", [])
    services_text = ", ".join(services) if services else "General consultation"

    hours = _parse_json_field(clinic, "business_hours", {})
    hours_text = "\n".join(f"  {d}: {t}" for d, t in hours.items()) if hours else "  Not specified"

    faq = _parse_json_field(clinic, "faq", [])
    faq_lines = []
    for item in faq:
        q = item.get("question", item.get("q", ""))
        a = item.get("answer", item.get("a", ""))
        if q and a:
            faq_lines.append(f"  Q: {q}\n  A: {a}")
    faq_text = ("\nFREQUENTLY ASKED QUESTIONS:\n" + "\n".join(faq_lines)) if faq_lines else ""

    return f"""CLINIC INFORMATION:
  Name:     {clinic.get('name', 'the clinic')}
  Phone:    {clinic.get('phone', 'not provided')}
  Email:    {clinic.get('email', 'not provided')}
  Address:  {clinic.get('address', 'not provided')}
  Services: {services_text}
  Hours:
{hours_text}{faq_text}"""


# ─────────────────────────────────────────────────────────────────────────────
# STATE-SPECIFIC SYSTEM PROMPTS
# ─────────────────────────────────────────────────────────────────────────────

def _base_rules() -> str:
    return """RULES (always apply):
- You are NOT a doctor. Never give medical advice, diagnoses, or treatment recommendations.
- Never invent clinic information not listed above.
- Never claim an appointment is confirmed — say the request will be reviewed by the clinic.
- For emergencies, tell the patient to call 911 or go to the nearest emergency room.
- Keep responses warm, calm, professional, and concise."""


def build_greeting_prompt(clinic: dict) -> str:
    clinic_name = clinic.get("name", DEFAULT_CLINIC_NAME)
    return f"""You are the virtual front desk assistant for {clinic_name}.

{_clinic_context_block(clinic)}

{_base_rules()}

TASK: Greet the patient warmly and ask how you can help them today.
Style: "Hi, welcome to {clinic_name}! I'm the clinic assistant. I can help you book an appointment, answer questions about our services, or help you get in contact with us. What brings you in today?"

Adapt the wording — don't copy it verbatim. Keep it under 3 sentences."""


def build_faq_prompt(clinic: dict, user_message: str) -> str:
    clinic_name = clinic.get("name", DEFAULT_CLINIC_NAME)
    fallback = clinic.get("fallback_message", "That's a great question — I'd recommend calling us directly so we can give you the most accurate answer.")
    return f"""You are the front desk assistant for {clinic_name}.

{_clinic_context_block(clinic)}

{_base_rules()}

TASK: Answer the patient's question using ONLY the clinic information above.
- Be friendly, clear, and concise.
- If you don't know the answer, say: "{fallback}"
- After answering, gently offer to help with anything else (such as booking an appointment).

Patient's question: {user_message}"""


def build_booking_start_prompt(clinic: dict, available_slots: list) -> str:
    clinic_name = clinic.get("name", DEFAULT_CLINIC_NAME)
    slots_text = ""
    if available_slots:
        lines = "\n".join(f"  - {s['date']} at {s['time']}" for s in available_slots[:5])
        slots_text = f"\n\nCURRENTLY AVAILABLE SLOTS:\n{lines}\n\nYou may mention these slots to the patient when they reach the time-preference step."
    return f"""You are the front desk assistant for {clinic_name}.

{_clinic_context_block(clinic)}
{slots_text}

{_base_rules()}

TASK: The patient wants to book an appointment.
- Acknowledge their request warmly.
- Ask ONE question only: what is the reason for their visit?

Example tone: "Of course! I'd be happy to help you set up an appointment. To get started, could you tell me what brings you in — what's the reason for your visit?"

Do NOT ask for name, phone, or any other detail yet. One question only."""


def build_collect_datetime_prompt(clinic: dict, booking_data: BookingData, available_slots: list) -> str:
    clinic_name = clinic.get("name", DEFAULT_CLINIC_NAME)
    slots_text = ""
    if available_slots:
        lines = "\n".join(f"  - {s['date']} at {s['time']}" for s in available_slots[:5])
        slots_text = f"\n\nAVAILABLE SLOTS (offer these to the patient):\n{lines}"
    return f"""You are the front desk assistant for {clinic_name}.

Booking in progress:
  Reason for visit: {booking_data.reason}

{_base_rules()}
{slots_text}

TASK: Acknowledge the patient's reason for visit warmly, then ask for their preferred date and time.
- If available slots are listed above, offer them as options.
- Ask ONE question only — preferred date and time.

Example: "Got it. What day or time works best for you?"""


def build_collect_name_prompt(clinic: dict, booking_data: BookingData) -> str:
    clinic_name = clinic.get("name", DEFAULT_CLINIC_NAME)
    return f"""You are the front desk assistant for {clinic_name}.

Booking in progress:
  Reason for visit:  {booking_data.reason}
  Preferred time:    {booking_data.datetime}

{_base_rules()}

TASK: Acknowledge the patient's preferred time, then ask for their full name so the clinic can follow up.
- Ask ONE question only — their full name.

Example: "Perfect, thank you. Can I get your name so the clinic can follow up with you?"""


def build_collect_phone_prompt(clinic: dict, booking_data: BookingData) -> str:
    clinic_name = clinic.get("name", DEFAULT_CLINIC_NAME)
    return f"""You are the front desk assistant for {clinic_name}.

Booking in progress:
  Name:              {booking_data.name}
  Reason for visit:  {booking_data.reason}
  Preferred time:    {booking_data.datetime}

{_base_rules()}

TASK: Acknowledge the patient's name warmly, then ask for their phone number.
- Ask ONE question only — their best phone number.

Example: "Thanks, {booking_data.name}. What's the best phone number for us to reach you?"""


def build_collect_email_prompt(clinic: dict, booking_data: BookingData) -> str:
    clinic_name = clinic.get("name", DEFAULT_CLINIC_NAME)
    return f"""You are the front desk assistant for {clinic_name}.

Booking in progress:
  Name:   {booking_data.name}
  Phone:  {booking_data.phone}

{_base_rules()}

TASK: Acknowledge the patient's phone number, then ask for their email address.
- Let them know it's optional — they can skip it.
- Ask ONE question only.

Example: "Got it, thank you. Do you want to share an email as well? It's optional, so you can skip it if you prefer."""


def build_confirmation_prompt(clinic: dict, booking_data: BookingData) -> str:
    clinic_name = clinic.get("name", DEFAULT_CLINIC_NAME)
    email_part = booking_data.email if booking_data.email else "not provided"
    return f"""You are the front desk assistant for {clinic_name}.

Booking details collected:
  Name:              {booking_data.name}
  Reason for visit:  {booking_data.reason}
  Preferred time:    {booking_data.datetime}
  Phone:             {booking_data.phone}
  Email:             {email_part}

{_base_rules()}

TASK: Read back the details to the patient in a natural, human way and ask them to confirm.
- Present the summary conversationally (not as a list).
- End with a simple yes/no question.
- Remind them this is a REQUEST — {clinic_name} will follow up to confirm.

Example: "Just to confirm, here's what I have: you're {booking_data.name}, you'd like to come in for {booking_data.reason}, and {booking_data.datetime} works best. We'll reach you at {booking_data.phone}. Is that all correct?"""


def build_completion_prompt(clinic: dict, booking_data: BookingData) -> str:
    clinic_name = clinic.get("name", DEFAULT_CLINIC_NAME)
    return f"""You are the front desk assistant for {clinic_name}.

The patient's appointment request has been successfully submitted.
  Patient: {booking_data.name}
  Reason:  {booking_data.reason}
  Time:    {booking_data.datetime}

{_base_rules()}

TASK: Thank the patient and let them know the team will be in touch to confirm.
- Keep it warm and reassuring — 2–3 sentences.
- Offer to help with anything else.

Example: "You're all set, {booking_data.name}. I've sent this request to our team, and we'll contact you shortly to confirm. Is there anything else I can help you with today?"""


def build_fallback_prompt(clinic: dict) -> str:
    clinic_name = clinic.get("name", DEFAULT_CLINIC_NAME)
    return f"""You are the front desk assistant for {clinic_name}.

{_clinic_context_block(clinic)}

{_base_rules()}

TASK: The patient's message was unclear. Respond politely, apologise briefly, and offer exactly two options:
1. Book an appointment
2. Answer a question about the clinic

Keep it very short and friendly. Do not repeat the patient's message back to them.

Example: "I'm not sure I caught that — sorry about that! I'm here to help you book an appointment or answer any questions about {clinic_name}. Which would you like?\""""


def build_confirm_restart_prompt(clinic: dict, booking_data: BookingData) -> str:
    clinic_name = clinic.get("name", DEFAULT_CLINIC_NAME)
    return f"""You are the front desk assistant for {clinic_name}.

Current booking details:
  Name:              {booking_data.name}
  Reason for visit:  {booking_data.reason}
  Preferred time:    {booking_data.datetime}
  Phone:             {booking_data.phone}
  Email:             {booking_data.email or "not provided"}

{_base_rules()}

TASK: The patient wants to change something. Ask them what they'd like to update and list the fields they can change.

Example: "No problem at all. Which detail would you like to update: your name, reason for visit, preferred time, phone number, or email?"""


def reply_greeting(clinic: dict) -> str:
    custom = clinic.get("greeting_message")
    if custom:
        return custom
    clinic_name = clinic.get("name", DEFAULT_CLINIC_NAME)
    return (
        f"Hi, welcome to {clinic_name}. I'm the clinic assistant. "
        "I can help with appointments or clinic questions. "
        "What would you like help with today?"
    )


def reply_booking_start() -> str:
    return (
        "Absolutely, I can help with that. "
        "To get started, what is the reason for your visit?"
    )


def reply_ask_reason() -> str:
    return "Of course. Could you share the correct reason for your visit?"


def reply_ask_datetime(available_slots: list) -> str:
    if available_slots:
        slot_lines = ", ".join(f"{s['date']} at {s['time']}" for s in available_slots[:3])
        return (
            "Thank you. What day or time works best for you? "
            f"If helpful, I currently see: {slot_lines}."
        )
    return "Thank you. What day or time works best for you?"


def reply_offer_slots(slot_options: list[dict]) -> str:
    labels = [opt["label"] for opt in slot_options]
    if not labels:
        return "I don't see open slots right now. What day or time works best for you?"

    if len(labels) == 1:
        joined = labels[0]
    elif len(labels) == 2:
        joined = f"{labels[0]} or {labels[1]}"
    else:
        joined = ", ".join(labels[:-1]) + f", or {labels[-1]}"

    return (
        "I currently have a few times open: "
        f"{joined}. Which works best for you? "
        "If none of these work, tell me your preferred time and I'll note it."
    )


def reply_no_slots_fallback() -> str:
    return (
        "I don't see an open slot available right now. "
        "What day or time would you prefer? I'll submit that request for the clinic to confirm."
    )


def reply_ask_name() -> str:
    return "Got it. Can I get your name so the clinic can follow up with you?"


def reply_ask_phone(name: str) -> str:
    if name:
        return f"Thanks, {name}. What's the best phone number for us to reach you?"
    return "Thanks. What's the best phone number for us to reach you?"


def reply_ask_email() -> str:
    return "Great, thank you. Do you want to share an email as well? It's optional, so you can skip it."


def reply_confirmation(booking_data: BookingData) -> str:
    email_part = (
        f" and email {booking_data.email}" if booking_data.email else ""
    )
    return (
        "Just to confirm, here's what I have: "
        f"{booking_data.name}, reason for visit: {booking_data.reason}, "
        f"preferred time: {booking_data.datetime}, "
        f"phone: {booking_data.phone}{email_part}. "
        "Is everything correct?"
    )


def reply_completion(clinic: dict, booking_data: BookingData) -> str:
    clinic_name = clinic.get("name", "the clinic")
    first_name = booking_data.name.split(" ")[0] if booking_data.name else "there"
    return (
        f"Thank you, {first_name}. I've submitted your appointment request to {clinic_name}. "
        "Our team will contact you shortly to confirm. "
        "Is there anything else I can help with today?"
    )


def reply_fallback(clinic: dict) -> str:
    clinic_name = clinic.get("name", "the clinic")
    return (
        "I'm not sure I understood that. "
        f"I can help you book an appointment or answer questions about {clinic_name}. "
        "Which would you like to do?"
    )


def reply_confirm_restart() -> str:
    return (
        "No problem at all. Which detail would you like to update: "
        "name, reason for visit, preferred time, phone number, or email?"
    )


# ─────────────────────────────────────────────────────────────────────────────
# MAIN ORCHESTRATOR
# ─────────────────────────────────────────────────────────────────────────────

async def process_chat(clinic_slug: str, session_id: str, user_message: str) -> dict:
    db = get_supabase()

    # ── Load clinic ──────────────────────────────────────────────────────────
    clinic_result = (
        db.table("clinics").select("*").eq("slug", clinic_slug).single().execute()
    )
    if not clinic_result.data:
        logger.warning(f"Chat for unknown clinic slug: {clinic_slug}")
        return {
            "reply": "Sorry, I couldn't find that clinic. Please check the link and try again.",
            "session_id": session_id,
            "intent": "error",
            "lead_created": False,
            "lead_id": None,
        }

    clinic = clinic_result.data
    clinic_id = clinic["id"]

    # ── Plan enforcement: check if clinic subscription allows chat ────────
    from app.services.pricing import is_at_lead_limit
    sub_status = clinic.get("subscription_status", "trialing")
    if sub_status == "inactive":
        return {
            "reply": "This clinic's subscription is currently inactive. Please ask the clinic to renew their plan.",
            "session_id": session_id,
            "intent": "error",
            "lead_created": False,
            "lead_id": None,
        }

    plan_id = clinic.get("plan", "trial")
    leads_used = clinic.get("monthly_leads_used", 0)
    if is_at_lead_limit(plan_id, leads_used):
        return {
            "reply": "This clinic has reached its monthly appointment request limit. Please contact the clinic directly by phone.",
            "session_id": session_id,
            "intent": "limit_reached",
            "lead_created": False,
            "lead_id": None,
        }

    # ── Load or create conversation ──────────────────────────────────────────
    conv_result = (
        db.table("conversations")
        .select("*")
        .eq("clinic_id", clinic_id)
        .eq("session_id", session_id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    if conv_result.data:
        conversation = conv_result.data[0]
    else:
        conv_insert = db.table("conversations").insert({
            "clinic_id": clinic_id,
            "session_id": session_id,
            "last_intent": "general",
            "summary": "",
        }).execute()
        conversation = conv_insert.data[0]

    conversation_id = conversation["id"]

    # ── Persist user message ─────────────────────────────────────────────────
    db.table("conversation_messages").insert({
        "conversation_id": conversation_id,
        "role": "user",
        "content": user_message,
    }).execute()

    # ── Load conversation state ──────────────────────────────────────────────
    state, booking_data = load_state(conversation)

    # ── Load available slots (if integration enabled) ────────────────────────
    available_slots: list = []
    if clinic.get("availability_enabled"):
        available_slots = get_available_slots(
            clinic.get("google_sheet_id"),
            clinic.get("availability_sheet_tab") or "Availability",
        )
    slot_options = format_slot_options(available_slots, max_slots=5)

    # ── Build message history for LLM ────────────────────────────────────────
    history_result = (
        db.table("conversation_messages")
        .select("role, content")
        .eq("conversation_id", conversation_id)
        .order("created_at")
        .limit(20)
        .execute()
    )
    messages = []
    found_current = False
    for m in history_result.data:
        messages.append({"role": m["role"], "content": m["content"]})
        if m["role"] == "user" and m["content"] == user_message:
            found_current = True
    if not found_current:
        messages.append({"role": "user", "content": user_message})

    logger.info(
        f"Session {session_id[:8]} | State: {state} | "
        f"Msg: {user_message[:60]!r} | Slots: {len(available_slots)}"
    )

    # ─────────────────────────────────────────────────────────────────────────
    # STATE MACHINE — determine system prompt and next state
    # ─────────────────────────────────────────────────────────────────────────
    lead_created = False
    lead_id: Optional[str] = None
    next_state = state
    system_prompt = build_fallback_prompt(clinic)
    response_override: Optional[str] = None

    try:
        # ── GENERAL / GREETING / FALLBACK ──────────────────────────────────
        if state in ("general", "greeting", "fallback"):
            intent = detect_intent(user_message)
            if intent == "booking":
                next_state = "booking_reason"
                system_prompt = build_booking_start_prompt(clinic, available_slots)
                response_override = reply_booking_start()
            elif intent == "faq":
                next_state = "faq"
                system_prompt = build_faq_prompt(clinic, user_message)
            else:
                if state == "general" or is_simple_greeting(user_message):
                    next_state = "greeting"
                    response_override = reply_greeting(clinic)
                else:
                    next_state = "fallback"
                    response_override = reply_fallback(clinic)

        # ── FAQ ─────────────────────────────────────────────────────────────
        elif state == "faq":
            intent = detect_intent(user_message)
            if intent == "booking":
                next_state = "booking_reason"
                system_prompt = build_booking_start_prompt(clinic, available_slots)
                response_override = reply_booking_start()
            else:
                next_state = "faq"
                system_prompt = build_faq_prompt(clinic, user_message)

        # ── BOOKING STEP 1: REASON FOR VISIT ────────────────────────────────
        elif state == "booking_reason":
            if detect_intent(user_message) == "faq" and "?" in user_message:
                next_state = "booking_reason"
                system_prompt = build_faq_prompt(clinic, user_message)
                response_override = None
                raise StopIteration
            booking_data.reason = user_message.strip()
            if booking_data.correction_mode and booking_data.correction_field == "reason":
                booking_data.correction_mode = False
                booking_data.correction_field = ""
                next_state = "booking_confirm"
                response_override = reply_confirmation(booking_data)
            else:
                if clinic.get("availability_enabled") and slot_options:
                    next_state = "booking_slot_offer"
                    response_override = reply_offer_slots(slot_options)
                elif clinic.get("availability_enabled") and not slot_options:
                    next_state = "booking_datetime_fallback"
                    response_override = reply_no_slots_fallback()
                else:
                    next_state = "booking_datetime_fallback"
                    response_override = reply_ask_datetime([])

        # ── BOOKING STEP 2A: OFFER SLOTS ───────────────────────────────────
        elif state == "booking_slot_offer":
            if detect_intent(user_message) == "faq" and "?" in user_message:
                next_state = "booking_slot_offer"
                system_prompt = build_faq_prompt(clinic, user_message)
                response_override = None
                raise StopIteration

            selected = match_slot_choice(user_message, slot_options)
            if selected:
                booking_data.datetime = selected["label"]
                booking_data.slot_row_index = selected["row_index"]
                booking_data.slot_source = "availability"
                next_state = "booking_name"
                response_override = reply_ask_name()
            elif wants_manual_time(user_message):
                next_state = "booking_datetime_fallback"
                response_override = reply_ask_datetime([])
            elif looks_like_custom_datetime(user_message):
                booking_data.datetime = user_message.strip()
                booking_data.slot_row_index = None
                booking_data.slot_source = "manual"
                next_state = "booking_name"
                response_override = reply_ask_name()
            else:
                next_state = "booking_slot_selection"
                response_override = reply_offer_slots(slot_options)

        # ── BOOKING STEP 2B: SLOT SELECTION CLARIFICATION ──────────────────
        elif state == "booking_slot_selection":
            if detect_intent(user_message) == "faq" and "?" in user_message:
                next_state = "booking_slot_selection"
                system_prompt = build_faq_prompt(clinic, user_message)
                response_override = None
                raise StopIteration

            selected = match_slot_choice(user_message, slot_options)
            if selected:
                booking_data.datetime = selected["label"]
                booking_data.slot_row_index = selected["row_index"]
                booking_data.slot_source = "availability"
                next_state = "booking_name"
                response_override = reply_ask_name()
            elif wants_manual_time(user_message) or looks_like_custom_datetime(user_message):
                booking_data.datetime = user_message.strip()
                booking_data.slot_row_index = None
                booking_data.slot_source = "manual"
                next_state = "booking_name"
                response_override = reply_ask_name()
            else:
                next_state = "booking_slot_selection"
                response_override = reply_offer_slots(slot_options)

        # ── BOOKING STEP 2C: MANUAL DATE / TIME FALLBACK ────────────────────
        elif state in ("booking_datetime", "booking_datetime_fallback"):
            if detect_intent(user_message) == "faq" and "?" in user_message:
                next_state = "booking_datetime_fallback"
                system_prompt = build_faq_prompt(clinic, user_message)
                response_override = None
                raise StopIteration
            booking_data.datetime = user_message.strip()
            # Check if the user selected a specific offered slot
            matched = find_matching_slot(user_message, available_slots)
            if matched is not None:
                booking_data.slot_row_index = matched
                booking_data.slot_source = "availability"
            else:
                booking_data.slot_row_index = None
                booking_data.slot_source = "manual"
            if booking_data.correction_mode and booking_data.correction_field == "datetime":
                booking_data.correction_mode = False
                booking_data.correction_field = ""
                next_state = "booking_confirm"
                system_prompt = build_confirmation_prompt(clinic, booking_data)
                response_override = reply_confirmation(booking_data)
            else:
                next_state = "booking_name"
                system_prompt = build_collect_name_prompt(clinic, booking_data)
                response_override = reply_ask_name()

        # ── BOOKING STEP 3: PATIENT NAME ─────────────────────────────────────
        elif state == "booking_name":
            if detect_intent(user_message) == "faq" and "?" in user_message:
                next_state = "booking_name"
                system_prompt = build_faq_prompt(clinic, user_message)
                response_override = None
                raise StopIteration
            booking_data.name = extract_name(user_message)
            if booking_data.correction_mode and booking_data.correction_field == "name":
                booking_data.correction_mode = False
                booking_data.correction_field = ""
                next_state = "booking_confirm"
                system_prompt = build_confirmation_prompt(clinic, booking_data)
                response_override = reply_confirmation(booking_data)
            else:
                next_state = "booking_phone"
                system_prompt = build_collect_phone_prompt(clinic, booking_data)
                response_override = reply_ask_phone(booking_data.name)

        # ── BOOKING STEP 4: PHONE NUMBER ─────────────────────────────────────
        elif state == "booking_phone":
            if detect_intent(user_message) == "faq" and "?" in user_message:
                next_state = "booking_phone"
                system_prompt = build_faq_prompt(clinic, user_message)
                response_override = None
                raise StopIteration
            booking_data.phone = extract_phone(user_message)
            if booking_data.correction_mode and booking_data.correction_field == "phone":
                booking_data.correction_mode = False
                booking_data.correction_field = ""
                next_state = "booking_confirm"
                system_prompt = build_confirmation_prompt(clinic, booking_data)
                response_override = reply_confirmation(booking_data)
            else:
                next_state = "booking_email"
                system_prompt = build_collect_email_prompt(clinic, booking_data)
                response_override = reply_ask_email()

        # ── BOOKING STEP 5: EMAIL (OPTIONAL) ─────────────────────────────────
        elif state == "booking_email":
            if detect_intent(user_message) == "faq" and "?" in user_message:
                next_state = "booking_email"
                system_prompt = build_faq_prompt(clinic, user_message)
                response_override = None
                raise StopIteration
            if "@" not in user_message and any(p in user_message.lower() for p in EMAIL_SKIP_PHRASES):
                booking_data.email = ""
            else:
                booking_data.email = extract_email(user_message)
            booking_data.correction_mode = False
            booking_data.correction_field = ""
            next_state = "booking_confirm"
            system_prompt = build_confirmation_prompt(clinic, booking_data)
            response_override = reply_confirmation(booking_data)

        # ── BOOKING STEP 6: CONFIRMATION ─────────────────────────────────────
        elif state == "booking_confirm":
            if is_confirmation(user_message):
                # Patient confirmed — save the lead
                intake_data = {
                    "patient_name": booking_data.name,
                    "patient_phone": booking_data.phone,
                    "patient_email": booking_data.email,
                    "reason_for_visit": booking_data.reason,
                    "preferred_datetime_text": booking_data.datetime,
                    "slot_row_index": booking_data.slot_row_index,
                    "slot_source": booking_data.slot_source,
                    "source": "web_chat",
                    "notes": "Selected from availability" if booking_data.slot_source == "availability" else "Manual preferred time",
                }
                lead = create_lead(clinic_id, intake_data)
                lead_created = True
                lead_id = lead["id"]
                next_state = "booking_complete"

                # Reserve the Google Sheet slot synchronously if applicable
                if booking_data.slot_row_index and clinic.get("availability_enabled"):
                    try:
                        from app.services.google_sheets import reserve_slot_in_sheet
                        reserve_slot_in_sheet(
                            clinic.get("google_sheet_id"),
                            clinic.get("availability_sheet_tab") or "Availability",
                            int(booking_data.slot_row_index),
                            booking_data.name,
                            lead_id,
                        )
                    except Exception as e:
                        logger.error(f"Slot reservation error: {e}")

                # Link lead to conversation
                db.table("conversations").update(
                    {"lead_id": lead_id}
                ).eq("id", conversation_id).execute()

                system_prompt = build_completion_prompt(clinic, booking_data)
                response_override = reply_completion(clinic, booking_data)
                logger.info(f"Lead created from chat: {lead_id} (session {session_id[:8]})")

            elif is_denial(user_message):
                # Patient wants to change something
                field = detect_field_to_change(user_message)
                if field:
                    # If user already provided corrected value in this message, apply it directly.
                    candidate = extract_corrected_value(field, user_message)
                    if field == "datetime" and len(candidate) > 3 and candidate.lower() not in ["date", "time", "datetime"]:
                        booking_data.datetime = candidate
                        booking_data.slot_row_index = None
                        booking_data.slot_source = "manual"
                        next_state = "booking_confirm"
                        system_prompt = build_confirmation_prompt(clinic, booking_data)
                        response_override = reply_confirmation(booking_data)
                    elif field == "reason" and len(candidate) > 3 and candidate.lower() not in ["reason", "visit"]:
                        booking_data.reason = candidate
                        next_state = "booking_confirm"
                        system_prompt = build_confirmation_prompt(clinic, booking_data)
                        response_override = reply_confirmation(booking_data)
                    elif field == "phone" and any(ch.isdigit() for ch in candidate):
                        booking_data.phone = extract_phone(candidate)
                        next_state = "booking_confirm"
                        system_prompt = build_confirmation_prompt(clinic, booking_data)
                        response_override = reply_confirmation(booking_data)
                    elif field == "email" and "@" in candidate:
                        booking_data.email = extract_email(candidate)
                        next_state = "booking_confirm"
                        system_prompt = build_confirmation_prompt(clinic, booking_data)
                        response_override = reply_confirmation(booking_data)
                    elif field == "name" and len(candidate) > 2:
                        booking_data.name = extract_name(candidate)
                        next_state = "booking_confirm"
                        system_prompt = build_confirmation_prompt(clinic, booking_data)
                        response_override = reply_confirmation(booking_data)
                    else:
                        booking_data.correction_mode = True
                        booking_data.correction_field = field
                        next_state = f"booking_{field}"
                        reply_map = {
                            "reason": reply_ask_reason(),
                            "datetime": reply_ask_datetime([]),
                            "name": reply_ask_name(),
                            "phone": reply_ask_phone(booking_data.name),
                            "email": reply_ask_email(),
                        }
                        response_override = reply_map[field]
                else:
                    # Not sure what to change — list the options
                    next_state = "booking_confirm"
                    system_prompt = build_confirm_restart_prompt(clinic, booking_data)
                    response_override = reply_confirm_restart()

            else:
                # Ambiguous — show confirmation again
                next_state = "booking_confirm"
                system_prompt = build_confirmation_prompt(clinic, booking_data)
                response_override = reply_confirmation(booking_data)

        # ── BOOKING COMPLETE ─────────────────────────────────────────────────
        elif state == "booking_complete":
            intent = detect_intent(user_message)
            if intent == "booking":
                # Start a fresh booking
                booking_data = BookingData()
                next_state = "booking_reason"
                system_prompt = build_booking_start_prompt(clinic, available_slots)
                response_override = reply_booking_start()
            else:
                next_state = "booking_complete"
                system_prompt = build_faq_prompt(clinic, user_message)

        # ── UNKNOWN STATE → FALLBACK ──────────────────────────────────────────
        else:
            next_state = "fallback"
            system_prompt = build_fallback_prompt(clinic)
            response_override = reply_fallback(clinic)

    except StopIteration:
        # Controlled short-circuit when answering FAQ during booking flow.
        pass

    except Exception as e:
        logger.error(f"State machine error for session {session_id}: {e}")
        next_state = "fallback"
        system_prompt = build_fallback_prompt(clinic)
        response_override = reply_fallback(clinic)

    # ── Generate AI response ─────────────────────────────────────────────────
    if response_override is not None:
        ai_reply = response_override
    else:
        try:
            ai_reply = await ai.generate_response(system_prompt, messages)
        except Exception as e:
            logger.error(f"OpenAI error: {e}")
            ai_reply = clinic.get(
                "fallback_message",
                "I apologize for the inconvenience. Please call the clinic directly for assistance.",
            )

    # ── Persist updated state ────────────────────────────────────────────────
    save_state(db, conversation_id, next_state, booking_data)

    # ── Save assistant message ───────────────────────────────────────────────
    db.table("conversation_messages").insert({
        "conversation_id": conversation_id,
        "role": "assistant",
        "content": ai_reply,
    }).execute()

    logger.info(
        f"Session {session_id[:8]} | {state} → {next_state} | "
        f"Lead: {lead_id or 'none'}"
    )

    return {
        "reply": ai_reply,
        "session_id": session_id,
        "intent": next_state,
        "lead_created": lead_created,
        "lead_id": lead_id,
    }
