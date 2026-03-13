import json
import os
import re
from typing import Any, Dict

from dotenv import load_dotenv
from openai import OpenAI

from prompts import SYSTEM_PROMPT, TOP3_TASK_PROMPT, CHAT_TASK_PREFIX

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
MODEL_NAME = os.getenv("MODEL_NAME", "gpt-5-mini")

if not OPENAI_API_KEY:
    raise RuntimeError("OPENAI_API_KEY is not set. Add it to your .env file.")

client = OpenAI(api_key=OPENAI_API_KEY)


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
    response = client.responses.create(
        model=MODEL_NAME,
        input=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": json.dumps(payload)},
        ],
    )
    return response.output_text.strip()


def explain_top_3(ranking_response: Dict[str, Any]) -> Dict[str, Any]:
    overall_top = ranking_response.get("overall_top", [])

    payload = {
        "task": TOP3_TASK_PROMPT,
        "ranking_basis": "after_tax_return",
        "overall_top": overall_top[:3],
    }

    raw_text = _call_llm(payload)
    parsed = _extract_json_object(raw_text)

    products = parsed.get("products", [])
    if not isinstance(products, list):
        raise ValueError("Top-3 explanation response is missing a valid 'products' list")

    return {"products": products}


def chat_about_results(question: str, ranking_response: Dict[str, Any]) -> str:
    payload = {
        "task": CHAT_TASK_PREFIX,
        "user_question": question,
        "ranking_basis": "after_tax_return",
        "ranking_response": ranking_response,
    }

    raw_text = _call_llm(payload)

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