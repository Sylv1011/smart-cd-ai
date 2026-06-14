import time
from typing import Any, Dict, Optional


CACHE_TTL_SECONDS = 24 * 60 * 60


class BulletRateRiskSummaryCache:
    def __init__(self, ttl_seconds: int = CACHE_TTL_SECONDS, time_fn=time.time):
        self.ttl_seconds = ttl_seconds
        self.time_fn = time_fn
        self._store: Dict[str, Dict[str, Any]] = {}

    def get(self, key: str) -> Optional[Dict[str, Any]]:
        entry = self._store.get(key)
        if not entry:
            return None

        if entry["expires_at"] <= self.time_fn():
            self._store.pop(key, None)
            return None

        return entry["value"]

    def set(self, key: str, value: Dict[str, Any]) -> None:
        self._store[key] = {
            "value": value,
            "expires_at": self.time_fn() + self.ttl_seconds,
        }

    def clear(self) -> None:
        self._store.clear()
