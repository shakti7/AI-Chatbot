from fastapi import FastAPI, Request, Response, Depends
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import AsyncGenerator, Dict, Any
import asyncio
import json

from .settings import get_settings, Settings
from .memory import memory_store
from .gemini_client import stream_gemini_response
from .schemas import ChatRequest
from .sse import format_sse
from .artifacts import ArtifactAggregator

app = FastAPI(title="Zocket AI Coding Agent Backend")

settings = get_settings()

app.add_middleware(
    CORSMiddleware,
    # allow_origins=settings.get_cors_origins(),
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.post("/api/session/reset")
async def reset_session(session_id: str) -> Dict[str, str]:
    memory_store.reset(session_id)
    return {"status": "reset", "session_id": session_id}


@app.post("/api/chat/stream")
async def chat_stream(request: Request, chat: ChatRequest) -> StreamingResponse:
    session_id = chat.session_id
    user_message = chat.message

    memory = memory_store.get_history(session_id)
    memory.append({"role": "user", "content": user_message})

    artifact_aggregator = ArtifactAggregator()

    async def event_generator() -> AsyncGenerator[bytes, None]:
        try:
            async for chunk in stream_gemini_response(memory):
                # chunk is a text piece
                artifact_event = artifact_aggregator.ingest(chunk)

                yield format_sse(data=json.dumps({"type": "chunk", "text": chunk}))

                if artifact_event is not None:
                    # Send artifact discovered event
                    yield format_sse(event="artifact", data=json.dumps(artifact_event))

            # Finalize assistant message
            assistant_text = artifact_aggregator.get_full_text()
            memory.append({"role": "assistant", "content": assistant_text})
            memory_store.set_history(session_id, memory)

            # Store last artifact per session if exists
            last_artifact = artifact_aggregator.get_last_artifact()
            if last_artifact is not None:
                memory_store.set_last_artifact(session_id, last_artifact)

            yield format_sse(data=json.dumps({"type": "done"}))
        except asyncio.CancelledError:
            # Client disconnected
            return
        except Exception as e:
            error_obj = {"type": "error", "message": str(e)}
            yield format_sse(data=json.dumps(error_obj))

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@app.get("/api/artifacts/latest")
async def get_latest_artifact(session_id: str) -> JSONResponse:
    artifact = memory_store.get_last_artifact(session_id)
    if artifact is None:
        return JSONResponse({"artifact": None})
    return JSONResponse({"artifact": artifact})
