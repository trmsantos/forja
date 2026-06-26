"""Password hashing (bcrypt) and JWT tokens (PyJWT)."""

import os
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-in-production")
JWT_ALGORITHM = "HS256"
TOKEN_TTL_DAYS = 7


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        return False


def create_token(user_id: int) -> str:
    """Session token returned at login/registration."""
    payload = {
        "sub": str(user_id),
        "exp": datetime.now(timezone.utc) + timedelta(days=TOKEN_TTL_DAYS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> int:
    payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    return int(payload["sub"])


def create_email_token(user_id: int, purpose: str = "verify", ttl_hours: int = 24) -> str:
    """Single-purpose token embedded in email links (e.g. address verification)."""
    payload = {
        "sub": str(user_id),
        "purpose": purpose,
        "exp": datetime.now(timezone.utc) + timedelta(hours=ttl_hours),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_email_token(token: str, purpose: str = "verify") -> int:
    payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    if payload.get("purpose") != purpose:
        raise ValueError("Wrong token purpose")
    return int(payload["sub"])
