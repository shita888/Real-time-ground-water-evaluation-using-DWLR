# backend/services/email_service.py
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Tuple, Optional
from dotenv import load_dotenv

# Ensure dotenv is loaded from backend/.env if available
_backend_dir = os.path.dirname(os.path.dirname(__file__))
_dotenv_path = os.path.join(_backend_dir, ".env")
if os.path.exists(_dotenv_path):
    load_dotenv(_dotenv_path)


def get_subscription_email_content(name: str, email: str, channel: str = "both") -> Tuple[str, str, str]:
    """
    Returns (subject, plain_text, html) for the JalDrishti subscription confirmation email.
    """
    subject = "💧 Welcome to JalDrishti — Groundwater Alert Subscription Confirmed"

    channel_display = {
        "email": "Email Notifications",
        "sms": "SMS Notifications",
        "both": "Email & SMS Notifications",
    }.get(channel, "Email Notifications")

    plain_text = f"""Hello {name},

Congratulations! You have successfully subscribed to the JalDrishti Groundwater Monitoring & Alert System.

Your Subscription Details:
------------------------------------------
• Subscriber Name: {name}
• Registered Email: {email}
• Notification Channel: {channel_display}
• Network Coverage: 55 Districts, 2,453 DWLR Telemetry Stations across Madhya Pradesh
• Status: Active

What to Expect:
------------------------------------------
JalDrishti continuously analyzes time-series telemetry from Digital Water Level Recorders (DWLR) and runs LSTM AI models to forecast groundwater trends.
You will receive instant alerts when:
- Critical depletion exceeds the 20 m bgl (meters below ground level) threshold.
- Rapid unseasonal depletion is detected in your district.
- Significant seasonal recharge trends are observed.

Groundwater Monitoring Reference Thresholds:
• 🟢 Safe Level: < 5.0 m bgl (Normal seasonal recharge)
• 🟡 Semi-Critical: 5.0 m to 10.0 m bgl (Monitored for accelerating depletion)
• 🔴 Critical / Over-Exploited: > 20.0 m bgl (Urgent advisory issued)

You can explore live station telemetry, district trends, and AI forecasts anytime at:
http://localhost:5173/dashboard

Thank you for partnering with us to preserve our precious groundwater resources.

Warm regards,
Team JalDrishti
Groundwater Resources Evaluation & DWLR Forecasting
Smart India Hackathon (SIH 2025) • Ministry of Jal Shakti
"""

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>JalDrishti Alert Subscription Confirmed</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f0f7ff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f0f7ff; padding: 30px 12px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px rgba(10, 61, 98, 0.12); border: 1px solid #bfdbfe;" cellspacing="0" cellpadding="0" border="0">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #0A3D62 0%, #0284c7 100%); padding: 36px 28px; text-align: center; color: #ffffff;">
              <div style="font-size: 40px; line-height: 1; margin-bottom: 8px;">💧</div>
              <h1 style="margin: 0 0 6px 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff;">JalDrishti</h1>
              <p style="margin: 0; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; color: #bae6fd;">
                Groundwater Telemetry &amp; Alert Network
              </p>
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td style="padding: 32px 28px;">
              <h2 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 700; color: #0A3D62;">
                Subscription Confirmed! 🎉
              </h2>
              <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.6; color: #334155;">
                Hello <strong>{name}</strong>,<br />
                You have successfully subscribed to real-time groundwater alerts from the <strong>JalDrishti</strong> network. You will now receive notifications whenever DWLR telemetry stations report critical depletion or unseasonal water table shifts.
              </p>

              <!-- Subscription Details Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: #f8fafc; border-radius: 14px; border: 1px solid #e2e8f0; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 18px 20px;">
                    <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #0284c7; margin-bottom: 12px;">
                      📋 Registered Details
                    </div>
                    <table width="100%" cellspacing="0" cellpadding="5" border="0" style="font-size: 14px; color: #334155;">
                      <tr>
                        <td width="38%" style="color: #64748b; font-weight: 500;">Subscriber Name:</td>
                        <td style="font-weight: 600; color: #0f172a;">{name}</td>
                      </tr>
                      <tr>
                        <td style="color: #64748b; font-weight: 500;">Registered Email:</td>
                        <td style="font-weight: 600; color: #0284c7;">{email}</td>
                      </tr>
                      <tr>
                        <td style="color: #64748b; font-weight: 500;">Alert Channel:</td>
                        <td style="font-weight: 600; color: #0f172a;">{channel_display}</td>
                      </tr>
                      <tr>
                        <td style="color: #64748b; font-weight: 500;">Network Scope:</td>
                        <td style="font-weight: 600; color: #0f172a;">55 Districts • 2,453 DWLR Stations</td>
                      </tr>
                      <tr>
                        <td style="color: #64748b; font-weight: 500;">Status:</td>
                        <td><span style="display: inline-block; background-color: #dcfce7; color: #15803d; font-size: 12px; font-weight: 700; padding: 2px 10px; border-radius: 12px;">● ACTIVE</span></td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Alert Thresholds -->
              <h3 style="margin: 0 0 10px 0; font-size: 15px; font-weight: 700; color: #0f172a;">
                🚨 Standard Monitoring Thresholds:
              </h3>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 24px;">
                <tr>
                  <td style="padding: 10px 14px; background: #ecfdf5; border-left: 4px solid #10b981; border-radius: 6px; font-size: 13px; color: #065f46;">
                    <strong>Safe Level (&lt; 5 m bgl):</strong> Normal seasonal recharge balance.
                  </td>
                </tr>
                <tr><td style="height: 6px;"></td></tr>
                <tr>
                  <td style="padding: 10px 14px; background: #fefce8; border-left: 4px solid #eab308; border-radius: 6px; font-size: 13px; color: #854d0e;">
                    <strong>Semi-Critical (5 m – 10 m bgl):</strong> Monitored for accelerating depletion trends.
                  </td>
                </tr>
                <tr><td style="height: 6px;"></td></tr>
                <tr>
                  <td style="padding: 10px 14px; background: #fef2f2; border-left: 4px solid #ef4444; border-radius: 6px; font-size: 13px; color: #991b1b;">
                    <strong>Critical Level (&gt; 20 m bgl):</strong> Urgent depletion advisory dispatched immediately.
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top: 10px; margin-bottom: 22px;">
                <tr>
                  <td align="center">
                    <a href="http://localhost:5173/dashboard" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700; padding: 13px 28px; border-radius: 12px; box-shadow: 0 4px 12px rgba(2, 132, 199, 0.3);">
                      Open Live Telemetry Dashboard →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #64748b; text-align: center;">
                Need to update your preferences or unsubscribe? You can manage your alert settings at any time on the JalDrishti platform.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f1f5f9; padding: 20px 28px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 4px 0; font-size: 12px; font-weight: 600; color: #475569;">
                JalDrishti — Real-time Groundwater Evaluation &amp; Forecasting
              </p>
              <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                Smart India Hackathon (SIH 2025) • Ministry of Jal Shakti Initiative
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""
    return subject, plain_text, html


def send_alert_email(to: str, subject: str, plain_text: str, html: Optional[str] = None) -> Tuple[bool, str]:
    """
    Send an email to 'to' with given subject and plain_text (and optional html).
    Supports:
      1. SendGrid API (via SENDGRID_API_KEY)
      2. SMTP Server (Gmail, Outlook, Yahoo, AWS SES, or custom SMTP)
         Supports port 587 (STARTTLS) and port 465 (SSL)
    Returns (success: bool, response: str)
    """
    # Dynamic env fetch so any changes in backend/.env are immediately applied
    sendgrid_key = os.getenv("SENDGRID_API_KEY")
    smtp_host = os.getenv("SMTP_HOST")
    smtp_port_raw = os.getenv("SMTP_PORT", "587")
    try:
        smtp_port = int(smtp_port_raw)
    except ValueError:
        smtp_port = 587

    smtp_user = os.getenv("SMTP_USER")
    smtp_pass = os.getenv("SMTP_PASS")
    email_from = os.getenv("EMAIL_FROM") or (smtp_user if smtp_user else "alerts@jaldrishti.gov.in")

    print(f"📧 [EmailService] send_alert_email called for: '{to}' | Subject: '{subject}'")

    # ---- 1. Try SendGrid if API key is provided ----
    if sendgrid_key:
        try:
            print("📧 [EmailService] Using SendGrid API...")
            from sendgrid import SendGridAPIClient
            from sendgrid.helpers.mail import Mail

            message = Mail(
                from_email=email_from,
                to_emails=to,
                subject=subject,
                plain_text_content=plain_text,
                html_content=html or f"<pre>{plain_text}</pre>",
            )
            sg = SendGridAPIClient(sendgrid_key)
            response = sg.send(message)
            print(f"✅ [EmailService] SendGrid delivered with status {response.status_code}")
            return True, f"SendGrid status {response.status_code}"
        except Exception as e:
            print(f"⚠️ [EmailService] SendGrid failed: {e}")
            if not (smtp_host and smtp_user and smtp_pass):
                return False, f"SendGrid error: {e}"

    # ---- 2. Try SMTP if host, user, and password are provided ----
    if smtp_host and smtp_user and smtp_pass:
        try:
            print(f"📧 [EmailService] Connecting to SMTP server {smtp_host}:{smtp_port} as {smtp_user}...")
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = email_from
            msg["To"] = to

            part1 = MIMEText(plain_text, "plain", "utf-8")
            msg.attach(part1)
            if html:
                part2 = MIMEText(html, "html", "utf-8")
                msg.attach(part2)

            # SSL mode for port 465
            if smtp_port == 465:
                with smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=15) as server:
                    server.login(smtp_user, smtp_pass)
                    server.sendmail(email_from, [to], msg.as_string())
            else:
                # STARTTLS mode for port 587 (standard for Gmail, Outlook, AWS SES)
                with smtplib.SMTP(smtp_host, smtp_port, timeout=15) as server:
                    server.ehlo()
                    server.starttls()
                    server.ehlo()
                    server.login(smtp_user, smtp_pass)
                    server.sendmail(email_from, [to], msg.as_string())

            print(f"✅ [EmailService] SMTP email successfully sent to {to}!")
            return True, "SMTP send success"
        except Exception as e:
            err_str = str(e)
            print(f"❌ [EmailService] SMTP error sending to {to}: {err_str}")
            return False, f"SMTP error: {err_str}"

    # ---- 3. No email provider configured in .env ----
    print("ℹ️ [EmailService] No email provider configured in backend/.env (set SMTP_HOST/SMTP_USER/SMTP_PASS or SENDGRID_API_KEY)")
    return False, "No email provider configured in backend/.env"
