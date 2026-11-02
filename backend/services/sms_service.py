# backend/services/sms_service.py
import os
from twilio.rest import Client
import phonenumbers

TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_FROM_NUMBER = os.getenv("TWILIO_FROM_NUMBER")


def format_number(number: str) -> str:
    """
    Normalize phone number to E.164 format using phonenumbers library.
    Raises ValueError if invalid.
    """
    parsed = phonenumbers.parse(number, None)  # auto-detect country if prefixed with +
    if not phonenumbers.is_possible_number(parsed):
        raise ValueError(f"Invalid phone number: {number}")
    return phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)


def send_sms(to: str, message: str):
    """
    Send an SMS via Twilio.
    Returns (success: bool, response: str)
    """
    if not (TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN and TWILIO_FROM_NUMBER):
        return False, "No Twilio credentials configured"

    try:
        client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        formatted_to = format_number(to)
        msg = client.messages.create(
            body=message,
            from_=TWILIO_FROM_NUMBER,
            to=formatted_to,
        )
        return True, f"Twilio SID {msg.sid}"
    except Exception as e:
        return False, f"Twilio error: {e}"
