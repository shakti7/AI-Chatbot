from typing import AsyncGenerator, Dict, Any, List
import google.generativeai as genai
import asyncio

from .settings import get_settings


def _init_model():
    settings = get_settings()
    genai.configure(api_key=settings.gemini_api_key)
    model = genai.GenerativeModel(settings.gemini_model)
    return model


async def stream_gemini_response(history: List[Dict[str, Any]]) -> AsyncGenerator[str, None]:
    model = _init_model()

    gemini_history = []
    for msg in history:
        role = msg.get("role")
        content = msg.get("content", "")
        if role == "user":
            gemini_history.append({"role": "user", "parts": [content]})
        elif role == "assistant":
            gemini_history.append({"role": "model", "parts": [content]})

    chat = model.start_chat(history=gemini_history)

    last_user_msg = None
    for m in reversed(history):
        if m.get("role") == "user":
            last_user_msg = m.get("content", "")
            break

    if last_user_msg is None:
        return

    loop = asyncio.get_running_loop()

    def _sync_stream():
        return chat.send_message(last_user_msg, stream=True)

    response = await loop.run_in_executor(None, _sync_stream)

    for chunk in response:
        text = getattr(chunk, "text", None)
        if not text:
            try:
                text = chunk.candidates[0].content.parts[0].text  # type: ignore[attr-defined]
            except Exception:
                text = ""
        if text:
            yield text
