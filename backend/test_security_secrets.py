"""Self-contained tests for the fail-fast weak-secret guard (app.security.require_strong_secrets).

Run from backend/ with the venv active:  python test_security_secrets.py
No database needed. Verifies the app refuses to boot with unset / default secrets in production,
that ENVIRONMENT=development keeps the local dev fallback working, and that ENVIRONMENT is read
from the environment (defaulting to production) when not passed explicitly.
"""

import os
import sys

sys.path.insert(0, ".")
from app.security import _DEV_DEFAULT, require_strong_secrets  # noqa: E402

STRONG = "a-long-random-production-value-0123456789"

# ---- 1) development bypasses the check entirely (local dev fallback still works) ----
require_strong_secrets(environment="development", jwt_secret=_DEV_DEFAULT, encryption_key=_DEV_DEFAULT)
print("dev bypass: PASS")

# ---- 2) any non-development environment + default/unset/empty secrets must refuse to start ----
for env in ("production", "prod", "staging", ""):
    for jwt, enc in [
        (_DEV_DEFAULT, STRONG),      # JWT still the dev default
        (STRONG, _DEV_DEFAULT),      # ENCRYPTION still the dev default
        (None, STRONG),              # JWT unset
        (STRONG, None),              # ENCRYPTION unset
        ("", STRONG),                # JWT empty
        (_DEV_DEFAULT, _DEV_DEFAULT),  # both default
    ]:
        try:
            require_strong_secrets(environment=env, jwt_secret=jwt, encryption_key=enc)
        except RuntimeError:
            continue
        raise AssertionError(f"expected refusal for env={env!r} jwt={jwt!r} enc={enc!r}")
print("production refuses weak/unset secrets: PASS")

# ---- 3) non-development + strong, distinct secrets boots fine ----
require_strong_secrets(environment="production", jwt_secret=STRONG, encryption_key=STRONG + "-2")
print("production accepts strong secrets: PASS")

# ---- 4) ENVIRONMENT is read from the env and defaults to production when unset ----
os.environ.pop("ENVIRONMENT", None)
try:
    require_strong_secrets(jwt_secret=_DEV_DEFAULT, encryption_key=STRONG)
except RuntimeError:
    pass
else:
    raise AssertionError("unset ENVIRONMENT should default to production and refuse the default JWT_SECRET")

os.environ["ENVIRONMENT"] = "development"
require_strong_secrets(jwt_secret=_DEV_DEFAULT, encryption_key=_DEV_DEFAULT)  # dev bypass via env var
os.environ.pop("ENVIRONMENT", None)
print("ENVIRONMENT env var is honored: PASS")

print("ALL SECURITY-SECRET TESTS PASS")
