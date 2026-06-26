"""Password hashing (bcrypt), JWT tokens (PyJWT), and secret encryption (Fernet)."""

import base64
import hashlib
import os
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from cryptography.fernet import Fernet, InvalidToken

JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-in-production")
JWT_ALGORITHM = "HS256"
TOKEN_TTL_DAYS = 7

# Used to encrypt customer Stripe keys at rest. Kept separate from JWT_SECRET on
# purpose: a JWT-secret leak must not also expose stored Stripe credentials.
ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY", "dev-secret-change-in-production")


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


# ---------- secret encryption (for customer Stripe keys at rest) ----------
def _fernet() -> Fernet:
    """A Fernet built from ENCRYPTION_KEY. Any passphrase works: we hash it to the
    32-byte url-safe key Fernet requires, so the operator sets a plain string in .env."""
    digest = hashlib.sha256(ENCRYPTION_KEY.encode("utf-8")).digest()
    return Fernet(base64.urlsafe_b64encode(digest))


def encrypt_secret(plaintext: str) -> str:
    """Encrypt a sensitive string (e.g. a Stripe restricted key) for DB storage."""
    return _fernet().encrypt(plaintext.encode("utf-8")).decode("utf-8")


def decrypt_secret(token: str) -> str:
    """Reverse of encrypt_secret. Raises ValueError if the ciphertext or key is wrong."""
    try:
        return _fernet().decrypt(token.encode("utf-8")).decode("utf-8")
    except InvalidToken as exc:
        raise ValueError("Could not decrypt secret (wrong ENCRYPTION_KEY?)") from exc
