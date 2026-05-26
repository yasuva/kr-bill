import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    """KR Store POS Backend Configuration Class"""
    SECRET_KEY = os.getenv("SECRET_KEY", "kr-store-super-secret-key-2026")
    JWT_SECRET = os.getenv("JWT_SECRET", "kr-store-jwt-secure-secret-key-2026")
    
    # Cloudinary Configs
    CLOUDINARY_CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME", "")
    CLOUDINARY_API_KEY = os.getenv("CLOUDINARY_API_KEY", "")
    CLOUDINARY_API_SECRET = os.getenv("CLOUDINARY_API_SECRET", "")
    
    # Firebase Credential Configs
    FIREBASE_CREDENTIAL_PATH = os.getenv("FIREBASE_CREDENTIAL_PATH", "")
    # Support direct Firebase secrets JSON injection in env vars
    FIREBASE_CONFIG_JSON = os.getenv("FIREBASE_CONFIG_JSON", "")
