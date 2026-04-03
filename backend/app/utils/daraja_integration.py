import httpx
import os
import base64
import json
from datetime import datetime
from loguru import logger
from dotenv import load_dotenv
from uuid import UUID

load_dotenv()

CONSUMER_KEY = os.getenv("DARAJA_LIVE_CONSUMER_KEY")
CONSUMER_SECRET = os.getenv("DARAJA_LIVE_CONSUMER_SECRET")
URL = os.getenv("DARAJA_LIVE_BASE_URL")
SHORT_CODE = os.getenv("DARAJA_LIVE_SHORT_CODE")
PASSKEY = os.getenv("DARAJA_LIVE_PASSKEY")
TILL = os.getenv("DARAJA_TILL_NO")


def validate_phone_number(phone_number: str) -> str:
    phone = phone_number.replace(" ", "").replace("-", "").replace("+", "")
    if phone.startswith("0"):
        phone = "254" + phone[1:]
    elif phone.startswith("7") or phone.startswith("1"):
        phone = "254" + phone
    elif not phone.startswith("254"):
        raise ValueError("Invalid phone number. Must start with 0, 7, 1 or 254.")
    if len(phone) != 12:
        raise ValueError("Phone number must be 12 digits in 254XXXXXXXXX format.")
    return phone


def generate_timestamp() -> str:
    return datetime.now().strftime("%Y%m%d%H%M%S")


def generate_password() -> tuple[str, str]:
    timestamp = generate_timestamp()
    raw = f"{SHORT_CODE}{PASSKEY}{timestamp}"
    return base64.b64encode(raw.encode()).decode(), timestamp


async def generate_access_token() -> str:
    """Async — fetches Daraja OAuth token."""
    if not CONSUMER_KEY or not CONSUMER_SECRET:
        raise Exception("DARAJA_LIVE_CONSUMER_KEY and DARAJA_LIVE_CONSUMER_SECRET must be set.")

    api_url = f"{URL}/oauth/v1/generate?grant_type=client_credentials"
    encoded = base64.b64encode(f"{CONSUMER_KEY}:{CONSUMER_SECRET}".encode()).decode()
    headers = {
        "Authorization": f"Basic {encoded}",
        "Content-Type": "application/json",
    }

    logger.info(f"Fetching Daraja access token from {api_url}")

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(api_url, headers=headers)

    resp.raise_for_status()
    data = resp.json()

    if "access_token" not in data:
        raise Exception(f"No access_token in response: {data}")

    logger.info("Daraja access token generated successfully.")
    return data["access_token"]


from urllib.parse import urlparse, urlunparse

async def sendStkPush(
    phone_number: str,
    amount: float,
    match_id: UUID,
    base_url: str,
) -> dict:
    if not phone_number or not amount or not base_url:
        raise ValueError("phone_number, amount, and base_url are required.")
    if amount <= 0:
        raise ValueError("Amount must be greater than 0.")

    # FIX: Strip any existing path from BASE_URL before appending /payments/callback
    # Prevents double-path like https://myapp.onrender.com/payments/health/payments/callback
    parsed = urlparse(base_url.rstrip("/"))
    clean_base = urlunparse((parsed.scheme, parsed.netloc, "", "", "", ""))
    callback_url = clean_base + "/payments/callback"
    logger.info(f"Callback URL set to: {callback_url}")

    formatted_phone = validate_phone_number(phone_number)
    password, timestamp = generate_password()
    access_token = await generate_access_token()

    api_url = f"{URL}/mpesa/stkpush/v1/processrequest"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }

    payload = {
        "BusinessShortCode": SHORT_CODE,
        "Password": password,
        "Timestamp": timestamp,
        "TransactionType": "CustomerBuyGoodsOnline",
        "Amount": int(amount),
        "PartyA": formatted_phone,
        "PartyB": TILL,
        "PhoneNumber": formatted_phone,
        "CallBackURL": callback_url,
        "AccountReference": "NANNYLINK",
        "TransactionDesc": f"NannyLink connection fee - match {str(match_id)[:8]}",
    }

    logger.info(f"STK Push payload: {json.dumps({**payload, 'Password': '***'}, indent=2)}")

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(api_url, headers=headers, json=payload)

    try:
        resp.raise_for_status()
    except httpx.HTTPStatusError as e:
        logger.error(f"STK Push HTTP error {resp.status_code}: {resp.text}")
        raise Exception(f"STK Push failed ({resp.status_code}): {resp.text}")

    response_json = resp.json()
    logger.info(f"STK Push response: {json.dumps(response_json, indent=2)}")

    if response_json.get("ResponseCode") != "0":
        err = response_json.get("ResponseDescription", "Unknown error")
        raise Exception(f"STK Push rejected by Safaricom: {err}")

    return response_json
