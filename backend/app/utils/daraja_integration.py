import requests
import os
import base64
import json
from datetime import datetime
from loguru import logger
from dotenv import load_dotenv
load_dotenv()
from uuid import UUID

CONSUMER_KEY = os.getenv("DARAJA_LIVE_CONSUMER_KEY")
CONSUMER_SECRET = os.getenv("DARAJA_LIVE_CONSUMER_SECRET")
URL = os.getenv("DARAJA_LIVE_BASE_URL") 
SHORT_CODE = os.getenv("DARAJA_LIVE_SHORT_CODE")  
PASSKEY = os.getenv("DARAJA_LIVE_PASSKEY") 
TILL = os.getenv("DARAJA_TILL_NO")

def validate_phone_number(phone_number: str) -> str:
    """
    Validates and formats phone number to Kenyan format (254...).
    """
    phone = phone_number.replace(" ", "").replace("-", "").replace("+", "")
    
    if phone.startswith("0"):
        phone = "254" + phone[1:]
    elif phone.startswith("7") or phone.startswith("1"): 
        phone = "254" + phone
    elif not phone.startswith("254"):
        raise ValueError("Invalid phone number format. Must start with 0, 7, 1 or 254.")
    
    if len(phone) != 12:
        raise ValueError("Phone number should be 12 digits in 254XXXXXXXXX format.")
    
    return phone

def generate_timestamp():
    """
    Generates a timestamp in the format YYYYMMDDHHMMSS.
    """
    return datetime.now().strftime("%Y%m%d%H%M%S")

def generate_password():
    """
    Generates a password for the STK push request.
    The password is a base64 encoded string of the short code, passkey, and timestamp.
    """
    timestamp = generate_timestamp()
    password_string = f"{SHORT_CODE}{PASSKEY}{timestamp}"
    return base64.b64encode(password_string.encode()).decode(), timestamp

def generate_access_token():
    """
    Generates access token for Daraja API.
    """
    api_url = f"{URL}/oauth/v1/generate?grant_type=client_credentials"
    
    try:
        if not CONSUMER_KEY or not CONSUMER_SECRET:
            # Using logger for consistency
            logger.error("DARAJA_CONSUMER_KEY and DARAJA_CONSUMER_SECRET environment variables must be set.")
            raise Exception("DARAJA_CONSUMER_KEY and DARAJA_CONSUMER_SECRET environment variables must be set.")
        
        encoded_credentials = base64.b64encode(f"{CONSUMER_KEY}:{CONSUMER_SECRET}".encode()).decode()
        
        headers = {
            "Authorization": f"Basic {encoded_credentials}", 
            "Content-Type": "application/json"
        }
        
        logger.info(f"Attempting to generate access token from URL: {api_url}")
        logger.debug(f"Authorization Header: Basic {encoded_credentials[:10]}...") 
        
        response = requests.get(api_url, headers=headers)
        response.raise_for_status()
        response_data = response.json()
        if "access_token" in response_data:
            logger.info("Access token generated successfully.")
            return response_data["access_token"]
        else:
            logger.error(f"Failed to get access token: 'access_token' not in response. Response: {json.dumps(response_data, indent=2)}")
            raise Exception("Failed to get access token: " + json.dumps(response_data))
        
    except requests.exceptions.HTTPError as http_err:
        error_message = f"HTTP error generating access token: {http_err}. Response: {http_err.response.text}"
        logger.error(error_message)
        raise Exception(error_message)
    except requests.exceptions.RequestException as req_err:
        error_message = f"Network error generating access token: {req_err}"
        logger.error(error_message)
        raise Exception(error_message)
    except Exception as e:
        error_message = f"Unexpected error generating access token: {e}"
        logger.error(error_message)
        raise Exception(error_message)


def sendStkPush(phone_number: str, amount: float, match_id: UUID, callback_url: str, ):
    """
    Sends an STK push request to the Daraja API.
    """
    try:
        if not phone_number or not amount or not callback_url:
            raise ValueError("Phone number, amount, and callback URL are required.")
        
        if amount <= 0:
            raise ValueError("Amount must be greater than 0.")
        
        formatted_phone = validate_phone_number(phone_number)
        password, timestamp = generate_password()
        
        api_url = f"{URL}/mpesa/stkpush/v1/processrequest"
        access_token = generate_access_token()
        
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
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
            "AccountReference": f"NANNYLINK KENYA:",
            "TransactionDesc": f"Payment for order NO:{match_id}"
        }
        
        logger.info(f"STK Push Payload: {json.dumps(payload, indent=2)}") 
        
        response = requests.post(api_url, headers=headers, json=payload)
        response.raise_for_status() 
        
        response_json = response.json()
        logger.info(f"STK Push Raw Response: {json.dumps(response_json, indent=2)}")
        
        return response_json
    
    except requests.exceptions.RequestException as e:
        error_detail = response.text if 'response' in locals() else str(e)
        logger.error(f"STK Push network/HTTP error: {e}. Response: {error_detail}")
        try:
            error_json = json.loads(error_detail)
            if "errorMessage" in error_json:
                raise Exception(f"STK Push failed: {error_json.get('errorMessage')}")
            else:
                raise Exception(f"STK Push failed with status {response.status_code}: {error_detail}")
        except json.JSONDecodeError:
             raise Exception(f"STK Push failed with status {response.status_code}: {error_detail}")
    except ValueError as e:
        logger.error(f"Validation error in STK Push: {e}")
        raise Exception(f"Validation error: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error in sendStkPush: {e}")
        raise Exception(f"STK Push error: {str(e)}")