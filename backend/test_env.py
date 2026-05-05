# test_env.py
import os
from dotenv import load_dotenv

load_dotenv()

print("All environment variables:")
for key, value in os.environ.items():
    if "URL" in key or "PASSWORD" in key or "FRONTEND" in key:
        print(f"{key} = {value}")

print("\nSpecific values:")
print(f"FRONTEND_URL: {os.getenv('FRONTEND_URL')}")
print(f"PASSWORD_RESET_URL: {os.getenv('PASSWORD_RESET_URL')}")