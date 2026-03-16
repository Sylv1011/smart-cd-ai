import json
import logging
import os
import re
import time
from typing import Any, Dict, Tuple

from dotenv import load_dotenv
from openai import OpenAI

from prompts import SYSTEM_PROMPT, TOP3_TASK_PROMPT, CHAT_TASK_PREFIX

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
MODEL_NAME = os.getenv("MODEL_NAME", "gpt-5-mini")

if not OPENAI_API_KEY:
    raise RuntimeError("OPENAI_API_KEY is not set. Add it to your .env file.")

client = OpenAI(api_key=OPENAI_API_KEY)

logger = logging.getLogger(__name__)

if not logging.getLogger().handlers:
    logging.basicConfig(level=logging.INFO)


TOP3_CACHE_TTL_SECONDS = int(os.getenv("TOP3_CACHE_TTL_SECONDS", "86400"))
_TOP3_EXPLANATION_CACHE: Dict[str, Tuple[float, Dict[str, Any]]] = {}


def _build_top3_cache_key(overall_top: list[Dict[str, Any]]) -> str:
    normalized_products = []

    for product in overall_top[:3]:
        normalized_products.append(
            {
                "rank_overall": product.get("rank_overall"),
                "product_type": product.get("product_type"),
                "institution_name": product.get("institution_name"),
                "brokerage_firm": product.get("brokerage_firm"),
                "term_months": product.get("term_months"),
                "apy_nominal": product.get("apy_nominal"),
                "after_tax_apy": product.get("after_tax_apy"),
                "after_tax_interest_usd": product.get("after_tax_interest_usd"),
                "minimum_deposit": product.get("minimum_deposit"),
                "fdic_insured": product.get("fdic_insured"),
            }
        )

    serialized = json.dumps(normalized_products, sort_keys=True)
    return serialized


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


def explain_top_3(ranking_response: Dict[str, Any]) -> Dict[str, Any]:
    overall_top = ranking_response.get("overall_top", [])
    cache_key = _build_top3_cache_key(overall_top)
    now = time.time()

    cached_entry = _TOP3_EXPLANATION_CACHE.get(cache_key)
    if cached_entry:
        cached_at, cached_value = cached_entry
        if now - cached_at < TOP3_CACHE_TTL_SECONDS:
            logger.info("Top-3 explanation cache hit | ttl_sec=%s", TOP3_CACHE_TTL_SECONDS)
            return cached_value
        logger.info("Top-3 explanation cache expired | ttl_sec=%s", TOP3_CACHE_TTL_SECONDS)
        _TOP3_EXPLANATION_CACHE.pop(cache_key, None)

    logger.info("Top-3 explanation cache miss")

    payload = {
        "task": TOP3_TASK_PROMPT,
        "ranking_basis": "after_tax_return",
        "overall_top": overall_top[:3],
    }

    start_time = time.perf_counter()
    raw_text = _call_llm(payload)
    parsed = _extract_json_object(raw_text)
    logger.info("Top-3 explanation pipeline completed | duration_sec=%.2f", time.perf_counter() - start_time)

    products = parsed.get("products", [])
    if not isinstance(products, list):
        raise ValueError("Top-3 explanation response is missing a valid 'products' list")

    result = {"products": products}
    _TOP3_EXPLANATION_CACHE[cache_key] = (now, result)
    return result


def chat_about_results(question: str, ranking_response: Dict[str, Any]) -> str:
    payload = {
        "task": CHAT_TASK_PREFIX,
        "user_question": question,
        "ranking_basis": "after_tax_return",
        "ranking_response": ranking_response,
    }

    start_time = time.perf_counter()
    raw_text = _call_llm(payload)
    logger.info("Chat pipeline completed | question=%r | duration_sec=%.2f", question, time.perf_counter() - start_time)

    # Normalize response in case the model outputs JSON like {"answer": ..., "full_text": ...}
    try:
        parsed = _extract_json_object(raw_text)

        if isinstance(parsed, dict):
            if "response" in parsed:
                return str(parsed["response"]).strip()
            if "answer" in parsed:
                return str(parsed["answer"]).strip()
            if "full_text" in parsed:
                return str(parsed["full_text"]).strip()

    except Exception:
        pass

    # If the model already returned plain text
    return raw_text.strip()