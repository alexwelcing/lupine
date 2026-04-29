"""
Model configuration for lupine-dspy.

Tiered model routing strategy:
  Tier 1 (Swarm/Parallel): Cloudflare Workers AI — free, zero egress, many agents
    -> Gemma 4 26B MoE (4B active, 256k context, thinking mode)
  Tier 2 (Reasoning):      Gemini Flash — fast, cheap, good at structured output
  Tier 3 (Local):           Ollama / vLLM — zero cost, full privacy, GPU required

Environment variables:
  CLOUDFLARE_API_KEY      — Workers AI access
  CLOUDFLARE_ACCOUNT_ID   — Workers AI account
  GOOGLE_API_KEY          — Gemini access
  OPENAI_API_KEY          — OpenAI fallback
  LUPINE_MODEL            — Override default model
  LUPINE_TIER             — Force a specific tier (cloudflare | gemini | local)
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from enum import Enum
from typing import Optional

import dspy


class ModelTier(str, Enum):
    """Model routing tiers, cheapest first."""
    CLOUDFLARE = "cloudflare"   # Free/cheap, parallel swarm agents
    GEMINI = "gemini"           # Mid-tier, structured output
    OPENAI = "openai"           # Premium fallback
    LOCAL = "local"             # Ollama / vLLM, zero cost


# ─── Model Catalog ─────────────────────────────────────────
# NOTE: Cloudflare models use the OpenAI-compatible endpoint
# (not LiteLLM's `cloudflare/` provider, which has a KeyError
# bug with newer models like Gemma 4 that don't return
# {"result": {"response": "..."}} format).

# Cloudflare OpenAI-compat model IDs (used with api_base override)
CF_MODELS = {
    "gemma-4": "@cf/google/gemma-4-26b-a4b-it",
    "llama-4": "@cf/meta/llama-4-scout-17b-16e-instruct",
    "llama-3.1": "@cf/meta/llama-3.1-8b-instruct",
    "qwen3": "@cf/alibaba/qwen3-30b-a3b-fp8",
    "glm": "@cf/zhipu/glm-4.7-flash",
}

MODELS = {
    # Cloudflare (resolved at runtime via _make_cf_lm)
    "cloudflare/gemma-4": "cf:gemma-4",
    "cloudflare/llama-4": "cf:llama-4",
    "cloudflare/llama-3.1": "cf:llama-3.1",
    "cloudflare/qwen3": "cf:qwen3",
    "cloudflare/glm": "cf:glm",

    # Gemini (Google)
    "gemini/flash": "gemini/gemini-2.5-flash",
    "gemini/pro": "gemini/gemini-2.5-pro",

    # OpenAI
    "openai/gpt4.1": "openai/gpt-4.1",
    "openai/gpt4.1-mini": "openai/gpt-4.1-mini",

    # Local (Ollama)
    "local/gemma3": "ollama_chat/gemma3:12b",
    "local/qwen3": "ollama_chat/qwen3:14b",
    "local/llama3.3": "ollama_chat/llama3.3:latest",
}

# Default model per tier
TIER_DEFAULTS = {
    ModelTier.CLOUDFLARE: "cf:gemma-4",
    ModelTier.GEMINI: "gemini/gemini-2.5-flash",
    ModelTier.OPENAI: "openai/gpt-4.1-mini",
    ModelTier.LOCAL: "ollama_chat/gemma3:12b",
}


@dataclass
class ModelConfig:
    """Resolved model configuration."""
    tier: ModelTier
    model_string: str
    lm: dspy.LM


def _make_cf_lm(cf_model_key: str) -> dspy.LM:
    """Create a DSPy LM using Cloudflare's OpenAI-compatible endpoint.

    Instead of LiteLLM's buggy `cloudflare/` provider, we use `openai/`
    with api_base pointed at CF's /v1/ endpoint. This correctly handles
    all model families (Gemma, Llama, Qwen, GLM).
    """
    account_id = os.environ.get("CLOUDFLARE_ACCOUNT_ID", "")
    api_key = os.environ.get("CLOUDFLARE_API_KEY", "")
    cf_model_id = CF_MODELS.get(cf_model_key, cf_model_key)

    return dspy.LM(
        model=f"openai/{cf_model_id}",
        api_base=f"https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/v1",
        api_key=api_key,
    )


def detect_tier() -> ModelTier:
    """Auto-detect the best available tier from environment variables."""
    forced = os.environ.get("LUPINE_TIER", "").lower()
    if forced in [t.value for t in ModelTier]:
        return ModelTier(forced)

    # Check what's available, cheapest first
    if os.environ.get("CLOUDFLARE_API_KEY") and os.environ.get("CLOUDFLARE_ACCOUNT_ID"):
        return ModelTier.CLOUDFLARE
    if os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY"):
        return ModelTier.GEMINI
    if os.environ.get("OPENAI_API_KEY"):
        return ModelTier.OPENAI
    return ModelTier.LOCAL


def resolve_model(
    model: Optional[str] = None,
    tier: Optional[ModelTier] = None,
) -> ModelConfig:
    """Resolve a model string into a configured DSPy LM.

    Priority:
      1. Explicit model string (e.g., "gemini/gemini-2.5-flash")
      2. Alias from MODELS catalog (e.g., "cloudflare/gemma-4")
      3. LUPINE_MODEL env var
      4. Tier default
    """
    # Resolve model string
    if model:
        model_string = MODELS.get(model, model)
    elif os.environ.get("LUPINE_MODEL"):
        raw = os.environ["LUPINE_MODEL"]
        model_string = MODELS.get(raw, raw)
    else:
        resolved_tier = tier or detect_tier()
        model_string = TIER_DEFAULTS[resolved_tier]

    # Detect tier from model string
    if tier is None:
        if model_string.startswith("cf:"):
            tier = ModelTier.CLOUDFLARE
        elif model_string.startswith("gemini/"):
            tier = ModelTier.GEMINI
        elif model_string.startswith("openai/"):
            tier = ModelTier.OPENAI
        else:
            tier = ModelTier.LOCAL

    # Create LM — special handling for Cloudflare
    if model_string.startswith("cf:"):
        cf_key = model_string[3:]  # strip "cf:" prefix
        lm = _make_cf_lm(cf_key)
        display_string = f"cloudflare/{cf_key} -> {CF_MODELS.get(cf_key, cf_key)}"
    else:
        lm = dspy.LM(model_string)
        display_string = model_string

    dspy.configure(lm=lm)
    return ModelConfig(tier=tier, model_string=display_string, lm=lm)


def configure_swarm_models() -> dict[str, ModelConfig]:
    """Configure models for parallel swarm execution.

    Returns a dict of role -> ModelConfig, optimized for
    concurrent agent execution on Cloudflare Workers AI.
    """
    tier = detect_tier()

    if tier == ModelTier.CLOUDFLARE:
        # All agents on CF Workers AI — free parallel execution
        return {
            "theorist": resolve_model("cloudflare/gemma-4"),
            "causal": resolve_model("cloudflare/gemma-4"),
            "experiment": resolve_model("cloudflare/gemma-4"),
            "literature": resolve_model("cloudflare/gemma-4"),
            "diary": resolve_model("cloudflare/llama-3.1"),  # lightweight for summaries
            "adjudicator": resolve_model("cloudflare/gemma-4"),
        }
    elif tier == ModelTier.GEMINI:
        # Flash for speed, Pro for critical reasoning
        return {
            "theorist": resolve_model("gemini/flash"),
            "causal": resolve_model("gemini/flash"),
            "experiment": resolve_model("gemini/flash"),
            "literature": resolve_model("gemini/flash"),
            "diary": resolve_model("gemini/flash"),
            "adjudicator": resolve_model("gemini/flash"),
        }
    else:
        # Local models
        return {
            "theorist": resolve_model("local/gemma3"),
            "causal": resolve_model("local/gemma3"),
            "experiment": resolve_model("local/gemma3"),
            "literature": resolve_model("local/gemma3"),
            "diary": resolve_model("local/gemma3"),
            "adjudicator": resolve_model("local/gemma3"),
        }
