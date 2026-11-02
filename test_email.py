# test_email.py
from dotenv import load_dotenv
import os
load_dotenv(os.path.join("backend", ".env"))

from backend.services.email_service import send_alert_email

ok, resp = send_alert_email("priyadarshimehak06@gmail.com", "DWLR test", "This is a test email from DWLR")
print("OK:", ok)
print("RESPONSE:", resp)
if not ok:
    print("⚠ Email send failed:", resp)