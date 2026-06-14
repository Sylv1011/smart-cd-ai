import hashlib
import json
import logging
import os
import re
import time
from typing import Any, Dict, Iterator, Tuple

from dotenv import load_dotenv
from openai import OpenAI

from bullet_rate_risk_cache import BulletRateRiskSummaryCache
from prompts import (
    BROKERED_CD_GENERATION_PROMPT,
    BULLET_RATE_RISK_SUMMARY_TASK_PROMPT,
    CHAT_TASK_PREFIX,
    SYSTEM_PROMPT,
    WHY_THIS_FITS_TASK_PROMPT,
)

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
MODEL_NAME = os.getenv("MODEL_NAME", "gpt-5-mini")
client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None
bullet_rate_risk_summary_cache = BulletRateRiskSummaryCache()


class AIServiceError(Exception):
    pass


class AIServiceConfigError(AIServiceError):
    pass


class AIServiceResponseError(AIServiceError):
    pass


def _get_client() -> OpenAI:
    global client

    if client is not None:
        return client

    if not OPENAI_API_KEY:
        raise AIServiceConfigError("OPENAI_API_KEY is not set.")

    client = OpenAI(api_key=OPENAI_API_KEY)
    return client


logger = logging.getLogger(__name__)

if not logging.getLogger().handlers:
    logging.basicConfig(level=logging.INFO)


WHY_THIS_FITS_CACHE_TTL_SECONDS = int(
    os.getenv("WHY_THIS_FITS_CACHE_TTL_SECONDS", os.getenv("TOP3_CACHE_TTL_SECONDS", "86400"))
)
_WHY_THIS_FITS_CACHE: Dict[str, Tuple[float, Dict[str, Any]]] = {}


def _build_why_this_fits_cache_key(selected_product: Dict[str, Any]) -> str:
    normalized_product = {
        "product_type": selected_product.get("product_type"),
        "term_months": selected_product.get("term_months"),
        "user_state": selected_product.get("user_state"),
        "income_range": selected_product.get("income_range"),
    }
    return json.dumps(normalized_product, sort_keys=True)


def _extract_json_object(text: str) -> Dict[str, Any]:
    text = text.strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    match = re.search(r"\{[\s\S]*\}", text)
    if not match:
        raise ValueError("Model did not return valid JSON")

    return json.loads(match.group(0))


def _extract_json_array_or_object(text: str) -> Any:
    text = (text or "").strip()

    if text.startswith("```"):
        lines = text.splitlines()
        if lines and lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]
        text = "\n".join(lines).strip()

    try:
        return json.loads(text)
    except Exception:
        pass

    try:
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1 and end > start:
            return json.loads(text[start : end + 1])
    except Exception:
        pass

    try:
        start = text.find("[")
        end = text.rfind("]")
        if start != -1 and end != -1 and end > start:
            return json.loads(text[start : end + 1])
    except Exception:
        pass

    raise ValueError(f"Model did not return valid JSON. Raw output: {text[:500]}")


def _call_llm(payload: Dict[str, Any], system_prompt: str = SYSTEM_PROMPT) -> str:
    user_payload = json.dumps(payload)
    approx_payload_chars = len(user_payload)
    start_time = time.perf_counter()

    logger.info("LLM request started | model=%s | payload_chars=%s", MODEL_NAME, approx_payload_chars)

    response = _get_client().responses.create(
        model=MODEL_NAME,
        input=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_payload},
        ],
    )

    output_text = response.output_text.strip()
    elapsed = time.perf_counter() - start_time

    logger.info(
        "LLM request completed | model=%s | duration_sec=%.2f | response_chars=%s",
        MODEL_NAME,
        elapsed,
        len(output_text),
    )

    return output_text


def _stream_llm_text(payload: Dict[str, Any]) -> Iterator[str]:
    user_payload = json.dumps(payload)
    approx_payload_chars = len(user_payload)
    start_time = time.perf_counter()

    logger.info("Streaming LLM request started | model=%s | payload_chars=%s", MODEL_NAME, approx_payload_chars)

    stream = _get_client().responses.create(
        model=MODEL_NAME,
        input=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_payload},
        ],
        stream=True,
    )

    total_chars = 0

    try:
        for event in stream:
            event_type = getattr(event, "type", "")

            if event_type == "response.output_text.delta":
                delta = getattr(event, "delta", "") or ""
                if delta:
                    total_chars += len(delta)
                    yield delta

            elif event_type == "response.completed":
                break
    finally:
        logger.info(
            "Streaming LLM request completed | model=%s | duration_sec=%.2f | response_chars=%s",
            MODEL_NAME,
            time.perf_counter() - start_time,
            total_chars,
        )


def _canonicalize_for_cache(value: Any) -> Any:
    if isinstance(value, dict):
        return {key: _canonicalize_for_cache(value[key]) for key in sorted(value.keys())}
    if isinstance(value, list):
        return [_canonicalize_for_cache(item) for item in value]
    if isinstance(value, float):
        return round(value, 6)
    if isinstance(value, str):
        return value.strip()
    return value


def _make_bullet_rate_risk_summary_cache_key(ai_summary_input: Dict[str, Any]) -> str:
    normalized_payload = _canonicalize_for_cache(ai_summary_input)
    serialized = json.dumps(normalized_payload, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()


def _validate_bullet_rate_risk_summary_response(parsed: Dict[str, Any]) -> Dict[str, str]:
    if not isinstance(parsed, dict):
        raise AIServiceResponseError("AI summary response must be a JSON object.")

    expected_keys = {"headline", "insight"}
    actual_keys = set(parsed.keys())
    if actual_keys != expected_keys:
        raise AIServiceResponseError("AI summary response must contain only headline and insight.")

    headline = str(parsed.get("headline", "")).strip()
    insight = str(parsed.get("insight", "")).strip()

    if not headline or not insight:
        raise AIServiceResponseError("AI summary response is missing headline or insight.")

    if len(headline.split()) > 8:
        raise AIServiceResponseError("AI summary headline exceeds 8 words.")

    if len(insight.split()) > 35:
        raise AIServiceResponseError("AI summary insight exceeds 35 words.")

    sentence_count = len([part for part in re.split(r"[.!?]+", insight) if part.strip()])
    if sentence_count > 2:
        raise AIServiceResponseError("AI summary insight exceeds 2 sentences.")

    return {"headline": headline, "insight": insight}


def explain_why_this_fits(selected_product: Dict[str, Any]) -> Dict[str, Any]:
    cache_key = _build_why_this_fits_cache_key(selected_product)
    now = time.time()

    cached_entry = _WHY_THIS_FITS_CACHE.get(cache_key)
    if cached_entry:
        cached_at, cached_value = cached_entry
        if now - cached_at < WHY_THIS_FITS_CACHE_TTL_SECONDS:
            logger.info("Why-this-fits cache hit | ttl_sec=%s", WHY_THIS_FITS_CACHE_TTL_SECONDS)
            return cached_value
        logger.info("Why-this-fits cache expired | ttl_sec=%s", WHY_THIS_FITS_CACHE_TTL_SECONDS)
        _WHY_THIS_FITS_CACHE.pop(cache_key, None)

    logger.info("Why-this-fits cache miss")

    payload = {
        "task": WHY_THIS_FITS_TASK_PROMPT,
        "product": selected_product,
    }

    start_time = time.perf_counter()
    raw_text = _call_llm(payload)
    parsed = _extract_json_object(raw_text)
    logger.info("Why-this-fits pipeline completed | duration_sec=%.2f", time.perf_counter() - start_time)
    logger.info("Raw text=%s", raw_text)
    headline = parsed.get("headline")
    if not isinstance(headline, str):
        raise ValueError("Why-this-fits response is missing a valid 'why_this_fits' string")

    result = parsed
    _WHY_THIS_FITS_CACHE[cache_key] = (now, result)
    return result


def stream_chat_about_results(question: str, ranking_response: Dict[str, Any]) -> Iterator[str]:
    payload = {
        "task": CHAT_TASK_PREFIX,
        "user_question": question,
        "ranking_basis": "after_tax_return",
        "ranking_response": ranking_response,
    }

    start_time = time.perf_counter()

    for chunk in _stream_llm_text(payload):
        yield chunk

    logger.info("Streaming chat pipeline completed | question=%r | duration_sec=%.2f", question, time.perf_counter() - start_time)


def generate_brokered_cds_multi_term() -> Dict[str, Any]:
    terms = [3, 6, 12, 24, 60]
    per_term = 4

    allowed_brokerages = [
        "Fidelity",
        "Schwab",
        "Vanguard",
        "Morgan Stanley",
        "E*Trade",
    ]

    allowed_banks = [
        "Goldman Sachs",
        "JPMorgan Chase",
        "Wells Fargo",
        "Citi",
        "Barclays",
        "Capital One",
        "Bank of America",
    ]

    payload = {
        "task": "generate_brokered_cds",
        "prompt": BROKERED_CD_GENERATION_PROMPT,
    }

    start_time = time.perf_counter()
    raw = _call_llm(payload, system_prompt=BROKERED_CD_GENERATION_PROMPT)
    parsed = _extract_json_array_or_object(raw)

    products = parsed if isinstance(parsed, list) else parsed.get("products", [])
    if not isinstance(products, list):
        raise ValueError("Invalid brokered CD response format")

    grouped = {3: [], 6: [], 12: [], 24: [], 60: []}

    for product in products:
        try:
            term = int(product.get("term_months"))
            if term not in grouped:
                continue

            brokerage = product.get("brokerage_firm")
            bank = product.get("issuing_bank")
            fdic_insured = product.get("fdic_insured") is True
            apy = float(product.get("apy", 0))
            minimum_deposit = int(product.get("minimum_deposit", 0))

            if brokerage not in allowed_brokerages:
                continue
            if bank not in allowed_banks:
                continue
            if not fdic_insured:
                continue
            if minimum_deposit not in {500, 1000, 5000, 10000}:
                continue

            if term in {3, 6} and not (3.0 <= apy <= 5.2):
                continue
            if term == 12 and not (3.2 <= apy <= 5.4):
                continue
            if term in {24, 60} and not (3.0 <= apy <= 5.6):
                continue

            grouped[term].append(product)
        except Exception:
            continue

    final_products = []

    for term in terms:
        grouped[term].sort(key=lambda item: float(item.get("apy", 0)), reverse=True)
        valid = grouped[term][:per_term]

        if len(valid) < per_term:
            raise ValueError(f"Not enough valid products for term {term}")

        for product in valid:
            final_products.append(
                {
                    "product_type": "brokered_cd",
                    "institution_name": None,
                    "brokerage_firm": product["brokerage_firm"],
                    "issuing_bank": product["issuing_bank"],
                    "term_months": term,
                    "apy": round(float(product["apy"]), 2),
                    "minimum_deposit": int(product["minimum_deposit"]),
                    "fdic_insured": True,
                    "source_name": product["brokerage_firm"],
                    "source_url": None,
                    "destination_url": None,
                    "retrieved_at": time.strftime("%Y-%m-%d"),
                }
            )

    logger.info(
        "Brokered CD multi-term generation completed | total=%s | duration_sec=%.2f",
        len(final_products),
        time.perf_counter() - start_time,
    )

    return {"products": final_products}


def summarize_bullet_rate_risk(ai_summary_input: Dict[str, Any]) -> Dict[str, Any]:
    cache_key = _make_bullet_rate_risk_summary_cache_key(ai_summary_input)

    try:
        cached_value = bullet_rate_risk_summary_cache.get(cache_key)
    except Exception:
        cached_value = None

    if cached_value is not None:
        return {
            "headline": cached_value["headline"],
            "insight": cached_value["insight"],
            "cache_hit": True,
        }

    payload = {
        "task": BULLET_RATE_RISK_SUMMARY_TASK_PROMPT,
        "ai_summary_input": ai_summary_input,
    }

    raw_text = _call_llm(payload)

    try:
        parsed = _extract_json_object(raw_text)
        validated = _validate_bullet_rate_risk_summary_response(parsed)
    except (ValueError, json.JSONDecodeError) as exc:
        raise AIServiceResponseError("AI summary did not return valid JSON.") from exc

    try:
        bullet_rate_risk_summary_cache.set(cache_key, validated)
    except Exception:
        pass

    return {
        "headline": validated["headline"],
        "insight": validated["insight"],
        "cache_hit": False,
    }
