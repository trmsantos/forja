"""Vercel Blob storage — used for user avatars.

There is no official Python SDK, so we call the Blob HTTP API directly with the standard
library (urllib + certifi), exactly like email.py talks to Resend. BLOB_API_VERSION is the one
value that can drift if Vercel changes the protocol: bump it if uploads start failing with a
version error (the @vercel/blob npm package is the source of truth).

Uploads need BLOB_READ_WRITE_TOKEN, injected by Vercel when a Blob store is connected to the
project. Without it, blob_configured() is False and the avatar endpoints return a friendly 503
instead of crashing.
"""

import json
import os
import ssl
import urllib.error
import urllib.request

# Verify TLS against certifi's CA bundle (macOS python.org builds often lack system CAs),
# mirroring email.py. Falls back to the system store if certifi isn't installed.
try:
    import certifi

    _SSL_CTX: "ssl.SSLContext | None" = ssl.create_default_context(cafile=certifi.where())
except Exception:  # pragma: no cover - certifi is a declared dependency
    _SSL_CTX = ssl.create_default_context()

BLOB_API_URL = os.getenv("VERCEL_BLOB_API_URL", "https://blob.vercel-storage.com")
BLOB_API_VERSION = "12"  # matches @vercel/blob; bump if the API rejects with a version error
_UA = "Forja/1.0 (+https://forja.studio)"


def blob_configured() -> bool:
    """True when a Vercel Blob store is connected (BLOB_READ_WRITE_TOKEN present)."""
    return bool(os.getenv("BLOB_READ_WRITE_TOKEN"))


def _token() -> str:
    token = os.getenv("BLOB_READ_WRITE_TOKEN")
    if not token:
        raise RuntimeError("BLOB_READ_WRITE_TOKEN is not set (connect a Vercel Blob store).")
    return token


def put_blob(pathname: str, data: bytes, content_type: str) -> str:
    """Upload bytes and return the public URL. A random suffix is added so each upload gets a
    unique, cache-safe URL (no stale-CDN problem when a user replaces their photo)."""
    req = urllib.request.Request(
        f"{BLOB_API_URL}/{pathname.lstrip('/')}",
        data=data,
        method="PUT",
        headers={
            "authorization": f"Bearer {_token()}",
            "x-api-version": BLOB_API_VERSION,
            "x-content-type": content_type,
            "x-add-random-suffix": "1",
            "x-vercel-blob-access": "public",
            "User-Agent": _UA,
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=15, context=_SSL_CTX) as resp:
            body = json.loads(resp.read() or b"{}")
            url = body.get("url")
            if not url:
                raise RuntimeError(f"Blob response had no url: {body}")
            return url
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", "replace")
        raise RuntimeError(f"Blob upload failed (HTTP {exc.code}): {detail}") from exc


def delete_blob(url: str) -> None:
    """Best-effort delete of a previously uploaded blob (cleans up a replaced avatar).
    Never raises — a failed cleanup must not break the request that triggered it."""
    if not url or not blob_configured():
        return
    payload = json.dumps({"urls": [url]}).encode("utf-8")
    req = urllib.request.Request(
        f"{BLOB_API_URL}/delete",
        data=payload,
        method="POST",
        headers={
            "authorization": f"Bearer {_token()}",
            "x-api-version": BLOB_API_VERSION,
            "content-type": "application/json",
            "User-Agent": _UA,
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=10, context=_SSL_CTX):
            pass
    except Exception as exc:  # noqa: BLE001 - cleanup is best-effort
        print("[blob] delete failed (ignored):", exc)
