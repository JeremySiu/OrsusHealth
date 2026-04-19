"""
Dr. Bear LangChain chat agent.

Uses Gemini (gemini-3-flash-preview) with tool-calling to query the user's
health records from Supabase and look up clinical facts on demand.
Traced via LangSmith (auto-enabled through environment variables).
"""

from __future__ import annotations

import json
import logging
import os
from typing import Any, AsyncGenerator

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_core.tools import tool
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.prebuilt import create_react_agent
from supabase import create_client, Client

from app.clinical_facts import get_clinical_facts as _lookup_clinical_facts

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Lazy Supabase client (initialised on first use, not at import time)
# ---------------------------------------------------------------------------
_supabase: Client | None = None


def _get_supabase() -> Client:
    global _supabase
    if _supabase is None:
        url = os.environ["SUPABASE_URL"]
        key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
        _supabase = create_client(url, key)
    return _supabase


# ---------------------------------------------------------------------------
# Tools
# ---------------------------------------------------------------------------

@tool
def get_health_records(user_id: str) -> str:
    """Retrieve **all** cardiovascular assessment records for a user.

    Returns a JSON array of objects, each containing:
    - ``value`` (JSONB): the full assessment payload (form_data, prediction, report_path)
    - ``recorded_at``: ISO-8601 timestamp of when the assessment was recorded

    Results are ordered newest-first.  Use this when the user asks about
    their history, trends, or past assessments.
    """
    sb = _get_supabase()
    response = (
        sb.table("health_records")
        .select("value, recorded_at")
        .eq("user_id", user_id)
        .order("recorded_at", desc=True)
        .execute()
    )
    return json.dumps(response.data, default=str)


@tool
def get_latest_assessment(user_id: str) -> str:
    """Retrieve only the **most recent** cardiovascular assessment for a user.

    Returns a single JSON object with ``value`` and ``recorded_at``, or an
    empty object if no records exist.  Use this for quick context when the
    user asks about their latest results.
    """
    sb = _get_supabase()
    response = (
        sb.table("health_records")
        .select("value, recorded_at")
        .eq("user_id", user_id)
        .order("recorded_at", desc=True)
        .limit(1)
        .execute()
    )
    if response.data:
        return json.dumps(response.data[0], default=str)
    return json.dumps({})


@tool
def get_clinical_facts(feature_name: str, is_positive: bool) -> str:
    """Look up the clinical fact, health suggestion, and medical citation
    for a specific cardiovascular feature.

    Parameters
    ----------
    feature_name : str
        The feature key exactly as it appears in the prediction model, e.g.
        ``"ST_Slope_Flat"``, ``"Age"``, ``"Cholesterol"``,
        ``"ChestPainType_ASY"``, etc.
    is_positive : bool
        ``True`` when the feature *increases* cardiovascular risk (positive
        SHAP value); ``False`` when it *decreases* risk.

    Returns a JSON object with keys: ``fact``, ``suggestion``, ``citation``.
    Call this whenever you need medical reference data to explain or
    contextualise a user's assessment results.
    """
    result = _lookup_clinical_facts(feature_name, is_positive)
    return json.dumps(result)


# ---------------------------------------------------------------------------
# System prompt
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = """\
You are **Dr. Bear 🐻**, a warm, knowledgeable, and encouraging cardiac \
health assistant for OrsusHealth.

## Your Capabilities
- You can retrieve the user's cardiovascular assessment history using the \
``get_health_records`` and ``get_latest_assessment`` tools.
- You can look up detailed clinical facts, suggestions, and citations for \
any health feature using the ``get_clinical_facts`` tool.
- You interpret assessment results (risk probability, SHAP-based top \
influencing features, form data) and explain them in plain language.

## Guidelines
- Always be encouraging and empathetic.  Use a conversational but \
professional tone.
- When discussing assessment results, call ``get_clinical_facts`` for the \
relevant features so your explanations are grounded in medical evidence.
- **Never** recommend anything that could harm the user.
- For serious or urgent findings, **always** advise the user to consult \
a qualified physician or cardiologist.
- Do **not** diagnose conditions — you explain risk factors and model \
outputs.
- Keep responses concise but thorough.  Use bullet points when listing \
multiple items.
- If the user asks something outside cardiac health, politely redirect \
them back to heart-health topics.
- **CRITICAL**: Do NOT use any emojis in your response.
- **CRITICAL**: Keep ALL responses completely under 100 words.

## Important Context
- The ``user_id`` is provided by the system.  You do not need to ask the \
user for it — it is automatically included in every tool call.
- Assessment ``value`` contains: ``form_data`` (patient inputs), \
``prediction`` (``heart_disease_probability`` and \
``top_influencing_features`` with SHAP values), and ``report_path``.
- A positive SHAP value means the feature *increased* the predicted risk; \
negative means it *decreased* it.
"""


# ---------------------------------------------------------------------------
# Agent factory
# ---------------------------------------------------------------------------

_TOOLS = [get_health_records, get_latest_assessment, get_clinical_facts]


def _build_agent():
    """Create a ReAct agent with Gemini + tools."""
    llm = ChatGoogleGenerativeAI(
        model="gemini-3-flash-preview",
        temperature=0.4,
    )
    return create_react_agent(llm, _TOOLS)


# Module-level singleton (created on first call to run_chat)
_agent = None


def _get_agent():
    global _agent
    if _agent is None:
        _agent = _build_agent()
    return _agent


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

async def run_chat(user_id: str, messages: list[dict[str, Any]]) -> AsyncGenerator[str, None]:
    """Run Dr. Bear chat agent with streaming events.

    Returns an async generator yielding JSON-encoded strings:
    - {"type": "tool", "name": "..."}
    - {"type": "text", "content": "..."}
    """
    agent = _get_agent()

    # Convert frontend messages to LangChain message objects
    lc_messages: list = [SystemMessage(content=SYSTEM_PROMPT)]
    for msg in messages:
        content = msg.get("content") or ""
        if msg["role"] == "user":
            lc_messages.append(HumanMessage(content=content))
        elif msg["role"] == "assistant":
            lc_messages.append(AIMessage(content=content))

    # The agent needs to know the user_id to pass to tools.
    lc_messages.insert(
        1,
        SystemMessage(
            content=f"The current user's ID is: {user_id}. Always pass this user_id to the health-record tools."
        ),
    )

    async for event in agent.astream_events({"messages": lc_messages}, version="v2"):
        kind = event["event"]

        if kind == "on_tool_start":
            yield json.dumps({"type": "tool", "name": event["name"]})

        elif kind == "on_chat_model_stream":
            content = event["data"]["chunk"].content
            if content:
                # Gemini may return content as a list or string
                text = ""
                if isinstance(content, str):
                    text = content
                elif isinstance(content, list):
                    text = "".join([c.get("text", "") for c in content if isinstance(c, dict) and "text" in c])
                
                if text:
                    yield json.dumps({"type": "text", "content": text})

