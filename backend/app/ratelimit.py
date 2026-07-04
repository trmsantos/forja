"""A tiny, dependency-free in-memory rate limiter (sliding window) keyed by an arbitrary string
(here: client IP).

Deliberately no new infra: on Vercel's serverless Python runtime each warm instance keeps its own
counters, so this is best-effort — it throttles the common single-source abuse (someone scripting a
leaked-key oracle against /api/audit) without a Redis dependency. If we ever need strict, global
limits we'd back this with Redis, but that's out of scope for the current deployment.
"""

import time


class RateLimiter:
    def __init__(self, max_requests: int, window_seconds: float) -> None:
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._hits: "dict[str, list[float]]" = {}

    def allow(self, key: str, now: "float | None" = None) -> bool:
        """Record a hit for `key` and return True if it's within the budget, False if it exceeds it.

        `now` is injectable (seconds, e.g. time.time()) so the window is testable without sleeping.
        """
        now = time.time() if now is None else now
        cutoff = now - self.window_seconds
        recent = [t for t in self._hits.get(key, []) if t > cutoff]  # drop hits outside the window
        if len(recent) >= self.max_requests:
            self._hits[key] = recent
            return False
        recent.append(now)
        self._hits[key] = recent
        return True
