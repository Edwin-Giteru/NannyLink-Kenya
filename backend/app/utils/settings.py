import os
class Settings:
   EMAIL_HOST: str = os.getenv("EMAIL_HOST", "smtp.gmail.com")
   EMAIL_PORT: int = int(os.getenv("EMAIL_PORT", 587))
   EMAIL_USERNAME: str = os.getenv("EMAIL_USERNAME", "egiteru5@gmail.com")
   EMAIL_PASSWORD: str = os.getenv("EMAIL_PASSWORD", "")
   EMAIL_FROM: str = os.getenv("EMAIL_FROM", "nannylink@nannylink.co.ke")
   FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://127.0.0.1:5500")
settings = Settings()