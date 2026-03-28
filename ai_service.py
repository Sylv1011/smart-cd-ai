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