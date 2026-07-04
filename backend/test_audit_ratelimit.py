"""Self-contained tests for IP rate limiting on the public /api/audit lead magnet.

Run from backend/ with the venv active:  python test_audit_ratelimit.py
Covers the in-memory RateLimiter (sliding window), the client-IP extraction (X-Forwarded-For
first hop, behind Vercel's proxy), and that the audit endpoint returns a friendly 429 once an IP
exceeds its budget — before it ever touches Stripe. No database needed.
"""

import sys

sys.path.insert(0, ".")
from fastapi import HTTPException  # noqa: E402

from app.ratelimit import RateLimiter  # noqa: E402

# ---- 1) sliding-window limiter: N allowed, then blocked, per key ----
rl = RateLimiter(max_requests=5, window_seconds=3600)
for i in range(5):
    assert rl.allow("1.2.3.4", now=1000.0 + i) is True, f"request {i + 1}/5 should be allowed"
assert rl.allow("1.2.3.4", now=1005.0) is False, "the 6th request inside the window must be blocked"

# ---- 2) each key (IP) has its own independent budget ----
assert rl.allow("9.9.9.9", now=1005.0) is True, "a different IP must not be affected by another's usage"

# ---- 3) once the window fully passes, the budget resets ----
assert rl.allow("1.2.3.4", now=1004.0 + 3600 + 1) is True, "budget resets after the window elapses"
print("rate limiter: PASS")

# ---- 4) client IP prefers the first X-Forwarded-For hop (real client behind the proxy) ----
from app.main import _client_ip  # noqa: E402


class _FakeReq:
    def __init__(self, host, xff=None):
        self.headers = {"x-forwarded-for": xff} if xff else {}
        self.client = type("C", (), {"host": host})()


assert _client_ip(_FakeReq("10.0.0.1", xff="203.0.113.9, 10.0.0.1")) == "203.0.113.9", "XFF first hop wins"
assert _client_ip(_FakeReq("198.51.100.2")) == "198.51.100.2", "falls back to request.client.host"
print("client ip: PASS")

# ---- 5) the audit endpoint returns 429 once the IP's budget is spent (before hitting Stripe) ----
import app.main as m  # noqa: E402

IP = "192.0.2.77"
for _ in range(5):
    assert m._audit_limiter.allow(IP) is True
try:
    m.audit(m.AuditIn(api_key="rk_test_dummy_key"), _FakeReq(IP))
except HTTPException as exc:
    assert exc.status_code == 429, f"exhausted IP must get 429, got {exc.status_code}"
    assert exc.detail, "429 should carry a friendly message"
else:
    raise AssertionError("an over-limit audit request must be rejected with 429")
print("audit endpoint 429: PASS")

print("ALL AUDIT-RATELIMIT TESTS PASS")
