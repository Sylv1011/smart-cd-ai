import json
import logging
import os
import re
import time
from typing import Any, Dict, Iterator, Tuple

from dotenv import load_dotenv
from openai import OpenAI

from prompts import SYSTEM_PROMPT, WHY_THIS_FITS_TASK_PROMPT, CHAT_TASK_PREFIX

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
MODEL_NAME = os.getenv("MODEL_NAME", "gpt-5-mini")

if not OPENAI_API_KEY:
    raise RuntimeError("OPENAI_API_KEY is not set. Add it to your .env file.")

client = OpenAI(api_key=OPENAI_API_KEY)

logger = logging.getLogger(__name__)

if not logging.getLogger().handlers:
    logging.basicConfig(level=logging.INFO)


WHY_THIS_FITS_CACHE_TTL_SECONDS = int(os.getenv("WHY_THIS_FITS_CACHE_TTL_SECONDS", os.getenv("TOP3_CACHE_TTL_SECONDS", "86400")))
_WHY_THIS_FITS_CACHE: Dict[str, Tuple[float, Dict[str, Any]]] = {}


def _build_why_this_fits_cache_key(selected_product: Dict[str, Any]) -> str:
    normalized_product = {
        "rank_overall": selected_product.get("rank_overall"),
        "product_type": selected_product.get("product_type"),
        "institution_name": selected_product.get("institution_name"),
        "brokerage_firm": selected_product.get("brokerage_firm"),
        "term_months": selected_product.get("term_months"),
        "apy_nominal": selected_product.get("apy_nominal"),
        "after_tax_apy": selected_product.get("after_tax_apy"),
        "after_tax_interest_usd": selected_product.get("after_tax_interest_usd"),
        "minimum_deposit": selected_product.get("minimum_deposit"),
        "fdic_insured": selected_product.get("fdic_insured"),
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

    # remove fenced code blocks if present
    if text.startswith("```"):
        lines = text.splitlines()
        if lines and lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]
        text = "\n".join(lines).strip()

    # try direct parse
    try:
        return json.loads(text)
    except Exception:
        pass

    # try object slice
    try:
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1 and end > start:
            return json.loads(text[start:end + 1])
    except Exception:
        pass

    # try array slice
    try:
        start = text.find("[")
        end = text.rfind("]")
        if start != -1 and end != -1 and end > start:
            return json.loads(text[start:end + 1])
    except Exception:
        pass

    raise ValueError(f"Model did not return valid JSON. Raw output: {text[:500]}")


def _call_llm(payload: Dict[str, Any]) -> str:
    user_payload = json.dumps(payload)
    approx_payload_chars = len(user_payload)
    start_time = time.perf_counter()

    logger.info("LLM request started | model=%s | payload_chars=%s", MODEL_NAME, approx_payload_chars)

    response = client.responses.create(
        model=MODEL_NAME,
        input=[
            {"role": "system", "content": SYSTEM_PROMPT},
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

    stream = client.responses.create(
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

    why_this_fits = parsed.get("why_this_fits", "")
    if not isinstance(why_this_fits, str):
        raise ValueError("Why-this-fits response is missing a valid 'why_this_fits' string")

    result = {"why_this_fits": why_this_fits.strip()}
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
    """
    Generate brokered CDs across multiple terms with guaranteed distribution.
    """

    terms = [3, 6, 12, 24]
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

    prompt = f"""
Generate brokered CD products.

Return ONLY valid JSON.

Requirements:
- Generate EXACTLY {per_term} products for EACH term: 3, 6, 12, 24, 60 months
- Total products = {per_term * len(terms)}
- Do NOT skip any term
- Do NOT mix counts

Rules:
- brokerage_firm must be one of: {", ".join(allowed_brokerages)}
- issuing_bank must be one of: {", ".join(allowed_banks)}
- fdic_insured must always be true
- product_type must be brokered_cd
- source_name must equal brokerage_firm
- minimum_deposit must be: 500, 1000, 5000, or 10000
- apy must be between 4.0 and 6.0

Return format:
{{
  "products": [ ... ]
}}
"""

    payload = {
        "task": "generate_brokered_cds",
        "prompt": prompt,
    }

    start_time = time.perf_counter()
    raw = _call_llm(payload)
    parsed = _extract_json_array_or_object(raw)

    products = parsed if isinstance(parsed, list) else parsed.get("products", [])

    if not isinstance(products, list):
        raise ValueError("Invalid brokered CD response format")

    # ---------------- VALIDATION + ENFORCEMENT ----------------
    grouped = {3: [], 6: [], 12: [], 24: [], 60: []}

    for p in products:
        try:
            term = int(p.get("term_months"))

            if term not in grouped:
                continue

            if (
                p.get("brokerage_firm") in allowed_brokerages
                and p.get("issuing_bank") in allowed_banks
                and p.get("fdic_insured") is True
            ):
                grouped[term].append(p)

        except:
            continue

    #  HARD ENFORCEMENT (this is key)
    final_products = []

    for term in terms:
        grouped[term].sort(key=lambda x: float(x.get("apy", 0)), reverse=True)
        valid = grouped[term][:per_term]

        if len(valid) < per_term:
            raise ValueError(f"Not enough valid products for term {term}")

        for p in valid:
            normalized = {
                "product_type": "brokered_cd",
                "institution_name": None,
                "brokerage_firm": p["brokerage_firm"],
                "issuing_bank": p["issuing_bank"],
                "term_months": term,
                "apy": round(float(p["apy"]), 2),
                "minimum_deposit": int(p["minimum_deposit"]),
                "fdic_insured": True,
                "source_name": p["brokerage_firm"],
                "source_url": None,
                "destination_url": None,
                "retrieved_at": time.strftime("%Y-%m-%d"),
            }
            final_products.append(normalized)

    logger.info(
        "Brokered CD multi-term generation completed | total=%s | duration_sec=%.2f",
        len(final_products),
        time.perf_counter() - start_time,
    )

    return {"products": final_products}