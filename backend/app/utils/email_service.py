import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.config.settings import settings
import logging

logger = logging.getLogger(__name__)

class EmailService:
    @staticmethod
    async def send_password_reset_email(to_email: str, reset_token: str) -> bool:
        """Send password reset email to user"""
        try:
            reset_link = f"{settings.FRONTEND_URL}/views/reset-password.html?token={reset_token}"
            
            # Create email content
            subject = "Reset Your NannyLink Password"
            
            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body {{
                        font-family: 'Inter', Arial, sans-serif;
                        background-color: #f8f9fa;
                        margin: 0;
                        padding: 0;
                    }}
                    .container {{
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 40px 20px;
                    }}
                    .card {{
                        background: white;
                        border-radius: 24px;
                        padding: 40px;
                        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
                        border: 1px solid #e2e8f0;
                    }}
                    .logo {{
                        text-align: center;
                        margin-bottom: 32px;
                    }}
                    .logo h1 {{
                        font-family: 'Manrope', sans-serif;
                        font-size: 28px;
                        font-weight: 800;
                        color: #00152f;
                        margin: 0;
                    }}
                    .logo p {{
                        font-size: 12px;
                        color: #835500;
                        text-transform: uppercase;
                        letter-spacing: 2px;
                        margin: 4px 0 0;
                    }}
                    h2 {{
                        color: #00152f;
                        font-size: 24px;
                        margin-bottom: 16px;
                        font-family: 'Manrope', sans-serif;
                    }}
                    .button {{
                        display: inline-block;
                        background-color: #00152f;
                        color: white;
                        text-decoration: none;
                        padding: 14px 32px;
                        border-radius: 12px;
                        font-weight: 600;
                        margin: 24px 0;
                        transition: background 0.3s;
                    }}
                    .button:hover {{
                        background-color: #0f2a4a;
                    }}
                    .footer {{
                        text-align: center;
                        font-size: 12px;
                        color: #94a3b8;
                        margin-top: 32px;
                        padding-top: 24px;
                        border-top: 1px solid #e2e8f0;
                    }}
                    .warning {{
                        background-color: #fef3c7;
                        border-left: 4px solid #f59e0b;
                        padding: 12px 16px;
                        font-size: 13px;
                        color: #92400e;
                        margin: 20px 0;
                        border-radius: 8px;
                    }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="card">
                        <div class="logo">
                            <h1>NannyLink Kenya</h1>
                            <p>Premium Care Network</p>
                        </div>
                        
                        <h2>Reset Your Password</h2>
                        
                        <p style="color: #4b5563; line-height: 1.6;">
                            We received a request to reset the password for your NannyLink account.
                            Click the button below to create a new password.
                        </p>
                        
                        <div style="text-align: center;">
                            <a href="{reset_link}" class="button" style="color: white;">Reset Password</a>
                        </div>
                        
                        <p style="color: #4b5563; font-size: 14px;">
                            Or copy this link into your browser:<br>
                            <span style="color: #835500; word-break: break-all;">{reset_link}</span>
                        </p>
                        
                        <div class="warning">
                            <strong>⚠️ This link expires in 30 minutes</strong><br>
                            If you didn't request this, please ignore this email.
                        </div>
                        
                        <div class="footer">
                            <p>NannyLink Kenya - Connecting Families with Trusted Caregivers</p>
                            <p>&copy; 2024 NannyLink Kenya. All rights reserved.</p>
                        </div>
                    </div>
                </div>
            </body>
            </html>
            """
            
            text_content = f"""
            Reset Your NannyLink Password
            
            We received a request to reset your password. Click the link below to create a new password:
            
            {reset_link}
            
            This link expires in 30 minutes.
            
            If you didn't request this, please ignore this email.
            
            ---
            NannyLink Kenya - Connecting Families with Trusted Caregivers
            """
            
            # Create message
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"NannyLink Kenya <{settings.EMAIL_USERNAME}>"
            msg["To"] = to_email
            
            # Attach both plain text and HTML versions
            part1 = MIMEText(text_content, "plain")
            part2 = MIMEText(html_content, "html")
            msg.attach(part1)
            msg.attach(part2)
            
            # Send email
            with smtplib.SMTP(settings.EMAIL_HOST, settings.EMAIL_PORT) as server:
                server.starttls()
                server.login(settings.EMAIL_USERNAME, settings.EMAIL_PASSWORD)
                server.send_message(msg)
            
            logger.info(f"Password reset email sent to {to_email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {str(e)}")
            return False