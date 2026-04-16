import httpx
import os
import base64
import json
from datetime import datetime
from loguru import logger
from dotenv import load_dotenv
from uuid import UUID
from urllib.parse import urlparse, urlunparse

load_dotenv()

# Use generic names or ensure these match your .env exactly
CONSUMER_KEY = os.getenv("DARAJA_LIVE_CONSUMER_KEY")
CONSUMER_SECRET = os.getenv("DARAJA_LIVE_CONSUMER_SECRET")
URL = os.getenv("DARAJA_LIVE_BASE_URL", "").rstrip("/")
SHORT_CODE = os.getenv("DARAJA_LIVE_SHORT_CODE")
PASSKEY = os.getenv("DARAJA_LIVE_PASSKEY")
TILL = os.getenv("DARAJA_TILL_NO") # Only used if TransactionType is BuyGoods

def validate_phone_number(phone_number: str) -> str:
    phone = phone_number.replace(" ", "").replace("-", "").replace("+", "")
    if phone.startswith("0"):
        phone = "254" + phone[1:]
    elif phone.startswith("7") or phone.startswith("1"):
        phone = "254" + phone
    if not phone.startswith("254") or len(phone) != 12:
        raise ValueError("Invalid phone format. Use 2547XXXXXXXX.")
    return phone

def generate_timestamp() -> str:
    return datetime.now().strftime("%Y%m%d%H%M%S")

def generate_password() -> tuple[str, str]:
    timestamp = generate_timestamp()
    # Password = Base64(ShortCode + Passkey + Timestamp)
    raw = f"{SHORT_CODE}{PASSKEY}{timestamp}"
    return base64.b64encode(raw.encode()).decode(), timestamp

async def generate_access_token() -> str:
    if not CONSUMER_KEY or not CONSUMER_SECRET:
        raise Exception("Daraja API Keys are missing in .env")

    api_url = f"{URL}/oauth/v1/generate?grant_type=client_credentials"
    encoded = base64.b64encode(f"{CONSUMER_KEY}:{CONSUMER_SECRET}".encode()).decode()
    headers = {"Authorization": f"Basic {encoded}"}

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(api_url, headers=headers)
        if resp.status_code != 200:
            logger.error(f"Auth Failed: {resp.text}")
            raise Exception("Failed to generate Daraja access token.")
        return resp.json()["access_token"]

async def sendStkPush(
    phone_number: str,
    amount: float,
    match_id: str, # Changed from UUID to str for flexibility
    base_url: str,
) -> dict:
    # 1. Format Callback URL
    parsed = urlparse(base_url.rstrip("/"))
    clean_base = urlunparse((parsed.scheme, parsed.netloc, "", "", "", ""))
    callback_url = f"{clean_base}/payments/callback"
    
    formatted_phone = validate_phone_number(phone_number)
    password, timestamp = generate_password()
    access_token = await generate_access_token()

    # 2. Prepare Payload
    # NOTE: If using a Paybill, TransactionType="CustomerPayBillOnline" and PartyB=SHORT_CODE
    # If using Buy Goods, TransactionType="CustomerBuyGoodsOnline" and PartyB=TILL
    transaction_type = "CustomerBuyGoodsOnline" if TILL else "CustomerPayBillOnline"
    party_b = TILL if TILL else SHORT_CODE

    payload = {
        "BusinessShortCode": SHORT_CODE,
        "Password": password,
        "Timestamp": timestamp,
        "TransactionType": transaction_type,
        "Amount": int(amount),
        "PartyA": formatted_phone,
        "PartyB": party_b,
        "PhoneNumber": formatted_phone,
        "CallBackURL": callback_url,
        "AccountReference": "NannyLink_Batch",
        "TransactionDesc": f"Pay_{match_id[:8]}"
    }

    api_url = f"{URL}/mpesa/stkpush/v1/processrequest"
    headers = {"Authorization": f"Bearer {access_token}"}

    async with httpx.AsyncClient(timeout=30) as client:
        logger.info(f"Triggering STK Push for {formatted_phone} amount {amount}")
        resp = await client.post(api_url, json=payload, headers=headers)
        
    response_json = resp.json()
    
    if resp.status_code != 200:
        logger.error(f"Safaricom rejected request: {response_json}")
        raise Exception(response_json.get("errorMessage", "STK Push Request Failed"))

    return response_json