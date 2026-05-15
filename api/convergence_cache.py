from __future__ import annotations

import hashlib
import json
import time
from typing import Any, Dict, List, Optional, Set, Tuple


class ConvergenceCache:
    TTL: int = 86400  # 24 hours

    def __init__(self) -> None:
        # _store: key → (payload, timestamp, set_of_product_ids)
        self._store: Dict[str, Tuple[Any, float, Set[str]]] = {}

    def make_key(self, target_maturity_date: str, tranches: List[Dict]) -> str:
        normalized = sorted(
            (t["product_id"], t["buy_in_months"], t["required_term_months"])
            for t in tranches
        )
        raw = json.dumps(
            {"date": target_maturity_date, "tranches": normalized},
            sort_keys=True,
        )
        return hashlib.sha256(raw.encode()).hexdigest()

    def get(self, key: str) -> Optional[Any]:
        entry = self._store.get(key)
        if entry is None:
            return None
        payload, ts, _ = entry
        if time.time() - ts > self.TTL:
            del self._store[key]
            return None
        return payload

    def set(self, key: str, payload: Any, product_ids: Optional[Set[str]] = None) -> None:
        self._store[key] = (payload, time.time(), product_ids or set())

    def invalidate_by_product_ids(self, product_ids: List[str]) -> None:
        target = set(product_ids)
        to_delete = [k for k, (_, _, pids) in self._store.items() if pids & target]
        for k in to_delete:
            del self._store[k]


# Module-level singleton shared across all requests in the process
convergence_cache = ConvergenceCache()
