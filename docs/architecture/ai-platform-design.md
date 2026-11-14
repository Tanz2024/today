# AI platform design

## Request flow

Browser → validated route handler → rate-limit/budget guard → provider adapter → normalized result → safe response.

The browser must never receive provider secrets. Each adapter should expose a small interface such as `generate({ task, input, limits })` and return either a typed success or a typed failure. Provider-specific errors must not leak raw prompts, keys or upstream response bodies.

## Required controls

- Model allowlist, not user-selected arbitrary model names.
- Maximum input characters/tokens and maximum output tokens.
- Per-IP and per-session rate limits.
- Request timeout and bounded retry count.
- Optional daily budget guard.
- Provider unavailable state when credentials are missing.
- No fake fallback output.
- Minimal operational logging with request ID, task name, latency and outcome; no raw document contents.
- Explicit retention statement for every upload-capable tool.

## MVP order

1. Text-only email writer, prompt improver and code explainer.
2. Workflow planner with a deterministic form schema and optional model refinement.
3. Flashcard generator with export and local history.
4. PDF summarizer only after upload isolation and deletion verification.

## Game architecture

Prefer fixed datasets, local scoring and precomputed semantic relationships. LLM calls should not sit inside the primary interaction loop. Any game that claims recognition or classification must use a real model or clearly describe itself as a rule-based game.
