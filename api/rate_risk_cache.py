from __future__ import annotations

import hashlib
import json
import time
from typing import Any, Dict, Optional, Tuple


class RateRiskCache:
    TTL: int = 86400  # 24 hours

    def __init__(self) -> None:
        # _store: key -> (payload, timestamp)
        self._store: Dict[str, Tuple[Any, float]] = {}

    def make_key(
        self,
        tranche2_after_tax_apy: Optional[float],
        tranche3_after_tax_apy: Optional[float],
        tranche2_buy_in_months: Optional[int],
        tranche3_buy_in_months: Optional[int],
        user_state: str,
        income_range: str,
    ) -> str:
        raw = json.dumps(
            {
                "t2_apy": None if tranche2_after_tax_apy is None else round(float(tranche2_after_tax_apy), 2),
                "t3_apy": None if tranche3_after_tax_apy is None else round(float(tranche3_after_tax_apy), 2),
                "t2_buy": None if tranche2_buy_in_months is None else int(tranche2_buy_in_months),
                "t3_buy": None if tranche3_buy_in_months is None else int(tranche3_buy_in_months),
                "state": str(user_state),
                "income": str(income_range),
            },
            sort_keys=True,
        )
        return hashlib.sha256(raw.encode()).hexdigest()

    def get(self, key: str) -> Optional[Any]:
        entry = self._store.get(key)
        if entry is None:
            return None
        payload, ts = entry
        if time.time() - ts > self.TTL:
            del self._store[key]
            return None
        return payload

    def set(self, key: str, payload: Any) -> None:
        self._store[key] = (payload, time.time())


rate_risk_cache = RateRiskCache()

