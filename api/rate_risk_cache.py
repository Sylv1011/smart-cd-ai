from __future__ import annotations

import hashlib
import json
import time
from decimal import Decimal, InvalidOperation
from typing import Any, Dict, Iterable, Optional, Tuple


class RateRiskCache:
    TTL: int = 86400  # 24 hours

    def __init__(self) -> None:
        # _store: key -> (payload, timestamp)
        self._store: Dict[str, Tuple[Any, float]] = {}

    @staticmethod
    def _normalize_string(value: Any) -> str:
        text = "" if value is None else str(value)
        return " ".join(text.strip().casefold().split())

    @staticmethod
    def _normalize_number(value: Any, places: int) -> float:
        try:
            quantized = Decimal(str(value)).quantize(Decimal(f"1.{('0' * places)}"))
        except (InvalidOperation, ValueError, TypeError) as exc:
            raise ValueError("Cache key values must be numeric") from exc
        return float(quantized)

    def _normalize_tranche(self, tranche: Dict[str, Any]) -> Dict[str, Any]:
        # Every field that affects the rate-risk computation must stay in the cache identity.
        # Sorting and normalization ensure logically equivalent requests hash to the same key.
        return {
            "allocation": self._normalize_number(tranche.get("allocation"), 2),
            "after_tax_apy": self._normalize_number(tranche.get("after_tax_apy"), 6),
            "buy_in_months": int(tranche.get("buy_in_months", 0)),
            "cd_term_months": int(tranche.get("cd_term_months", 0)),
            "product_id": self._normalize_string(tranche.get("product_id")),
            "slot": int(tranche.get("slot", 0)),
        }

    def _normalize_request_identity(
        self,
        investment_amount: Any,
        user_state: Any,
        user_income_range: Any,
        tranches: Iterable[Dict[str, Any]],
    ) -> Dict[str, Any]:
        normalized_tranches = sorted(
            (self._normalize_tranche(tranche) for tranche in tranches),
            key=lambda item: (
                item["slot"],
                item["buy_in_months"],
                item["cd_term_months"],
                item["product_id"],
                item["allocation"],
                item["after_tax_apy"],
            ),
        )
        return {
            "investment_amount": self._normalize_number(investment_amount, 2),
            "user_state": self._normalize_string(user_state),
            "user_income_range": self._normalize_string(user_income_range),
            "tranches": normalized_tranches,
        }

    def make_key(
        self,
        investment_amount: Any,
        user_state: Any,
        user_income_range: Any,
        tranches: Iterable[Dict[str, Any]],
    ) -> str:
        identity = self._normalize_request_identity(
            investment_amount=investment_amount,
            user_state=user_state,
            user_income_range=user_income_range,
            tranches=tranches,
        )
        raw = json.dumps(identity, separators=(",", ":"), sort_keys=True)
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()

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

